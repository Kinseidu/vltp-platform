// src/app/applicant/verification/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { DashboardLayout, PageHeader } from '@/components/shared/DashboardLayout';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { NotificationBell } from '@/components/shared/NotificationBell';
import { useToast } from '@/components/shared/ToastProvider';
import { CheckCircle, Clock, AlertCircle, Shield, Loader2 } from 'lucide-react';

const STEPS = [
  { key: 'submit', label: 'Request Submitted', icon: <CheckCircle size={18} /> },
  { key: 'youth', label: 'Youth President Approval', icon: <Shield size={18} /> },
  { key: 'chief', label: 'Chief Confirmation', icon: <Shield size={18} /> },
  { key: 'verified', label: 'Verified Local Status', icon: <CheckCircle size={18} /> },
];

export default function VerificationPage() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [verificationData, setVerificationData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => {
      if (d.success) setUser(d.data.user);
    });
    fetchVerification();
  }, []);

  const fetchVerification = async () => {
    const res = await fetch('/api/verification');
    const data = await res.json();
    if (data.success) {
      setVerificationData(data.data);
    }
    const profileRes = await fetch('/api/profile/me');
    const profileData = await profileRes.json();
    if (profileData.success) setProfile(profileData.data.profile);
    setLoading(false);
  };

  const requestVerification = async () => {
    setSubmitting(true);
    const res = await fetch('/api/verification', { method: 'POST' });
    const data = await res.json();
    if (data.success) {
      toast({ title: 'Success', description: 'Verification request submitted! Your Youth President will review it shortly.', variant: 'success' });
      fetchVerification();
    } else {
      toast({ title: 'Error', description: data.error || 'Failed to submit request', variant: 'error' });
    }
    setSubmitting(false);
  };

  const status = verificationData?.verificationStatus || profile?.verificationStatus || 'NONE';
  const request = verificationData?.request;

  const getStepStatus = (step: string) => {
    if (status === 'NONE') return 'pending';
    if (step === 'submit') return request ? 'done' : 'pending';
    if (step === 'youth') {
      if (['YOUTH_APPROVED', 'CHIEF_CONFIRMED', 'VERIFIED'].includes(status)) return 'done';
      if (status === 'REJECTED' && request?.youthVerification) return 'rejected';
      if (status === 'PENDING') return 'active';
      return 'pending';
    }
    if (step === 'chief') {
      if (['CHIEF_CONFIRMED', 'VERIFIED'].includes(status)) return 'done';
      if (status === 'YOUTH_APPROVED') return 'active';
      return 'pending';
    }
    if (step === 'verified') {
      return status === 'VERIFIED' ? 'done' : 'pending';
    }
    return 'pending';
  };

  const stepColour = (s: string) => ({
    done: 'bg-green-500 text-white border-green-500',
    active: 'bg-blue-500 text-white border-blue-500',
    rejected: 'bg-red-500 text-white border-red-500',
    pending: 'bg-white dark:bg-gray-800 text-gray-400 dark:text-gray-500 border-gray-300 dark:border-gray-600',
  }[s] || 'bg-white text-gray-400 border-gray-300');

  return (
    <DashboardLayout role={user?.role || 'APPLICANT'} userName={profile?.fullName || user?.email || ''} userEmail={user?.email || ''}>
      <NotificationBell />
      <PageHeader
        title="Community Verification"
        subtitle="Complete verification to become a Verified Local and apply for jobs"
      />

      {/* Status banner */}
      {status === 'VERIFIED' && (
        <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-xl p-4 mb-6 flex items-center gap-3">
          <CheckCircle className="text-green-500" size={20} />
          <div>
            <p className="text-sm font-semibold text-green-800 dark:text-green-300">You are a Verified Local!</p>
            <p className="text-xs text-green-600 dark:text-green-400 mt-0.5">You can now apply for all matched job openings.</p>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Progress tracker */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-5">Verification Progress</h2>
          <div className="space-y-0">
            {STEPS.map((step, idx) => {
              const s = getStepStatus(step.key);
              return (
                <div key={step.key} className="flex items-stretch gap-4">
                  <div className="flex flex-col items-center">
                    <div className={`w-9 h-9 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${stepColour(s)}`}>
                      {s === 'done' ? <CheckCircle size={16} /> : s === 'active' ? <Clock size={16} /> : s === 'rejected' ? <AlertCircle size={16} /> : step.icon}
                    </div>
                    {idx < STEPS.length - 1 && (
                      <div className={`w-0.5 flex-1 my-1 ${s === 'done' ? 'bg-green-300 dark:bg-green-700' : 'bg-gray-200 dark:bg-gray-700'}`} style={{ minHeight: '24px' }} />
                    )}
                  </div>
                  <div className="pb-5 pt-1">
                    <div className={`text-sm font-medium ${s === 'done' ? 'text-green-700 dark:text-green-400' : s === 'active' ? 'text-blue-700 dark:text-blue-400' : s === 'rejected' ? 'text-red-600 dark:text-red-400' : 'text-gray-400 dark:text-gray-500'}`}>
                      {step.label}
                    </div>
                    {step.key === 'youth' && request?.youthVerification && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        Reviewed by Youth President · {new Date(request.youthVerification.decisionAt).toLocaleDateString()}
                        {request.youthVerification.notes && <div className="italic mt-0.5">&ldquo;{request.youthVerification.notes}&rdquo;</div>}
                      </div>
                    )}
                    {step.key === 'chief' && request?.chiefConfirmation && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        Confirmed by {request.chiefConfirmation.chiefName} · {new Date(request.chiefConfirmation.confirmedAt).toLocaleDateString()}
                        {request.chiefConfirmation.notes && <div className="italic mt-0.5">&ldquo;{request.chiefConfirmation.notes}&rdquo;</div>}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Action panel */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-3">Current Status</h2>
            <div className="flex items-center gap-3 mb-4">
              <StatusBadge status={status === 'NONE' ? 'PENDING' : status} />
            </div>

            {/* Requirements checklist */}
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Requirements to request verification:</h3>
            <div className="space-y-2">
              {[
                { label: 'At least 1 skill added', met: (profile?.skills?.length || 0) > 0 },
                { label: 'At least 1 work experience added', met: (profile?.workExperiences?.length || 0) > 0 },
                { label: 'Community selected', met: !!profile?.communityId },
              ].map((req, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  {req.met
                    ? <CheckCircle size={15} className="text-green-500 flex-shrink-0" />
                    : <AlertCircle size={15} className="text-gray-300 dark:text-gray-600 flex-shrink-0" />}
                  <span className={req.met ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400 dark:text-gray-500'}>{req.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Action button */}
          {!request && status !== 'VERIFIED' && (
            <button
              onClick={requestVerification}
              disabled={submitting || !profile?.skills?.length || !profile?.workExperiences?.length || !profile?.communityId}
              aria-busy={submitting}
              className="w-full inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-xl text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting && <Loader2 size={15} className="animate-spin" />}
              {submitting ? 'Submitting...' : 'Request Community Verification'}
            </button>
          )}

          {status === 'PENDING' && (
            <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4 text-sm text-amber-800 dark:text-amber-300">
              <Clock size={16} className="inline mr-2" />
              Your request is pending review by the Youth President of <strong>{profile?.community?.name}</strong>.
            </div>
          )}

          {status === 'YOUTH_APPROVED' && (
            <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-xl p-4 text-sm text-blue-800 dark:text-blue-300">
              <CheckCircle size={16} className="inline mr-2 text-blue-500" />
              Approved by the Youth President! Awaiting Chief confirmation from an authorised staff member.
            </div>
          )}

          {status === 'REJECTED' && (
            <div className="space-y-3">
              <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl p-4 text-sm text-red-800 dark:text-red-300">
                <AlertCircle size={16} className="inline mr-2" />
                Your verification was not approved. Please speak with your Youth President for more information.
              </div>
              <button
                onClick={requestVerification}
                disabled={submitting}
                aria-busy={submitting}
                className="w-full inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-xl text-sm"
              >
                {submitting && <Loader2 size={15} className="animate-spin" />}
                Re-apply for Verification
              </button>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
