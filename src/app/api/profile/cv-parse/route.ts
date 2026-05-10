import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getSession } from '@/lib/auth/jwt';
import { ok, error, unauthorized } from '@/lib/utils/api';
import { parseCV } from '@/lib/ai/cv-parser.service';
import { UserRole } from '@prisma/client';

export const POST = async (req: NextRequest) => {
  const session = await getSession();
  if (!session || session.role !== UserRole.APPLICANT) return unauthorized();

  const { docId } = await req.json();

  if (!docId) return error('docId required', 400);

  const document = await prisma.applicationDocument.findUnique({
    where: { id: docId },
    include: { application: { include: { applicant: { select: { userId: true } } } } },
  });

  if (!document) return error('Document not found', 404);
  if (document.application.applicant.userId !== session.id) return error('Forbidden', 403);

  const parsed = await parseCV(document.storagePath, document.mimeType);

  return ok({ parsed });
};
