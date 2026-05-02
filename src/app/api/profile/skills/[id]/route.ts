// src/app/api/profile/skills/[id]/route.ts
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { getSession } from '@/lib/auth/jwt';
import { ok, unauthorized, notFound, forbidden, withErrorHandler } from '@/lib/utils/api';
import { audit } from '@/lib/services/audit.service';
import { SkillProficiency, UserRole } from '@prisma/client';

const UpdateSkillSchema = z.object({
  yearsOfExp: z.number().int().min(0).max(50).optional(),
  proficiency: z.nativeEnum(SkillProficiency).optional(),
  notes: z.string().max(200).optional(),
});

async function getOwnedSkill(session: { id: string; role: string }, skillId: number) {
  const profile = await prisma.applicantProfile.findUnique({ where: { userId: session.id } });
  if (!profile) return null;
  return prisma.applicantSkill.findFirst({
    where: { id: skillId, applicantId: profile.id },
    include: { skill: true },
  });
}

export const PUT = withErrorHandler(async (req: NextRequest, { params }: { params: { id: string } }) => {
  const session = await getSession();
  if (!session || session.role !== UserRole.APPLICANT) return unauthorized();

  const skillId = parseInt(params.id);
  const existing = await getOwnedSkill(session, skillId);
  if (!existing) return notFound('Skill not found on your profile');

  const body = UpdateSkillSchema.parse(await req.json());

  const updated = await prisma.applicantSkill.update({
    where: { id: skillId },
    data: body,
    include: { skill: true },
  });

  await audit({
    actorId: session.id,
    action: 'SKILL_UPDATED',
    entity: 'ApplicantSkill',
    entityId: skillId,
    before: existing as any,
    after: body as any,
  });

  return ok({ skill: updated });
});

export const DELETE = withErrorHandler(async (req: NextRequest, { params }: { params: { id: string } }) => {
  const session = await getSession();
  if (!session || session.role !== UserRole.APPLICANT) return unauthorized();

  const skillId = parseInt(params.id);
  const existing = await getOwnedSkill(session, skillId);
  if (!existing) return notFound('Skill not found on your profile');

  await prisma.applicantSkill.delete({ where: { id: skillId } });

  await audit({
    actorId: session.id,
    action: 'SKILL_REMOVED',
    entity: 'ApplicantSkill',
    entityId: skillId,
    before: existing as any,
  });

  return ok(null, 'Skill removed');
});
