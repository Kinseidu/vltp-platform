// src/app/api/applications/[id]/documents/route.ts
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getSession } from '@/lib/auth/jwt';
import { ok, created, error, unauthorized, forbidden, notFound, withErrorHandler } from '@/lib/utils/api';
import { audit } from '@/lib/services/audit.service';
import { storeFile } from '@/lib/services/storage.service';
import { getFileUrl, deleteFile } from '@/lib/services/storage.service';
import { DocumentType, UserRole } from '@prisma/client';

export const GET = withErrorHandler(async (req: NextRequest, { params }: { params: { id: string } }) => {
  const session = await getSession();
  if (!session) return unauthorized();

  const appId = parseInt(params.id);
  const documents = await prisma.applicationDocument.findMany({
    where: { applicationId: appId },
    orderBy: { uploadedAt: 'desc' },
  });

  // Attach secure URLs
  const docsWithUrls = documents.map(doc => ({
    ...doc,
    url: getFileUrl(doc.storagePath),
  }));

  return ok({ documents: docsWithUrls });
});

export const POST = withErrorHandler(async (req: NextRequest, { params }: { params: { id: string } }) => {
  const session = await getSession();
  if (!session || session.role !== UserRole.APPLICANT) return unauthorized();

  const appId = parseInt(params.id);

  // Verify ownership and check deadline
  const profile = await prisma.applicantProfile.findUnique({ where: { userId: session.id } });
  if (!profile) return error('Profile not found', 404);

  const application = await prisma.application.findUnique({
    where: { id: appId },
    include: { job: true },
  });

  if (!application) return notFound('Application not found');
  if (application.applicantId !== profile.id) return forbidden();

  // Deadline check
  if (application.job.applicationDeadline && new Date() > new Date(application.job.applicationDeadline)) {
    return error('The application deadline for this job has passed. No further documents can be uploaded.', 403);
  }

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

  return created({ document: { ...document, url: getFileUrl(document.storagePath) } }, 'Document uploaded successfully');
});

export const DELETE = withErrorHandler(async (req: NextRequest, { params }: { params: { id: string } }) => {
  const session = await getSession();
  if (!session || session.role !== UserRole.APPLICANT) return unauthorized();

  const appId = parseInt(params.id);
  const url = new URL(req.url);
  const docId = parseInt(url.searchParams.get('docId') || '');

  if (!docId) return error('Document ID required', 400);

  const application = await prisma.application.findUnique({
    where: { id: appId },
    include: { 
      job: true,
      applicant: { select: { userId: true } }
    },
  });

  if (!application) return notFound('Application not found');
  if (application.applicant.userId !== session.id) return forbidden();

  // Deadline check
  if (application.job.applicationDeadline && new Date() > new Date(application.job.applicationDeadline)) {
    return error('The application deadline for this job has passed. Documents cannot be removed.', 403);
  }

  const doc = await prisma.applicationDocument.findUnique({ where: { id: docId } });
  if (!doc || doc.applicationId !== appId) return notFound('Document not found');

  // Delete from storage and DB
  await deleteFile(doc.storagePath);
  await prisma.applicationDocument.delete({ where: { id: docId } });

  await audit({
    actorId: session.id,
    action: 'DOCUMENT_DELETED',
    entity: 'ApplicationDocument',
    entityId: docId,
    before: doc as any,
  });

  return ok(null, 'Document deleted successfully');
});
