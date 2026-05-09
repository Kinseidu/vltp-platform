// src/lib/ai/ai.service.ts
// AI service abstraction using Google Gemini API
// All prompts, response parsing, and error handling are centralised here
// Primary provider: Google Gemini 2.5-flash

import {
  JobWithDetails, ApplicationWithDetails, ShortlistCandidateResult,
  GeneratedQuestion, GeneratedQuestionPack, EligibilityStatus
} from '@/types';
import { VerificationStatus, QuestionType } from '@prisma/client';
import { readFile } from '../services/storage.service';

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

function parseJSONArrayFromText<T>(rawText: string): T[] {
  if (!rawText || rawText.trim() === '') {
    throw new Error('AI returned an empty response');
  }

  const cleaned = rawText.replace(/```json|```/g, '').trim();

  // First try direct parse.
  try {
    const parsed = JSON.parse(cleaned);
    console.log(`[AI Pipeline] JSON parsed successfully. Array size: ${Array.isArray(parsed) ? parsed.length : 'N/A'}`);
    return parsed as T[];
  } catch (err) {
    console.warn('[AI Pipeline] Direct JSON parse failed, attempting slice...');
    // Some models return extra prose before/after JSON.
    const start = cleaned.indexOf('[');
    const end = cleaned.lastIndexOf(']');
    if (start >= 0 && end > start) {
      const sliced = cleaned.slice(start, end + 1);
      try {
        const parsed = JSON.parse(sliced);
        console.log(`[AI Pipeline] JSON slice parsed successfully. Array size: ${Array.isArray(parsed) ? parsed.length : 'N/A'}`);
        return parsed as T[];
      } catch (e) {
        console.error('[AI Pipeline] JSON slice parse failed:', sliced);
        throw new Error('AI response contained invalid JSON array');
      }
    }
    console.error('[AI Pipeline] Raw response was not JSON:', cleaned);
    throw new Error('AI response did not contain a valid JSON array');
  }
}

export interface AIInputFile {
  mimeType: string;
  data: string; // base64
}

