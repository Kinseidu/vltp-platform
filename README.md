# Verified Local Talent Platform
### Mining Community Digital Recruitment System

A production-style MVP that allows host-community job seekers to create verified profiles, receive AI-matched job alerts, apply fully online, and supports HR with AI-assisted shortlisting and interview question generation.

---

## Quick Start (Local Development)

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- npm or yarn

### 1. Clone and install

```bash
git clone <your-repo>
cd verified-local-talent-platform
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` and fill in:
- `DATABASE_URL` — your PostgreSQL connection string
- `JWT_SECRET` — run `openssl rand -base64 32` to generate
- `ANTHROPIC_API_KEY` — your Claude API key from console.anthropic.com

### 3. Set up the database

```bash
# Generate Prisma client
npm run db:generate

# Run migrations (creates all tables)
npm run db:migrate

# Seed with sample data (communities, skills, users, jobs)
npm run db:seed
```

### 4. Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Demo Credentials (after seeding)

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@miningco.gh | Admin@1234 |
| HR Officer | hr@miningco.gh | Hr@12345 |
| Youth President (Kotoku) | yp.kotoku@gmail.com | Youth@123 |
| Chief Staff | chiefstaff@miningco.gh | Chief@123 |
| Applicant (Verified) | kwame.asante@gmail.com | Applicant@123 |
| Applicant (Verified) | ama.boateng@gmail.com | Applicant@123 |

---

## System Roles and Permissions

| Role | Key Permissions |
|------|----------------|
| **Applicant** | Register, build profile, request verification, view matched jobs, apply online, upload documents |
| **Youth President** | Approve/reject verification requests from own community only |
| **Chief Staff** | Log Chief confirmations (proxy for Chief — no smartphone required) |
| **HR Officer** | Post jobs, run AI shortlisting, generate interview questions, update application status |
| **Admin** | Manage all users, communities, audit logs, role assignments |

---

## Core Workflow

```
1. Applicant registers → builds profile (skills + experience) → no document upload yet
2. Applicant requests community verification
3. Youth President approves (own community only)
4. Chief Staff logs Chief confirmation (phone-confirmed, logged by staff)
5. Applicant becomes Verified Local → match alerts sent
6. HR posts job with required skills, communities, and document types
7. Verified applicant applies online → uploads CV, certificates, licences
8. HR runs AI shortlisting:
   a. Hard filters first: verified status, community, experience, mandatory skills
   b. AI ranks eligible applicants with scores + explanations
   c. HR can override any AI decision
9. HR generates AI interview questions per applicant
10. HR edits questions, exports printable PDF pack
11. HR invites selected applicants for physical interview (status update)
```

---

## AI Features

### AI Shortlisting (`/api/ai/shortlist/[jobId]`)
- **Stage 1 (rule-based):** Filters out unverified, wrong community, insufficient experience, missing mandatory skills
- **Stage 2 (Claude AI):** Ranks eligible applicants by skills match, experience, documents, role relevance
- **Output:** Match score (0–100), reasons, missing requirements, evidence extracted
- **HR control:** Full override capability — AI assists, HR decides
- **Fallback:** If AI fails, falls back to rule-based scoring

### Interview Question Generator (`/api/ai/interview-questions/[appId]`)
- Reads job scope, responsibilities, requirements
- Reads applicant's skills, work history, documents
- Generates 12 questions: 3 Technical, 3 Experiential, 3 Safety/Compliance, 3 Scenario-Based
- Each question includes: question text, scoring rubric, linked job requirement
- HR can edit, delete, add, reorder, and export to printable HTML/PDF

