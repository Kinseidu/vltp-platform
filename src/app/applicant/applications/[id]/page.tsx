'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, FileText, ExternalLink, Loader2, Wand2, X } from 'lucide-react';
import { DashboardLayout, EmptyState, PageHeader } from '@/components/shared/DashboardLayout';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { SkeletonForm } from '@/components/shared/Skeleton';
import { NotificationBell } from '@/components/shared/NotificationBell';
import { useToast } from '@/components/shared/ToastProvider';

function buildFileToken(storagePath: string) {
  if (!storagePath) return '';
  const raw = `${storagePath}:${Date.now()}`;
  return btoa(raw).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export default function ApplicantApplicationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [user, setUser] = useState<any>(null);
  const [application, setApplication] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [parsing, setParsing] = useState<number | null>(null);
  const [parsedCV, setParsedCV] = useState<any>(null);
  const toast = useToast();

  useEffect(() => {
    Promise.all([
      fetch('/api/auth/me').then(r => r.json()),
      fetch(`/api/applications/${id}`).then(r => r.json()),
    ]).then(([meData, appData]) => {
      if (meData.success) setUser(meData.data.user);
      if (appData.success) setApplication(appData.data.application);
      setLoading(false);
    });
  }, [id]);

  const docs = useMemo(() => application?.documents || [], [application]);
  const cvDoc = docs.find((d: any) => d.docType === 'CV_RESUME');

  const handleParseCV = async (docId: number) => {
    setParsing(docId);
    setParsedCV(null);
    try {
      const res = await fetch('/api/profile/cv-parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ docId }),
      });
      const data = await res.json();
      if (data.success) {
        setParsedCV(data.data.parsed);
        toast({ title: 'CV Parsed', description: `Parsed using ${data.data.parsed.source === 'ai' ? 'AI' : 'rule-based'} extraction.`, variant: 'success' });
      } else {
        toast({ title: 'Parse failed', description: data.error || 'Could not parse the CV.', variant: 'error' });
      }
    } catch {
      toast({ title: 'Network error', description: 'Could not parse the CV.', variant: 'error' });
    }
    setParsing(null);
  };

  if (loading) {
    return (
      <DashboardLayout role="APPLICANT" userName="" userEmail="">
        <SkeletonForm />
      </DashboardLayout>
    );
  }

  if (!user) {
    window.location.href = '/auth/login';
    return null;
  }

  if (!application) {
    return (
      <DashboardLayout role={user.role} userName={user.applicantProfile?.fullName || user.email} userEmail={user.email}>
        <EmptyState icon={<FileText size={24} />} title="Application not found" message="This application may not exist or you may not have access." />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role={user.role} userName={user.applicantProfile?.fullName || user.email} userEmail={user.email}>
      <NotificationBell />
      <div className="mb-4">
        <Link href="/applicant/applications" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
          <ChevronLeft size={16} /> Back to applications
        </Link>
      </div>

      <PageHeader title={application.job?.title || 'Application'} subtitle="Application details and uploaded documents" />

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-base font-semibold text-gray-900">Status</h3>
              <StatusBadge status={application.status} />
            </div>
            <div className="text-sm text-gray-600 mt-3">
              Submitted: {application.submittedAt ? new Date(application.submittedAt).toLocaleString() : 'Not submitted'}
            </div>
            {application.coverNote && (
              <div className="mt-4">
                <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1">Cover note</h4>
                <p className="text-sm text-gray-700">{application.coverNote}</p>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-semibold text-gray-900">Uploaded Documents</h3>
              {cvDoc && (
                <button
                  onClick={() => handleParseCV(cvDoc.id)}
                  disabled={parsing !== null}
                  className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {parsing === cvDoc.id ? <Loader2 size={12} className="animate-spin" /> : <Wand2 size={12} />}
                  {parsing === cvDoc.id ? 'Parsing...' : 'AI Parse CV'}
                </button>
              )}
            </div>

            {/* Parsed CV results */}
            {parsedCV && (
              <div className="mb-4 bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-semibold text-purple-800">CV Analysis Results</h4>
                  <button onClick={() => setParsedCV(null)} className="text-purple-500 hover:text-purple-700">
                    <X size={14} />
                  </button>
                </div>
                <div className="grid md:grid-cols-2 gap-3 text-sm">
                  {parsedCV.name && <div><span className="font-medium text-purple-700">Name:</span> {parsedCV.name}</div>}
                  {parsedCV.email && <div><span className="font-medium text-purple-700">Email:</span> {parsedCV.email}</div>}
                  {parsedCV.phone && <div><span className="font-medium text-purple-700">Phone:</span> {parsedCV.phone}</div>}
                  {parsedCV.education && <div className="md:col-span-2"><span className="font-medium text-purple-700">Education:</span> {parsedCV.education}</div>}
                  {parsedCV.skills?.length > 0 && (
                    <div className="md:col-span-2">
                      <span className="font-medium text-purple-700">Skills detected:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {parsedCV.skills.map((s: string, i: number) => (
                          <span key={i} className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">{s}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {parsedCV.workExperiences?.length > 0 && (
                    <div className="md:col-span-2">
                      <span className="font-medium text-purple-700">Work History:</span>
                      <div className="mt-1 space-y-1">
                        {parsedCV.workExperiences.slice(0, 3).map((w: any, i: number) => (
                          <div key={i} className="text-xs text-purple-700">{w.title}{w.employer && ` at ${w.employer}`}</div>
                        ))}
                      </div>
                    </div>
                  )}
                  {parsedCV.summary && (
                    <div className="md:col-span-2"><span className="font-medium text-purple-700">Summary:</span> <span className="text-xs">{parsedCV.summary}</span></div>
                  )}
                </div>
                <p className="text-xs text-purple-500 mt-2">Parsed via {parsedCV.source === 'ai' ? 'Google Gemini AI' : 'rule-based extraction'}</p>
              </div>
            )}

            {docs.length === 0 ? (
              <p className="text-sm text-gray-500">No documents uploaded for this application yet.</p>
            ) : (
              <div className="space-y-2">
                {docs.map((doc: any) => {
                  const token = buildFileToken(doc.storagePath);
                  const isCV = doc.docType === 'CV_RESUME';
                  return (
                    <a
                      key={doc.id}
                      href={`/api/files/${token}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">{doc.label}</div>
                        <div className="text-xs text-gray-500 truncate">{doc.originalName}{isCV ? ' (CV/Resume)' : ''}</div>
                      </div>
                      <ExternalLink size={14} className="text-gray-500 flex-shrink-0" />
                    </a>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Job Summary</h3>
            <p className="text-sm text-gray-600">{application.job?.description || 'No description available.'}</p>
            <div className="text-xs text-gray-500 mt-3">
              Deadline: {application.job?.applicationDeadline ? new Date(application.job.applicationDeadline).toLocaleDateString() : 'Not specified'}
            </div>
          </div>

          <Link
            href={`/applicant/jobs/${application.jobId}`}
            className="block text-center bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2.5 rounded-lg"
          >
            View job posting
          </Link>
        </div>
      </div>
    </DashboardLayout>
  );
}
