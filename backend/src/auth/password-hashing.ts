import * as argon2 from 'argon2';
import * as bcrypt from 'bcrypt';
import { enforcePasswordPolicy, normalizePassword, PasswordContext } from './password-policy';

export const ARGON2_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
  hashLength: 32,
} as const;

export const passwordHashRuntime = {
  hash(normalizedPassword: string) {
    return argon2.hash(normalizedPassword, ARGON2_OPTIONS);
  },
};

const bcryptHashPattern = /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/;

export type PasswordHashAlgorithm = 'argon2id' | 'bcrypt' | 'unknown';

export function identifyPasswordHash(hash: string): PasswordHashAlgorithm {
  if (hash.startsWith('$argon2id$')) return 'argon2id';
  if (bcryptHashPattern.test(hash)) return 'bcrypt';
  return 'unknown';
}

export function hashNormalizedPassword(normalizedPassword: string) {
  return passwordHashRuntime.hash(normalizedPassword);
}

export async function hashPassword(password: string, context: PasswordContext = {}) {
  return hashNormalizedPassword(enforcePasswordPolicy(password, context));
}

export type PasswordVerification = {
  valid: boolean;
  algorithm: PasswordHashAlgorithm;
  rehash?: string;
  rehashFailed?: boolean;
};

export async function verifyPassword(password: string, hash: string): Promise<PasswordVerification> {
  const algorithm = identifyPasswordHash(hash);
  if (algorithm === 'unknown') return { valid: false, algorithm };

  if (algorithm === 'argon2id') {
    try {
      const normalized = normalizePassword(password);
      const valid = await argon2.verify(hash, normalized);
      if (!valid) return { valid: false, algorithm };
      if (!argon2.needsRehash(hash, ARGON2_OPTIONS)) return { valid: true, algorithm };
      try {
        return { valid: true, algorithm, rehash: await hashNormalizedPassword(normalized) };
      } catch {
        return { valid: true, algorithm, rehashFailed: true };
      }
    } catch {
      return { valid: false, algorithm };
    }
  }

  let valid = false;
  try {
    const compatibleHash = hash.startsWith('$2y$') ? `$2b$${hash.slice(4)}` : hash;
    valid = await bcrypt.compare(password, compatibleHash);
  } catch {
    return { valid: false, algorithm };
  }
  if (!valid || Buffer.byteLength(password, 'utf8') > 72) return { valid, algorithm };

  try {
    return { valid: true, algorithm, rehash: await hashNormalizedPassword(normalizePassword(password)) };
  } catch {
    return { valid: true, algorithm, rehashFailed: true };
  }
}
