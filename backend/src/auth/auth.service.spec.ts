import * as bcrypt from 'bcrypt';
import { UserRole } from '../../generated/prisma/enums';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';

describe('AuthService session payload', () => {
  const users = { findByEmail: jest.fn() };
  const jwt = { sign: jest.fn(() => 'signed-token') };
  const service = new AuthService(users as unknown as UsersService, jwt as never);

  beforeEach(() => jest.clearAllMocks());

  it('accepts login credentials for an active user', async () => {
    const password = await bcrypt.hash('segredo123', 4);
    users.findByEmail.mockResolvedValue({ id: 1, email: 'active@teste.local', password, role: UserRole.ADMIN, active: true, sessionVersion: 3 });
    await expect(service.validateUser('active@teste.local', 'segredo123')).resolves.toEqual(expect.objectContaining({ active: true, sessionVersion: 3 }));
  });

  it('rejects login for an inactive user', async () => {
    users.findByEmail.mockResolvedValue({ id: 1, password: 'hash', active: false });
    await expect(service.validateUser('inactive@teste.local', 'segredo123')).resolves.toBeNull();
  });

  it('signs sessionVersion without exposing it in the public user response', async () => {
    const user = { id: 1, name: 'Admin', email: 'admin@teste.local', role: UserRole.ADMIN, active: true, sessionVersion: 7 };
    const result = await service.login(user);
    expect(jwt.sign).toHaveBeenCalledWith({ email: user.email, sub: user.id, role: user.role, sessionVersion: 7 });
    expect(result.user).not.toHaveProperty('sessionVersion');
  });
});
