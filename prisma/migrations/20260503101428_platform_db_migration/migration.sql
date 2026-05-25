-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('APPLICANT', 'YOUTH_PRESIDENT', 'CHIEF_STAFF', 'HR_OFFICER', 'ADMIN');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('PENDING', 'YOUTH_APPROVED', 'CHIEF_CONFIRMED', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'SHORTLISTED', 'REJECTED', 'INVITED_FOR_INTERVIEW');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('DRAFT', 'OPEN', 'CLOSED', 'FILLED');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('CV_RESUME', 'CERTIFICATE', 'LICENSE', 'SUPPORTING_DOC', 'OTHER');

-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('TECHNICAL', 'EXPERIENTIAL', 'SAFETY_COMPLIANCE', 'SCENARIO_BASED');

-- CreateEnum
CREATE TYPE "SkillProficiency" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'PROFICIENT', 'EXPERT');

-- CreateEnum
CREATE TYPE "EligibilityStatus" AS ENUM ('ELIGIBLE', 'INELIGIBLE_NOT_VERIFIED', 'INELIGIBLE_COMMUNITY', 'INELIGIBLE_EXPERIENCE', 'INELIGIBLE_MISSING_CERTS');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('MATCH_ALERT', 'VERIFICATION_UPDATE', 'APPLICATION_STATUS', 'INTERVIEW_INVITE', 'SYSTEM');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'APPLICANT',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Community" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "youthPresidentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Community_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApplicantProfile" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "communityId" INTEGER NOT NULL,
    "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "bio" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "gender" TEXT,
    "highestEducation" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApplicantProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Skill" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "Skill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApplicantSkill" (
    "id" SERIAL NOT NULL,
    "applicantId" INTEGER NOT NULL,
    "skillId" INTEGER NOT NULL,
    "yearsOfExp" INTEGER NOT NULL DEFAULT 0,
    "proficiency" "SkillProficiency" NOT NULL DEFAULT 'BEGINNER',
    "notes" TEXT,

    CONSTRAINT "ApplicantSkill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkExperience" (
    "id" SERIAL NOT NULL,
    "applicantId" INTEGER NOT NULL,
    "jobTitle" TEXT NOT NULL,
    "employer" TEXT NOT NULL,
    "industry" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "location" TEXT,

    CONSTRAINT "WorkExperience_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationRequest" (
    "id" SERIAL NOT NULL,
    "applicantId" INTEGER NOT NULL,
    "status" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "notes" TEXT,

    CONSTRAINT "VerificationRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "YouthVerification" (
    "id" SERIAL NOT NULL,
    "requestId" INTEGER NOT NULL,
    "youthPresidentId" TEXT NOT NULL,
    "decision" "VerificationStatus" NOT NULL,
    "notes" TEXT,
    "decisionAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "YouthVerification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChiefConfirmation" (
    "id" SERIAL NOT NULL,
    "requestId" INTEGER NOT NULL,
    "confirmingStaffId" TEXT NOT NULL,
    "status" "VerificationStatus" NOT NULL,
    "chiefName" TEXT NOT NULL,
    "notes" TEXT,
    "confirmedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChiefConfirmation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Job" (
    "id" SERIAL NOT NULL,
    "postedById" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "responsibilities" TEXT NOT NULL,
    "minExperience" INTEGER NOT NULL DEFAULT 0,
    "status" "JobStatus" NOT NULL DEFAULT 'DRAFT',
    "applicationDeadline" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobRequirement" (
    "id" SERIAL NOT NULL,
    "jobId" INTEGER NOT NULL,
    "skillId" INTEGER NOT NULL,
    "isMandatory" BOOLEAN NOT NULL DEFAULT true,
    "minYears" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "JobRequirement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobEligibleCommunity" (
    "id" SERIAL NOT NULL,
    "jobId" INTEGER NOT NULL,
    "communityId" INTEGER NOT NULL,

    CONSTRAINT "JobEligibleCommunity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobRequiredDocument" (
    "id" SERIAL NOT NULL,
    "jobId" INTEGER NOT NULL,
    "docType" "DocumentType" NOT NULL,
    "label" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "JobRequiredDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Application" (
    "id" SERIAL NOT NULL,
    "jobId" INTEGER NOT NULL,
    "applicantId" INTEGER NOT NULL,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'DRAFT',
    "coverNote" TEXT,
    "submittedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Application_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApplicationDocument" (
    "id" SERIAL NOT NULL,
    "applicationId" INTEGER NOT NULL,
    "docType" "DocumentType" NOT NULL,
    "label" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApplicationDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShortlistResult" (
    "id" SERIAL NOT NULL,
    "applicationId" INTEGER NOT NULL,
    "matchScore" DOUBLE PRECISION NOT NULL,
    "eligibilityStatus" "EligibilityStatus" NOT NULL,
    "skillsMatchScore" DOUBLE PRECISION NOT NULL,
    "experienceScore" DOUBLE PRECISION NOT NULL,
    "certsScore" DOUBLE PRECISION NOT NULL,
    "roleRelevanceScore" DOUBLE PRECISION NOT NULL,
    "reasons" JSONB NOT NULL,
    "missingRequirements" JSONB NOT NULL,
    "evidenceExtracted" JSONB NOT NULL,
    "hrOverride" BOOLEAN NOT NULL DEFAULT false,
    "hrOverrideNote" TEXT,
    "hrOverrideBy" TEXT,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShortlistResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterviewQuestionPack" (
    "id" SERIAL NOT NULL,
    "applicationId" INTEGER NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "exportedAt" TIMESTAMP(3),
    "isEdited" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "InterviewQuestionPack_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterviewQuestion" (
    "id" SERIAL NOT NULL,
    "packId" INTEGER NOT NULL,
    "type" "QuestionType" NOT NULL,
    "question" TEXT NOT NULL,
    "rubric" TEXT,
    "mappedTo" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "InterviewQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "linkUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" SERIAL NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemSetting" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,

    CONSTRAINT "SystemSetting_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE UNIQUE INDEX "Community_name_key" ON "Community"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Community_youthPresidentId_key" ON "Community"("youthPresidentId");

-- CreateIndex
CREATE INDEX "Community_youthPresidentId_idx" ON "Community"("youthPresidentId");

-- CreateIndex
CREATE UNIQUE INDEX "ApplicantProfile_userId_key" ON "ApplicantProfile"("userId");

-- CreateIndex
CREATE INDEX "ApplicantProfile_userId_idx" ON "ApplicantProfile"("userId");

-- CreateIndex
CREATE INDEX "ApplicantProfile_communityId_idx" ON "ApplicantProfile"("communityId");

-- CreateIndex
CREATE INDEX "ApplicantProfile_verificationStatus_idx" ON "ApplicantProfile"("verificationStatus");

-- CreateIndex
CREATE UNIQUE INDEX "Skill_name_key" ON "Skill"("name");

-- CreateIndex
CREATE INDEX "ApplicantSkill_applicantId_idx" ON "ApplicantSkill"("applicantId");

-- CreateIndex
CREATE UNIQUE INDEX "ApplicantSkill_applicantId_skillId_key" ON "ApplicantSkill"("applicantId", "skillId");

-- CreateIndex
CREATE INDEX "WorkExperience_applicantId_idx" ON "WorkExperience"("applicantId");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationRequest_applicantId_key" ON "VerificationRequest"("applicantId");

-- CreateIndex
CREATE INDEX "VerificationRequest_status_idx" ON "VerificationRequest"("status");

-- CreateIndex
CREATE UNIQUE INDEX "YouthVerification_requestId_key" ON "YouthVerification"("requestId");

-- CreateIndex
CREATE INDEX "YouthVerification_youthPresidentId_idx" ON "YouthVerification"("youthPresidentId");

-- CreateIndex
CREATE UNIQUE INDEX "ChiefConfirmation_requestId_key" ON "ChiefConfirmation"("requestId");

-- CreateIndex
CREATE INDEX "ChiefConfirmation_confirmingStaffId_idx" ON "ChiefConfirmation"("confirmingStaffId");

-- CreateIndex
CREATE INDEX "Job_status_idx" ON "Job"("status");

-- CreateIndex
CREATE INDEX "Job_postedById_idx" ON "Job"("postedById");

-- CreateIndex
CREATE INDEX "JobRequirement_jobId_idx" ON "JobRequirement"("jobId");

-- CreateIndex
CREATE UNIQUE INDEX "JobRequirement_jobId_skillId_key" ON "JobRequirement"("jobId", "skillId");

-- CreateIndex
CREATE UNIQUE INDEX "JobEligibleCommunity_jobId_communityId_key" ON "JobEligibleCommunity"("jobId", "communityId");

-- CreateIndex
CREATE INDEX "JobRequiredDocument_jobId_idx" ON "JobRequiredDocument"("jobId");

-- CreateIndex
CREATE INDEX "Application_jobId_idx" ON "Application"("jobId");

-- CreateIndex
CREATE INDEX "Application_applicantId_idx" ON "Application"("applicantId");

-- CreateIndex
CREATE INDEX "Application_status_idx" ON "Application"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Application_jobId_applicantId_key" ON "Application"("jobId", "applicantId");

-- CreateIndex
CREATE INDEX "ApplicationDocument_applicationId_idx" ON "ApplicationDocument"("applicationId");

-- CreateIndex
CREATE UNIQUE INDEX "ShortlistResult_applicationId_key" ON "ShortlistResult"("applicationId");

-- CreateIndex
CREATE INDEX "ShortlistResult_matchScore_idx" ON "ShortlistResult"("matchScore");

-- CreateIndex
CREATE INDEX "ShortlistResult_eligibilityStatus_idx" ON "ShortlistResult"("eligibilityStatus");

-- CreateIndex
CREATE INDEX "InterviewQuestionPack_applicationId_idx" ON "InterviewQuestionPack"("applicationId");

-- CreateIndex
CREATE INDEX "InterviewQuestion_packId_idx" ON "InterviewQuestion"("packId");

-- CreateIndex
CREATE INDEX "Notification_userId_isRead_idx" ON "Notification"("userId", "isRead");

-- CreateIndex
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_actorId_idx" ON "AuditLog"("actorId");

-- CreateIndex
CREATE INDEX "AuditLog_entity_entityId_idx" ON "AuditLog"("entity", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "SystemSetting_key_idx" ON "SystemSetting"("key");

-- AddForeignKey
ALTER TABLE "Community" ADD CONSTRAINT "Community_youthPresidentId_fkey" FOREIGN KEY ("youthPresidentId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicantProfile" ADD CONSTRAINT "ApplicantProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicantProfile" ADD CONSTRAINT "ApplicantProfile_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicantSkill" ADD CONSTRAINT "ApplicantSkill_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "ApplicantProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicantSkill" ADD CONSTRAINT "ApplicantSkill_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkExperience" ADD CONSTRAINT "WorkExperience_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "ApplicantProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerificationRequest" ADD CONSTRAINT "VerificationRequest_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "ApplicantProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "YouthVerification" ADD CONSTRAINT "YouthVerification_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "VerificationRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "YouthVerification" ADD CONSTRAINT "YouthVerification_youthPresidentId_fkey" FOREIGN KEY ("youthPresidentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChiefConfirmation" ADD CONSTRAINT "ChiefConfirmation_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "VerificationRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChiefConfirmation" ADD CONSTRAINT "ChiefConfirmation_confirmingStaffId_fkey" FOREIGN KEY ("confirmingStaffId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_postedById_fkey" FOREIGN KEY ("postedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobRequirement" ADD CONSTRAINT "JobRequirement_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobRequirement" ADD CONSTRAINT "JobRequirement_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobEligibleCommunity" ADD CONSTRAINT "JobEligibleCommunity_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobEligibleCommunity" ADD CONSTRAINT "JobEligibleCommunity_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobRequiredDocument" ADD CONSTRAINT "JobRequiredDocument_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "ApplicantProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationDocument" ADD CONSTRAINT "ApplicationDocument_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShortlistResult" ADD CONSTRAINT "ShortlistResult_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewQuestionPack" ADD CONSTRAINT "InterviewQuestionPack_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewQuestion" ADD CONSTRAINT "InterviewQuestion_packId_fkey" FOREIGN KEY ("packId") REFERENCES "InterviewQuestionPack"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
