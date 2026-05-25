import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getSession } from '@/lib/auth/jwt';
import { UserRole, NotificationType } from '@prisma/client';
import { audit } from '@/lib/services/audit.service';
import { ok, unauthorized, withErrorHandler } from '@/lib/utils/api';

export const POST = withErrorHandler(async (req: NextRequest) => {
  const session = await getSession();
  if (!session || session.role !== UserRole.ADMIN) {
    return unauthorized();
  }

  const { title, message, targetRole, targetCommunityId } = await req.json();

  const where: any = {};
  if (targetRole) where.role = targetRole;
  if (targetCommunityId) where.applicantProfile = { communityId: parseInt(targetCommunityId) };

  const targetUsers = await prisma.user.findMany({ where, select: { id: true } });

  if (targetUsers.length > 0) {
    await prisma.notification.createMany({
      data: targetUsers.map(u => ({
        userId: u.id,
        type: NotificationType.SYSTEM,
        title,
        message,
      }))
    });
  }

  await audit({
    actorId: session.id,
    action: 'ANNOUNCEMENT_SENT',
    entity: 'Notification',
    entityId: 'bulk',
    after: { targetCount: targetUsers.length, title, targetRole, targetCommunityId },
  });

  return ok({ sentCount: targetUsers.length });
});
