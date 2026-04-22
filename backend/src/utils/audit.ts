import { logger } from './logger';

export interface AuditContext {
  event: string;
  entity: 'order' | 'address' | 'cart' | 'product';
  entityId: number | string | null;
  details?: Record<string, unknown>;
}

export function audit(ctx: AuditContext): void {
  logger.info(`audit:${ctx.event}`, {
    audit: true,
    entity: ctx.entity,
    entityId: ctx.entityId,
    ...ctx.details,
  });
}
