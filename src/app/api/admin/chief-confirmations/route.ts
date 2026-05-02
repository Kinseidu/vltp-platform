import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getSession } from '@/lib/auth/jwt';
import { UserRole } from '@prisma/client';

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== UserRole.ADMIN) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const logs = await prisma.chiefConfirmation.findMany({
      include: {
        confirmingStaff: { select: { email: true } },
        request: {
          include: {
            applicant: { select: { fullName: true, community: { select: { name: true } } } }
          }
        }
      },
      orderBy: { confirmedAt: 'desc' },
      take: 50,
    });

    return NextResponse.json({ success: true, data: { logs } });
  } catch (error) {
    console.error('[Admin ChiefConfirmations GET]', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
