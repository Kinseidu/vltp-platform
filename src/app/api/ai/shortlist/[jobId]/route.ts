// src/app/api/ai/shortlist/[jobId]/route.ts
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getSession } from '@/lib/auth/jwt';
import { ok, created, forbidden, notFound, error, withErrorHandler } from '@/lib/utils/api';
import { audit } from '@/lib/services/audit.service';
import { generateShortlist } from '@/lib/ai/ai.service';
import { UserRole } from '@prisma/client';

// GET: Fetch existing shortlist for a job
export const GET = withErrorHandler(async (req: NextRequest, { params }: { params: { jobId: string } }) => {
  const session = await getSession();
  if (!session || (session.role !== UserRole.HR_OFFICER && session.role !== UserRole.ADMIN)) {
    return forbidden();
  }

  const jobId = parseInt(params.jobId);
  const results = await prisma.shortlistResult.findMany({
    where: { application: { jobId } },
    include: {
      application: {
        include: {
          applicant: {
            include: {
              community: true,
              skills: { include: { skill: true } },
              workExperiences: true,
            },
          },
          documents: true,
        },
      },
    },
    orderBy: { matchScore: 'desc' },
  });

  return ok({ results, total: results.length });
});

// POST: Generate new AI shortlist for a job
export const POST = withErrorHandler(async (req: NextRequest, { params }: { params: { jobId: string } }) => {
  const session = await getSession();
  if (!session || (session.role !== UserRole.HR_OFFICER && session.role !== UserRole.ADMIN)) {
    return forbidden();
  }

  const jobId = parseInt(params.jobId);

  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: {
      requirements: { include: { skill: true } },
      eligibleCommunities: { include: { community: true } },
      requiredDocTypes: true,
      postedBy: { select: { id: true, email: true } },
      _count: { select: { applications: true } },
    },
  });

  if (!job) return notFound('Job not found');

  const rawApplications = await prisma.application.findMany({
    where: { jobId },
    include: {
      applicant: {
        include: {
          user: { select: { id: true, email: true, phone: true } },
          community: true,
          skills: { include: { skill: true } },
          workExperiences: true,
          verificationRequest: true,
        },
      },
      documents: true,
      shortlistResult: true,
    },
  });

  if (rawApplications.length === 0) {
    return error('No applications found for this job', 404);
  }

  // Generate shortlist (hard filter + AI ranking)
  const shortlistResults = await generateShortlist(job as any, rawApplications as any);

  // Persist results — upsert so re-running overwrites
  const saved = await Promise.all(
    shortlistResults.map(result =>
      prisma.shortlistResult.upsert({
        where: { applicationId: result.applicationId },
        update: {
          matchScore: result.matchScore,
          eligibilityStatus: result.eligibilityStatus,
          skillsMatchScore: result.skillsMatchScore,
          experienceScore: result.experienceScore,
          certsScore: result.certsScore,
          roleRelevanceScore: result.roleRelevanceScore,
          reasons: result.reasons as any,
          missingRequirements: result.missingRequirements as any,
          evidenceExtracted: result.evidenceExtracted as any,
          hrOverride: false,
          hrOverrideNote: null,
          hrOverrideBy: null,
        },
        create: {
          applicationId: result.applicationId,
          matchScore: result.matchScore,
          eligibilityStatus: result.eligibilityStatus,
          skillsMatchScore: result.skillsMatchScore,
          experienceScore: result.experienceScore,
          certsScore: result.certsScore,
          roleRelevanceScore: result.roleRelevanceScore,
          reasons: result.reasons as any,
          missingRequirements: result.missingRequirements as any,
          evidenceExtracted: result.evidenceExtracted as any,
        },
      })
    )
  );

  await audit({
    actorId: session.id,
    action: 'AI_SHORTLIST_GENERATED',
    entity: 'Job',
    entityId: jobId,
    after: { applicantsProcessed: shortlistResults.length } as any,
  });

  return created({
    shortlist: shortlistResults,
    summary: {
      total: shortlistResults.length,
      eligible: shortlistResults.filter(r => r.eligibilityStatus === 'ELIGIBLE').length,
      ineligible: shortlistResults.filter(r => r.eligibilityStatus !== 'ELIGIBLE').length,
    },
  });
});
