// src/app/applicant/jobs/[id]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/shared/DashboardLayout';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { AppSpinner } from '@/components/shared/AppSpinner';
import { ChevronLeft, Upload, FileText, Loader2, CheckCircle, AlertCircle, Trash2 } from 'lucide-react';
import Link from 'next/link';

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [job, setJob] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [applying, setApplying] = useState(false);
  const [applicationId, setApplicationId] = useState<number | null>(null);
  const [coverNote, setCoverNote] = useState('');
  const [uploadedDocs, setUploadedDocs] = useState<Record<number, File>>({});
  const [uploading, setUploading] = useState(false);
  const [step, setStep] = useState<'view' | 'apply' | 'documents' | 'done'>('view');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/auth/me').then(r => r.json()),
      fetch(`/api/jobs/${id}`).then(r => r.json()),
      fetch('/api/profile/me').then(r => r.json()),
    ]).then(([u, j, p]) => {
      if (u.success) setUser(u.data.user);
      if (j.success) setJob(j.data.job);
      if (p.success) setProfile(p.data.profile);
      setLoading(false);
    });
  }, [id]);

  const submitApplication = async () => {
    setApplying(true);
    setError('');
    const res = await fetch('/api/applications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobId: parseInt(id), coverNote }),
    });
    const data = await res.json();
    if (data.success) {
      setApplicationId(data.data.application.id);
      setStep('documents');
    } else {
      setError(data.error || 'Application failed');
    }
    setApplying(false);
  };

  const uploadDocument = async (docType: any, label: string, file: File) => {
    if (!applicationId) return;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('docType', docType);
    formData.append('label', label);

    await fetch(`/api/applications/${applicationId}/documents`, {
      method: 'POST',
      body: formData,
    });
  };

  const submitAllDocuments = async () => {
    setUploading(true);
    try {
      await Promise.all(
        Object.entries(uploadedDocs).map(([idx, file]) => {
          const docReq = job.requiredDocTypes[parseInt(idx)];
          return uploadDocument(docReq.docType, docReq.label, file);
        })
      );
      setStep('done');
    } catch {
      setError('Some documents failed to upload. Please try again.');
    }
    setUploading(false);
  };

  if (loading) {
    return (
      <DashboardLayout role="APPLICANT" userName="" userEmail="">
        <div className="h-[70vh] flex flex-col items-center justify-center gap-3 text-gray-500">
          <AppSpinner size="md" />
          <p className="text-sm">Loading job...</p>
        </div>
      </DashboardLayout>
    );
  }
  if (!job) return <div className="min-h-screen flex items-center justify-center"><div className="text-sm text-gray-400">Job not found.</div></div>;

  const isVerified = profile?.verificationStatus === 'VERIFIED';

  if (step === 'done') {
    return (
      <DashboardLayout role={user?.role || 'APPLICANT'} userName={profile?.fullName || ''} userEmail={user?.email || ''}>
        <div className="max-w-lg mx-auto text-center py-20">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={32} className="text-green-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Application Submitted!</h2>
          <p className="text-sm text-gray-500 mb-6">Your application for <strong>{job.title}</strong> has been submitted. You will receive notifications as your application progresses.</p>
          <div className="flex gap-3 justify-center">
            <Link href="/applicant/applications" className="bg-blue-600 text-white text-sm font-medium px-5 py-2.5 rounded-lg hover:bg-blue-700">
              View My Applications
            </Link>
            <Link href="/applicant/jobs" className="border border-gray-300 text-gray-700 text-sm font-medium px-5 py-2.5 rounded-lg hover:bg-gray-50">
              Browse More Jobs
            </Link>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role={user?.role || 'APPLICANT'} userName={profile?.fullName || ''} userEmail={user?.email || ''}>
      <div className="mb-4">
        <button onClick={() => step === 'view' ? router.back() : setStep('view')}
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
          <ChevronLeft size={16} /> {step === 'view' ? 'Back to Jobs' : 'Back'}
        </button>
      </div>

      {error && <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg border border-red-200 mb-4">{error}</div>}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Job details */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-xl font-bold text-gray-900">{job.title}</h1>
                <div className="flex items-center gap-2 mt-2">
                  <StatusBadge status={job.status} size="sm" />
                  <span className="text-xs text-gray-500">Min {job.minExperience}yr experience</span>
                </div>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-4">{job.description}</p>
            <div className="space-y-3">
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Scope of Work</h3>
                <p className="text-sm text-gray-600">{job.scope}</p>
              </div>
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Responsibilities</h3>
                <p className="text-sm text-gray-600">{job.responsibilities}</p>
              </div>
            </div>
          </div>

          {/* Required skills */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Skill Requirements</h3>
            <div className="space-y-2">
              {job.requirements?.map((req: any) => (
                <div key={req.id} className="flex items-center justify-between py-1.5 border-b border-gray-100 last:border-0">
                  <span className="text-sm text-gray-700">{req.skill?.name}</span>
                  <div className="flex items-center gap-2">
                    {req.minYears > 0 && <span className="text-xs text-gray-400">Min {req.minYears}yr</span>}
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${req.isMandatory ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>
                      {req.isMandatory ? 'Required' : 'Preferred'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Apply panel */}
        <div className="space-y-4">
          {/* Eligible communities */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Eligible Communities</h3>
            <div className="space-y-1">
              {job.eligibleCommunities?.map((ec: any) => (
                <div key={ec.community.id} className="text-sm text-gray-600">{ec.community.name}</div>
              ))}
            </div>
          </div>

          {/* Required documents */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Documents Required</h3>
            <div className="space-y-1">
              {job.requiredDocTypes?.map((d: any) => (
                <div key={d.id} className="flex items-center gap-2 text-sm">
                  <FileText size={13} className="text-gray-400" />
                  <span className="text-gray-600">{d.label}</span>
                  {d.required && <span className="text-xs text-red-500 ml-auto">Required</span>}
                </div>
              ))}
            </div>
          </div>

          {/* Apply / upload flow */}
          {step === 'view' && (
            <div>
              {!isVerified ? (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
                  <AlertCircle size={15} className="inline mr-1.5" />
                  You must be a Verified Local to apply.{' '}
                  <Link href="/applicant/verification" className="underline font-medium">Complete verification →</Link>
                </div>
              ) : (
                <button
                  onClick={() => setStep('apply')}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-xl text-sm transition-colors"
                >
                  Apply for this Job
                </button>
              )}
            </div>
          )}

          {step === 'apply' && (
            <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
              <h3 className="text-sm font-semibold text-gray-900">Cover Note (Optional)</h3>
              <textarea
                rows={4}
                value={coverNote}
                onChange={e => setCoverNote(e.target.value)}
                placeholder="Briefly explain why you are a good fit for this role..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
              <button
                onClick={submitApplication}
                disabled={applying}
                className="w-full inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg text-sm disabled:opacity-50"
              >
                {applying && <Loader2 size={14} className="animate-spin" />}
                {applying ? 'Submitting...' : 'Continue to Documents →'}
              </button>
            </div>
          )}

          {step === 'documents' && (
            <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Upload Documents</h3>
                <p className="text-xs text-gray-500 mt-0.5">Accepted: PDF, DOC, DOCX, JPG, PNG (max 10MB each)</p>
              </div>
              <div className="space-y-3">
                {job.requiredDocTypes?.map((doc: any, idx: number) => (
                  <div key={doc.id} className="space-y-1">
                    <label className="text-xs font-medium text-gray-700">
                      {doc.label} {doc.required && <span className="text-red-500">*</span>}
                    </label>
                    {uploadedDocs[idx] ? (
                      <div className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded-lg">
                        <CheckCircle size={13} className="text-green-500" />
                        <span className="text-xs text-green-700 flex-1 truncate">{uploadedDocs[idx].name}</span>
                        <button onClick={() => {
                          const d = { ...uploadedDocs };
                          delete d[idx];
                          setUploadedDocs(d);
                        }}><Trash2 size={13} className="text-red-400 hover:text-red-600" /></button>
                      </div>
                    ) : (
                      <label className="flex items-center gap-2 p-2.5 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors">
                        <Upload size={14} className="text-gray-400" />
                        <span className="text-xs text-gray-500">Click to upload</span>
                        <input type="file" className="hidden"
                          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                          onChange={e => {
                            if (e.target.files?.[0]) setUploadedDocs({ ...uploadedDocs, [idx]: e.target.files[0] });
                          }} />
                      </label>
                    )}
                  </div>
                ))}
              </div>
              <button
                onClick={submitAllDocuments}
                disabled={uploading}
                className="w-full inline-flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-medium py-2.5 rounded-lg text-sm disabled:opacity-50"
              >
                {uploading && <Loader2 size={14} className="animate-spin" />}
                {uploading ? 'Uploading...' : 'Submit Application'}
              </button>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
