import { SetMetadata } from '@nestjs/common';

export const AUDIT_KEY = 'audit';

export type AuditDefinition = {
  action: string;
  entity: string;
  entityIdParam?: string;
};

export const Audit = (definition: AuditDefinition) => SetMetadata(AUDIT_KEY, definition);
