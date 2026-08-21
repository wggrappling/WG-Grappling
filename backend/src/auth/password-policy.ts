import { registerDecorator, ValidationArguments, ValidationOptions } from 'class-validator';

export const PASSWORD_MIN_CODE_POINTS = 15;
export const PASSWORD_MAX_CODE_POINTS = 128;

export type PasswordContext = { name?: string; email?: string };

const commonPasswords = new Set([
  '123456789012345',
  'administrador123',
  'adminadminadmin',
  'letmeinletmein',
  'passwordpassword',
  'qwertyuiopasdfg',
  'senha1234567890',
]);

const comparisonForm = (value: string) => value
  .normalize('NFD')
  .toLocaleLowerCase('pt-BR')
  .replace(/\p{M}/gu, '')
  .replace(/[^\p{L}\p{N}]/gu, '');

const contextualTerms = ({ name, email }: PasswordContext) => {
  const terms = new Set(['wggrappling', 'grappling']);
  const add = (value: string | undefined) => {
    const normalized = comparisonForm(value ?? '');
    if (normalized.length >= 4) terms.add(normalized);
  };

  add(name);
  for (const token of name?.split(/\s+/u) ?? []) add(token);
  add(email);
  add(email?.split('@')[0]);
  return terms;
};

export class PasswordPolicyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PasswordPolicyError';
  }
}

export function normalizePassword(password: string) {
  return password.normalize('NFC');
}

export function enforcePasswordPolicy(password: string, context: PasswordContext = {}) {
  const normalized = normalizePassword(password);
  const length = Array.from(normalized).length;
  if (length < PASSWORD_MIN_CODE_POINTS || length > PASSWORD_MAX_CODE_POINTS) {
    throw new PasswordPolicyError(
      `A senha deve ter entre ${PASSWORD_MIN_CODE_POINTS} e ${PASSWORD_MAX_CODE_POINTS} caracteres.`,
    );
  }

  const comparable = comparisonForm(normalized);
  if (commonPasswords.has(comparable)) {
    throw new PasswordPolicyError('A senha informada é muito comum. Escolha uma senha diferente.');
  }
  for (const term of contextualTerms(context)) {
    if (comparable.includes(term)) {
      throw new PasswordPolicyError('A senha não pode conter informações previsíveis do sistema ou do usuário.');
    }
  }
  return normalized;
}

export function IsPasswordPolicy(validationOptions?: ValidationOptions) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      name: 'isPasswordPolicy',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown, args: ValidationArguments) {
          if (typeof value !== 'string') return false;
          try {
            const source = args.object as PasswordContext;
            enforcePasswordPolicy(value, { name: source.name, email: source.email });
            return true;
          } catch {
            return false;
          }
        },
        defaultMessage() {
          return 'A senha não atende à política de segurança.';
        },
      },
    });
  };
}
