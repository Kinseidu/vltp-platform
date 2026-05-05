'use client';

import { useEffect, useState } from 'react';
import { DashboardLayout, EmptyState, PageHeader } from '@/components/shared/DashboardLayout';
import { AppSpinner } from '@/components/shared/AppSpinner';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { CheckCircle, ChevronDown, ChevronUp, Loader2, Shield, XCircle } from 'lucide-react';

type Decision = 'CONFIRM' | 'REJECT';

export default function ChiefConfirmationsPage() {
  const [user, setUser] = useState<any>(null);
  const [requests, setRequests] = useState<any[]>([]);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [chiefNameByReq, setChiefNameByReq] = useState<Record<number, string>>({});
  const [notesByReq, setNotesByReq] = useState<Record<number, string>>({});
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

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
      setMessage('Chief name is required before submitting a confirmation decision.');
      return;
    }

    setMessage('');
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
      setMessage(data.error || 'Failed to submit decision');
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
        <div className="h-[70vh] flex flex-col items-center justify-center gap-3 text-gray-500">
          <AppSpinner size="md" />
          <p className="text-sm">Loading confirmations...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!user) {
    window.location.href = '/auth/login';
    return null;
  }

  return (
    <DashboardLayout role={user.role} userName={user.email} userEmail={user.email}>
      <PageHeader
        title="Chief Confirmations"
        subtitle={`${requests.length} youth-approved request${requests.length === 1 ? '' : 's'} awaiting confirmation`}
      />

      <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 mb-6 text-sm text-indigo-800">
        Record the Chief&apos;s decision for each applicant after Youth President approval. This action updates both
        verification request status and applicant verification status.
      </div>

      {message && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{message}</div>
      )}

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
              <div key={req.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div
                  className="p-5 flex items-center gap-4 cursor-pointer hover:bg-gray-50"
                  onClick={() => setExpanded(open ? null : req.id)}
                >
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-700 font-semibold">
                    {applicant.fullName?.charAt(0) || 'A'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-gray-900">{applicant.fullName}</div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {applicant.user?.email} · {applicant.community?.name}
                    </div>
                  </div>
                  <StatusBadge status={req.status} size="sm" />
                  {open ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                </div>

                {open && (
                  <div className="border-t border-gray-100 p-6 bg-gray-50/30 space-y-6 animate-in slide-in-from-top-2 duration-200">
                    {/* Applicant Bio & Info */}
                    <div className="grid md:grid-cols-3 gap-6">
                      <div className="md:col-span-2 space-y-4">
                        <div>
                          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Applicant Bio</h4>
                          <p className="text-sm text-gray-700 leading-relaxed bg-white p-3 rounded-lg border border-gray-100 italic">
                            {applicant.bio || 'No bio provided.'}
                          </p>
                        </div>
                        
                        <div className="grid sm:grid-cols-2 gap-4">
                          <div className="bg-white p-3 rounded-lg border border-gray-100">
                            <h4 className="text-[10px] font-bold text-gray-400 uppercase mb-1">Skills</h4>
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              {applicant.skills?.length > 0 ? (
                                applicant.skills.map((s: any) => (
                                  <span key={s.id} className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-[10px] font-medium border border-blue-100">
                                    {s.skill.name} ({s.yearsOfExp}y)
                                  </span>
                                ))
                              ) : (
                                <span className="text-xs text-gray-400">None listed</span>
                              )}
                            </div>
                          </div>
                          <div className="bg-white p-3 rounded-lg border border-gray-100">
                            <h4 className="text-[10px] font-bold text-gray-400 uppercase mb-1">Education</h4>
                            <p className="text-xs text-gray-700 mt-1">{applicant.highestEducation || 'Not specified'}</p>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                          <h4 className="text-xs font-bold text-indigo-900 uppercase tracking-wider mb-2">Youth Decision</h4>
                          <div className="flex items-center gap-2 mb-2">
                            <StatusBadge status={req.status} size="sm" />
                            <span className="text-[10px] text-indigo-700 font-medium">
                              {new Date(req.youthVerification?.decisionAt).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-xs text-indigo-800 italic leading-relaxed">
                            &ldquo;{req.youthVerification?.notes || 'No notes provided by Youth President.'}&rdquo;
                          </p>
                          <div className="mt-2 pt-2 border-t border-indigo-200/50 text-[10px] text-indigo-600">
                            Reviewed by: {req.youthVerification?.youthPresident?.email}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Work Experience */}
                    <div>
                      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Work Experience (Top 3)</h4>
                      <div className="grid sm:grid-cols-3 gap-3">
                        {applicant.workExperiences?.length > 0 ? (
                          applicant.workExperiences.map((exp: any) => (
                            <div key={exp.id} className="bg-white p-3 rounded-lg border border-gray-200">
                              <div className="text-xs font-bold text-gray-900">{exp.jobTitle}</div>
                              <div className="text-[10px] text-gray-500 mb-1">{exp.employer}</div>
                              <div className="text-[10px] text-blue-600 font-medium">
                                {new Date(exp.startDate).getFullYear()} - {exp.isCurrent ? 'Present' : new Date(exp.endDate).getFullYear()}
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="col-span-3 text-center py-4 text-xs text-gray-400 bg-white rounded-lg border border-dashed border-gray-200">
                            No work experience records found.
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Decision Form */}
                    <div className="pt-4 border-t border-gray-100 space-y-4">
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-gray-600 mb-1">Chief Name (Recorded Official)</label>
                          <input
                            type="text"
                            value={chiefNameByReq[req.id] || ''}
                            onChange={e => setChiefNameByReq(prev => ({ ...prev, [req.id]: e.target.value }))}
                            placeholder="e.g. Nana Akuamoah III"
                            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-600 mb-1">Verification Notes (Optional)</label>
                          <textarea
                            rows={1}
                            value={notesByReq[req.id] || ''}
                            onChange={e => setNotesByReq(prev => ({ ...prev, [req.id]: e.target.value }))}
                            placeholder="e.g. Confirmed via phone call"
                            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm resize-none"
                          />
                        </div>
                      </div>

                      <div className="grid sm:grid-cols-2 gap-3">
                        <button
                          onClick={() => submitDecision(req.id, 'CONFIRM')}
                          disabled={disabled}
                          className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl text-sm font-bold shadow-md hover:shadow-lg transition-all disabled:opacity-50"
                        >
                          {disabled ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                          Finalize Confirmation
                        </button>
                        <button
                          onClick={() => submitDecision(req.id, 'REJECT')}
                          disabled={disabled}
                          className="flex items-center justify-center gap-2 bg-white hover:bg-red-50 text-red-600 border border-red-200 py-3 rounded-xl text-sm font-bold transition-all disabled:opacity-50"
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
