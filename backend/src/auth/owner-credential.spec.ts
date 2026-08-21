import * as bcrypt from 'bcrypt';
import * as argon2 from 'argon2';
import { UserRole } from '../../generated/prisma/enums';
import { prepareExistingOwnerUpdate, prepareNewOwner } from './owner-credential';
import { hashPassword } from './password-hashing';

describe('create-owner credential preparation', () => {
  const input = {
    name: 'Owner Operacional',
    email: 'owner@example.com',
    password: 'Céu aberto com luas muito distantes!',
  };

  it('creates new OWNER credentials with Argon2id and the central policy', async () => {
    const data = await prepareNewOwner(input);
    expect(data.password).toMatch(/^\$argon2id\$/);
    expect(await argon2.verify(data.password, input.password)).toBe(true);
    await expect(prepareNewOwner({ ...input, password: 'muito curta' })).rejects.toThrow();
  });

  it('does not rehash or increment when Argon2id password and critical fields are unchanged', async () => {
    const password = await hashPassword(input.password, input);
    const data = await prepareExistingOwnerUpdate({ password, role: UserRole.OWNER, active: true }, input);
    expect(data).not.toHaveProperty('password');
    expect(data).not.toHaveProperty('sessionVersion');
  });

  it('rehashes matching bcrypt without incrementing sessionVersion', async () => {
    const password = await bcrypt.hash(input.password, 4);
    const data = await prepareExistingOwnerUpdate({ password, role: UserRole.OWNER, active: true }, input);
    expect(data.password).toMatch(/^\$argon2id\$/);
    expect(data).not.toHaveProperty('sessionVersion');
  });

  it('increments sessionVersion once for a real password change plus role and active changes', async () => {
    const password = await hashPassword('Outra frase secreta com grande distância!', input);
    const data = await prepareExistingOwnerUpdate({ password, role: UserRole.ADMIN, active: false }, input);
    expect(data.password).toMatch(/^\$argon2id\$/);
    expect(data.sessionVersion).toEqual({ increment: 1 });
  });

  it('increments once for role or active changes with the same password', async () => {
    const password = await hashPassword(input.password, input);
    const data = await prepareExistingOwnerUpdate({ password, role: UserRole.ADMIN, active: false }, input);
    expect(data).not.toHaveProperty('password');
    expect(data.sessionVersion).toEqual({ increment: 1 });
  });

  it('treats an ambiguous bcrypt password above 72 bytes as a controlled real change', async () => {
    const longInput = { ...input, password: `Frase muito longa ${'界'.repeat(30)} com final seguro!` };
    const password = await bcrypt.hash(longInput.password, 4);
    const data = await prepareExistingOwnerUpdate({ password, role: UserRole.OWNER, active: true }, longInput);
    expect(data.password).toMatch(/^\$argon2id\$/);
    expect(data.sessionVersion).toEqual({ increment: 1 });
  });

  it('fails safely for an unknown existing hash and never logs the password', async () => {
    const log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    const error = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    await expect(prepareExistingOwnerUpdate({ password: 'unknown', role: UserRole.OWNER, active: true }, input)).rejects.toThrow(/não reconhecido/i);
    expect(JSON.stringify([...log.mock.calls, ...error.mock.calls])).not.toContain(input.password);
    log.mockRestore();
    error.mockRestore();
  });
});
