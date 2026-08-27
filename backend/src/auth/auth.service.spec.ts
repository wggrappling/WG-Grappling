import * as bcrypt from 'bcrypt';
import { UserRole } from '../../generated/prisma/enums';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';

describe('AuthService session payload', () => {
  const users = { findByEmail: jest.fn(), upgradePasswordHash: jest.fn() };
  const jwt = { sign: jest.fn(() => 'signed-token') };
  const service = new AuthService(users as unknown as UsersService, jwt as never);

  beforeEach(() => jest.clearAllMocks());

  it('accepts login credentials for an active user', async () => {
    const password = await bcrypt.hash('segredo123', 4);
    users.findByEmail.mockResolvedValue({ id: 1, email: 'active@teste.local', password, role: UserRole.ADMIN, active: true, sessionVersion: 3 });
    await expect(service.validateUser('active@teste.local', 'segredo123')).resolves.toEqual(expect.objectContaining({ active: true, sessionVersion: 3 }));
    expect(users.upgradePasswordHash).toHaveBeenCalledWith(1, password, expect.stringMatching(/^\$argon2id\$/));
  });

  it('rejects login for an inactive user', async () => {
    users.findByEmail.mockResolvedValue({ id: 1, password: 'hash', active: false });
    await expect(service.validateUser('inactive@teste.local', 'segredo123')).resolves.toBeNull();
  });

  it('signs sessionVersion without exposing it in the public user response', async () => {
    const user = { id: 1, name: 'Admin', email: 'admin@teste.local', role: UserRole.ADMIN, active: true, sessionVersion: 7, studentId: null };
    const result = await service.login(user);
    expect(jwt.sign).toHaveBeenCalledWith({ email: user.email, sub: user.id, role: user.role, sessionVersion: 7 });
    expect(result.user).not.toHaveProperty('sessionVersion');
    expect(result.user).not.toHaveProperty('studentId');
  });

  it.each([
    ['ALUNO', UserRole.ALUNO, 42],
    ['interno', UserRole.ADMIN, null],
  ])('keeps studentId internal when logging in a %s User', async (_kind, role, studentId) => {
    const password = await bcrypt.hash('segredo123', 4);
    users.findByEmail.mockResolvedValue({
      id: 4,
      name: 'Usuário',
      email: 'usuario@teste.local',
      password,
      role,
      active: true,
      sessionVersion: 2,
      studentId,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    });

    const validated = await service.validateUser('usuario@teste.local', 'segredo123');
    const result = await service.login(validated);

    expect(validated).not.toHaveProperty('studentId');
    expect(result.user).not.toHaveProperty('studentId');
    expect(result.user).toEqual(expect.objectContaining({ id: 4, role }));
    expect(jwt.sign).toHaveBeenCalledWith({
      email: 'usuario@teste.local',
      sub: 4,
      role,
      sessionVersion: 2,
    });
  });

  it('keeps a valid login successful when compare-and-swap does not update', async () => {
    const password = await bcrypt.hash('legado123', 4);
    users.findByEmail.mockResolvedValue({ id: 2, email: 'legacy@teste.local', password, role: UserRole.ADMIN, active: true, sessionVersion: 4 });
    users.upgradePasswordHash.mockResolvedValue({ count: 0 });
    await expect(service.validateUser('legacy@teste.local', 'legado123')).resolves.toEqual(expect.objectContaining({ id: 2 }));
  });

  it('rejects an unknown password hash generically', async () => {
    users.findByEmail.mockResolvedValue({ id: 3, password: 'plain-text-is-not-a-hash', active: true });
    await expect(service.validateUser('unknown@teste.local', 'qualquer senha')).resolves.toBeNull();
    expect(users.upgradePasswordHash).not.toHaveBeenCalled();
  });
});
