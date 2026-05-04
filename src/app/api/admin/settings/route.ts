import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getSession } from '@/lib/auth/jwt';
import { UserRole } from '@prisma/client';
import { audit } from '@/lib/services/audit.service';
import { unauthorized, serverError } from '@/lib/utils/api';

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== UserRole.ADMIN) {
      return unauthorized();
    }

    const settings = await prisma.systemSetting.findMany();
    return NextResponse.json({ success: true, data: { settings } });
  } catch (error) {
    console.error('[Admin Settings GET]', error);
    return serverError();
  }
}

export async function PUT(req: NextRequest) {
  try {
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

    return NextResponse.json({ success: true, message: 'Settings updated' });
  } catch (error) {
    console.error('[Admin Settings PUT]', error);
    return serverError();
  }
}
