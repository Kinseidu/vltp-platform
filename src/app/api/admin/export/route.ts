import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getSession } from '@/lib/auth/jwt';
import { unauthorized } from '@/lib/utils/api';
import { UserRole } from '@prisma/client';

function escapeCSV(value: string | null | undefined): string {
  if (!value) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || (session.role !== UserRole.ADMIN && session.role !== UserRole.HR_OFFICER)) {
      return unauthorized();
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') || 'applications';

    let csv = '';
    let filename = '';

    if (type === 'applicants') {
      const applicants = await prisma.applicantProfile.findMany({
        include: {
          user: { select: { email: true, phone: true } },
          community: { select: { name: true } },
        },
        orderBy: { fullName: 'asc' },
      });

      csv = [
        'Full Name,Email,Phone,Community,Verification Status,Joined',
        ...applicants.map(a =>
          [a.fullName, a.user.email, escapeCSV(a.user.phone), escapeCSV(a.community?.name), a.verificationStatus, a.createdAt.toISOString().split('T')[0]].join(',')
        ),
      ].join('\n');
      filename = 'applicants.csv';
    } else {
      const applications = await prisma.application.findMany({
        include: {
          applicant: { select: { fullName: true } },
          job: { select: { title: true } },
        },
        orderBy: { createdAt: 'desc' },
      });

      csv = [
        'Applicant,Job Title,Status,Submitted',
        ...applications.map(a =>
          [escapeCSV(a.applicant.fullName), escapeCSV(a.job.title), a.status, a.submittedAt?.toISOString().split('T')[0] || ''].join(',')
        ),
      ].join('\n');
      filename = 'applications.csv';
    }

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('[Export CSV]', error);
    return new NextResponse('Export failed', { status: 500 });
  }
}
