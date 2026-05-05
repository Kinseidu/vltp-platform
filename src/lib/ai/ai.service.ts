// src/lib/ai/ai.service.ts
// AI service abstraction using Claude API (Anthropic)
// All prompts, response parsing, and error handling are centralised here

import Anthropic from '@anthropic-ai/sdk';
import {
  JobWithDetails, ApplicationWithDetails, ShortlistCandidateResult,
  GeneratedQuestion, GeneratedQuestionPack, EligibilityStatus
} from '@/types';
import { VerificationStatus, QuestionType } from '@prisma/client';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

const AI_MODEL = 'claude-sonnet-4-20250514';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-1.5-flash';

function parseJSONArrayFromText<T>(rawText: string): T[] {
  if (!rawText || rawText.trim() === '') {
    throw new Error('AI returned an empty response');
  }

  const cleaned = rawText.replace(/```json|```/g, '').trim();

  // First try direct parse.
  try {
    return JSON.parse(cleaned) as T[];
  } catch {
    // Some models return extra prose before/after JSON.
    const start = cleaned.indexOf('[');
    const end = cleaned.lastIndexOf(']');
    if (start >= 0 && end > start) {
      const sliced = cleaned.slice(start, end + 1);
      try {
        return JSON.parse(sliced) as T[];
      } catch (e) {
        console.error('[AI] JSON slice parse failed:', sliced);
        throw new Error('AI response contained invalid JSON array');
      }
    }
    console.error('[AI] Raw response was not JSON:', cleaned);
    throw new Error('AI response did not contain a valid JSON array');
  }
}

async function generateAIText(prompt: string, maxTokens: number): Promise<string> {
  const anthropicKey = process.env.ANTHROPIC_API_KEY || '';
  const geminiKey = process.env.GEMINI_API_KEY || '';

  // Prefer Anthropic when configured.
  if (anthropicKey && !anthropicKey.includes('replace-with-')) {
    const response = await anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }],
    });

    return response.content
      .filter(c => c.type === 'text')
      .map(c => (c as { type: 'text'; text: string }).text)
      .join('');
  }

  // Fallback to Gemini when Anthropic key is unavailable.
  if (geminiKey && !geminiKey.includes('replace-with-')) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(geminiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            maxOutputTokens: maxTokens,
            temperature: 0.7, // Slightly higher for more variety in questions
            responseMimeType: 'application/json',
          },
        }),
      }
    );

    if (!res.ok) {
      const errData = await res.json().catch(() => ({ error: { message: 'Unknown error' } }));
      throw new Error(`Gemini API error (${res.status}): ${errData.error?.message || 'Unknown error'}`);
    }

    const data = await res.json() as {
      candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> };
        finishReason?: string;
      }>;
    };

    if (!data.candidates || data.candidates.length === 0) {
      throw new Error('Gemini API returned no candidates. Safety filters may have blocked the response.');
    }

    const text = data.candidates[0].content?.parts?.map(p => p.text || '').join('') || '';
    
    if (!text.trim()) {
      if (data.candidates[0].finishReason === 'SAFETY') {
        throw new Error('Gemini API blocked the response due to safety filters.');
      }
      throw new Error('Gemini API returned an empty response');
    }

    return text;
  }

  throw new Error('No AI provider configured. Set ANTHROPIC_API_KEY or GEMINI_API_KEY.');
}

// ─── HARD FILTER (Rule-based, no AI) ─────────────────────────────────────────

interface HardFilterResult {
  passed: boolean;
  eligibilityStatus: EligibilityStatus;
  reasons: string[];
}

function applyHardFilters(
  app: ApplicationWithDetails,
  job: JobWithDetails
): HardFilterResult {
  const reasons: string[] = [];
  const profile = app.applicant;

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

/**
 * Build the shortlisting prompt for Claude.
 * Gives Claude structured context and asks for JSON output.
 */
function buildShortlistPrompt(job: JobWithDetails, applications: ApplicationWithDetails[]): string {
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

  return `You are an AI assistant helping an HR officer at a mining company shortlist applicants for a host-community recruitment programme.

Your role is to ASSIST human decision-making, not replace it. Rank the following applicants based on job fit.

${jobContext}

ELIGIBLE APPLICANTS TO RANK:
${applicantsContext}

For each applicant, provide a JSON scoring with these exact fields:
- applicationId: number (the APPLICANT ID shown above)
- matchScore: number 0-100 (overall fit score)
- skillsMatchScore: number 0-100
- experienceScore: number 0-100
- certsScore: number 0-100 (based on documents uploaded)
- roleRelevanceScore: number 0-100
- reasons: string[] (3-5 bullet points explaining the score, referencing specific evidence)
- missingRequirements: string[] (what would strengthen their application)
- evidenceExtracted: object with key claims found in their profile/experience

Respond ONLY with a valid JSON array. No preamble. No markdown. Example:
[{"applicationId":1,"matchScore":82,"skillsMatchScore":90,"experienceScore":75,"certsScore":70,"roleRelevanceScore":85,"reasons":["5 years underground mining directly matches scope","Has drilling experience at Asanko Gold Mine"],"missingRequirements":["Blasting certificate not uploaded"],"evidenceExtracted":{"drillingExp":"5 years at Asanko Gold Mine","safetyTraining":"Mentioned in work history"}}]`;
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
    const filterResult = applyHardFilters(app, job);
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
      eligibilityStatus: filterResult.eligibilityStatus,
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
    const rawText = await generateAIText(prompt, 2000);

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

    // Merge AI results with applicant names
    for (const aiResult of aiResults) {
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
        reasons: aiResult.reasons,
        missingRequirements: aiResult.missingRequirements,
        evidenceExtracted: aiResult.evidenceExtracted,
      });
    }
  } catch (err) {
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

  return `You are assisting an HR officer at a mining company to prepare interview questions for a host-community recruitment interview.

The candidate will attend a PHYSICAL interview at the mine site. Your questions should help the interviewer:
1. Verify the technical claims in the candidate's profile
2. Assess safety consciousness (critical in mining)
3. Explore scenario-based problem solving
4. Understand real experience depth

${jobContext}

${applicantContext}

Generate exactly 12 interview questions in this JSON format:
[
  {
    "type": "TECHNICAL" | "EXPERIENTIAL" | "SAFETY_COMPLIANCE" | "SCENARIO_BASED",
    "question": "The full question text",
    "rubric": "What a strong answer would include (2-3 sentences)",
    "mappedTo": "Which job requirement or applicant claim this question addresses"
  }
]

Guidelines:
- 3 TECHNICAL questions: test knowledge of the role's technical requirements
- 3 EXPERIENTIAL questions: verify specific claims in their work history
- 3 SAFETY_COMPLIANCE questions: assess safety awareness (mandatory in mining)
- 3 SCENARIO_BASED questions: present realistic on-site scenarios

Reference the applicant's specific background where possible. If they claim X years at employer Y, ask them to describe a specific situation from that time.

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

  try {
    const rawText = await generateAIText(prompt, 2500);

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
