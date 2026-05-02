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

    const jobs = await prisma.job.findMany({
      include: {
        postedBy: { select: { email: true } },
        _count: { select: { applications: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, data: { jobs } });
  } catch (error) {
    console.error('[Admin Jobs GET]', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
