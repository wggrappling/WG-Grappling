import { BadRequestException, ForbiddenException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { Test, TestingModule } from '@nestjs/testing';
import { UserRole } from '../../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from './users.service';

describe('UsersService security policy', () => {
  let service: UsersService;
  const prisma = {
    user: {
      create: jest.fn(), findUnique: jest.fn(), findUniqueOrThrow: jest.fn(),
      update: jest.fn(), updateMany: jest.fn(), delete: jest.fn(),
    },
  };
  const owner = { id: 1, role: UserRole.OWNER };
  const admin = { id: 2, role: UserRole.ADMIN };
  const ownerDto = { name: 'Owner Teste', email: 'owner@teste.local', password: 'Passphrase longa e segura!', role: UserRole.OWNER };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [UsersService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(UsersService);
    prisma.user.create.mockResolvedValue({ id: 10, ...ownerDto, password: 'hash', active: true, sessionVersion: 0 });
    prisma.user.findUniqueOrThrow.mockResolvedValue({ role: UserRole.ADMIN, active: true, name: 'Usuário Teste', email: 'user@teste.local' });
    prisma.user.update.mockResolvedValue({ id: 10, name: 'Usuário', email: 'user@teste.local', role: UserRole.ADMIN, active: true, createdAt: new Date() });
    prisma.user.delete.mockResolvedValue({ id: 10 });
  });

  it('allows OWNER to create OWNER', async () => {
    await expect(service.create(ownerDto, owner)).resolves.toEqual(expect.objectContaining({ data: expect.objectContaining({ role: UserRole.OWNER }) }));
  });

  it('allows OWNER to create ADMIN', async () => {
    await expect(service.create({ ...ownerDto, role: UserRole.ADMIN }, owner)).resolves.toBeDefined();
  });

  it('allows ADMIN to create ADMIN', async () => {
    await expect(service.create({ ...ownerDto, role: UserRole.ADMIN }, admin)).resolves.toBeDefined();
  });

  it('denies ADMIN creating OWNER', async () => {
    await expect(service.create(ownerDto, admin)).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it('allows OWNER to promote another user to OWNER and invalidates sessions', async () => {
    await service.update(10, { role: UserRole.OWNER }, owner);
    expect(prisma.user.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ role: UserRole.OWNER, sessionVersion: { increment: 1 } }),
    }));
  });

  it('denies ADMIN promoting any user to OWNER', async () => {
    await expect(service.update(10, { role: UserRole.OWNER }, admin)).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it.each([
    ['name', { name: 'Novo Nome' }],
    ['email', { email: 'novo-owner@teste.local' }],
    ['password', { password: 'Nova passphrase longa e segura!' }],
    ['role', { role: UserRole.ADMIN }],
    ['active', { active: false }],
    ['combined fields', { name: 'Novo Nome', email: 'novo-owner@teste.local', password: 'Passphrase completamente diferente!', role: UserRole.ADMIN, active: false }],
  ])('denies ADMIN updating OWNER %s', async (_field, update) => {
    prisma.user.findUniqueOrThrow.mockResolvedValue({ role: UserRole.OWNER, active: true });
    await expect(service.update(10, update, admin)).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('denies ADMIN removing OWNER', async () => {
    prisma.user.findUniqueOrThrow.mockResolvedValue({ role: UserRole.OWNER, active: true });
    await expect(service.remove(10, admin)).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.user.delete).not.toHaveBeenCalled();
  });

  it('allows OWNER to deactivate a user and increments sessionVersion', async () => {
    await service.update(10, { active: false }, owner);
    expect(prisma.user.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ active: false, sessionVersion: { increment: 1 } }),
    }));
  });

  it('increments sessionVersion when password changes', async () => {
    await service.update(10, { password: 'Nova passphrase longa e segura!' }, owner);
    expect(prisma.user.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ password: expect.stringMatching(/^\$argon2id\$/), sessionVersion: { increment: 1 } }),
    }));
  });

  it('does not invalidate sessions for a non-critical name change', async () => {
    await service.update(10, { name: 'Nome Atualizado' }, admin);
    expect(prisma.user.update.mock.calls[0][0].data).not.toHaveProperty('sessionVersion');
  });

  it('rejects a user changing their own role', async () => {
    await expect(service.update(2, { role: UserRole.TEACHER }, admin)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('allows OWNER to remove OWNER', async () => {
    prisma.user.findUniqueOrThrow.mockResolvedValue({ role: UserRole.OWNER, active: true });
    await expect(service.remove(10, owner)).resolves.toBeDefined();
  });

  it('allows OWNER to update another OWNER', async () => {
    prisma.user.findUniqueOrThrow.mockResolvedValue({ role: UserRole.OWNER, active: true });
    await expect(service.update(10, { name: 'Owner Atualizado' }, owner)).resolves.toBeDefined();
  });

  it.each([UserRole.ADMIN, UserRole.RECEPTION, UserRole.TEACHER])(
    'allows ADMIN to update a %s user',
    async (targetRole) => {
      prisma.user.findUniqueOrThrow.mockResolvedValue({ role: targetRole, active: true });
      await expect(service.update(10, { name: 'Usuário Atualizado' }, admin)).resolves.toBeDefined();
    },
  );

  it('creates new users with Argon2id without exposing the hash', async () => {
    await service.create({ ...ownerDto, role: UserRole.ADMIN }, owner);
    const stored = prisma.user.create.mock.calls[0][0].data.password;
    expect(stored).toMatch(/^\$argon2id\$/);
    expect(await argon2.verify(stored, ownerDto.password.normalize('NFC'))).toBe(true);
  });

  it('does not expose studentId in the administrative create response', async () => {
    prisma.user.create.mockResolvedValue({
      id: 10,
      name: 'Aluno',
      email: 'aluno@teste.local',
      role: UserRole.ALUNO,
      active: true,
      createdAt: new Date(),
      studentId: 55,
    });

    const result = await service.create({ ...ownerDto, role: UserRole.ALUNO }, owner);

    expect(result.data).not.toHaveProperty('studentId');
    expect(prisma.user.create).toHaveBeenCalledWith(expect.objectContaining({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        createdAt: true,
      },
    }));
  });

  it('uses compare-and-swap for automatic hash upgrades without session invalidation', async () => {
    prisma.user.updateMany.mockResolvedValue({ count: 0 });
    await expect(service.upgradePasswordHash(10, 'old-hash', 'new-hash')).resolves.toEqual({ count: 0 });
    expect(prisma.user.updateMany).toHaveBeenCalledWith({
      where: { id: 10, password: 'old-hash' },
      data: { password: 'new-hash' },
    });
    expect(prisma.user.updateMany.mock.calls[0][0].data).not.toHaveProperty('sessionVersion');
  });

  it('enforces the central password policy even when the service is called directly', async () => {
    await expect(service.create({ ...ownerDto, password: 'curta demais' }, owner)).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.user.create).not.toHaveBeenCalled();
  });
});
