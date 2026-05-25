'use client';

import { useEffect, useState } from 'react';
import { DashboardLayout, EmptyState, PageHeader } from '@/components/shared/DashboardLayout';
import { SkeletonList } from '@/components/shared/Skeleton';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { CheckCircle, ChevronDown, ChevronUp, Loader2, Shield, XCircle } from 'lucide-react';
import { NotificationBell } from '@/components/shared/NotificationBell';
import { useToast } from '@/components/shared/ToastProvider';

type Decision = 'CONFIRM' | 'REJECT';

export default function ChiefConfirmationsPage() {
  const [user, setUser] = useState<any>(null);
  const [requests, setRequests] = useState<any[]>([]);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [chiefNameByReq, setChiefNameByReq] = useState<Record<number, string>>({});
  const [notesByReq, setNotesByReq] = useState<Record<number, string>>({});
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    Promise.all([
      fetch('/api/auth/me').then(r => r.json()),
      fetch('/api/verification/pending-chief').then(r => r.json()),
    ]).then(([meData, queueData]) => {
      if (meData.success) setUser(meData.data.user);
      if (queueData.success) setRequests(queueData.data.requests || []);
      setLoading(false);
    });
  }, []);

  const submitDecision = async (requestId: number, decision: Decision) => {
    const chiefName = (chiefNameByReq[requestId] || '').trim();
    if (!chiefName) {
      toast({ title: 'Error', description: 'Chief name is required before submitting a confirmation decision.', variant: 'error' });
      return;
    }

    setProcessingId(requestId);
    const res = await fetch(`/api/verification/${requestId}/chief-confirm`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chiefName,
        status: decision,
        notes: (notesByReq[requestId] || '').trim() || undefined,
      }),
    });

    const data = await res.json();
    if (!data.success) {
      toast({ title: 'Error', description: data.error || 'Failed to submit decision', variant: 'error' });
      setProcessingId(null);
      return;
    }

    setRequests(prev => prev.filter(r => r.id !== requestId));
    setExpanded(null);
    setProcessingId(null);
  };

  if (loading) {
    return (
      <DashboardLayout role="CHIEF_STAFF" userName="" userEmail="">
        <NotificationBell />
        <SkeletonList count={5} />
      </DashboardLayout>
    );
  }

  if (!user) {
    window.location.href = '/auth/login';
    return null;
  }

  return (
    <DashboardLayout role={user.role} userName={user.email} userEmail={user.email}>
      <NotificationBell />
      <PageHeader
        title="Chief Confirmations"
        subtitle={`${requests.length} youth-approved request${requests.length === 1 ? '' : 's'} awaiting confirmation`}
      />

      <div className="bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800 rounded-xl p-4 mb-6 text-sm text-indigo-800 dark:text-indigo-300">
        Record the Chief&apos;s decision for each applicant after Youth President approval. This action updates both
        verification request status and applicant verification status.
      </div>

      {/* removed message */}

      {requests.length === 0 ? (
        <EmptyState
          icon={<CheckCircle size={24} />}
          title="No pending confirmations"
          message="There are no youth-approved requests waiting for Chief confirmation."
        />
      ) : (
        <div className="space-y-4">
          {requests.map((req: any) => {
            const applicant = req.applicant;
            const open = expanded === req.id;
            const disabled = processingId === req.id;
            return (
              <div key={req.id} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div
                  role="button"
                  tabIndex={0}
                  aria-expanded={open}
                  aria-controls={`req-content-${req.id}`}
                  className="p-5 flex items-center gap-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                  onClick={() => setExpanded(open ? null : req.id)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setExpanded(open ? null : req.id); } }}
                >
                  <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-700 dark:text-gray-300 font-semibold">
                    {applicant.fullName?.charAt(0) || 'A'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">{applicant.fullName}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {applicant.user?.email} · {applicant.community?.name}
                    </div>
                  </div>
                  <StatusBadge status={req.status} size="sm" />
                  {open ? <ChevronUp size={16} className="text-gray-400 dark:text-gray-500" /> : <ChevronDown size={16} className="text-gray-400 dark:text-gray-500" />}
                </div>

                {open && (
                  <div id={`req-content-${req.id}`} role="region" className="border-t border-gray-100 dark:border-gray-700 p-6 bg-gray-50/30 dark:bg-gray-800/30 space-y-6 animate-in slide-in-from-top-2 duration-200">
                    {/* Applicant Bio & Info */}
                    <div className="grid md:grid-cols-3 gap-6">
                      <div className="md:col-span-2 space-y-4">
                        <div>
                          <h4 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Applicant Bio</h4>
                          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-100 dark:border-gray-700 italic">
                            {applicant.bio || 'No bio provided.'}
                          </p>
                        </div>
                        
                        <div className="grid sm:grid-cols-2 gap-4">
                          <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-100 dark:border-gray-700">
                            <h4 className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase mb-1">Skills</h4>
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              {applicant.skills?.length > 0 ? (
                                applicant.skills.map((s: any) => (
                                  <span key={s.id} className="px-2 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-[10px] font-medium border border-blue-100 dark:border-blue-800">
                                    {s.skill.name} ({s.yearsOfExp}y)
                                  </span>
                                ))
                              ) : (
                                <span className="text-xs text-gray-400 dark:text-gray-500">None listed</span>
                              )}
                            </div>
                          </div>
                          <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-100 dark:border-gray-700">
                            <h4 className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase mb-1">Education</h4>
                            <p className="text-xs text-gray-700 dark:text-gray-300 mt-1">{applicant.highestEducation || 'Not specified'}</p>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="bg-indigo-50 dark:bg-indigo-900/30 p-4 rounded-xl border border-indigo-100 dark:border-indigo-800">
                          <h4 className="text-xs font-bold text-indigo-900 dark:text-indigo-300 uppercase tracking-wider mb-2">Youth Decision</h4>
                          <div className="flex items-center gap-2 mb-2">
                            <StatusBadge status={req.status} size="sm" />
                            <span className="text-[10px] text-indigo-700 dark:text-indigo-300 font-medium">
                              {new Date(req.youthVerification?.decisionAt).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-xs text-indigo-800 dark:text-indigo-300 italic leading-relaxed">
                            &ldquo;{req.youthVerification?.notes || 'No notes provided by Youth President.'}&rdquo;
                          </p>
                          <div className="mt-2 pt-2 border-t border-indigo-200/50 dark:border-indigo-800/50 text-[10px] text-indigo-600 dark:text-indigo-400">
                            Reviewed by: {req.youthVerification?.youthPresident?.email}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Work Experience */}
                    <div>
                      <h4 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Work Experience (Top 3)</h4>
                      <div className="grid sm:grid-cols-3 gap-3">
                        {applicant.workExperiences?.length > 0 ? (
                          applicant.workExperiences.map((exp: any) => (
                            <div key={exp.id} className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                              <div className="text-xs font-bold text-gray-900 dark:text-gray-100">{exp.jobTitle}</div>
                              <div className="text-[10px] text-gray-500 dark:text-gray-400 mb-1">{exp.employer}</div>
                              <div className="text-[10px] text-blue-600 font-medium">
                                {new Date(exp.startDate).getFullYear()} - {exp.isCurrent ? 'Present' : new Date(exp.endDate).getFullYear()}
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="col-span-3 text-center py-4 text-xs text-gray-400 dark:text-gray-500 bg-white dark:bg-gray-800 rounded-lg border border-dashed border-gray-200 dark:border-gray-700">
                            No work experience records found.
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Decision Form */}
                    <div className="pt-4 border-t border-gray-100 dark:border-gray-700 space-y-4">
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1">Chief Name (Recorded Official)</label>
                          <input
                            type="text"
                            value={chiefNameByReq[req.id] || ''}
                            onChange={e => setChiefNameByReq(prev => ({ ...prev, [req.id]: e.target.value }))}
                            placeholder="e.g. Nana Akuamoah III"
                            className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 shadow-sm dark:bg-gray-800 dark:text-gray-100"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1">Verification Notes (Optional)</label>
                          <textarea
                            rows={1}
                            value={notesByReq[req.id] || ''}
                            onChange={e => setNotesByReq(prev => ({ ...prev, [req.id]: e.target.value }))}
                            placeholder="e.g. Confirmed via phone call"
                            className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 shadow-sm resize-none dark:bg-gray-800 dark:text-gray-100"
                          />
                        </div>
                      </div>

                      <div className="grid sm:grid-cols-2 gap-3">
                        <button
                          onClick={() => submitDecision(req.id, 'CONFIRM')}
                          disabled={disabled}
                          className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl text-sm font-bold shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {disabled ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                          Finalize Confirmation
                        </button>
                        <button
                          onClick={() => submitDecision(req.id, 'REJECT')}
                          disabled={disabled}
                          className="flex items-center justify-center gap-2 bg-white dark:bg-gray-800 hover:bg-red-50 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 py-3 rounded-xl text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {disabled ? <Loader2 size={16} className="animate-spin" /> : <XCircle size={16} />}
                          Reject Request
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </DashboardLayout>
  );
}
