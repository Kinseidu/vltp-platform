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
                  <div className="border-t border-gray-100 p-5 space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                        <div className="text-xs font-semibold text-gray-500 uppercase mb-2">Youth decision</div>
                        <div className="text-sm text-gray-800">
                          Approved by {req.youthVerification?.youthPresident?.email || 'Unknown'} on{' '}
                          {new Date(req.youthVerification?.decisionAt || req.submittedAt).toLocaleDateString()}
                        </div>
                        {req.youthVerification?.notes && (
                          <p className="text-xs text-gray-600 mt-2 italic">&quot;{req.youthVerification.notes}&quot;</p>
                        )}
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                        <div className="text-xs font-semibold text-gray-500 uppercase mb-2">Applicant summary</div>
                        <div className="text-sm text-gray-700">
                          Skills: {applicant.skills?.length || 0} · Experience records: {applicant.workExperiences?.length || 0}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">Submitted: {new Date(req.submittedAt).toLocaleDateString()}</div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Chief Name (required)</label>
                      <input
                        type="text"
                        value={chiefNameByReq[req.id] || ''}
                        onChange={e => setChiefNameByReq(prev => ({ ...prev, [req.id]: e.target.value }))}
                        placeholder="Enter chief name as recorded"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Notes (optional)</label>
                      <textarea
                        rows={2}
                        value={notesByReq[req.id] || ''}
                        onChange={e => setNotesByReq(prev => ({ ...prev, [req.id]: e.target.value }))}
                        placeholder="Any context for audit trail"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                      />
                    </div>

                    <div className="grid sm:grid-cols-2 gap-3">
                      <button
                        onClick={() => submitDecision(req.id, 'CONFIRM')}
                        disabled={disabled}
                        className="inline-flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-lg text-sm font-medium disabled:opacity-50"
                      >
                        {disabled ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle size={15} />}
                        Confirm
                      </button>
                      <button
                        onClick={() => submitDecision(req.id, 'REJECT')}
                        disabled={disabled}
                        className="inline-flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-lg text-sm font-medium disabled:opacity-50"
                      >
                        {disabled ? <Loader2 size={15} className="animate-spin" /> : <XCircle size={15} />}
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
