import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getSession } from '@/lib/auth/jwt';
import { UserRole } from '@prisma/client';
import { audit } from '@/lib/services/audit.service';
import { unauthorized, notFound, serverError, error as apiError } from '@/lib/utils/api';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSession();
    if (!session || session.role !== UserRole.ADMIN) {
      return unauthorized();
    }

    const body = await req.json();
    const { role, isActive } = body;

    const user = await prisma.user.findUnique({ where: { id: params.id } });
    if (!user) return notFound('User not found');

    const updateData: any = {};
    if (role) updateData.role = role;
    if (isActive !== undefined) updateData.isActive = isActive;

    const updatedUser = await prisma.user.update({
      where: { id: params.id },
      data: updateData,
      select: { id: true, email: true, role: true, isActive: true }
    });

    await audit({
      actorId: session.id,
      action: 'USER_UPDATED',
      entity: 'User',
      entityId: params.id,
      before: { role: user.role, isActive: user.isActive },
      after: { role: updatedUser.role, isActive: updatedUser.isActive }
    });

    return NextResponse.json({ success: true, data: { user: updatedUser } });
  } catch (error) {
    console.error('[Admin Users PUT]', error);
    return serverError();
  }
}
