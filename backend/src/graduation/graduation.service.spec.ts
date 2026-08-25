import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { GraduationStatus, UserRole } from '../../generated/prisma/enums';
import { GraduationService } from './graduation.service';
import { validate } from 'class-validator';
import { CreateGraduationDto } from './dto/graduation.dto';

describe('GraduationService', () => {
  const prisma = {
    user: { findUnique: jest.fn() },
    student: { findFirst: jest.fn() },
    modality: { findFirst: jest.fn() },
    studentModality: { findFirst: jest.fn() },
    graduationLevel: { findFirst: jest.fn(), findMany: jest.fn(), count: jest.fn() },
    graduation: { findMany: jest.fn(), findFirst: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn(), updateMany: jest.fn() },
    $transaction: jest.fn(),
  };
  const service = new GraduationService(prisma as never);
  const admin = { id: 1, role: UserRole.ADMIN };
  const teacher = { id: 9, role: UserRole.TEACHER };
  const dto = { modalityId: 2, graduationLevelId: 7, degree: 2, beltStartedAt: '2026-08-01T00:00:00.000Z', graduatedAt: '2026-08-10T00:00:00.000Z' };
  const level = { id: 7, modalityId: 2, code: 'BLUE', minDegree: 0, maxDegree: 4 };

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.user.findUnique.mockResolvedValue({ id: 1, role: UserRole.ADMIN, active: true });
    prisma.student.findFirst.mockResolvedValue({ id: 1 });
    prisma.modality.findFirst.mockResolvedValue({ id: 2 });
    prisma.studentModality.findFirst.mockResolvedValue({ id: 3 });
    prisma.graduationLevel.findFirst.mockResolvedValue(level);
    prisma.graduationLevel.count.mockResolvedValue(1);
    prisma.graduation.findFirst.mockResolvedValue(null);
    prisma.graduation.create.mockResolvedValue({ id: 4 });
    prisma.graduation.findMany.mockResolvedValue([]);
    prisma.graduation.updateMany.mockResolvedValue({ count: 1 });
    prisma.graduation.update.mockResolvedValue({ id: 4 });
    prisma.$transaction.mockImplementation(async (callback) => callback({ graduation: prisma.graduation }));
  });

  it('registra uma decisão humana autorizada', async () => {
    await expect(service.create(1, dto, admin)).resolves.toEqual({ id: 4 });
    expect(prisma.graduation.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ graduationLevelId: 7, degree: 2, graduatedBy: 1 }) }));
  });

  it('retorna catálogo vazio como lista válida', async () => {
    prisma.graduationLevel.findMany.mockResolvedValue([]);
    await expect(service.findAvailable(2)).resolves.toEqual([]);
  });

  it('permite professor ativo autorizado no contexto do aluno', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 9, role: UserRole.TEACHER, active: true });
    await service.create(1, dto, teacher);
    expect(prisma.student.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ studentClasses: { some: { status: 'ACTIVE', class: { active: true, teacherUserId: 9, modalityId: 2 } } } }) }));
  });

  it.each([
    ['turma de outro professor'],
    ['turma desativada'],
    ['turma de outra modalidade'],
  ])('rejeita professor quando o contexto não contém %s', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 9, role: UserRole.TEACHER, active: true });
    prisma.student.findFirst.mockResolvedValue(null);
    await expect(service.create(1, dto, teacher)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('consulta histórico sem apagar registros anteriores', async () => {
    prisma.graduation.findMany.mockResolvedValue([{ id: 2 }, { id: 1 }]);
    await expect(service.findAll(1, admin)).resolves.toHaveLength(2);
    expect(prisma.graduation.findMany).toHaveBeenCalledWith(expect.objectContaining({ orderBy: [{ createdAt: 'desc' }, { id: 'desc' }] }));
  });

  it('deriva uma graduação atual ativa por modalidade', async () => {
    prisma.graduation.findMany.mockResolvedValue([{ id: 3, modalityId: 2 }, { id: 2, modalityId: 2 }, { id: 1, modalityId: 4 }]);
    await expect(service.findCurrent(1, admin)).resolves.toEqual([{ id: 3, modalityId: 2 }, { id: 1, modalityId: 4 }]);
  });

  it('rejeita nível incompatível com a modalidade', async () => {
    prisma.graduationLevel.findFirst.mockResolvedValue(null);
    await expect(service.create(1, dto, admin)).rejects.toBeInstanceOf(ConflictException);
  });

  it('retorna erro claro quando o catálogo está vazio', async () => {
    prisma.graduationLevel.findFirst.mockResolvedValue(null);
    prisma.graduationLevel.count.mockResolvedValue(0);
    await expect(service.create(1, dto, admin)).rejects.toThrow('catálogo acadêmico desta modalidade ainda não está configurado');
  });

  it('aceita somente graduationLevelId', async () => {
    await service.create(1, dto, admin);
    expect(prisma.graduation.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ graduationLevelId: 7, belt: undefined }) }));
  });

  it('aceita somente belt quando há nível correspondente', async () => {
    await service.create(1, { ...dto, graduationLevelId: undefined, belt: 'BLUE' }, admin);
    expect(prisma.graduationLevel.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ modalityId: 2, code: 'BLUE' }) }));
  });

  it('aceita belt e level compatíveis', async () => {
    await expect(service.create(1, { ...dto, belt: 'BLUE' }, admin)).resolves.toEqual({ id: 4 });
  });

  it('rejeita belt e level incompatíveis', async () => {
    await expect(service.create(1, { ...dto, belt: 'BLACK' }, admin)).rejects.toThrow('não corresponde ao GraduationLevel');
  });

  it('rejeita belt sem nível correspondente', async () => {
    prisma.graduationLevel.findFirst.mockResolvedValue(null);
    await expect(service.create(1, { ...dto, graduationLevelId: undefined, belt: 'BLACK' }, admin)).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejeita belt fora do enum no contrato HTTP', async () => {
    const input = Object.assign(new CreateGraduationDto(), dto, { belt: 'INVALID' });
    const errors = await validate(input);
    expect(errors.some((error) => error.property === 'belt')).toBe(true);
  });

  it('rejeita aluno sem vínculo vigente com a modalidade', async () => {
    prisma.studentModality.findFirst.mockResolvedValue(null);
    await expect(service.create(1, dto, admin)).rejects.toBeInstanceOf(ConflictException);
  });

  it('aceita StudentModality ACTIVE ou PAUSED', async () => {
    await service.create(1, dto, admin);
    expect(prisma.studentModality.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ status: { in: ['ACTIVE', 'PAUSED'] } }) }));
  });

  it('rejeita StudentModality FINISHED', async () => {
    prisma.studentModality.findFirst.mockResolvedValue(null);
    await expect(service.create(1, dto, admin)).rejects.toThrow('não possui vínculo vigente');
  });

  it('rejeita usuário inativo', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 1, role: UserRole.ADMIN, active: false });
    await expect(service.create(1, dto, admin)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejeita role não autorizada no service', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 8, role: UserRole.RECEPTION, active: true });
    await expect(service.create(1, dto, { id: 8, role: UserRole.RECEPTION })).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('bloqueia professor fora do contexto do aluno', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 9, role: UserRole.TEACHER, active: true });
    prisma.student.findFirst.mockResolvedValue(null);
    await expect(service.findAll(1, teacher)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejeita duplicidade acidental', async () => {
    prisma.graduation.findFirst.mockResolvedValue({ id: 20 });
    await expect(service.create(1, dto, admin)).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejeita data futura', async () => {
    await expect(service.create(1, { ...dto, graduatedAt: '2999-01-01T00:00:00.000Z' }, admin)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('corrige com motivo e autoria sem excluir o histórico', async () => {
    prisma.graduation.findUnique.mockResolvedValue({ id: 4, modalityId: 2, graduationLevelId: 7, degree: 2, beltStartedAt: new Date(dto.beltStartedAt), graduatedAt: new Date(dto.graduatedAt), status: GraduationStatus.ACTIVE });
    prisma.graduation.create.mockResolvedValue({ id: 5, correctsGraduationId: 4, degree: 3 });
    await expect(service.update(4, { degree: 3, correctionReason: 'Correção administrativa' }, admin)).resolves.toEqual({ id: 5, correctsGraduationId: 4, degree: 3 });
    expect(prisma.graduation.updateMany).toHaveBeenCalledWith({ where: { id: 4, status: GraduationStatus.ACTIVE }, data: { status: GraduationStatus.SUPERSEDED } });
    expect(prisma.graduation.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ degree: 3, correctedBy: 1, correctionReason: 'Correção administrativa', correctsGraduationId: 4 }) }));
  });

  it('preserva a cadeia em uma segunda correção', async () => {
    prisma.graduation.findUnique.mockResolvedValue({ id: 5, studentId: 1, modalityId: 2, graduationLevelId: 7, degree: 3, belt: null, beltStartedAt: new Date(dto.beltStartedAt), graduatedAt: new Date(dto.graduatedAt), notes: null, graduatedBy: 8, status: GraduationStatus.ACTIVE });
    prisma.graduation.create.mockResolvedValue({ id: 6, correctsGraduationId: 5 });
    await service.update(5, { degree: 4, correctionReason: 'Segunda correção' }, admin);
    expect(prisma.graduation.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ correctsGraduationId: 5, correctedBy: 1, correctionReason: 'Segunda correção' }) }));
  });

  it('traduz colisão concorrente do índice em conflito de domínio', async () => {
    prisma.graduation.create.mockRejectedValue({ code: 'P2002' });
    await expect(service.create(1, dto, admin)).rejects.toBeInstanceOf(ConflictException);
  });

  it('cancela logicamente e preserva o registro', async () => {
    prisma.graduation.findUnique.mockResolvedValue({ id: 4, studentId: 1, modalityId: 2, status: GraduationStatus.CANCELLED, cancellationReason: 'Lançamento incorreto' });
    await expect(service.cancel(4, { reason: 'Lançamento incorreto' }, admin)).resolves.toEqual(expect.objectContaining({ id: 4, status: GraduationStatus.CANCELLED }));
    expect(prisma.graduation.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 4, status: GraduationStatus.ACTIVE }, data: expect.objectContaining({ status: GraduationStatus.CANCELLED, cancelledBy: 1 }) }));
  });

  it.each([GraduationStatus.SUPERSEDED, GraduationStatus.CANCELLED])('rejeita cancelamento quando a versão está %s', async (status) => {
    prisma.graduation.updateMany.mockResolvedValue({ count: 0 });
    prisma.graduation.findUnique.mockResolvedValue({ id: 4, status });
    await expect(service.cancel(4, { reason: 'Lançamento incorreto' }, admin)).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejeita cancelamento da versão antiga após uma correção concorrente', async () => {
    prisma.graduation.updateMany.mockResolvedValue({ count: 0 });
    prisma.graduation.findUnique.mockResolvedValue({ id: 4, status: GraduationStatus.SUPERSEDED });
    await expect(service.cancel(4, { reason: 'Operação concorrente' }, admin)).rejects.toThrow('Somente a versão ativa pode ser cancelada');
    expect(prisma.graduation.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 4, status: GraduationStatus.ACTIVE } }));
  });

  it('permite somente um de dois cancelamentos da mesma graduação', async () => {
    prisma.graduation.updateMany.mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 0 });
    prisma.graduation.findUnique
      .mockResolvedValueOnce({ id: 4, studentId: 1, modalityId: 2, status: GraduationStatus.CANCELLED })
      .mockResolvedValueOnce({ id: 4, status: GraduationStatus.CANCELLED });
    await expect(service.cancel(4, { reason: 'Primeiro cancelamento' }, admin)).resolves.toEqual(expect.objectContaining({ status: GraduationStatus.CANCELLED }));
    await expect(service.cancel(4, { reason: 'Segundo cancelamento' }, admin)).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.graduation.updateMany).toHaveBeenCalledTimes(2);
  });
});
