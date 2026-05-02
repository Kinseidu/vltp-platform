// src/app/api/applications/[id]/documents/route.ts
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getSession } from '@/lib/auth/jwt';
import { ok, created, error, unauthorized, forbidden, notFound, withErrorHandler } from '@/lib/utils/api';
import { audit } from '@/lib/services/audit.service';
import { storeFile } from '@/lib/services/storage.service';
import { DocumentType, UserRole } from '@prisma/client';

export const GET = withErrorHandler(async (req: NextRequest, { params }: { params: { id: string } }) => {
  const session = await getSession();
  if (!session) return unauthorized();

  const appId = parseInt(params.id);
  const documents = await prisma.applicationDocument.findMany({
    where: { applicationId: appId },
    orderBy: { uploadedAt: 'desc' },
  });

  return ok({ documents });
});

export const POST = withErrorHandler(async (req: NextRequest, { params }: { params: { id: string } }) => {
  const session = await getSession();
  if (!session || session.role !== UserRole.APPLICANT) return unauthorized();

  const appId = parseInt(params.id);

  // Verify ownership
  const profile = await prisma.applicantProfile.findUnique({ where: { userId: session.id } });
  if (!profile) return error('Profile not found', 404);

  const application = await prisma.application.findUnique({
    where: { id: appId },
    include: { job: { include: { requiredDocTypes: true } } },
  });

  if (!application) return notFound('Application not found');
  if (application.applicantId !== profile.id) return forbidden();

  // Parse multipart form
  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  const docTypeStr = formData.get('docType') as string | null;
  const label = formData.get('label') as string | null;

  if (!file) return error('No file provided', 400);
  if (!docTypeStr || !Object.values(DocumentType).includes(docTypeStr as DocumentType)) {
    return error('Invalid document type', 400);
  }

  const docType = docTypeStr as DocumentType;
  const buffer = Buffer.from(await file.arrayBuffer());

  const stored = await storeFile({
    buffer,
    originalName: file.name,
    mimeType: file.type,
    subDir: `applications/${appId}`,
  });

  const document = await prisma.applicationDocument.create({
    data: {
      applicationId: appId,
      docType,
      label: label || file.name,
      fileName: stored.fileName,
      originalName: stored.originalName,
      storagePath: stored.storagePath,
      fileSize: stored.fileSize,
      mimeType: stored.mimeType,
    },
  });

  await audit({
    actorId: session.id,
    action: 'DOCUMENT_UPLOADED',
    entity: 'ApplicationDocument',
    entityId: document.id,
    after: { applicationId: appId, docType, label: document.label } as any,
  });

  return created({ document }, 'Document uploaded successfully');
});
