// src/app/api/skills/route.ts
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { ok, withErrorHandler } from '@/lib/utils/api';

export const GET = withErrorHandler(async (req: NextRequest) => {
  const url = new URL(req.url);
  const category = url.searchParams.get('category') || undefined;

  const skills = await prisma.skill.findMany({
    where: category ? { category } : undefined,
    orderBy: [{ category: 'asc' }, { name: 'asc' }],
  });

  // Group by category for UI
  const grouped = skills.reduce((acc, skill) => {
    if (!acc[skill.category]) acc[skill.category] = [];
    acc[skill.category].push(skill);
    return acc;
  }, {} as Record<string, typeof skills>);

  return ok({ skills, grouped });
});
