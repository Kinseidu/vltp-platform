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

    const roles = await prisma.user.groupBy({
      by: ['role'],
      _count: { id: true },
    });

    const verifications = await prisma.applicantProfile.groupBy({
      by: ['verificationStatus'],
      _count: { id: true },
    });

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const userRegistrations = await prisma.user.findMany({
      where: { createdAt: { gte: thirtyDaysAgo } },
      select: { createdAt: true, role: true },
      orderBy: { createdAt: 'asc' },
    });

    const applicationsByMonth = await prisma.application.findMany({
      where: { createdAt: { gte: thirtyDaysAgo } },
      select: { createdAt: true, status: true },
      orderBy: { createdAt: 'asc' },
    });

    const jobsByStatus = await prisma.job.groupBy({
      by: ['status'],
      _count: { id: true },
    });

    const communityStats = await prisma.applicantProfile.groupBy({
      by: ['communityId', 'verificationStatus'],
      _count: { id: true },
    });

    const communities = await prisma.community.findMany({
      where: { id: { in: communityStats.map(c => c.communityId).filter(Boolean) } },
      select: { id: true, name: true },
    });

    const communityMap: Record<number, string> = {};
    communities.forEach(c => { communityMap[c.id] = c.name; });

    return NextResponse.json({
      success: true,
      data: {
        overview: { totalUsers, totalJobs, totalApplications },
        roles,
        verifications,
        jobsByStatus,
        userRegistrations: userRegistrations.map(u => ({
          date: u.createdAt.toISOString().split('T')[0],
          role: u.role,
        })),
        applicationsByMonth: applicationsByMonth.map(a => ({
          date: a.createdAt.toISOString().split('T')[0],
          status: a.status,
        })),
        communityBreakdown: communityStats
          .filter(c => c.communityId)
          .map(c => ({
            community: communityMap[c.communityId] || 'Unknown',
            status: c.verificationStatus,
            count: c._count.id,
          })),
      }
    });
  } catch (error) {
    console.error('[Admin Reports GET]', error);
    return serverError();
  }
}
