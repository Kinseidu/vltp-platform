import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getSession } from '@/lib/auth/jwt';
import { UserRole } from '@prisma/client';
import { unauthorized, serverError } from '@/lib/utils/api';

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== UserRole.ADMIN) {
      return unauthorized();
    }

    const totalUsers = await prisma.user.count();
    const totalJobs = await prisma.job.count();
    const totalApplications = await prisma.application.count();
    
    // Additional analytics like registrations over time
    const recentUsers = await prisma.user.groupBy({
      by: ['role'],
      _count: { id: true },
    });

    const verificationStats = await prisma.applicantProfile.groupBy({
      by: ['verificationStatus'],
      _count: { id: true },
    });

    return NextResponse.json({ 
      success: true, 
      data: { 
        overview: { totalUsers, totalJobs, totalApplications },
        roles: recentUsers,
        verifications: verificationStats
      } 
    });
  } catch (error) {
    console.error('[Admin Reports GET]', error);
    return serverError();
  }
}
