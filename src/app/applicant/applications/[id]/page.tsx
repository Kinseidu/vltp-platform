'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, FileText, ExternalLink } from 'lucide-react';
import { DashboardLayout, EmptyState, PageHeader } from '@/components/shared/DashboardLayout';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { AppSpinner } from '@/components/shared/AppSpinner';

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

  if (loading) {
    return (
      <DashboardLayout role="APPLICANT" userName="" userEmail="">
        <div className="h-[70vh] flex flex-col items-center justify-center gap-3 text-gray-500">
          <AppSpinner size="md" />
          <p className="text-sm">Loading application...</p>
        </div>
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
            <h3 className="text-base font-semibold text-gray-900 mb-3">Uploaded Documents</h3>
            {docs.length === 0 ? (
              <p className="text-sm text-gray-500">No documents uploaded for this application yet.</p>
            ) : (
              <div className="space-y-2">
                {docs.map((doc: any) => {
                  const token = buildFileToken(doc.storagePath);
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
                        <div className="text-xs text-gray-500 truncate">{doc.originalName}</div>
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
