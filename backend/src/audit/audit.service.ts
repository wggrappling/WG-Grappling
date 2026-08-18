import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const forbiddenKeys = /(password|token|jwt|authorization|secret|database.?url|connection.?string)/i;

export function sanitizeAuditMetadata(value: unknown): Prisma.InputJsonValue | undefined {
  if (value === undefined || value === null) return undefined;
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeAuditMetadata(item) ?? null) as Prisma.InputJsonArray;
  }
  if (typeof value === 'object') {
    const sanitized: Record<string, Prisma.InputJsonValue> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      if (forbiddenKeys.test(key) || item === undefined) continue;
      const clean = sanitizeAuditMetadata(item);
      if (clean !== undefined) sanitized[key] = clean;
    }
    return sanitized;
  }
  if (['string', 'number', 'boolean'].includes(typeof value)) return value as string | number | boolean;
  return String(value);
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async record(input: { userId?: number; action: string; entity: string; entityId?: string; metadata?: unknown }) {
    try {
      return await this.prisma.auditLog.create({
        data: {
          userId: input.userId,
          action: input.action,
          entity: input.entity,
          entityId: input.entityId,
          metadata: sanitizeAuditMetadata(input.metadata),
        },
      });
    } catch {
      this.logger.warn('Falha ao registrar auditoria.');
      return null;
    }
  }

  async findAll(query: { entity?: string; action?: string; userId?: number; from?: Date; to?: Date; page: number; pageSize: number }) {
    const where: Prisma.AuditLogWhereInput = {
      ...(query.entity ? { entity: query.entity } : {}),
      ...(query.action ? { action: query.action } : {}),
      ...(query.userId ? { userId: query.userId } : {}),
      ...(query.from || query.to ? { createdAt: { gte: query.from, lte: query.to } } : {}),
    };
    const [total, data] = await this.prisma.$transaction([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        include: { user: { select: { id: true, name: true, email: true, role: true } } },
      }),
    ]);
    return { total, page: query.page, pageSize: query.pageSize, totalPages: Math.ceil(total / query.pageSize), data };
  }
}
