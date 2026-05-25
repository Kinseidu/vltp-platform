'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { DashboardLayout, PageHeader, EmptyState } from '@/components/shared/DashboardLayout';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { NotificationBell } from '@/components/shared/NotificationBell';
import { StaggerContainer, StaggerItem } from '@/components/shared/AnimatedContainer';
import { SkeletonList } from '@/components/shared/Skeleton';
import { ClipboardList, Search, User, Briefcase } from 'lucide-react';

export default function HRApplicationsPage() {
  const [user, setUser] = useState<any>(null);
  const [applications, setApplications] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => d.success && setUser(d.data.user));
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    if (status) params.set('status', status);

    fetch(`/api/applications?${params}`)
      .then(r => r.json())
      .then(d => {
        if (d.success) setApplications(d.data.applications || []);
        setLoading(false);
      });
  }, [status]);

  if (!user && !loading) {
    window.location.href = '/auth/login';
    return null;
  }

  const filtered = applications.filter(app => {
    const name = app.applicant?.fullName?.toLowerCase() || '';
    const title = app.job?.title?.toLowerCase() || '';
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return name.includes(q) || title.includes(q);
  });

  return (
      <DashboardLayout role={user?.role || 'HR_OFFICER'} userName={user?.email || ''} userEmail={user?.email || ''}>
        <NotificationBell role={user?.role} />
        <PageHeader
        title="Applications"
        subtitle={`${applications.length} total applications`}
      />

      <div className="flex gap-3 mb-6 flex-wrap">
        <div className="relative flex-1 min-w-56">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
          <input
            type="text"
            placeholder="Search applicant or job..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600"
          />
        </div>

        <select
          value={status}
          onChange={e => setStatus(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 bg-white dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600"
        >
          <option value="">All statuses</option>
          <option value="SUBMITTED">Submitted</option>
          <option value="UNDER_REVIEW">Under Review</option>
          <option value="SHORTLISTED">Shortlisted</option>
          <option value="REJECTED">Rejected</option>
          <option value="INVITED_FOR_INTERVIEW">Invited For Interview</option>
          <option value="HIRED">Hired</option>
        </select>
      </div>

      {loading ? (
        <SkeletonList count={5} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<ClipboardList size={24} />}
          title="No applications found"
          message="Applications will appear here when candidates apply to posted jobs."
        />
      ) : (
        <StaggerContainer className="space-y-3">
          {filtered.map((app: any) => (
            <StaggerItem key={app.id}>
              <Link
                href={`/hr/applications/${app.id}`}
                className="block bg-white rounded-xl border border-gray-200 p-4 hover:border-blue-300 hover:shadow-sm transition-all dark:bg-gray-900 dark:border-gray-700 dark:hover:border-blue-600"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">{app.applicant?.fullName || 'Unknown applicant'}</div>
                    <div className="text-xs text-gray-500 mt-1 flex items-center gap-3 flex-wrap dark:text-gray-400">
                      <span className="inline-flex items-center gap-1">
                        <Briefcase size={12} />
                        {app.job?.title || 'Unknown job'}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <User size={12} />
                        {app.applicant?.community?.name || 'No community'}
                      </span>
                      <span>{app.documents?.length || 0} document(s)</span>
                    </div>
                  </div>
                  <StatusBadge status={app.status} size="sm" />
                </div>
              </Link>
            </StaggerItem>
          ))}
        </StaggerContainer>
      )}
    </DashboardLayout>
  );
}
