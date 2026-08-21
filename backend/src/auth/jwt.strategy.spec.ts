import { UnauthorizedException } from '@nestjs/common';
import { UserRole } from '../../generated/prisma/enums';
import { UsersService } from '../users/users.service';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy session validation', () => {
  const users = { findForAuthentication: jest.fn() };
  const strategy = new JwtStrategy(users as unknown as UsersService, { getOrThrow: () => '12345678901234567890123456789012' } as never);
  const payload = { sub: 1, email: 'admin@teste.local', role: UserRole.ADMIN, sessionVersion: 4 };
  const currentUser = { id: 1, name: 'Admin', email: payload.email, role: UserRole.ADMIN, active: true, sessionVersion: 4, createdAt: new Date() };

  beforeEach(() => {
    jest.clearAllMocks();
    users.findForAuthentication.mockResolvedValue(currentUser);
  });

  it('accepts an active user with the current sessionVersion', async () => {
    await expect(strategy.validate(payload)).resolves.toEqual(expect.objectContaining({ id: 1, role: UserRole.ADMIN }));
  });

  it('rejects a JWT when the user no longer exists', async () => {
    users.findForAuthentication.mockResolvedValue(null);
    await expect(strategy.validate(payload)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects a JWT for a subsequently deactivated user', async () => {
    users.findForAuthentication.mockResolvedValue({ ...currentUser, active: false, sessionVersion: 5 });
    await expect(strategy.validate(payload)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects a JWT with an old sessionVersion', async () => {
    users.findForAuthentication.mockResolvedValue({ ...currentUser, sessionVersion: 5 });
    await expect(strategy.validate(payload)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects a legacy JWT without sessionVersion', async () => {
    await expect(strategy.validate({ ...payload, sessionVersion: undefined as never })).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects a JWT whose role no longer matches the database', async () => {
    users.findForAuthentication.mockResolvedValue({ ...currentUser, role: UserRole.RECEPTION, sessionVersion: 5 });
    await expect(strategy.validate(payload)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('accepts a new token payload after a critical account change', async () => {
    const newPayload = { ...payload, role: UserRole.RECEPTION, sessionVersion: 5 };
    users.findForAuthentication.mockResolvedValue({ ...currentUser, role: UserRole.RECEPTION, sessionVersion: 5 });
    await expect(strategy.validate(newPayload)).resolves.toEqual(expect.objectContaining({ role: UserRole.RECEPTION }));
  });
});
