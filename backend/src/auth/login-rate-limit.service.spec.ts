import { LoginRateLimitService } from './login-rate-limit.service';

type Bucket = {
  key: string;
  attempts: number;
  windowStartedAt: Date;
  lockedUntil: Date | null;
  updatedAt: Date;
};

const createPrisma = () => {
  let buckets = new Map<string, Bucket>();
  const client = {
    authRateLimitBucket: {
      findUnique: jest.fn(async ({ where }: any) => buckets.get(where.key) ?? null),
      create: jest.fn(async ({ data }: any) => {
        const row = { ...data, updatedAt: new Date() };
        buckets.set(data.key, row);
        return row;
      }),
      update: jest.fn(async ({ where, data }: any) => {
        const row = { ...buckets.get(where.key)!, ...data, updatedAt: new Date() };
        buckets.set(where.key, row);
        return row;
      }),
      deleteMany: jest.fn(async ({ where }: any) => {
        if (where.key) return { count: buckets.delete(where.key) ? 1 : 0 };
        let count = 0;
        for (const [key, bucket] of buckets) {
          if (where.updatedAt?.lt && bucket.updatedAt < where.updatedAt.lt) {
            buckets.delete(key);
            count += 1;
          }
        }
        return { count };
      }),
    },
    $transaction: jest.fn(async (work: any) => {
      const snapshot = new Map([...buckets].map(([key, value]) => [key, { ...value }]));
      try {
        return await work(client);
      } catch (error) {
        buckets = snapshot;
        throw error;
      }
    }),
    buckets: () => [...buckets.values()],
  };
  return client;
};

const createService = (overrides: Record<string, number> = {}) => {
  const values: Record<string, number> = {
    AUTH_RATE_LIMIT_WINDOW_SECONDS: 60,
    AUTH_RATE_LIMIT_MAX_ATTEMPTS: 10,
    AUTH_ACCOUNT_RATE_LIMIT_MAX_ATTEMPTS: 3,
    AUTH_LOCKOUT_SECONDS: 120,
    ...overrides,
  };
  const prisma = createPrisma();
  const config = { getOrThrow: jest.fn((key: string) => key === 'JWT_SECRET' ? 'test-secret-with-at-least-32-characters' : values[key]) };
  return { service: new LoginRateLimitService(prisma as any, config as any), prisma };
};

describe('LoginRateLimitService', () => {
  beforeEach(() => jest.useFakeTimers().setSystemTime(new Date('2026-08-21T12:00:00Z')));
  afterEach(() => jest.useRealTimers());

  it('allows invalid attempts below both configured limits', async () => {
    const { service } = createService();
    const account = service.accountKey('User@Example.com');
    await expect(service.consumeAttempt('203.0.113.10', account)).resolves.toBeUndefined();
    await expect(service.consumeAttempt('203.0.113.10', account)).resolves.toBeUndefined();
  });

  it('blocks new attempts when the account limit is reached across different IPs', async () => {
    const { service } = createService();
    const account = service.accountKey('target@example.com');
    await service.consumeAttempt('203.0.113.1', account);
    await service.consumeAttempt('203.0.113.2', account);
    await service.consumeAttempt('203.0.113.3', account);
    await expect(service.consumeAttempt('203.0.113.4', account)).rejects.toMatchObject({ status: 429 });
  });

  it('blocks new attempts when the IP limit is reached across different accounts', async () => {
    const { service } = createService({ AUTH_RATE_LIMIT_MAX_ATTEMPTS: 2, AUTH_ACCOUNT_RATE_LIMIT_MAX_ATTEMPTS: 10 });
    await service.consumeAttempt('203.0.113.10', service.accountKey('one@example.com'));
    await service.consumeAttempt('203.0.113.10', service.accountKey('two@example.com'));
    await expect(service.consumeAttempt('203.0.113.10', service.accountKey('three@example.com'))).rejects.toMatchObject({ status: 429 });
  });

  it('allows attempts again after the temporary lock expires', async () => {
    const { service } = createService({ AUTH_ACCOUNT_RATE_LIMIT_MAX_ATTEMPTS: 1 });
    const account = service.accountKey('target@example.com');
    await service.consumeAttempt('203.0.113.1', account);
    await expect(service.consumeAttempt('203.0.113.2', account)).rejects.toMatchObject({ status: 429 });
    jest.advanceTimersByTime(120_001);
    await expect(service.consumeAttempt('203.0.113.2', account)).resolves.toBeUndefined();
  });

  it('resets only the successful account bucket and preserves the IP bucket', async () => {
    const { service, prisma } = createService();
    const account = service.accountKey('success@example.com');
    await service.consumeAttempt('203.0.113.10', account);
    await service.resetAccount(account);
    expect(prisma.buckets()).toHaveLength(1);
    expect(prisma.buckets()[0].key).not.toBe(account);
  });

  it('does not let failures against one account block another account on the same IP', async () => {
    const { service } = createService();
    const attacked = service.accountKey('attacked@example.com');
    await service.consumeAttempt('203.0.113.10', attacked);
    await service.consumeAttempt('203.0.113.10', attacked);
    await service.consumeAttempt('203.0.113.10', attacked);
    await expect(service.consumeAttempt('203.0.113.10', service.accountKey('legitimate@example.com'))).resolves.toBeUndefined();
  });

  it('stores irreversible hashes instead of email addresses', async () => {
    const { service, prisma } = createService();
    const email = 'private@example.com';
    await service.consumeAttempt('203.0.113.10', service.accountKey(email));
    expect(JSON.stringify(prisma.buckets())).not.toContain(email);
  });
});
