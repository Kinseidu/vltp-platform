// src/app/api/profile/experience/[id]/route.ts
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { getSession } from '@/lib/auth/jwt';
import { ok, unauthorized, notFound, withErrorHandler } from '@/lib/utils/api';
import { audit } from '@/lib/services/audit.service';
import { UserRole } from '@prisma/client';

const UpdateExperienceSchema = z.object({
  jobTitle: z.string().min(2).max(100).optional(),
  employer: z.string().min(2).max(100).optional(),
  industry: z.string().max(100).optional(),
  startDate: z.string().optional(),
  endDate: z.string().nullable().optional(),
  isCurrent: z.boolean().optional(),
  description: z.string().max(1000).optional(),
  location: z.string().max(100).optional(),
});

export const PUT = withErrorHandler(async (req: NextRequest, { params }: { params: { id: string } }) => {
  const session = await getSession();
  if (!session || session.role !== UserRole.APPLICANT) return unauthorized();

  const expId = parseInt(params.id);
  const profile = await prisma.applicantProfile.findUnique({ where: { userId: session.id } });
  if (!profile) return notFound();

  const existing = await prisma.workExperience.findFirst({
    where: { id: expId, applicantId: profile.id },
  });
  if (!existing) return notFound('Experience record not found');

  const body = UpdateExperienceSchema.parse(await req.json());

  const updated = await prisma.workExperience.update({
    where: { id: expId },
    data: {
      ...body,
      ...(body.startDate && { startDate: new Date(body.startDate) }),
      ...(body.endDate !== undefined && { endDate: body.endDate ? new Date(body.endDate) : null }),
    },
  });

  await audit({
    actorId: session.id,
    action: 'EXPERIENCE_UPDATED',
    entity: 'WorkExperience',
    entityId: expId,
    before: existing as any,
    after: body as any,
  });

  return ok({ experience: updated });
});

export const DELETE = withErrorHandler(async (req: NextRequest, { params }: { params: { id: string } }) => {
  const session = await getSession();
  if (!session || session.role !== UserRole.APPLICANT) return unauthorized();

  const expId = parseInt(params.id);
  const profile = await prisma.applicantProfile.findUnique({ where: { userId: session.id } });
  if (!profile) return notFound();

  const existing = await prisma.workExperience.findFirst({
    where: { id: expId, applicantId: profile.id },
  });
  if (!existing) return notFound('Experience record not found');

  await prisma.workExperience.delete({ where: { id: expId } });

  await audit({
    actorId: session.id,
    action: 'EXPERIENCE_REMOVED',
    entity: 'WorkExperience',
    entityId: expId,
    before: existing as any,
  });

  return ok(null, 'Experience removed');
});
