import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getSession } from '@/lib/auth/jwt';
import { UserRole } from '@prisma/client';
import { audit } from '@/lib/services/audit.service';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSession();
    if (!session || session.role !== UserRole.ADMIN) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { youthPresidentId } = await req.json();
    const communityId = parseInt(params.id);

    // If assigning a new YP, we must ensure they are actually a YOUTH_PRESIDENT role.
    if (youthPresidentId) {
      const ypUser = await prisma.user.findUnique({ where: { id: youthPresidentId } });
      if (!ypUser || ypUser.role !== UserRole.YOUTH_PRESIDENT) {
        return new NextResponse('User is not a valid Youth President', { status: 400 });
      }

      // Check if this YP is already assigned to another community
      const existing = await prisma.community.findFirst({ where: { youthPresidentId } });
      if (existing && existing.id !== communityId) {
        return new NextResponse('Youth President is already assigned to another community', { status: 400 });
      }
    }

    const community = await prisma.community.update({
      where: { id: communityId },
      data: { youthPresidentId: youthPresidentId || null },
    });

    await audit({
      actorId: session.id,
      action: 'COMMUNITY_YP_ASSIGNED',
      entity: 'Community',
      entityId: communityId,
      after: { youthPresidentId },
    });

    return NextResponse.json({ success: true, data: { community } });
  } catch (error) {
    console.error('[Admin Community YP PUT]', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
