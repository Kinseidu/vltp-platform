// src/app/hr/shortlisting/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { DashboardLayout, PageHeader, EmptyState } from '@/components/shared/DashboardLayout';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { NotificationBell } from '@/components/shared/NotificationBell';
import { BarChart2, Zap, Loader2, ChevronDown, ChevronUp, CheckCircle, XCircle, Info, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/components/shared/ToastProvider';

export default function ShortlistingPage() {
  const [user, setUser] = useState<any>(null);
  const [jobs, setJobs] = useState<any[]>([]);
  const [selectedJob, setSelectedJob] = useState<string>('');
  const [results, setResults] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [running, setRunning] = useState(false);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    Promise.all([
      fetch('/api/auth/me').then(r => r.json()),
      fetch('/api/jobs?status=OPEN').then(r => r.json()),
    ]).then(([u, j]) => {
      if (u.success) setUser(u.data.user);
      if (j.success) setJobs(j.data.jobs || []);
      setLoading(false);
    });
  }, []);

  const loadExistingResults = async (jobId: string) => {
    if (!jobId) return;
    const res = await fetch(`/api/ai/shortlist/${jobId}`);
    const data = await res.json();
    if (data.success && data.data.results?.length > 0) {
      setResults(data.data.results);
      setSummary(null);
    } else {
      setResults([]);
    }
  };

  const handleJobChange = (jobId: string) => {
    setSelectedJob(jobId);
    setResults([]);
    setSummary(null);
    if (jobId) loadExistingResults(jobId);
  };

  const runShortlist = async () => {
    if (!selectedJob) return;
    setRunning(true);
    setResults([]);
    setSummary(null);

    try {
      const res = await fetch(`/api/ai/shortlist/${selectedJob}`, { method: 'POST' });
      const data = await res.json();

      if (data.success) {
        setResults(data.data.shortlist);
        setSummary(data.data.summary);
        toast({ title: 'Success', description: 'AI Shortlist analysis complete', variant: 'success' });
      } else {
        toast({ title: 'Error', description: data.error || 'Shortlisting failed', variant: 'error' });
      }
    } catch (err) {
      toast({ title: 'Error', description: 'Network error during AI analysis', variant: 'error' });
    }
    setRunning(false);
  };

  const handleOverride = async (appId: number, include: boolean, note: string) => {
    const res = await fetch(`/api/ai/shortlist/override/${appId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ include, note }),
    });
    if (res.ok) {
      setResults(prev => prev.map(r =>
        r.application?.id === appId ? { ...r, hrOverride: true, hrOverrideNote: note } : r
      ));
    }
  };

  const eligible = results.filter(r => r.eligibilityStatus === 'ELIGIBLE' || r.hrOverride);
  const ineligible = results.filter(r => r.eligibilityStatus !== 'ELIGIBLE' && !r.hrOverride);

  const ScoreBar = ({ label, value }: { label: string; value: number }) => (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-500 dark:text-gray-400 w-32 flex-shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full">
        <div className="h-1.5 rounded-full bg-blue-500 transition-all" style={{ width: `${Math.round(value)}%` }} />
      </div>
      <span className="text-xs font-medium text-gray-700 dark:text-gray-300 w-8 text-right">{Math.round(value)}</span>
    </div>
  );

  return (
      <DashboardLayout role={user?.role || 'HR_OFFICER'} userName={user?.email || ''} userEmail={user?.email || ''}>
        <NotificationBell role={user?.role} />
        <PageHeader
        title="AI-Assisted Shortlisting"
        subtitle="Hard filters first, then AI ranks eligible applicants. You make the final call."
      />

      {/* Job selector + run button */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 mb-6 flex items-end gap-4 flex-wrap">
        <div className="flex-1 min-w-64">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Select Job</label>
          <select
            value={selectedJob}
            onChange={e => handleJobChange(e.target.value)}
            className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 bg-white dark:bg-gray-800 dark:text-gray-100"
          >
            <option value="">Choose an open job...</option>
            {jobs.map((j: any) => (
              <option key={j.id} value={j.id}>
                {j.title} ({j._count?.applications || 0} applications)
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={runShortlist}
          disabled={!selectedJob || running}
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium px-5 py-2.5 rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {running ? <Loader2 size={15} className="animate-spin" /> : <Zap size={15} />}
          {running ? 'Running AI shortlist...' : 'Run Shortlist'}
        </button>
      </div>

      {/* removed message */}

      {/* AI disclaimer */}
      <div className="flex items-start gap-2 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3 mb-6 text-xs text-amber-800 dark:text-amber-300">
        <Info size={14} className="mt-0.5 flex-shrink-0" />
        <span>
          <strong>AI assists, you decide.</strong> Results below are AI recommendations only. Hard eligibility
          filters (verified status, community, experience, mandatory certs) are applied first by rule-based logic.
          The AI then ranks the eligible pool. You can override any decision.
        </span>
      </div>

      {/* Summary strip */}
      {summary && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 p-4 text-center">
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{summary.total}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Total Applicants</div>
          </div>
          <div className="bg-green-50 dark:bg-green-900/30 rounded-lg border border-green-200 dark:border-green-800 p-4 text-center">
            <div className="text-2xl font-bold text-green-700 dark:text-green-300">{summary.eligible}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Eligible</div>
          </div>
          <div className="bg-red-50 dark:bg-red-900/30 rounded-lg border border-red-200 dark:border-red-800 p-4 text-center">
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">{summary.ineligible}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Did Not Pass Filters</div>
          </div>
        </div>
      )}

      {/* Results */}
      {results.length === 0 && !running && (
        <EmptyState
          icon={<BarChart2 size={24} />}
          title={selectedJob ? 'No results yet' : 'Select a job to begin'}
          message={selectedJob ? 'Click "Run Shortlist" to analyse applicants for this job.' : 'Choose an open job from the dropdown above.'}
        />
      )}

      {eligible.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
            <CheckCircle size={16} className="text-green-500" /> Eligible Applicants — Ranked by AI
          </h2>
          <div className="space-y-3">
            {eligible.map((r: any, idx: number) => {
              const app = r.application;
              const isOpen = expanded === r.applicationId;
              return (
                <div key={r.applicationId} className={`bg-white dark:bg-gray-900 rounded-xl border transition-all ${r.hrOverride ? 'border-amber-300 dark:border-amber-700' : 'border-gray-200 dark:border-gray-700'}`}>
                <div
                  role="button"
                  tabIndex={0}
                  aria-expanded={isOpen}
                  aria-controls={`shortlist-content-${r.applicationId}`}
                  className="flex items-center gap-4 p-4 cursor-pointer"
                  onClick={() => setExpanded(isOpen ? null : r.applicationId)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setExpanded(isOpen ? null : r.applicationId); } }}
                >
                  <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 flex items-center justify-center text-sm font-bold flex-shrink-0">
                    #{idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        {app?.applicant?.fullName || r.applicantName}
                      </span>
                      {r.hrOverride && (
                        <span className="text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full font-medium">HR Override</span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {app?.applicant?.community?.name} · {app?.documents?.length || 0} docs uploaded
                    </div>
                  </div>
                  {/* Score ring */}
                  <div className="text-center">
                    <div className={`text-2xl font-bold ${r.matchScore >= 70 ? 'text-green-600 dark:text-green-400' : r.matchScore >= 50 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-500 dark:text-red-400'}`}>
                      {Math.round(r.matchScore)}
                    </div>
                    <div className="text-xs text-gray-400 dark:text-gray-500">/ 100</div>
                  </div>
                  <StatusBadge status={r.eligibilityStatus} size="sm" />
                  {isOpen ? <ChevronUp size={16} className="text-gray-400 dark:text-gray-500" /> : <ChevronDown size={16} className="text-gray-400 dark:text-gray-500" />}
                </div>

                {isOpen && (
                  <div id={`shortlist-content-${r.applicationId}`} role="region" className="border-t border-gray-100 dark:border-gray-700 p-4 space-y-4">
                      {/* Score breakdown */}
                      <div>
                        <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Score Breakdown</h4>
                        <div className="space-y-1.5">
                          <ScoreBar label="Skills match" value={r.skillsMatchScore} />
                          <ScoreBar label="Experience" value={r.experienceScore} />
                          <ScoreBar label="Documents/Certs" value={r.certsScore} />
                          <ScoreBar label="Role relevance" value={r.roleRelevanceScore} />
                        </div>
                      </div>

                      {/* Reasons */}
                      {r.reasons?.length > 0 && (
                        <div>
                          <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Why this score</h4>
                          <ul className="space-y-1">
                            {r.reasons.map((reason: string, i: number) => (
                              <li key={i} className="text-xs text-gray-600 dark:text-gray-400 flex items-start gap-1.5">
                                <CheckCircle size={12} className="text-green-500 mt-0.5 flex-shrink-0" /> {reason}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Missing requirements */}
                      {r.missingRequirements?.length > 0 && (
                        <div>
                          <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Missing / Gaps</h4>
                          <ul className="space-y-1">
                            {r.missingRequirements.map((m: string, i: number) => (
                              <li key={i} className="text-xs text-gray-600 dark:text-gray-400 flex items-start gap-1.5">
                                <AlertTriangle size={12} className="text-yellow-500 mt-0.5 flex-shrink-0" /> {m}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                        <Link href={`/hr/applications/${r.applicationId}`}
                          className="text-xs text-blue-600 hover:underline font-medium">
                          View full application →
                        </Link>
                        {!r.hrOverride && (
                          <button
                            onClick={() => {
                              const note = prompt('Override note (optional):') || '';
                              handleOverride(r.applicationId, true, note);
                            }}
                            className="text-xs text-amber-600 hover:underline font-medium ml-auto"
                          >
                            Override decision
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Ineligible */}
      {ineligible.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
            <XCircle size={16} className="text-red-400" /> Did Not Pass Hard Filters
          </h2>
          <div className="space-y-2">
            {ineligible.map((r: any) => (
              <div key={r.applicationId} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 flex items-center gap-4">
                <div className="flex-1">
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {r.application?.applicant?.fullName || r.applicantName}
                  </span>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {r.reasons?.join(' · ')}
                  </div>
                </div>
                <StatusBadge status={r.eligibilityStatus} size="sm" />
                <button
                  onClick={() => {
                    const note = prompt('Override note (required — explain why you are including this applicant):') || '';
                    if (note) handleOverride(r.applicationId, true, note);
                  }}
                  className="text-xs text-amber-600 hover:underline font-medium"
                >
                  Override & include
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
