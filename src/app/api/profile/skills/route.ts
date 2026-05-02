// src/app/api/profile/skills/route.ts
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { getSession } from '@/lib/auth/jwt';
import { ok, created, error, unauthorized, withErrorHandler } from '@/lib/utils/api';
import { audit } from '@/lib/services/audit.service';
import { UserRole, SkillProficiency } from '@prisma/client';

const AddSkillSchema = z.object({
  skillId: z.number().int().positive(),
  yearsOfExp: z.number().int().min(0).max(50),
  proficiency: z.nativeEnum(SkillProficiency),
  notes: z.string().max(200).optional(),
});

export const GET = withErrorHandler(async (req: NextRequest) => {
  const session = await getSession();
  if (!session) return unauthorized();

  const profile = await prisma.applicantProfile.findUnique({ where: { userId: session.id } });
  if (!profile) return error('Profile not found', 404);

  const skills = await prisma.applicantSkill.findMany({
    where: { applicantId: profile.id },
    include: { skill: true },
    orderBy: { yearsOfExp: 'desc' },
  });

  return ok({ skills });
});

export const POST = withErrorHandler(async (req: NextRequest) => {
  const session = await getSession();
  if (!session || session.role !== UserRole.APPLICANT) return unauthorized();

  const body = AddSkillSchema.parse(await req.json());

  const profile = await prisma.applicantProfile.findUnique({ where: { userId: session.id } });
  if (!profile) return error('Profile not found', 404);

  const skill = await prisma.skill.findUnique({ where: { id: body.skillId } });
  if (!skill) return error('Skill not found', 404);

  // Check for duplicate
  const existing = await prisma.applicantSkill.findUnique({
    where: { applicantId_skillId: { applicantId: profile.id, skillId: body.skillId } },
  });
  if (existing) return error('You have already added this skill. Use PUT to update it.', 409);

  const applicantSkill = await prisma.applicantSkill.create({
    data: {
      applicantId: profile.id,
      skillId: body.skillId,
      yearsOfExp: body.yearsOfExp,
      proficiency: body.proficiency,
      notes: body.notes,
    },
    include: { skill: true },
  });

  await audit({
    actorId: session.id,
    action: 'SKILL_ADDED',
    entity: 'ApplicantSkill',
    entityId: applicantSkill.id,
    after: body as any,
  });

  return created({ skill: applicantSkill });
});
