// src/app/api/ai/interview-questions/export/[packId]/route.ts
// Generates a printable HTML interview pack (print-to-PDF via browser)
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getSession } from '@/lib/auth/jwt';
import { forbidden, notFound } from '@/lib/utils/api';
import { audit } from '@/lib/services/audit.service';
import { UserRole } from '@prisma/client';
import { format } from 'date-fns';

export const GET = async (req: NextRequest, { params }: { params: { packId: string } }) => {
  const session = await getSession();
  if (!session || (session.role !== UserRole.HR_OFFICER && session.role !== UserRole.ADMIN)) {
    return forbidden();
  }

  const packId = parseInt(params.packId);

  const pack = await prisma.interviewQuestionPack.findUnique({
    where: { id: packId },
    include: {
      questions: { orderBy: { displayOrder: 'asc' } },
      application: {
        include: {
          applicant: {
            include: {
              community: true,
              skills: { include: { skill: true } },
              workExperiences: { orderBy: { startDate: 'desc' }, take: 3 },
            },
          },
          job: {
            include: { requirements: { include: { skill: true } } },
          },
          shortlistResult: true,
        },
      },
    },
  });

  if (!pack) return notFound('Interview pack not found');

  const { application } = pack;
  const { applicant, job } = application;

  const questionsByType: Record<string, typeof pack.questions> = {};
  for (const q of pack.questions) {
    if (!questionsByType[q.type]) questionsByType[q.type] = [];
    questionsByType[q.type].push(q);
  }

  const typeLabels: Record<string, string> = {
    TECHNICAL: '🔧 Technical Questions',
    EXPERIENTIAL: '📋 Experiential Questions',
    SAFETY_COMPLIANCE: '⛑ Safety & Compliance Questions',
    SCENARIO_BASED: '🎯 Scenario-Based Questions',
  };

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Interview Pack — ${applicant.fullName} — ${job.title}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 13px; color: #111; max-width: 800px; margin: 0 auto; padding: 32px; }
    h1 { font-size: 20px; color: #1a1a2e; border-bottom: 2px solid #1a1a2e; padding-bottom: 8px; }
    h2 { font-size: 15px; color: #16213e; margin-top: 28px; }
    h3 { font-size: 13px; color: #374151; margin: 16px 0 6px; }
    .header-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 16px; margin: 16px 0; }
    .header-item label { font-size: 10px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; }
    .header-item span { display: block; font-size: 13px; font-weight: 500; color: #1e293b; margin-top: 2px; }
    .score-bar { display: flex; align-items: center; gap: 8px; margin: 4px 0; }
    .score-label { width: 140px; font-size: 11px; color: #64748b; }
    .score-track { flex: 1; height: 6px; background: #e2e8f0; border-radius: 3px; }
    .score-fill { height: 6px; background: #3b82f6; border-radius: 3px; }
    .question-block { border: 1px solid #e2e8f0; border-radius: 6px; padding: 14px 16px; margin-bottom: 12px; page-break-inside: avoid; }
    .question-num { font-size: 10px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; }
    .question-text { font-size: 13px; font-weight: 500; color: #1e293b; margin-bottom: 8px; }
    .question-rubric { font-size: 12px; color: #475569; background: #f8fafc; padding: 8px 10px; border-radius: 4px; border-left: 3px solid #3b82f6; }
    .question-mapped { font-size: 10px; color: #94a3b8; margin-top: 6px; }
    .answer-box { border: 1px solid #e2e8f0; border-radius: 4px; height: 60px; margin-top: 8px; }
    .type-header { font-size: 14px; font-weight: 600; color: #1e293b; margin: 24px 0 12px; padding: 8px 12px; background: #f1f5f9; border-radius: 4px; }
    .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 10px; color: #94a3b8; display: flex; justify-content: space-between; }
    .badge { display: inline-block; font-size: 10px; padding: 2px 8px; border-radius: 10px; font-weight: 500; }
    .badge-eligible { background: #d1fae5; color: #065f46; }
    .badge-ineligible { background: #fee2e2; color: #991b1b; }
    @media print { body { padding: 16px; } .no-print { display: none; } }
  </style>
</head>
<body>
  <div class="no-print" style="background:#fef3c7;padding:12px 16px;border-radius:6px;margin-bottom:24px;font-size:12px;color:#92400e;">
    📄 Press <strong>Ctrl+P</strong> (or Cmd+P on Mac) to print or save as PDF
  </div>

  <h1>Interview Question Pack</h1>
  <p style="color:#64748b;margin:0 0 16px">Generated ${format(new Date(pack.generatedAt), 'dd MMMM yyyy, HH:mm')}${pack.isEdited ? ' · Edited by HR' : ''}</p>

  <div class="header-grid">
    <div class="header-item"><label>Applicant</label><span>${applicant.fullName}</span></div>
    <div class="header-item"><label>Community</label><span>${applicant.community.name}</span></div>
    <div class="header-item"><label>Position Applied</label><span>${job.title}</span></div>
    <div class="header-item"><label>Interview Date</label><span>___________________</span></div>
    <div class="header-item"><label>Interviewer(s)</label><span>___________________</span></div>
    <div class="header-item"><label>Location</label><span>Mine Site / HR Office</span></div>
  </div>

  ${application.shortlistResult ? `
  <h2>AI Shortlist Score</h2>
  <div style="margin:8px 0 16px">
    <span class="badge ${application.shortlistResult.eligibilityStatus === 'ELIGIBLE' ? 'badge-eligible' : 'badge-ineligible'}">
      ${application.shortlistResult.eligibilityStatus.replace(/_/g, ' ')}
    </span>
    <strong style="margin-left:12px">Overall Match: ${application.shortlistResult.matchScore}/100</strong>
  </div>
  <div class="score-bar"><span class="score-label">Skills match</span><div class="score-track"><div class="score-fill" style="width:${application.shortlistResult.skillsMatchScore}%"></div></div><span>${application.shortlistResult.skillsMatchScore}%</span></div>
  <div class="score-bar"><span class="score-label">Experience</span><div class="score-track"><div class="score-fill" style="width:${application.shortlistResult.experienceScore}%"></div></div><span>${application.shortlistResult.experienceScore}%</span></div>
  <div class="score-bar"><span class="score-label">Documents/Certs</span><div class="score-track"><div class="score-fill" style="width:${application.shortlistResult.certsScore}%"></div></div><span>${application.shortlistResult.certsScore}%</span></div>
  ` : ''}

  <h2>Candidate Summary</h2>
  <p><strong>Skills:</strong> ${applicant.skills.map(s => `${s.skill.name} (${s.yearsOfExp}yr)`).join(', ') || 'Not listed'}</p>
  <p><strong>Recent Experience:</strong> ${applicant.workExperiences.slice(0, 2).map(w => `${w.jobTitle} at ${w.employer}`).join(' | ') || 'Not listed'}</p>

  <h2>Interview Questions</h2>
  ${Object.entries(questionsByType).map(([type, questions]) => `
    <div class="type-header">${typeLabels[type] || type}</div>
    ${questions.map((q, idx) => `
      <div class="question-block">
        <div class="question-num">Question ${q.displayOrder}</div>
        <div class="question-text">${q.question}</div>
        ${q.rubric ? `<div class="question-rubric"><strong>Good answer includes:</strong> ${q.rubric}</div>` : ''}
        ${q.mappedTo ? `<div class="question-mapped">↳ Linked to: ${q.mappedTo}</div>` : ''}
        <div class="answer-box"></div>
      </div>
    `).join('')}
  `).join('')}

  <div style="margin-top:32px;border-top:2px solid #e2e8f0;padding-top:16px">
    <h2>Interviewer Notes</h2>
    <div style="border:1px solid #e2e8f0;border-radius:6px;height:100px;margin-top:8px;"></div>
    <div style="margin-top:24px;display:flex;gap:48px">
      <div>
        <div style="border-bottom:1px solid #111;width:200px;height:40px;"></div>
        <div style="font-size:11px;color:#64748b;margin-top:4px">Interviewer Signature</div>
      </div>
      <div>
        <div style="border-bottom:1px solid #111;width:200px;height:40px;"></div>
        <div style="font-size:11px;color:#64748b;margin-top:4px">Date</div>
      </div>
    </div>
  </div>

  <div class="footer">
    <span>Verified Local Talent Platform — Confidential</span>
    <span>Generated by HR System — Not for public distribution</span>
  </div>
</body>
</html>`;

  // Mark as exported
  await prisma.interviewQuestionPack.update({
    where: { id: packId },
    data: { exportedAt: new Date() },
  });

  await audit({
    actorId: session.id,
    action: 'INTERVIEW_PACK_EXPORTED',
    entity: 'InterviewQuestionPack',
    entityId: packId,
  });

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Disposition': `inline; filename="interview-pack-${application.applicant.fullName.replace(/\s+/g, '-')}.html"`,
    },
  });
};
