// src/lib/services/matching.service.ts
// Rule-based job-to-applicant matching engine
// Runs when a job is posted; determines which verified applicants are eligible

import { prisma } from '@/lib/db/prisma';
import { VerificationStatus } from '@prisma/client';
import { notifyJobMatch } from './notification.service';

/**
 * Find all verified applicants who match a given job.
 * Matching criteria:
 *   1. Applicant is fully VERIFIED
 *   2. Applicant's community is in the job's eligible communities
 *   3. Applicant meets minimum experience (years of exp across all skills)
 *   4. Applicant has at least one mandatory skill
 */
export async function findMatchingApplicants(jobId: number): Promise<{
  applicantId: number;
  userId: string;
  matchReasons: string[];
}[]> {
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: {
      requirements: { include: { skill: true } },
      eligibleCommunities: { include: { community: true } },
    },
  });

  if (!job) throw new Error(`Job ${jobId} not found`);

  const eligibleCommunityIds = job.eligibleCommunities.map(ec => ec.communityId);
  const mandatorySkillIds = job.requirements
    .filter(r => r.isMandatory)
    .map(r => r.skillId);

  // Fetch all verified applicants in eligible communities
  const candidates = await prisma.applicantProfile.findMany({
    where: {
      verificationStatus: VerificationStatus.VERIFIED,
      communityId: { in: eligibleCommunityIds },
    },
    include: {
      user: { select: { id: true } },
      skills: { include: { skill: true } },
      workExperiences: true,
    },
  });

  const matches: { applicantId: number; userId: string; matchReasons: string[] }[] = [];

  for (const candidate of candidates) {
    const reasons: string[] = [];

    // Check mandatory skills
    const candidateSkillIds = candidate.skills.map(s => s.skillId);
    const hasAllMandatory = mandatorySkillIds.every(id => candidateSkillIds.includes(id));

    if (!hasAllMandatory) continue;

    // Check minimum experience
    const totalYears = Math.max(...candidate.skills.map(s => s.yearsOfExp), 0);
    if (totalYears < job.minExperience) continue;

    // Build match reasons
    const matchingSkills = candidate.skills.filter(cs =>
      job.requirements.some(jr => jr.skillId === cs.skillId)
    );
    if (matchingSkills.length > 0) {
      reasons.push(`Matches ${matchingSkills.length} of ${job.requirements.length} required skills`);
    }
    if (totalYears >= job.minExperience) {
      reasons.push(`Has ${totalYears} years of relevant experience (minimum: ${job.minExperience})`);
    }
    reasons.push('Verified community member in eligible community');

    matches.push({
      applicantId: candidate.id,
      userId: candidate.user.id,
      matchReasons: reasons,
    });
  }

  return matches;
}

/**
 * Run job matching and send alerts to matched applicants.
 * Called after a job is posted or updated to OPEN.
 */
export async function runJobMatchingAndNotify(jobId: number, jobTitle: string): Promise<number> {
  const matches = await findMatchingApplicants(jobId);

  // Notify each matched applicant
  await Promise.allSettled(
    matches.map(m => notifyJobMatch(m.userId, jobTitle, jobId))
  );

  return matches.length;
}

/**
 * Get matched jobs for a specific applicant.
 */
export async function getMatchedJobsForApplicant(applicantId: number) {
  const profile = await prisma.applicantProfile.findUnique({
    where: { id: applicantId },
    include: {
      skills: true,
      community: true,
    },
  });

  if (!profile || profile.verificationStatus !== VerificationStatus.VERIFIED) {
    return [];
  }

  const applicantSkillIds = profile.skills.map(s => s.skillId);
  const maxYears = Math.max(...profile.skills.map(s => s.yearsOfExp), 0);

  return prisma.job.findMany({
    where: {
      status: 'OPEN',
      minExperience: { lte: maxYears },
      eligibleCommunities: {
        some: { communityId: profile.communityId },
      },
      requirements: {
        some: { skillId: { in: applicantSkillIds } },
      },
    },
    include: {
      requirements: { include: { skill: true } },
      eligibleCommunities: { include: { community: true } },
      requiredDocTypes: true,
      _count: { select: { applications: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}
