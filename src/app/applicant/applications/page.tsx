'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ClipboardList, Search } from 'lucide-react';
import { DashboardLayout, EmptyState, PageHeader } from '@/components/shared/DashboardLayout';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { AppSpinner } from '@/components/shared/AppSpinner';

export default function ApplicantApplicationsPage() {
  const [user, setUser] = useState<any>(null);
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    Promise.all([
      fetch('/api/auth/me').then(r => r.json()),
      fetch('/api/applications').then(r => r.json()),
    ]).then(([meData, appsData]) => {
      if (meData.success) setUser(meData.data.user);
      if (appsData.success) setApplications(appsData.data.applications || []);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <DashboardLayout role="APPLICANT" userName="" userEmail="">
        <div className="h-[70vh] flex flex-col items-center justify-center gap-3 text-gray-500">
          <AppSpinner size="md" />
          <p className="text-sm">Loading applications...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!user) {
    window.location.href = '/auth/login';
    return null;
  }

  const filtered = applications.filter((app: any) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return app.job?.title?.toLowerCase().includes(q);
  });

  return (
    <DashboardLayout role={user.role} userName={user.applicantProfile?.fullName || user.email} userEmail={user.email}>
      <PageHeader title="My Applications" subtitle={`${applications.length} submitted application${applications.length === 1 ? '' : 's'}`} />

      <div className="relative mb-6">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by job title..."
          className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<ClipboardList size={24} />}
          title={applications.length === 0 ? 'No applications yet' : 'No results'}
          message={
            applications.length === 0
              ? 'Apply to matched jobs to track your progress here.'
              : 'Try a different job title keyword.'
          }
          action={
            <Link href="/applicant/jobs" className="inline-flex text-sm font-medium text-blue-600 hover:underline">
              Browse jobs
            </Link>
          }
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((app: any) => (
            <Link
              key={app.id}
              href={`/applicant/applications/${app.id}`}
              className="block bg-white rounded-xl border border-gray-200 p-4 hover:border-blue-300 hover:shadow-sm transition-all"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold text-gray-900">{app.job?.title || 'Unknown job'}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    Submitted: {app.submittedAt ? new Date(app.submittedAt).toLocaleDateString() : 'Not submitted'}
                    {' · '}
                    Documents: {app.documents?.length || 0}
                  </div>
                </div>
                <StatusBadge status={app.status} size="sm" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
