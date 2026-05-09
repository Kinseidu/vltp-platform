// src/lib/services/audit.service.ts
// Immutable audit trail for all critical platform actions

import { prisma } from '@/lib/db/prisma';

export type AuditAction =
  | 'USER_REGISTERED'
  | 'USER_LOGIN'
  | 'USER_LOGOUT'
  | 'PROFILE_UPDATED'
  | 'SKILL_ADDED' | 'SKILL_UPDATED' | 'SKILL_REMOVED'
  | 'EXPERIENCE_ADDED' | 'EXPERIENCE_UPDATED' | 'EXPERIENCE_REMOVED'
  | 'VERIFICATION_REQUESTED'
  | 'VERIFICATION_YOUTH_APPROVED' | 'VERIFICATION_YOUTH_REJECTED'
  | 'VERIFICATION_CHIEF_CONFIRMED' | 'VERIFICATION_CHIEF_REJECTED'
  | 'VERIFICATION_COMPLETED'
  | 'JOB_POSTED' | 'JOB_UPDATED' | 'JOB_STATUS_CHANGED' | 'JOB_DELETED'
  | 'APPLICATION_SUBMITTED' | 'APPLICATION_STATUS_UPDATED'
  | 'DOCUMENT_UPLOADED' | 'DOCUMENT_DELETED'
  | 'AI_SHORTLIST_GENERATED'
  | 'HR_SHORTLIST_OVERRIDE'
  | 'INTERVIEW_QUESTIONS_GENERATED'
  | 'INTERVIEW_PACK_EXPORTED'
  | 'INTERVIEW_INVITATION_SENT'
  | 'ANNOUNCEMENT_SENT'
  | 'USER_ROLE_CHANGED' | 'USER_DEACTIVATED' | 'USER_PASSWORD_RESET' | 'USER_UPDATED' | 'USER_DELETED'
  | 'COMMUNITY_CREATED' | 'COMMUNITY_UPDATED' | 'COMMUNITY_DELETED'
  | 'SYSTEM_SETTINGS_UPDATED';

interface AuditLogParams {
  actorId: string;
  action: AuditAction;
  entity: string;
  entityId: string | number;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Log an auditable action. Fire-and-forget — never throws,
 * so audit failures never break the main flow.
 */
export async function audit(params: AuditLogParams): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: params.actorId,
        action: params.action,
        entity: params.entity,
        entityId: String(params.entityId),
        before: params.before ? (params.before as any) : undefined,
        after: params.after ? (params.after as any) : undefined,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
      },
    });
  } catch (err) {
    // Log to console but never surface audit errors to callers
    console.error('[AuditLog] Failed to write audit entry:', err);
  }
}

/**
 * Fetch paginated audit logs (admin only).
 */
export async function getAuditLogs(params: {
  page?: number;
  pageSize?: number;
  actorId?: string;
  entity?: string;
  action?: string;
}) {
  const { page = 1, pageSize = 50, actorId, entity, action } = params;

  const where = {
    ...(actorId && { actorId }),
    ...(entity && { entity }),
    ...(action && { action }),
  };

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: { actor: { select: { email: true, role: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return { logs, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}
