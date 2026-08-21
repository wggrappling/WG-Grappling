import { createHmac } from 'crypto';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type BucketPolicy = { key: string; maxAttempts: number };

export class LoginRateLimitedException extends HttpException {
  constructor() {
    super('Muitas tentativas. Tente novamente mais tarde.', HttpStatus.TOO_MANY_REQUESTS);
  }
}

@Injectable()
export class LoginRateLimitService {
  private readonly windowMs: number;
  private readonly ipMaxAttempts: number;
  private readonly accountMaxAttempts: number;
  private readonly lockoutMs: number;
  private readonly identifierSecret: string;

  constructor(private readonly prisma: PrismaService, config: ConfigService) {
    this.windowMs = config.getOrThrow<number>('AUTH_RATE_LIMIT_WINDOW_SECONDS') * 1000;
    this.ipMaxAttempts = config.getOrThrow<number>('AUTH_RATE_LIMIT_MAX_ATTEMPTS');
    this.accountMaxAttempts = config.getOrThrow<number>('AUTH_ACCOUNT_RATE_LIMIT_MAX_ATTEMPTS');
    this.lockoutMs = config.getOrThrow<number>('AUTH_LOCKOUT_SECONDS') * 1000;
    this.identifierSecret = config.getOrThrow<string>('JWT_SECRET');
  }

  accountKey(email: string) {
    return this.hashIdentifier('account', email.trim().toLowerCase());
  }

  ipKey(ip: string) {
    return this.hashIdentifier('ip', ip);
  }

  async consumeAttempt(ip: string, accountKey: string) {
    const policies: BucketPolicy[] = [
      { key: this.ipKey(ip), maxAttempts: this.ipMaxAttempts },
      { key: accountKey, maxAttempts: this.accountMaxAttempts },
    ];

    for (let retry = 0; retry < 3; retry += 1) {
      try {
        await this.prisma.$transaction(
          async (tx) => {
            const now = new Date();
            const staleBefore = new Date(now.getTime() - Math.max(this.windowMs, this.lockoutMs));
            await tx.authRateLimitBucket.deleteMany({ where: { updatedAt: { lt: staleBefore } } });
            for (const policy of policies) await this.consumeBucket(tx, policy, now);
          },
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        );
        return;
      } catch (error) {
        if (this.isSerializationConflict(error) && retry < 2) continue;
        throw error;
      }
    }
  }

  resetAccount(accountKey: string) {
    return this.prisma.authRateLimitBucket.deleteMany({ where: { key: accountKey } });
  }

  private async consumeBucket(tx: Prisma.TransactionClient, policy: BucketPolicy, now: Date) {
    const current = await tx.authRateLimitBucket.findUnique({ where: { key: policy.key } });
    if (current?.lockedUntil && current.lockedUntil > now) this.block();

    const resetWindow = !current
      || current.windowStartedAt.getTime() + this.windowMs <= now.getTime()
      || (current.lockedUntil !== null && current.lockedUntil <= now);
    const attempts = resetWindow ? 1 : current.attempts + 1;
    const lockedUntil = attempts >= policy.maxAttempts ? new Date(now.getTime() + this.lockoutMs) : null;

    if (current) {
      await tx.authRateLimitBucket.update({
        where: { key: policy.key },
        data: { attempts, windowStartedAt: resetWindow ? now : current.windowStartedAt, lockedUntil },
      });
    } else {
      await tx.authRateLimitBucket.create({
        data: { key: policy.key, attempts, windowStartedAt: now, lockedUntil },
      });
    }
  }

  private hashIdentifier(scope: 'ip' | 'account', value: string) {
    return createHmac('sha256', this.identifierSecret).update(`${scope}:${value}`).digest('hex');
  }

  private isSerializationConflict(error: unknown) {
    return error instanceof Prisma.PrismaClientKnownRequestError && ['P2002', 'P2034'].includes(error.code);
  }

  private block(): never {
    throw new LoginRateLimitedException();
  }
}
