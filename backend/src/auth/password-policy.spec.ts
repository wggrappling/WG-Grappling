import { validate } from 'class-validator';
import { CreateUserDto, UserRole } from '../users/dto/create-user.dto';
import {
  enforcePasswordPolicy,
  normalizePassword,
  PASSWORD_MAX_CODE_POINTS,
  PasswordPolicyError,
} from './password-policy';

describe('password policy', () => {
  const context = { name: 'Maria Silva', email: 'maria.silva@example.com' };

  it('accepts Unicode, spaces, symbols and a long passphrase', () => {
    const password = 'Céu aberto, luas distantes! 🥋';
    expect(enforcePasswordPolicy(password, context)).toBe(normalizePassword(password));
  });

  it('counts Unicode code points after NFC normalization', () => {
    const decomposed = `${'a'.repeat(14)}e\u0301`;
    expect(Array.from(normalizePassword(decomposed))).toHaveLength(15);
    expect(enforcePasswordPolicy(decomposed)).toBe(`${'a'.repeat(14)}é`);
  });

  it('rejects fewer than 15 and more than 128 code points', () => {
    expect(() => enforcePasswordPolicy('a'.repeat(14))).toThrow(PasswordPolicyError);
    expect(() => enforcePasswordPolicy('🧗'.repeat(PASSWORD_MAX_CODE_POINTS + 1))).toThrow(PasswordPolicyError);
  });

  it.each([
    '123456789012345',
    'PASSWORD-PASSWORD',
    'Minha senha WG Grappling é longa!',
    'Segredo Maria Silva protegido!',
    'maria.silva@example.com segura!',
  ])('rejects common or contextual password: %s', (password) => {
    expect(() => enforcePasswordPolicy(password, context)).toThrow(PasswordPolicyError);
  });

  it('applies the same policy through CreateUserDto', async () => {
    const dto = Object.assign(new CreateUserDto(), {
      name: context.name,
      email: context.email,
      password: 'curta demais',
      role: UserRole.ADMIN,
    });
    expect((await validate(dto)).some((error) => error.property === 'password')).toBe(true);
  });
});
