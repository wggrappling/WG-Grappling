import * as argon2 from 'argon2';
import * as bcrypt from 'bcrypt';
import {
  ARGON2_OPTIONS,
  hashPassword,
  identifyPasswordHash,
  passwordHashRuntime,
  verifyPassword,
} from './password-hashing';

describe('password hashing', () => {
  const strongPassword = 'Céu aberto com luas distantes!';

  it('creates Argon2id with the approved parameters and verifies NFC input', async () => {
    const hash = await hashPassword('Ce\u0301u aberto com luas distantes!');
    expect(hash).toMatch(/^\$argon2id\$v=19\$m=19456,p=1,t=2\$/);
    expect(await verifyPassword(strongPassword, hash)).toMatchObject({ valid: true, algorithm: 'argon2id' });
    expect(await verifyPassword('Senha totalmente incorreta!', hash)).toMatchObject({ valid: false, algorithm: 'argon2id' });
  });

  it('recognizes all approved bcrypt prefixes', async () => {
    const hash = await bcrypt.hash('legado123', 4);
    for (const prefix of ['$2a$', '$2b$', '$2y$']) {
      const variant = hash.replace('$2b$', prefix);
      expect(identifyPasswordHash(variant)).toBe('bcrypt');
      expect((await verifyPassword('legado123', variant)).valid).toBe(true);
    }
  });

  it('validates and migrates weak legacy bcrypt without applying the new policy', async () => {
    for (const password of ['123456', 'legado123456']) {
      const hash = await bcrypt.hash(password, 4);
      const result = await verifyPassword(password, hash);
      expect(result).toMatchObject({ valid: true, algorithm: 'bcrypt' });
      expect(result.rehash).toMatch(/^\$argon2id\$/);
    }
  });

  it('does not migrate an incorrect bcrypt password', async () => {
    const hash = await bcrypt.hash('legado123', 4);
    await expect(verifyPassword('incorreta', hash)).resolves.toEqual({ valid: false, algorithm: 'bcrypt' });
  });

  it('verifies legacy Unicode raw before normalizing the Argon2id rehash', async () => {
    const decomposed = 'Cafe\u0301 legado seguro';
    const hash = await bcrypt.hash(decomposed, 4);
    const result = await verifyPassword(decomposed, hash);
    expect(result.valid).toBe(true);
    expect(result.rehash).toMatch(/^\$argon2id\$/);
    expect(await argon2.verify(result.rehash!, decomposed.normalize('NFC'))).toBe(true);
  });

  it('authenticates bcrypt above 72 bytes without automatic migration', async () => {
    const password = `prefixo-${'á'.repeat(40)}`;
    expect(Buffer.byteLength(password, 'utf8')).toBeGreaterThan(72);
    const hash = await bcrypt.hash(password, 4);
    await expect(verifyPassword(password, hash)).resolves.toEqual({ valid: true, algorithm: 'bcrypt' });
  });

  it('supports Argon2id passphrases beyond the bcrypt byte limit', async () => {
    const password = `Passphrase muito longa ${'界'.repeat(30)} com final!`;
    const hash = await hashPassword(password);
    expect(Buffer.byteLength(password, 'utf8')).toBeGreaterThan(72);
    expect(await verifyPassword(password, hash)).toMatchObject({ valid: true, algorithm: 'argon2id' });
  });

  it('rejects Argon2i, Argon2d, malformed and unknown hashes', async () => {
    const argon2i = await argon2.hash(strongPassword, { ...ARGON2_OPTIONS, type: argon2.argon2i });
    const argon2d = await argon2.hash(strongPassword, { ...ARGON2_OPTIONS, type: argon2.argon2d });
    for (const hash of [argon2i, argon2d, '$argon2id$malformed', 'plain-text']) {
      expect((await verifyPassword(strongPassword, hash)).valid).toBe(false);
    }
  });

  it('keeps bcrypt authentication valid if Argon2id rehash generation fails', async () => {
    const hash = await bcrypt.hash('legado123', 4);
    const argonHash = jest.spyOn(passwordHashRuntime, 'hash').mockRejectedValueOnce(new Error('simulated failure'));
    await expect(verifyPassword('legado123', hash)).resolves.toEqual({
      valid: true,
      algorithm: 'bcrypt',
      rehashFailed: true,
    });
    argonHash.mockRestore();
  });
});