---

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── auth/          # register, login, logout, me
│   │   ├── profile/       # profile, skills, experience
│   │   ├── verification/  # request, community queue, youth-decision, chief-confirm
│   │   ├── jobs/          # list, create, update, matches
│   │   ├── applications/  # submit, documents, status update
│   │   ├── ai/            # shortlist, interview-questions, export
│   │   ├── admin/         # users, communities, audit-logs
│   │   ├── notifications/ # list, mark read
│   │   └── skills/        # catalogue
│   ├── auth/              # login, register pages
│   ├── applicant/         # dashboard, profile, verification, jobs, applications
│   ├── youth-president/   # dashboard, verification queue
│   ├── chief-staff/       # dashboard, confirmation log
│   ├── hr/                # dashboard, jobs, applications, shortlisting
│   └── admin/             # dashboard, users, communities, audit logs
├── components/
│   └── shared/            # Sidebar, DashboardLayout, StatusBadge
├── lib/
│   ├── ai/                # ai.service.ts (Claude API + fallback)
│   ├── auth/              # jwt.ts
│   ├── db/                # prisma.ts singleton
│   ├── services/          # audit, notification, storage, matching
│   └── utils/             # api helpers, cn
└── types/                 # shared TypeScript interfaces
prisma/
├── schema.prisma           # Full normalized schema (20 models)
└── seed.ts                 # Mining-relevant seed data
```

---

## Key Design Decisions

### Chief Confirmation (no smartphone required)
The Chief's confirmation is not a direct digital action. Instead, an authorised staff member (`CHIEF_STAFF` role) logs the confirmation after receiving it by phone or in person. This records: Chief's name, confirming staff ID, date, and notes — preserving community authority without requiring digital literacy.

### Document Upload Policy
Documents are **only** uploaded during a job application — never at registration. This is enforced at the API route level. This keeps onboarding frictionless and ensures documents are always job-specific and reviewable in context.

### AI Explainability
Every AI shortlist decision includes:
- Eligibility status with reason (hard filter or AI)
- Match score broken down by component (skills, experience, certs, relevance)
- Specific reasons referencing applicant data
- Missing requirements list

HR can override any decision with a mandatory note that appears in the audit trail.

### Audit Trail
All critical actions are logged to `AuditLog` with actor ID, action type, entity, before/after state, and timestamp. The audit service is fire-and-forget (never breaks the main request flow).

---

## Database Schema Summary

20 Prisma models covering:
- **Auth:** User, (Role via enum)
- **Community:** Community
- **Profile:** ApplicantProfile, Skill, ApplicantSkill, WorkExperience
- **Verification:** VerificationRequest, YouthVerification, ChiefConfirmation
- **Jobs:** Job, JobRequirement, JobEligibleCommunity, JobRequiredDocument
- **Applications:** Application, ApplicationDocument
- **AI:** ShortlistResult, InterviewQuestionPack, InterviewQuestion
- **System:** Notification, AuditLog

---

## Deployment

### Environment variables needed in production
```
DATABASE_URL          PostgreSQL connection string
JWT_SECRET            32+ character random secret
ANTHROPIC_API_KEY     Claude API key
UPLOAD_DIR            File storage path (or swap to S3)
```

### Docker (optional)
```bash
docker-compose up -d   # starts PostgreSQL
npm run db:migrate
npm run db:seed
npm run build
npm start
```

### Recommended production stack
- **Hosting:** Vercel (Next.js), Railway, or Render
- **Database:** Neon.tech (serverless PostgreSQL) or Railway PostgreSQL
- **File Storage:** AWS S3 or Supabase Storage (replace `storage.service.ts`)
- **SMS:** Twilio (replace mock in `notification.service.ts`)
- **Email:** SendGrid

---

## Extending the MVP

| Future Feature | Where to Add |
|----------------|-------------|
| Real S3 storage | Replace `storeFile()` in `storage.service.ts` |
| SMS notifications | Replace mock in `notification.service.ts` |
| Email notifications | Add `emailService.send()` in `notification.service.ts` |
| Advanced reporting | New `/api/admin/reports` route |
| Mobile app | All API routes are REST — connect any mobile client |
| Document parsing (AI reads CV content) | Extend `ai.service.ts` with PDF text extraction |
| Multi-language support | Add i18n to Next.js config |

---

## Testing

```bash
# Run all API routes with these seed credentials:
# Admin: admin@miningco.gh / Admin@1234
# HR: hr@miningco.gh / Hr@12345

# Test the full workflow:
# 1. Register as new applicant
# 2. Add skills and experience
# 3. Request verification
# 4. Login as Youth President → approve
# 5. Login as Chief Staff → confirm
# 6. Login as HR → post job, run shortlist, generate interview questions
# 7. Login as applicant → apply for matched job, upload documents
```
# vltp-platform