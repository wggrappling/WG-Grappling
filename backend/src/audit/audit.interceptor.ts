import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, tap } from 'rxjs';
import { AUDIT_KEY, AuditDefinition } from './audit.decorator';
import { AuditService } from './audit.service';

const secretKey = /(password|token|jwt|authorization|secret|database.?url|connection.?string)/i;
const detailKeys = new Set(['status', 'type', 'method', 'belt', 'planId', 'modalityId', 'classId', 'studentId', 'amount', 'paidAt', 'attendanceDate']);

function auditMetadata(body: Record<string, unknown> | undefined) {
  const entries = Object.entries(body ?? {}).filter(([key]) => !secretKey.test(key));
  const details = Object.fromEntries(entries.filter(([key, value]) => detailKeys.has(key) && ['string', 'number', 'boolean'].includes(typeof value)));
  return { changedFields: entries.map(([key]) => key), ...(Object.keys(details).length ? { details } : {}) };
}

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector, private readonly auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const definition = this.reflector.getAllAndOverride<AuditDefinition>(AUDIT_KEY, [context.getHandler(), context.getClass()]);
    if (!definition) return next.handle();
    const request = context.switchToHttp().getRequest();
    return next.handle().pipe(tap((result) => {
      const userId = request.user?.id ?? result?.user?.id;
      const rawId = definition.entityIdParam
        ? request.params?.[definition.entityIdParam]
        : (result?.id ?? result?.user?.id ?? result?.student?.id ?? result?.data?.studentId);
      void this.auditService.record({
        userId,
        action: definition.action,
        entity: definition.entity,
        entityId: rawId === undefined || rawId === null ? undefined : String(rawId),
        metadata: auditMetadata(request.body),
      });
    }));
  }
}
