// src/app/api/profile/experience/route.ts
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { getSession } from '@/lib/auth/jwt';
import { ok, created, error, unauthorized, withErrorHandler } from '@/lib/utils/api';
import { audit } from '@/lib/services/audit.service';
import { UserRole } from '@prisma/client';

const AddExperienceSchema = z.object({
  jobTitle: z.string().min(2).max(100),
  employer: z.string().min(2).max(100),
  industry: z.string().max(100).optional(),
  startDate: z.string(),
  endDate: z.string().optional(),
  isCurrent: z.boolean().optional().default(false),
  description: z.string().max(1000).optional(),
  location: z.string().max(100).optional(),
});

export const GET = withErrorHandler(async (req: NextRequest) => {
  const session = await getSession();
  if (!session) return unauthorized();

  const profile = await prisma.applicantProfile.findUnique({ where: { userId: session.id } });
  if (!profile) return error('Profile not found', 404);

  const experiences = await prisma.workExperience.findMany({
    where: { applicantId: profile.id },
    orderBy: { startDate: 'desc' },
  });

  return ok({ experiences });
});

export const POST = withErrorHandler(async (req: NextRequest) => {
  const session = await getSession();
  if (!session || session.role !== UserRole.APPLICANT) return unauthorized();

  const body = AddExperienceSchema.parse(await req.json());

  const profile = await prisma.applicantProfile.findUnique({ where: { userId: session.id } });
  if (!profile) return error('Profile not found', 404);

  const experience = await prisma.workExperience.create({
    data: {
      applicantId: profile.id,
      jobTitle: body.jobTitle,
      employer: body.employer,
      industry: body.industry,
      startDate: new Date(body.startDate),
      endDate: body.endDate ? new Date(body.endDate) : null,
      isCurrent: body.isCurrent ?? false,
      description: body.description,
      location: body.location,
    },
  });

  await audit({
    actorId: session.id,
    action: 'EXPERIENCE_ADDED',
    entity: 'WorkExperience',
    entityId: experience.id,
    after: body as any,
  });

  return created({ experience });
});
