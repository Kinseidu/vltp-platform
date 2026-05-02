// src/app/hr/applications/[id]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { DashboardLayout, PageHeader } from '@/components/shared/DashboardLayout';
import { StatusBadge } from '@/components/shared/StatusBadge';
import {
  ChevronLeft, Zap, Loader2, FileText, ExternalLink,
  Edit2, Trash2, Plus, Download, CheckCircle
} from 'lucide-react';
import Link from 'next/link';

const STATUS_OPTIONS = [
  'SUBMITTED', 'UNDER_REVIEW', 'SHORTLISTED', 'REJECTED', 'INVITED_FOR_INTERVIEW'
];

const Q_TYPES = ['TECHNICAL', 'EXPERIENTIAL', 'SAFETY_COMPLIANCE', 'SCENARIO_BASED'];
const Q_TYPE_LABELS: Record<string, string> = {
  TECHNICAL: '🔧 Technical',
  EXPERIENTIAL: '📋 Experiential',
  SAFETY_COMPLIANCE: '⛑ Safety & Compliance',
  SCENARIO_BASED: '🎯 Scenario-Based',
};

export default function HRApplicationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [application, setApplication] = useState<any>(null);
  const [pack, setPack] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [generatingQ, setGeneratingQ] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [editingPack, setEditingPack] = useState(false);
  const [editedQuestions, setEditedQuestions] = useState<any[]>([]);
  const [savingPack, setSavingPack] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => d.success && setUser(d.data.user));
    fetchApplication();
  }, [id]);

  const fetchApplication = async () => {
    const res = await fetch(`/api/applications/${id}`);
    const data = await res.json();
    if (data.success) {
      setApplication(data.data.application);
      if (data.data.application.interviewPacks?.[0]) {
        setPack(data.data.application.interviewPacks[0]);
      }
    }
    setLoading(false);
  };

  const generateQuestions = async () => {
    setGeneratingQ(true);
    const res = await fetch(`/api/ai/interview-questions/${id}`, { method: 'POST' });
    const data = await res.json();
    if (data.success) {
      setPack(data.data.pack);
      setMessage('');
    } else {
      setMessage(data.error || 'Failed to generate questions');
    }
    setGeneratingQ(false);
  };

  const updateStatus = async (status: string) => {
    setUpdatingStatus(true);
    const res = await fetch(`/api/applications/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    const data = await res.json();
    if (data.success) {
      setApplication((prev: any) => ({ ...prev, status }));
    }
    setUpdatingStatus(false);
  };

  const startEdit = () => {
    setEditedQuestions(pack.questions.map((q: any) => ({ ...q })));
    setEditingPack(true);
  };

  const savePack = async () => {
    setSavingPack(true);
    const res = await fetch(`/api/ai/interview-questions/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ packId: pack.id, questions: editedQuestions }),
    });
    const data = await res.json();
    if (data.success) {
      setPack(data.data.pack);
      setEditingPack(false);
    }
    setSavingPack(false);
  };

  const updateQ = (idx: number, field: string, value: string) => {
    setEditedQuestions(prev => prev.map((q, i) => i === idx ? { ...q, [field]: value } : q));
  };

  const removeQ = (idx: number) => setEditedQuestions(prev => prev.filter((_, i) => i !== idx));

  const addQ = () => setEditedQuestions(prev => [
    ...prev,
    { type: 'TECHNICAL', question: '', rubric: '', mappedTo: '', displayOrder: prev.length + 1 }
  ]);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="text-gray-400 text-sm">Loading application...</div></div>;
  if (!application) return <div className="min-h-screen flex items-center justify-center"><div className="text-gray-400 text-sm">Application not found.</div></div>;

  const { applicant, job, documents, shortlistResult } = application;

  return (
    <DashboardLayout role={user?.role || 'HR_OFFICER'} userName={user?.email || ''} userEmail={user?.email || ''}>
      <div className="mb-4">
        <button onClick={() => router.back()} className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
          <ChevronLeft size={16} /> Back
        </button>
      </div>

      <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{applicant.fullName}</h1>
          <p className="text-sm text-gray-500 mt-0.5">Applied for: <strong>{job.title}</strong> · Community: {applicant.community?.name}</p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={application.status} />
          <select
            value={application.status}
            onChange={e => updateStatus(e.target.value)}
            disabled={updatingStatus}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
          </select>
        </div>
      </div>

      {message && (
        <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg border border-red-200 mb-4">{message}</div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left column: applicant info */}
        <div className="lg:col-span-1 space-y-4">
          {/* Profile summary */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Profile Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Email</span>
                <span className="text-gray-900 font-medium">{applicant.user?.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Phone</span>
                <span className="text-gray-900 font-medium">{applicant.user?.phone || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Community</span>
                <span className="text-gray-900 font-medium">{applicant.community?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Verification</span>
                <StatusBadge status={applicant.verificationStatus} size="sm" />
              </div>
            </div>
          </div>

          {/* Skills */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Skills</h3>
            <div className="space-y-2">
              {applicant.skills?.map((s: any) => (
                <div key={s.id} className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">{s.skill?.name}</span>
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                    {s.yearsOfExp}yr · {s.proficiency}
                  </span>
                </div>
              ))}
              {!applicant.skills?.length && <p className="text-xs text-gray-400">No skills listed</p>}
            </div>
          </div>

          {/* Work experience */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Work Experience</h3>
            <div className="space-y-3">
              {applicant.workExperiences?.map((w: any) => (
                <div key={w.id} className="border-l-2 border-blue-200 pl-3">
                  <div className="text-sm font-medium text-gray-900">{w.jobTitle}</div>
                  <div className="text-xs text-gray-500">{w.employer}</div>
                  <div className="text-xs text-gray-400">
                    {new Date(w.startDate).getFullYear()} – {w.endDate ? new Date(w.endDate).getFullYear() : 'Present'}
                  </div>
                  {w.description && <p className="text-xs text-gray-600 mt-1">{w.description}</p>}
                </div>
              ))}
              {!applicant.workExperiences?.length && <p className="text-xs text-gray-400">No experience listed</p>}
            </div>
          </div>

          {/* Documents */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Uploaded Documents ({documents?.length || 0})</h3>
            {documents?.length === 0 && <p className="text-xs text-gray-400">No documents uploaded yet</p>}
            <div className="space-y-2">
              {documents?.map((doc: any) => (
                <div key={doc.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg border border-gray-200">
                  <FileText size={14} className="text-blue-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-gray-900 truncate">{doc.label}</div>
                    <div className="text-xs text-gray-400">{doc.originalName}</div>
                  </div>
                  <ExternalLink size={12} className="text-gray-400" />
                </div>
              ))}
            </div>
          </div>

          {/* AI shortlist score */}
          {shortlistResult && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">AI Shortlist Score</h3>
              <div className="text-3xl font-bold text-blue-600 mb-1">{Math.round(shortlistResult.matchScore)}<span className="text-base text-gray-400">/100</span></div>
              <StatusBadge status={shortlistResult.eligibilityStatus} size="sm" />
              <div className="mt-3 space-y-1">
                {(shortlistResult.reasons as string[]).map((r, i) => (
                  <div key={i} className="text-xs text-gray-600 flex items-start gap-1">
                    <CheckCircle size={11} className="text-green-500 mt-0.5 flex-shrink-0" /> {r}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right column: interview questions */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-semibold text-gray-900">Interview Question Pack</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  AI generates questions from job scope and applicant profile. You can edit before printing.
                </p>
              </div>
              <div className="flex gap-2">
                {pack && (
                  <>
                    {!editingPack ? (
                      <button onClick={startEdit}
                        className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 px-3 py-1.5 rounded-lg hover:bg-gray-50">
                        <Edit2 size={13} /> Edit
                      </button>
                    ) : (
                      <button onClick={savePack} disabled={savingPack}
                        className="inline-flex items-center gap-1.5 text-sm text-white bg-green-600 hover:bg-green-700 px-3 py-1.5 rounded-lg">
                        {savingPack && <Loader2 size={13} className="animate-spin" />}
                        Save
                      </button>
                    )}
                    <a href={`/api/ai/interview-questions/export/${pack.id}`} target="_blank" rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 border border-blue-300 px-3 py-1.5 rounded-lg hover:bg-blue-50">
                      <Download size={13} /> Export PDF
                    </a>
                  </>
                )}
                <button
                  onClick={generateQuestions}
                  disabled={generatingQ}
                  className="inline-flex items-center gap-1.5 text-sm text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-lg disabled:opacity-50"
                >
                  {generatingQ ? <Loader2 size={13} className="animate-spin" /> : <Zap size={13} />}
                  {pack ? 'Regenerate' : 'Generate Questions'}
                </button>
              </div>
            </div>

            {!pack && !generatingQ && (
              <div className="text-center py-12 text-gray-400">
                <Zap size={32} className="mx-auto mb-3 text-gray-300" />
                <p className="text-sm">Click "Generate Questions" to create an AI-powered interview pack for this applicant.</p>
              </div>
            )}

            {generatingQ && (
              <div className="text-center py-12">
                <Loader2 size={28} className="mx-auto mb-3 text-blue-500 animate-spin" />
                <p className="text-sm text-gray-500">AI is generating personalised interview questions...</p>
              </div>
            )}

            {pack && !editingPack && (
              <div className="space-y-4">
                {Q_TYPES.map(type => {
                  const qs = pack.questions?.filter((q: any) => q.type === type) || [];
                  if (qs.length === 0) return null;
                  return (
                    <div key={type}>
                      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{Q_TYPE_LABELS[type]}</h4>
                      <div className="space-y-2">
                        {qs.map((q: any, i: number) => (
                          <div key={q.id} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                            <div className="text-xs text-gray-400 mb-1">Q{q.displayOrder}</div>
                            <p className="text-sm font-medium text-gray-900 mb-1">{q.question}</p>
                            {q.rubric && (
                              <p className="text-xs text-gray-500 bg-white px-2 py-1 rounded border border-gray-200 mt-1">
                                <strong>Good answer:</strong> {q.rubric}
                              </p>
                            )}
                            {q.mappedTo && (
                              <p className="text-xs text-gray-400 mt-1">↳ {q.mappedTo}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Edit mode */}
            {editingPack && (
              <div className="space-y-3">
                {editedQuestions.map((q: any, idx: number) => (
                  <div key={idx} className="p-3 bg-gray-50 rounded-lg border border-gray-200 space-y-2">
                    <div className="flex items-center gap-2">
                      <select value={q.type} onChange={e => updateQ(idx, 'type', e.target.value)}
                        className="px-2 py-1 border border-gray-300 rounded text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-500">
                        {Q_TYPES.map(t => <option key={t} value={t}>{Q_TYPE_LABELS[t]}</option>)}
                      </select>
                      <button onClick={() => removeQ(idx)} className="ml-auto text-red-400 hover:text-red-600">
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <textarea
                      value={q.question}
                      onChange={e => updateQ(idx, 'question', e.target.value)}
                      rows={2}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                      placeholder="Question text..."
                    />
                    <input
                      value={q.rubric || ''}
                      onChange={e => updateQ(idx, 'rubric', e.target.value)}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="Good answer rubric (optional)..."
                    />
                    <input
                      value={q.mappedTo || ''}
                      onChange={e => updateQ(idx, 'mappedTo', e.target.value)}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="Linked to requirement (optional)..."
                    />
                  </div>
                ))}
                <button onClick={addQ}
                  className="w-full py-2 border-2 border-dashed border-gray-300 text-sm text-gray-500 rounded-lg hover:border-blue-400 hover:text-blue-600 flex items-center justify-center gap-1.5">
                  <Plus size={15} /> Add Question
                </button>
                <div className="flex gap-2 justify-end">
                  <button onClick={() => setEditingPack(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
                    Cancel
                  </button>
                  <button onClick={savePack} disabled={savingPack}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium">
                    {savingPack && <Loader2 size={14} className="animate-spin" />}
                    Save Changes
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
