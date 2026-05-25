import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getSession } from '@/lib/auth/jwt';
import { UserRole } from '@prisma/client';
import { audit } from '@/lib/services/audit.service';
import { ok, unauthorized, withErrorHandler } from '@/lib/utils/api';

export const GET = withErrorHandler(async () => {
  const session = await getSession();
  if (!session || session.role !== UserRole.ADMIN) {
    return unauthorized();
  }

  const settings = await prisma.systemSetting.findMany();
  return ok({ settings });
});

export const PUT = withErrorHandler(async (req: NextRequest) => {
  const session = await getSession();
  if (!session || session.role !== UserRole.ADMIN) {
    return unauthorized();
  }

  const { settings } = await req.json();

  const updatePromises = Object.entries(settings).map(([key, value]) => 
    prisma.systemSetting.upsert({
      where: { key },
      update: { value: String(value), updatedBy: session.id },
      create: { key, value: String(value), updatedBy: session.id }
    })
  );

  await Promise.all(updatePromises);

  await audit({
    actorId: session.id,
    action: 'SYSTEM_SETTINGS_UPDATED',
    entity: 'SystemSetting',
    entityId: 'global',
    after: settings,
  });

  return ok(null, 'Settings updated');
});
