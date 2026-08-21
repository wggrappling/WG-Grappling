import { UserRole } from '../../generated/prisma/enums';
import { hashPassword, identifyPasswordHash, verifyPassword } from './password-hashing';
import { enforcePasswordPolicy } from './password-policy';

type ExistingOwnerCandidate = {
  password: string;
  role: UserRole;
  active: boolean;
};

type OwnerInput = {
  name: string;
  email: string;
  password: string;
};

export async function prepareNewOwner(input: OwnerInput) {
  return {
    name: input.name,
    email: input.email,
    password: await hashPassword(input.password, input),
    role: UserRole.OWNER,
    active: true,
  };
}

export async function prepareExistingOwnerUpdate(existing: ExistingOwnerCandidate, input: OwnerInput) {
  enforcePasswordPolicy(input.password, input);
  const algorithm = identifyPasswordHash(existing.password);
  if (algorithm === 'unknown') {
    throw new Error('Hash de credencial existente não reconhecido; atualização cancelada.');
  }

  const ambiguousLongBcrypt = algorithm === 'bcrypt' && Buffer.byteLength(input.password, 'utf8') > 72;
  const verification = ambiguousLongBcrypt
    ? { valid: false, algorithm }
    : await verifyPassword(input.password, existing.password);
  let password: string | undefined;
  let passwordChanged = false;

  if (verification.valid) {
    if (verification.rehashFailed) {
      throw new Error('Não foi possível atualizar com segurança a representação da credencial.');
    }
    password = verification.rehash;
  } else {
    password = await hashPassword(input.password, input);
    passwordChanged = true;
  }

  const roleChanged = existing.role !== UserRole.OWNER;
  const activeChanged = !existing.active;
  const criticalChange = passwordChanged || roleChanged || activeChanged;

  return {
    name: input.name,
    role: UserRole.OWNER,
    active: true,
    ...(password ? { password } : {}),
    ...(criticalChange ? { sessionVersion: { increment: 1 } } : {}),
  };
}
