
'use client';

import { useEffect, useState } from 'react';
import { DashboardLayout, PageHeader, EmptyState } from '@/components/shared/DashboardLayout';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { CheckCircle, XCircle, ChevronDown, ChevronUp, User, Briefcase, Loader2, RefreshCw } from 'lucide-react';

export default function YouthVerificationsPage() {
  const [user, setUser] = useState<any>(null);
  const [requests, setRequests] = useState<any[]>([]);
  const [community, setCommunity] = useState<any>(null);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processing, setProcessing] = useState<number | null>(null);
  const [noteInput, setNoteInput] = useState<Record<number, string>>({});

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => d.success && setUser(d.data.user));
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    const res = await fetch('/api/verification/community');
    const data = await res.json();
    if (data.success) {
      setRequests(data.data.requests || []);
      setCommunity(data.data.community);
    }
    setLoading(false);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchRequests();
    setRefreshing(false);
  };

  const handleDecision = async (requestId: number, decision: 'APPROVE' | 'REJECT') => {
    setProcessing(requestId);
    const res = await fetch(`/api/verification/${requestId}/youth-decision`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision, notes: noteInput[requestId] || '' }),
    });
    const data = await res.json();
    if (data.success) {
      setRequests(prev => prev.filter(r => r.id !== requestId));
    }
    setProcessing(null);
  };

  return (
    <DashboardLayout role={user?.role || 'YOUTH_PRESIDENT'} userName={user?.email || ''} userEmail={user?.email || ''}>
      <PageHeader
        title="Verification Queue"
        subtitle={community ? `Community: ${community.name} · ${requests.length} pending` : 'Loading...'}
        action={
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
            {refreshing ? 'Refreshing...' : 'Refresh Queue'}
          </button>
        }
      />

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 text-sm text-blue-800">
        <strong>Your role:</strong> Review applicants from your assigned community ({community?.name}) and approve or reject 
        their verification requests. You can only review applicants from your own community. After your approval, 
        an authorised staff member will record the Chief&apos;s confirmation.
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400 text-sm">Loading requests...</div>
      ) : requests.length === 0 ? (
        <EmptyState
          icon={<CheckCircle size={24} />}
          title="No pending requests"
          message="There are no verification requests waiting for your review right now."
        />
      ) : (
        <div className="space-y-4">
          {requests.map((req: any) => {
            const applicant = req.applicant;
            const isOpen = expanded === req.id;
            return (
              <div key={req.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                {/* Header row */}
                <div
                  className="flex items-center gap-4 p-5 cursor-pointer hover:bg-gray-50"
                  onClick={() => setExpanded(isOpen ? null : req.id)}
                >
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-base font-semibold text-slate-600 flex-shrink-0">
                    {applicant.fullName?.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-gray-900">{applicant.fullName}</div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {applicant.user?.email} · {applicant.community?.name}
                    </div>
                  </div>
                  <div className="text-xs text-gray-400">
                    Submitted: {new Date(req.submittedAt).toLocaleDateString()}
                  </div>
                  <StatusBadge status={req.status} size="sm" />
                  {isOpen ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                </div>

                {/* Expanded details */}
                {isOpen && (
                  <div className="border-t border-gray-100 p-5 space-y-5">
                    <div className="grid md:grid-cols-2 gap-5">
                      {/* Skills */}
                      <div>
                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1">
                          <User size={12} /> Skills
                        </h4>
                        {applicant.skills?.length === 0 ? (
                          <p className="text-xs text-gray-400">No skills listed</p>
                        ) : (
                          <div className="space-y-1">
                            {applicant.skills?.map((s: any) => (
                              <div key={s.id} className="flex items-center justify-between text-sm">
                                <span className="text-gray-700">{s.skill?.name}</span>
                                <span className="text-xs text-gray-400">{s.yearsOfExp}yr</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Experience */}
                      <div>
                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1">
                          <Briefcase size={12} /> Work Experience
                        </h4>
                        {applicant.workExperiences?.length === 0 ? (
                          <p className="text-xs text-gray-400">No experience listed</p>
                        ) : (
                          <div className="space-y-2">
                            {applicant.workExperiences?.map((w: any) => (
                              <div key={w.id} className="border-l-2 border-gray-200 pl-2">
                                <div className="text-sm font-medium text-gray-800">{w.jobTitle}</div>
                                <div className="text-xs text-gray-500">{w.employer}</div>
                                <div className="text-xs text-gray-400">
                                  {new Date(w.startDate).getFullYear()} – {w.endDate ? new Date(w.endDate).getFullYear() : 'Present'}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Notes input */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Your notes (optional — shown in audit trail)
                      </label>
                      <textarea
                        rows={2}
                        value={noteInput[req.id] || ''}
                        onChange={e => setNoteInput({ ...noteInput, [req.id]: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                        placeholder="e.g. Confirmed community member. Known to the community for 5+ years."
                      />
                    </div>

                    {/* Decision buttons */}
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleDecision(req.id, 'APPROVE')}
                        disabled={processing === req.id}
                        className="flex-1 inline-flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-medium py-2.5 rounded-lg text-sm transition-colors disabled:opacity-50"
                      >
                        {processing === req.id ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle size={15} />}
                        Approve Verification
                      </button>
                      <button
                        onClick={() => handleDecision(req.id, 'REJECT')}
                        disabled={processing === req.id}
                        className="flex-1 inline-flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-medium py-2.5 rounded-lg text-sm transition-colors disabled:opacity-50"
                      >
                        {processing === req.id ? <Loader2 size={15} className="animate-spin" /> : <XCircle size={15} />}
                        Reject
                      </button>
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
