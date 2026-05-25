import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/jwt';
import { prisma } from '@/lib/db/prisma';
import { readFile } from '@/lib/services/storage.service';
import { UserRole } from '@prisma/client';
import { withErrorHandler } from '@/lib/utils/api';

export const GET = withErrorHandler(async (req: NextRequest, { params }: { params: { token: string } }) => {
  const session = await getSession();
  if (!session) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const decoded = Buffer.from(params.token, 'base64url').toString('utf-8');
  const parts = decoded.split(':');
  if (parts.length < 2) {
    return new NextResponse('Invalid token format', { status: 400 });
  }

  parts.pop(); 
  const storagePath = parts.join(':');

  const doc = await prisma.applicationDocument.findFirst({
    where: { storagePath }
  });

  if (!doc) {
    return new NextResponse('Document not found', { status: 404 });
  }

  if (session.role === UserRole.APPLICANT) {
    const application = await prisma.application.findUnique({
      where: { id: doc.applicationId },
      select: { applicant: { select: { userId: true } } }
    });
    if (application?.applicant.userId !== session.id) {
      return new NextResponse('Forbidden', { status: 403 });
    }
  } else if (
    session.role !== UserRole.HR_OFFICER && 
    session.role !== UserRole.ADMIN && 
    session.role !== UserRole.CHIEF_STAFF && 
    session.role !== UserRole.YOUTH_PRESIDENT
  ) {
    return new NextResponse('Forbidden', { status: 403 });
  }

  const fileBuffer = await readFile(storagePath);

  return new NextResponse(new Uint8Array(fileBuffer), {
    headers: {
      'Content-Type': doc.mimeType,
      'Content-Disposition': `inline; filename="${doc.originalName}"`,
    }
  });
});
