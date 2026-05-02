// src/app/api/ai/shortlist/override/[appId]/route.ts
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { getSession } from '@/lib/auth/jwt';
import { ok, forbidden, notFound, withErrorHandler } from '@/lib/utils/api';
import { audit } from '@/lib/services/audit.service';
import { UserRole } from '@prisma/client';

const OverrideSchema = z.object({
  include: z.boolean(),
  note: z.string().max(500).optional(),
});

export const PUT = withErrorHandler(async (req: NextRequest, { params }: { params: { appId: string } }) => {
  const session = await getSession();
  if (!session || (session.role !== UserRole.HR_OFFICER && session.role !== UserRole.ADMIN)) {
    return forbidden();
  }

  const appId = parseInt(params.appId);
  const body = OverrideSchema.parse(await req.json());

  const result = await prisma.shortlistResult.findUnique({ where: { applicationId: appId } });
  if (!result) return notFound('No shortlist result for this application');

  const updated = await prisma.shortlistResult.update({
    where: { applicationId: appId },
    data: {
      hrOverride: true,
      hrOverrideNote: body.note,
      hrOverrideBy: session.id,
    },
  });

  await audit({
    actorId: session.id,
    action: 'HR_SHORTLIST_OVERRIDE',
    entity: 'ShortlistResult',
    entityId: result.id,
    before: { hrOverride: result.hrOverride } as any,
    after: { include: body.include, note: body.note } as any,
  });

  return ok({ result: updated }, `Shortlist decision overridden by HR`);
});
