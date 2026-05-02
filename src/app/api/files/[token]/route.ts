import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/jwt';
import { prisma } from '@/lib/db/prisma';
import { readFile } from '@/lib/services/storage.service';
import { UserRole } from '@prisma/client';

export async function GET(req: NextRequest, { params }: { params: { token: string } }) {
  try {
    const session = await getSession();
    if (!session) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Decode the base64url token
    const decoded = Buffer.from(params.token, 'base64url').toString('utf-8');
    const parts = decoded.split(':');
    if (parts.length < 2) {
      return new NextResponse('Invalid token format', { status: 400 });
    }

    // Since storagePath could conceptually have a colon, we pop the timestamp 
    // and join the rest back as the storagePath
    parts.pop(); 
    const storagePath = parts.join(':');

    // Find the document in the DB
    const doc = await prisma.applicationDocument.findFirst({
      where: { storagePath }
    });

    if (!doc) {
      return new NextResponse('Document not found', { status: 404 });
    }

    // Role-based Access Control
    if (session.role === UserRole.APPLICANT) {
      // Must be their document
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
      // General safeguard for any other unhandled role
      return new NextResponse('Forbidden', { status: 403 });
    }

    // Read file buffer from disk
    const fileBuffer = await readFile(storagePath);
    
    // Serve the file inline
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': doc.mimeType,
        'Content-Disposition': `inline; filename="${doc.originalName}"`,
      }
    });

  } catch (error: any) {
    console.error('[Document Server] Error serving file:', error);

    if (error.code === 'ENOENT') {
      return new NextResponse('File missing from disk', { status: 404 });
    }

    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
