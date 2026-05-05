// src/app/applicant/jobs/[id]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/shared/DashboardLayout';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { AppSpinner } from '@/components/shared/AppSpinner';
import { ChevronLeft, Upload, FileText, Loader2, CheckCircle, AlertCircle, Trash2, ExternalLink, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [job, setJob] = useState<any>(null);
  const [serverDocs, setServerDocs] = useState<any[]>([]);
  const [isPastDeadline, setIsPastDeadline] = useState(false);
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
      fetch('/api/applications').then(r => r.json()),
    ]).then(([u, j, p, apps]) => {
      if (u.success) setUser(u.data.user);
      if (j.success) {
        setJob(j.data.job);
        if (j.data.job.applicationDeadline) {
          setIsPastDeadline(new Date() > new Date(j.data.job.applicationDeadline));
        }
      }
      if (p.success) setProfile(p.data.profile);
      
      // Check if already applied
      if (apps.success) {
        const existing = apps.data.applications.find((a: any) => a.jobId === parseInt(id));
        if (existing) {
          setApplicationId(existing.id);
          setServerDocs(existing.documents || []);
          setStep('documents');
        }
      }
      setLoading(false);
    });
  }, [id]);

  const fetchServerDocs = async (appId: number) => {
    const res = await fetch(`/api/applications/${appId}/documents`);
    const data = await res.json();
    if (data.success) setServerDocs(data.data.documents);
  };

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

    const res = await fetch(`/api/applications/${applicationId}/documents`, {
      method: 'POST',
      body: formData,
    });
    const data = await res.json();
    if (data.success) {
      await fetchServerDocs(applicationId);
    } else {
      throw new Error(data.error || 'Upload failed');
    }
  };

  const deleteDocument = async (docId: number) => {
    if (!applicationId || isPastDeadline) return;
    setUploading(true);
    const res = await fetch(`/api/applications/${applicationId}/documents?docId=${docId}`, {
      method: 'DELETE',
    });
    const data = await res.json();
    if (data.success) {
      await fetchServerDocs(applicationId);
    } else {
      setError(data.error || 'Failed to delete document');
    }
    setUploading(false);
  };

  const submitAllDocuments = async () => {
    setUploading(true);
    try {
      // Filter out types that already have a server doc (or handle multiple?)
      // For now, let's just upload what's in local state
      await Promise.all(
        Object.entries(uploadedDocs).map(([idx, file]) => {
          const docReq = job.requiredDocTypes[parseInt(idx)];
          return uploadDocument(docReq.docType, docReq.label, file);
        })
      );
      setUploadedDocs({}); // Clear local state after successful upload
      setStep('done');
    } catch (err: any) {
      setError(err.message || 'Some documents failed to upload. Please try again.');
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
        <div className="max-w-lg mx-auto text-center py-20 animate-in fade-in zoom-in-95 duration-500">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
            <CheckCircle size={40} className="text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Application Submitted!</h2>
          <p className="text-gray-500 mb-8 leading-relaxed">
            Your application for <strong>{job.title}</strong> has been successfully received. 
            You can manage your documents until the application deadline.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/applicant/applications" className="bg-blue-600 text-white text-sm font-bold px-8 py-3 rounded-xl hover:bg-blue-700 shadow-md transition-all">
              My Applications
            </Link>
            <button onClick={() => setStep('documents')} className="border border-gray-300 text-gray-700 text-sm font-bold px-8 py-3 rounded-xl hover:bg-gray-50 transition-all">
              Manage Documents
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role={user?.role || 'APPLICANT'} userName={profile?.fullName || ''} userEmail={user?.email || ''}>
      <div className="mb-4">
        <button onClick={() => step === 'view' ? router.back() : setStep('view')}
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 font-medium">
          <ChevronLeft size={16} /> {step === 'view' ? 'Back to Jobs' : 'Back to Job Details'}
        </button>
      </div>

      {isPastDeadline && step !== 'view' && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl mb-6 flex items-center gap-3">
          <AlertCircle size={20} />
          <div>
            <p className="font-bold text-sm">Application Deadline Reached</p>
            <p className="text-xs opacity-80">The deadline for this job has passed. You can no longer modify your application or documents.</p>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-xl border border-red-200 mb-6 flex justify-between items-center">
          <span>{error}</span>
          <button onClick={() => setError('')} className="font-bold">&times;</button>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Job details */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{job.title}</h1>
                <div className="flex items-center gap-3 mt-3">
                  <StatusBadge status={job.status} size="sm" />
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                    Min {job.minExperience}yr Experience
                  </span>
                </div>
              </div>
            </div>
            
            <div className="prose prose-sm max-w-none text-gray-600 mb-8">
              <p className="whitespace-pre-wrap">{job.description}</p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 pt-6 border-t border-gray-100">
              <div>
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Scope of Work</h3>
                <p className="text-sm text-gray-700 leading-relaxed italic border-l-4 border-blue-100 pl-4 bg-blue-50/30 py-2 rounded-r-lg">{job.scope}</p>
              </div>
              <div>
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Key Responsibilities</h3>
                <p className="text-sm text-gray-700 leading-relaxed">{job.responsibilities}</p>
              </div>
            </div>
          </div>

          {/* Required skills */}
          <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
            <h3 className="text-lg font-bold text-gray-900 mb-6">Skill Requirements</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              {job.requirements?.map((req: any) => (
                <div key={req.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <span className="text-sm font-semibold text-gray-800">{req.skill?.name}</span>
                  <div className="flex items-center gap-2">
                    {req.minYears > 0 && <span className="text-[10px] font-bold text-gray-400 bg-white border border-gray-200 px-2 py-0.5 rounded-md">{req.minYears}Y+</span>}
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md ${req.isMandatory ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                      {req.isMandatory ? 'Required' : 'Preferred'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Apply panel */}
        <div className="space-y-6">
          {/* Status summary cards */}
          <div className="grid gap-4">
            <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Eligibility</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Verification</span>
                  <StatusBadge status={profile?.verificationStatus || 'PENDING'} size="sm" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Community</span>
                  <div className="text-xs font-bold text-gray-700">{profile?.community?.name}</div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Deadline</h3>
              <div className="flex items-center gap-2">
                <Calendar size={16} className={isPastDeadline ? 'text-red-500' : 'text-blue-500'} />
                <span className={`text-sm font-bold ${isPastDeadline ? 'text-red-600' : 'text-gray-700'}`}>
                  {job.applicationDeadline ? format(new Date(job.applicationDeadline), 'dd MMM yyyy') : 'No Deadline'}
                </span>
              </div>
              {isPastDeadline && <div className="text-[10px] text-red-500 font-bold mt-1">APPLICATIONS CLOSED</div>}
            </div>
          </div>

          {/* Apply / upload flow */}
          <div className="sticky top-6">
            {step === 'view' && (
              <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-lg border-t-4 border-t-blue-500">
                {!isVerified ? (
                  <div className="space-y-4">
                    <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-xs text-amber-800 leading-relaxed italic">
                      <AlertCircle size={14} className="inline mr-1.5" />
                      Community verification is required before you can apply for this job.
                    </div>
                    <Link href="/applicant/verification" className="block w-full bg-slate-900 text-white text-center font-bold py-3.5 rounded-xl text-sm hover:bg-slate-800 transition-all shadow-md">
                      Get Verified Now
                    </Link>
                  </div>
                ) : isPastDeadline && !applicationId ? (
                  <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-xs text-red-800 font-medium text-center">
                    This job is no longer accepting applications.
                  </div>
                ) : (
                  <button
                    onClick={() => applicationId ? setStep('documents') : setStep('apply')}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl text-sm transition-all shadow-md hover:shadow-lg active:scale-[0.98]"
                  >
                    {applicationId ? 'Manage My Application' : 'Start Application'}
                  </button>
                )}
              </div>
            )}

            {step === 'apply' && (
              <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-lg space-y-4 animate-in slide-in-from-right-4 duration-300">
                <h3 className="text-base font-bold text-gray-900">Cover Note</h3>
                <p className="text-xs text-gray-500">Briefly explain why you are interested in this position.</p>
                <textarea
                  rows={5}
                  value={coverNote}
                  onChange={e => setCoverNote(e.target.value)}
                  placeholder="Tell HR about your relevant experience..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none bg-gray-50/50"
                />
                <button
                  onClick={submitApplication}
                  disabled={applying}
                  className="w-full inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl text-sm shadow-md disabled:opacity-50"
                >
                  {applying && <Loader2 size={16} className="animate-spin" />}
                  {applying ? 'Submitting...' : 'Continue to Documents'}
                </button>
              </div>
            )}

            {step === 'documents' && (
              <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xl space-y-6 animate-in slide-in-from-bottom-4 duration-300">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Application Documents</h3>
                  <p className="text-xs text-gray-500 mt-1">Upload the required files to complete your application.</p>
                </div>

                <div className="space-y-5">
                  {job.requiredDocTypes?.map((doc: any, idx: number) => {
                    const serverDoc = serverDocs.find(sd => sd.docType === doc.docType);
                    return (
                      <div key={doc.id} className="space-y-2">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center justify-between">
                          <span>{doc.label}</span>
                          {doc.required && <span className="text-red-500">Required</span>}
                        </label>
                        
                        {serverDoc ? (
                          <div className="flex items-center gap-3 p-3 bg-blue-50/50 border border-blue-100 rounded-xl group relative">
                            <FileText size={18} className="text-blue-500" />
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-bold text-gray-800 truncate">{serverDoc.originalName}</div>
                              <div className="text-[10px] text-gray-500">Uploaded {format(new Date(serverDoc.uploadedAt), 'dd MMM')}</div>
                            </div>
                            <div className="flex items-center gap-1">
                              <a href={serverDoc.url} target="_blank" rel="noreferrer" className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-md transition-colors" title="Preview">
                                <ExternalLink size={14} />
                              </a>
                              {!isPastDeadline && (
                                <button onClick={() => deleteDocument(serverDoc.id)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors" title="Delete">
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </div>
                          </div>
                        ) : uploadedDocs[idx] ? (
                          <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-100 rounded-xl">
                            <CheckCircle size={18} className="text-green-500" />
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-bold text-green-800 truncate">{uploadedDocs[idx].name}</div>
                              <div className="text-[10px] text-green-600">Ready to submit</div>
                            </div>
                            <button onClick={() => {
                              const d = { ...uploadedDocs };
                              delete d[idx];
                              setUploadedDocs(d);
                            }} className="p-1.5 text-red-400 hover:text-red-600"><Trash2 size={14} /></button>
                          </div>
                        ) : (
                          <label className={`flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed rounded-xl transition-all ${isPastDeadline ? 'bg-gray-50 border-gray-200 cursor-not-allowed' : 'border-gray-200 hover:border-blue-400 hover:bg-blue-50/30 cursor-pointer'}`}>
                            <Upload size={20} className="text-gray-400" />
                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Click to upload</span>
                            <input 
                              type="file" 
                              className="hidden"
                              disabled={isPastDeadline}
                              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                              onChange={e => {
                                if (e.target.files?.[0]) setUploadedDocs({ ...uploadedDocs, [idx]: e.target.files[0] });
                              }} 
                            />
                          </label>
                        )}
                      </div>
                    );
                  })}
                </div>

                {!isPastDeadline && (
                  <button
                    onClick={submitAllDocuments}
                    disabled={uploading || Object.keys(uploadedDocs).length === 0}
                    className="w-full inline-flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-bold py-4 rounded-xl text-sm shadow-md transition-all disabled:opacity-50"
                  >
                    {uploading && <Loader2 size={16} className="animate-spin" />}
                    {uploading ? 'Processing...' : 'Upload & Save Changes'}
                  </button>
                )}
                
                <button
                  onClick={() => setStep('done')}
                  className="w-full text-center text-xs font-bold text-gray-400 hover:text-gray-600 transition-colors uppercase tracking-widest pt-2"
                >
                  I'm done for now
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