async function generateAIText(prompt: string, maxTokens: number, files?: AIInputFile[]): Promise<string> {
  const geminiKey = process.env.GEMINI_API_KEY || '';
  const MAX_RETRIES = 2;
  const TIMEOUT_MS = 30000;

  let lastError: any;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

      // Primary: Gemini
      if (geminiKey && !geminiKey.includes('replace-with-')) {
        const parts: any[] = [{ text: prompt }];
        if (files) {
          files.forEach(f => parts.push({ inline_data: { mime_type: f.mimeType, data: f.data } }));
        }

        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(geminiKey)}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts }],
              generationConfig: {
                maxOutputTokens: maxTokens,
                temperature: 0.7,
                responseMimeType: 'application/json',
              },
            }),
            signal: controller.signal
          }
        );

        clearTimeout(timeoutId);

        if (!res.ok) {
          const errData = await res.json().catch(() => ({ error: { message: 'Unknown error' } }));
          throw new Error(`Gemini API error (${res.status}): ${errData.error?.message || 'Unknown error'}`);
        }

        const data = await res.json() as any;
        const text = data.candidates?.[0]?.content?.parts?.map((p: any) => p.text || '').join('') || '';
        
        if (!text.trim()) throw new Error('AI returned an empty response');
        console.log('[AI Pipeline] ✓ Gemini request successful');
        return text;
      }

      throw new Error('No AI provider configured (GEMINI_API_KEY required)');

    } catch (err: any) {
      lastError = err;
      if (err.name === 'AbortError') console.error('[AI Pipeline] Request timed out');
      console.warn(`[AI Pipeline] Attempt ${attempt + 1} failed:`, err.message);
      if (attempt < MAX_RETRIES) {
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

// ─── HARD FILTER (Rule-based, no AI) ─────────────────────────────────────────

interface HardFilterResult {
  passed: boolean;
  eligibilityStatus?: EligibilityStatus;
  reasons: string[];
}

function runHardFilters(job: JobWithDetails, app: ApplicationWithDetails): HardFilterResult {
  const profile = app.applicant;
  const reasons: string[] = [];

  console.log(`[AI Debug] runHardFilters for applicant: ${profile?.fullName || 'UNKNOWN'}`);
  if (!profile) {
    console.error('[AI Debug] Profile is missing for app:', app.id);
    return { passed: false, eligibilityStatus: 'INELIGIBLE_NOT_VERIFIED', reasons: ['System error: Profile missing'] };
  }

  // Filter 1: Must be a verified local
  if (profile.verificationStatus !== VerificationStatus.VERIFIED) {
    return {
      passed: false,
      eligibilityStatus: 'INELIGIBLE_NOT_VERIFIED',
      reasons: ['Applicant is not a Verified Local'],
    };
  }

  // Filter 2: Community must be in eligible communities
  const eligibleCommunityIds = job.eligibleCommunities.map(ec => ec.community.id);
  if (!eligibleCommunityIds.includes(profile.communityId)) {
    return {
      passed: false,
      eligibilityStatus: 'INELIGIBLE_COMMUNITY',
      reasons: [`Applicant's community (${profile.community.name}) is not eligible for this job`],
    };
  }

  // Filter 3: Minimum experience
  const maxYears = Math.max(...(profile.skills?.map(s => s.yearsOfExp) || [0]), 0);
  if (maxYears < job.minExperience) {
    return {
      passed: false,
      eligibilityStatus: 'INELIGIBLE_EXPERIENCE',
      reasons: [`Minimum experience required: ${job.minExperience} years. Applicant has: ${maxYears} years`],
    };
  }

  // Filter 4: Mandatory skills check
  const mandatoryReqs = job.requirements.filter(r => r.isMandatory);
  const applicantSkillIds = profile.skills?.map(s => s.skillId) || [];
  const missingMandatory = mandatoryReqs.filter(r => !applicantSkillIds.includes(r.skillId));
  if (missingMandatory.length > 0) {
    return {
      passed: false,
      eligibilityStatus: 'INELIGIBLE_MISSING_CERTS',
      reasons: missingMandatory.map(r => `Missing mandatory skill: ${r.skill.name}`),
    };
  }

  reasons.push('Verified Local status confirmed');
  reasons.push(`Community ${profile.community.name} is eligible`);
  reasons.push(`Has ${maxYears} years of experience (minimum: ${job.minExperience})`);
  return { passed: true, eligibilityStatus: 'ELIGIBLE', reasons };
}

// ─── AI SHORTLISTING ──────────────────────────────────────────────────────────

function buildShortlistPrompt(job: JobWithDetails, applications: ApplicationWithDetails[]): string {
  console.log(`[AI Debug] buildShortlistPrompt. Job: ${job?.title}, Apps: ${applications?.length}`);
  const jobContext = `
JOB TITLE: ${job.title}
JOB SCOPE: ${job.scope}
RESPONSIBILITIES: ${job.responsibilities}
MINIMUM EXPERIENCE: ${job.minExperience} years
REQUIRED SKILLS:
${job.requirements.map(r => `  - ${r.skill.name} (${r.isMandatory ? 'MANDATORY' : 'PREFERRED'}, min ${r.minYears} years)`).join('\n')}
`;

  const applicantsContext = applications.map(app => {
    const profile = app.applicant;
    const skills = profile.skills?.map(s =>
      `${s.skill.name}: ${s.yearsOfExp} years (${s.proficiency})`
    ).join(', ') || 'No skills listed';

    const experience = profile.workExperiences?.map(w =>
      `${w.jobTitle} at ${w.employer} (${new Date(w.startDate).getFullYear()}–${w.endDate ? new Date(w.endDate).getFullYear() : 'present'}): ${w.description || ''}`
    ).join(' | ') || 'No experience listed';

    const docs = app.documents?.map(d => d.label).join(', ') || 'No documents uploaded';

    return `
APPLICANT ID: ${app.id}
NAME: ${profile.fullName}
SKILLS: ${skills}
WORK HISTORY: ${experience}
DOCUMENTS UPLOADED: ${docs}
COVER NOTE: ${app.coverNote || 'None provided'}
`;
  }).join('\n---\n');

  return `You are a Senior Technical Recruiter at a major mining company. Your task is to shortlist applicants for a host-community recruitment programme.
  
STRICT QUALITY GUIDELINES:
1. BASE REASONING ONLY on the provided text summaries and the ATTACHED CV DOCUMENTS.
2. DO NOT make assumptions. If a certificate is mentioned in text but not in documents, mark it as 'Not verified by upload'.
3. BE SPECIFIC. Mention employer names, project titles, and specific technical skills (e.g., "Maintained CAT 797F haul trucks" instead of "Heavy equipment experience").
4. DETECT INCONSISTENCIES. If a CV claim contradicts a skill entry, note it in the reasons.

${jobContext}

ELIGIBLE APPLICANTS TO RANK:
${applicantsContext}

THE CV/RESUMES FOR THESE APPLICANTS ARE ATTACHED.
- Use them to verify specific dates and technical depth.
- Cross-reference the "APPLICANT ID" in the text above with the content of the attached files.

For each applicant, provide a JSON scoring with these exact fields:
- applicationId: number (MATCH EXACTLY with the APPLICANT ID provided)
- matchScore: number 0-100 (weighted: 40% skills, 40% experience, 20% certifications)
- skillsMatchScore: number 0-100
- experienceScore: number 0-100
- certsScore: number 0-100 (reward verified document uploads)
- roleRelevanceScore: number 0-100
- reasons: string[] (3-5 bullet points. Start each with 'VERIFIED:' or 'CLAIMED:' or 'MISSING:')
- missingRequirements: string[] (specific missing items relative to job requirements)
- evidenceExtracted: object with key technical claims (e.g. {"drilling_exp": "5 years", "equipment": "Sandvik DX800"})

Respond ONLY with a valid JSON array. No preamble. No markdown. Example:
[{"applicationId":1,"matchScore":82,"skillsMatchScore":90,"experienceScore":75,"certsScore":70,"roleRelevanceScore":85,"reasons":["VERIFIED: 5 years experience with underground drilling at Asanko Gold","CLAIMED: Safety supervision experience (no certificate uploaded)"],"missingRequirements":["Blasting certificate"],"evidenceExtracted":{"drilling_equipment":"Sandvik DX800","safety_role":"Shift lead at Asanko"}}]`;
}

/**
 * Main AI shortlisting function.
 * Step 1: Hard filters (rule-based, no AI)
 * Step 2: AI ranking of eligible applicants only
 */
export async function generateShortlist(
  job: JobWithDetails,
  applications: ApplicationWithDetails[]
): Promise<ShortlistCandidateResult[]> {
  const results: ShortlistCandidateResult[] = [];

  // Separate eligible from ineligible using hard filters
  const eligible: ApplicationWithDetails[] = [];
  const ineligible: { app: ApplicationWithDetails; filterResult: HardFilterResult }[] = [];

  for (const app of applications) {
    const filterResult = runHardFilters(job, app);
    if (filterResult.passed) {
      eligible.push(app);
    } else {
      ineligible.push({ app, filterResult });
    }
  }

  // Push ineligible results immediately (no AI needed)
  for (const { app, filterResult } of ineligible) {
    results.push({
      applicationId: app.id,
      applicantName: app.applicant.fullName,
      matchScore: 0,
      eligibilityStatus: filterResult.eligibilityStatus || 'INELIGIBLE_NOT_VERIFIED',
      skillsMatchScore: 0,
      experienceScore: 0,
      certsScore: 0,
      roleRelevanceScore: 0,
      reasons: filterResult.reasons,
      missingRequirements: filterResult.reasons,
      evidenceExtracted: {},
    });
  }

  // If no eligible applicants, return early
  if (eligible.length === 0) return results;

  // AI ranking for eligible applicants
  try {
    const prompt = buildShortlistPrompt(job, eligible);
    
    // Read CV contents for eligible applicants to provide deeper context
    const files: AIInputFile[] = [];
    for (const app of eligible) {
      const cv = app.documents.find(d => d.docType === 'CV_RESUME');
      if (cv) {
        try {
          const buffer = await readFile(cv.storagePath);
          files.push({
            mimeType: cv.mimeType,
            data: buffer.toString('base64')
          });
        } catch (err) {
          console.error(`[AI] Failed to read CV for app ${app.id}:`, err);
        }
      }
    }

    const rawText = await generateAIText(prompt, 4000, files);

    const aiResults = parseJSONArrayFromText<{
      applicationId: number;
      matchScore: number;
      skillsMatchScore: number;
      experienceScore: number;
      certsScore: number;
      roleRelevanceScore: number;
      reasons: string[];
      missingRequirements: string[];
      evidenceExtracted: Record<string, string>;
    }>(rawText);

    // Validation layer
    const validatedResults = aiResults.filter(r => {
      const appExists = eligible.some(a => a.id === r.applicationId);
      if (!appExists) console.warn(`[AI Pipeline] AI returned unknown applicationId: ${r.applicationId}`);
      return appExists && typeof r.matchScore === 'number';
    });

    // Merge AI results with applicant names
    for (const aiResult of validatedResults) {
      const app = eligible.find(a => a.id === aiResult.applicationId);
      if (!app) continue;

      results.push({
        applicationId: aiResult.applicationId,
        applicantName: app.applicant.fullName,
        matchScore: Math.round(aiResult.matchScore),
        eligibilityStatus: 'ELIGIBLE',
        skillsMatchScore: Math.round(aiResult.skillsMatchScore),
        experienceScore: Math.round(aiResult.experienceScore),
        certsScore: Math.round(aiResult.certsScore),
        roleRelevanceScore: Math.round(aiResult.roleRelevanceScore),
        reasons: aiResult.reasons || [],
        missingRequirements: aiResult.missingRequirements || [],
        evidenceExtracted: aiResult.evidenceExtracted || {},
      });
    }
  } catch (err: any) {
    console.error('[AI] Shortlist generation failed:', err);
    // Fallback: return eligible with basic rule-based scores
    for (const app of eligible) {
      const maxYears = Math.max(...(app.applicant.skills?.map(s => s.yearsOfExp) || [0]));
      const skillMatch = app.applicant.skills?.filter(s =>
        job.requirements.some(r => r.skillId === s.skillId)
      ).length || 0;
      const skillScore = Math.round((skillMatch / Math.max(job.requirements.length, 1)) * 100);

      results.push({
        applicationId: app.id,
        applicantName: app.applicant.fullName,
        matchScore: skillScore,
        eligibilityStatus: 'ELIGIBLE',
        skillsMatchScore: skillScore,
        experienceScore: Math.min((maxYears / Math.max(job.minExperience, 1)) * 100, 100),
        certsScore: app.documents.length > 0 ? 60 : 20,
        roleRelevanceScore: skillScore,
        reasons: ['Passed all eligibility filters (AI scoring unavailable — using rule-based fallback)'],
        missingRequirements: [],
        evidenceExtracted: {},
      });
    }
  }

  // Sort by matchScore descending
  results.sort((a, b) => b.matchScore - a.matchScore);
  return results;
}

// ─── INTERVIEW QUESTION GENERATION ───────────────────────────────────────────

/**
 * Build the interview question generation prompt.
 */
function buildInterviewPrompt(job: JobWithDetails, app: ApplicationWithDetails): string {
  const profile = app.applicant;

  const jobContext = `
JOB: ${job.title}
SCOPE: ${job.scope}
RESPONSIBILITIES: ${job.responsibilities}
REQUIRED SKILLS: ${job.requirements.map(r => `${r.skill.name} (${r.isMandatory ? 'mandatory' : 'preferred'})`).join(', ')}
MINIMUM EXPERIENCE: ${job.minExperience} years
`;

  const applicantContext = `
APPLICANT: ${profile.fullName}
SKILLS: ${profile.skills?.map(s => `${s.skill.name}: ${s.yearsOfExp} yrs (${s.proficiency})`).join(', ') || 'Not listed'}
WORK HISTORY: ${profile.workExperiences?.map(w => `${w.jobTitle} at ${w.employer}: ${w.description}`).join(' | ') || 'Not listed'}
DOCUMENTS: ${app.documents?.map(d => d.label).join(', ') || 'None uploaded'}
COVER NOTE: ${app.coverNote || 'None'}
`;

  return `You are an Expert Technical Interviewer at a mining site. Prepare a set of 12 highly specific interview questions for the candidate below.

STRICT GUIDELINES:
1. AVOID GENERIC QUESTIONS. (e.g., Do not ask "Tell me about yourself").
2. USE THE ATTACHED DOCUMENTS. Read the candidate's CV/Resume and certificates to find specific details.
3. MAP TO REQUIREMENTS. Every question must probe either a mandatory job requirement or a specific claim in the candidate's history.
4. MINING FOCUS. Focus on technical competence, site safety, and scenario-based problem solving.

${jobContext}

${applicantContext}

THE CANDIDATE'S DOCUMENTS ARE ATTACHED. 
- Reference their specific past employers and projects in your questions.
- If they claim a specific skill (e.g. "Blasting"), ask a question that verifies the DEPTH of that skill.

Generate exactly 12 interview questions in this JSON format:
[
  {
    "type": "TECHNICAL" | "EXPERIENTIAL" | "SAFETY_COMPLIANCE" | "SCENARIO_BASED",
    "question": "The full question text (e.g., 'At your previous role at [Employer], you mentioned [Project]. How did you handle [Specific Challenge]?')",
    "rubric": "What a high-quality answer would include (look for specific technical terms or safety protocols)",
    "mappedTo": "Requirement ID or CV Claim being verified"
  }
]

Respond ONLY with a valid JSON array. No preamble. No markdown fences.`;
}

/**
 * Generate interview question pack for an applicant.
 */
export async function generateInterviewQuestions(
  job: JobWithDetails,
  application: ApplicationWithDetails
): Promise<GeneratedQuestion[]> {
  const prompt = buildInterviewPrompt(job, application);

  // Read actual document contents for AI analysis
  const files: AIInputFile[] = [];
  if (application.documents && application.documents.length > 0) {
    for (const doc of application.documents) {
      try {
        const buffer = await readFile(doc.storagePath);
        files.push({
          mimeType: doc.mimeType,
          data: buffer.toString('base64')
        });
      } catch (err) {
        console.error(`[AI] Failed to read document ${doc.id}:`, err);
      }
    }
  }

  try {
    const rawText = await generateAIText(prompt, 4000, files);

    const questions = parseJSONArrayFromText<GeneratedQuestion>(rawText);
    return questions;

  } catch (err) {
    console.error('[AI] Interview question generation failed:', err);

    // Fallback: return generic mining interview questions
    return [
      { type: QuestionType.TECHNICAL, question: `Describe your experience with ${job.requirements[0]?.skill.name || 'the key technical requirements of this role'}.`, rubric: 'Look for specific examples, equipment names, and process knowledge.', mappedTo: 'Primary job requirement' },
      { type: QuestionType.TECHNICAL, question: 'Walk me through a typical work shift in your previous role. What were your daily responsibilities?', rubric: 'Should demonstrate structured approach and role awareness.', mappedTo: 'Work experience' },
      { type: QuestionType.TECHNICAL, question: 'What equipment have you operated and what is your maintenance routine for that equipment?', rubric: 'Specific equipment names and maintenance steps indicate genuine experience.', mappedTo: 'Technical competence' },
      { type: QuestionType.EXPERIENTIAL, question: `You stated you worked at ${application.applicant.workExperiences?.[0]?.employer || 'a previous employer'}. Describe the most technically challenging task you handled there.`, rubric: 'Specificity and problem-solving detail indicate authentic experience.', mappedTo: 'Work history verification' },
      { type: QuestionType.EXPERIENTIAL, question: 'Tell me about a time you had to work under significant time pressure. How did you manage it?', rubric: 'Look for composure, prioritisation skills, and team communication.', mappedTo: 'Experiential' },
      { type: QuestionType.EXPERIENTIAL, question: 'Describe a time you identified a problem that others had missed. What did you do?', rubric: 'Initiative and observation skills.', mappedTo: 'Experiential' },
      { type: QuestionType.SAFETY_COMPLIANCE, question: 'What are the first steps you take when you arrive at your workstation at the start of a shift?', rubric: 'Should include pre-operational checks, safety inspections, hazard identification.', mappedTo: 'Safety compliance' },
      { type: QuestionType.SAFETY_COMPLIANCE, question: 'You notice a colleague is about to perform a task in an unsafe way. What do you do?', rubric: 'Should demonstrate willingness to intervene and follow chain of reporting.', mappedTo: 'Safety culture' },
      { type: QuestionType.SAFETY_COMPLIANCE, question: 'What personal protective equipment (PPE) is required for your role and why?', rubric: 'Should name specific PPE relevant to mining operations.', mappedTo: 'Safety knowledge' },
      { type: QuestionType.SCENARIO_BASED, question: 'You are mid-shift when your equipment shows an unusual reading or sound. What are your steps?', rubric: 'Stop work, report, do not attempt unauthorised repair. Safety first.', mappedTo: 'Equipment fault response' },
      { type: QuestionType.SCENARIO_BASED, question: 'A community member approaches your worksite and asks to speak with you during working hours. How do you handle this?', rubric: 'Professional boundaries while being respectful of community relations.', mappedTo: 'Community relations' },
      { type: QuestionType.SCENARIO_BASED, question: `You have completed your shift but your handover colleague has not arrived. The operation cannot stop. What do you do?`, rubric: 'Should escalate to supervisor, not make unilateral decision to leave.', mappedTo: 'Responsibility and handover' },
    ];
  }
}
