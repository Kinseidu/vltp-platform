// src/types/index.ts
// Shared TypeScript types for the Verified Local Talent Platform

import {
  User, ApplicantProfile, Community, Skill, Job, Application,
  ApplicationDocument, ShortlistResult, InterviewQuestion,
  UserRole, VerificationStatus, ApplicationStatus, JobStatus,
  DocumentType, QuestionType, EligibilityStatus, SkillProficiency
} from '@prisma/client';

// Re-export Prisma enums for convenience
export {
  UserRole, VerificationStatus, ApplicationStatus, JobStatus,
  DocumentType, QuestionType, EligibilityStatus, SkillProficiency
};

// ─── AUTH ─────────────────────────────────────────────────────────────────────

export interface JWTPayload {
  sub: string;       // user id
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

export interface SessionUser {
  id: string;
  email: string;
  role: UserRole;
  applicantProfileId?: number;
}

// ─── API RESPONSE WRAPPERS ────────────────────────────────────────────────────

export interface ApiSuccess<T> {
  success: true;
  data: T;
  message?: string;
}

export interface ApiError {
  success: false;
  error: string;
  details?: Record<string, string[]>;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

// ─── APPLICANT ────────────────────────────────────────────────────────────────

export type ApplicantProfileWithDetails = ApplicantProfile & {
  user: Pick<User, 'id' | 'email' | 'phone'>;
  community: Community;
  skills: ApplicantSkillWithSkill[];
  workExperiences: WorkExperienceRecord[];
  verificationRequest?: VerificationRequestWithDetails | null;
};

export type ApplicantSkillWithSkill = {
  id: number;
  skillId: number;
  yearsOfExp: number;
  proficiency: SkillProficiency;
  notes: string | null;
  skill: Skill;
};

export type WorkExperienceRecord = {
  id: number;
  jobTitle: string;
  employer: string;
  industry: string | null;
  startDate: Date;
  endDate: Date | null;
  isCurrent: boolean;
  description: string | null;
  location: string | null;
};

// ─── VERIFICATION ─────────────────────────────────────────────────────────────

export type VerificationRequestWithDetails = {
  id: number;
  status: VerificationStatus;
  submittedAt: Date;
  resolvedAt: Date | null;
  notes: string | null;
  youthVerification?: {
    id: number;
    decision: VerificationStatus;
    notes: string | null;
    decisionAt: Date;
    youthPresident: Pick<User, 'id' | 'email'>;
  } | null;
  chiefConfirmation?: {
    id: number;
    status: VerificationStatus;
    chiefName: string;
    notes: string | null;
    confirmedAt: Date;
    confirmingStaff: Pick<User, 'id' | 'email'>;
  } | null;
};

// ─── JOBS ─────────────────────────────────────────────────────────────────────

export type JobWithDetails = Job & {
  postedBy: Pick<User, 'id' | 'email'>;
  requirements: JobRequirementWithSkill[];
  eligibleCommunities: { community: Community }[];
  requiredDocTypes: JobRequiredDocumentRecord[];
  _count: { applications: number };
};

export type JobRequirementWithSkill = {
  id: number;
  skillId: number;
  isMandatory: boolean;
  minYears: number;
  skill: Skill;
};

export type JobRequiredDocumentRecord = {
  id: number;
  docType: DocumentType;
  label: string;
  required: boolean;
};

// ─── APPLICATIONS ─────────────────────────────────────────────────────────────

export type ApplicationWithDetails = Application & {
  job: Pick<Job, 'id' | 'title' | 'status'>;
  applicant: ApplicantProfileWithDetails;
  documents: ApplicationDocument[];
  shortlistResult?: ShortlistResult | null;
};

// ─── AI SHORTLISTING ─────────────────────────────────────────────────────────

export interface ShortlistInput {
  job: JobWithDetails;
  applications: ApplicationWithDetails[];
}

export interface ShortlistCandidateResult {
  applicationId: number;
  applicantName: string;
  matchScore: number;
  eligibilityStatus: EligibilityStatus;
  skillsMatchScore: number;
  experienceScore: number;
  certsScore: number;
  roleRelevanceScore: number;
  reasons: string[];
  missingRequirements: string[];
  evidenceExtracted: Record<string, string>;
}

export interface ShortlistResponse {
  jobId: number;
  jobTitle: string;
  totalApplicants: number;
  eligibleCount: number;
  results: ShortlistCandidateResult[];
  generatedAt: string;
}

// ─── INTERVIEW QUESTIONS ──────────────────────────────────────────────────────

export interface InterviewQuestionInput {
  job: JobWithDetails;
  application: ApplicationWithDetails;
}

export interface GeneratedQuestion {
  type: QuestionType;
  question: string;
  rubric?: string;
  mappedTo?: string;
}

export interface GeneratedQuestionPack {
  applicationId: number;
  applicantName: string;
  jobTitle: string;
  questions: GeneratedQuestion[];
  generatedAt: string;
}

// ─── FORMS (request bodies) ───────────────────────────────────────────────────

export interface RegisterBody {
  fullName: string;
  email: string;
  phone?: string;
  password: string;
  communityId: number;
}

export interface LoginBody {
  email: string;
  password: string;
}

export interface AddSkillBody {
  skillId: number;
  yearsOfExp: number;
  proficiency: SkillProficiency;
  notes?: string;
}

export interface AddExperienceBody {
  jobTitle: string;
  employer: string;
  industry?: string;
  startDate: string;
  endDate?: string;
  isCurrent?: boolean;
  description?: string;
  location?: string;
}

export interface PostJobBody {
  title: string;
  description: string;
  scope: string;
  responsibilities: string;
  minExperience: number;
  applicationDeadline?: string;
  requirements: { skillId: number; isMandatory: boolean; minYears: number }[];
  eligibleCommunityIds: number[];
  requiredDocTypes: { docType: DocumentType; label: string; required: boolean }[];
}

export interface SubmitApplicationBody {
  jobId: number;
  coverNote?: string;
}

export interface YouthDecisionBody {
  decision: 'APPROVE' | 'REJECT';
  notes?: string;
}

export interface ChiefConfirmBody {
  chiefName: string;
  status: 'CONFIRM' | 'REJECT';
  notes?: string;
}

export interface HROverrideBody {
  include: boolean;
  note?: string;
}
