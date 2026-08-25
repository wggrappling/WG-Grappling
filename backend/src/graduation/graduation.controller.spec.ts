import { UserRole } from '../../generated/prisma/enums';
import { GraduationController } from './graduation.controller';

describe('GraduationController', () => {
  const service = {
    findAvailable: jest.fn(),
    findAll: jest.fn(),
    findCurrent: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    cancel: jest.fn(),
  };
  const controller = new GraduationController(service as never);
  const request = { user: { id: 9, role: UserRole.TEACHER } };

  beforeEach(() => jest.clearAllMocks());

  it('expõe o catálogo disponível filtrado por modalidade', async () => {
    service.findAvailable.mockResolvedValue([{ id: 7 }]);
    await expect(controller.available('2')).resolves.toEqual([{ id: 7 }]);
    expect(service.findAvailable).toHaveBeenCalledWith(2);
  });

  it('expõe histórico e graduação atual do aluno', async () => {
    service.findAll.mockResolvedValue([{ id: 1 }]);
    service.findCurrent.mockResolvedValue([{ id: 2 }]);
    await expect(controller.list('4', request)).resolves.toEqual([{ id: 1 }]);
    await expect(controller.current('4', request)).resolves.toEqual([{ id: 2 }]);
    expect(service.findAll).toHaveBeenCalledWith(4, request.user);
    expect(service.findCurrent).toHaveBeenCalledWith(4, request.user);
  });

  it('encaminha ator explícito no registro, correção e cancelamento', async () => {
    const createDto = { modalityId: 2, graduationLevelId: 7, beltStartedAt: '2026-08-01', graduatedAt: '2026-08-10' };
    await controller.create('4', createDto, request);
    await controller.update('15', { correctionReason: 'Correção' }, request);
    await controller.cancel('15', { reason: 'Incorreto' }, request);
    expect(service.create).toHaveBeenCalledWith(4, createDto, request.user);
    expect(service.update).toHaveBeenCalledWith(15, { correctionReason: 'Correção' }, request.user);
    expect(service.cancel).toHaveBeenCalledWith(15, { reason: 'Incorreto' }, request.user);
  });
});
