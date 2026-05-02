// src/app/api/notifications/route.ts
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { getSession } from '@/lib/auth/jwt';
import { ok, unauthorized, withErrorHandler } from '@/lib/utils/api';

export const GET = withErrorHandler(async (req: NextRequest) => {
  const session = await getSession();
  if (!session) return unauthorized();

  const url = new URL(req.url);
  const unreadOnly = url.searchParams.get('unread') === 'true';

  const notifications = await prisma.notification.findMany({
    where: { userId: session.id, ...(unreadOnly && { isRead: false }) },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  const unreadCount = await prisma.notification.count({
    where: { userId: session.id, isRead: false },
  });

  return ok({ notifications, unreadCount });
});

// Mark notifications as read
const MarkReadSchema = z.object({
  ids: z.array(z.number()).optional(), // if omitted, mark all
});

export const PUT = withErrorHandler(async (req: NextRequest) => {
  const session = await getSession();
  if (!session) return unauthorized();

  const body = MarkReadSchema.parse(await req.json());

  await prisma.notification.updateMany({
    where: {
      userId: session.id,
      ...(body.ids ? { id: { in: body.ids } } : {}),
    },
    data: { isRead: true },
  });

  return ok(null, 'Notifications marked as read');
});
