'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Briefcase, Search } from 'lucide-react';
import { DashboardLayout, EmptyState, PageHeader } from '@/components/shared/DashboardLayout';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { SkeletonList } from '@/components/shared/Skeleton';
import { NotificationBell } from '@/components/shared/NotificationBell';
import { StaggerContainer, StaggerItem } from '@/components/shared/AnimatedContainer';

export default function ApplicantJobsPage() {
  const [user, setUser] = useState<any>(null);
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  useEffect(() => {
    Promise.all([
      fetch('/api/auth/me').then(r => r.json()),
      fetch('/api/jobs/matches').then(r => r.json()),
    ]).then(([meData, jobsData]) => {
      if (meData.success) setUser(meData.data.user);
      if (jobsData.success) setJobs(jobsData.data.jobs || []);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <DashboardLayout role="APPLICANT" userName="" userEmail="">
        <SkeletonList count={6} />
      </DashboardLayout>
    );
  }

  if (!user) {
    window.location.href = '/auth/login';
    return null;
  }

  const filtered = jobs.filter((job: any) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return job.title?.toLowerCase().includes(q) || job.description?.toLowerCase().includes(q);
  });

  return (
    <DashboardLayout role={user.role} userName={user.applicantProfile?.fullName || user.email} userEmail={user.email}>
      <NotificationBell />
      <PageHeader title="Matched Jobs" subtitle={`${jobs.length} jobs matched to your profile`} />

      <div className="relative mb-6">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search matched jobs..."
          className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:bg-gray-800 dark:text-gray-100"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Briefcase size={24} />}
          title={jobs.length === 0 ? 'No matched jobs yet' : 'No jobs match your search'}
          message={
            jobs.length === 0
              ? 'Matched jobs will appear after your profile and verification criteria align with open postings.'
              : 'Try a different keyword.'
          }
        />
      ) : (
        <StaggerContainer className="space-y-3">
          {filtered.map((job: any) => (
            <StaggerItem key={job.id}>
              <Link
                href={`/applicant/jobs/${job.id}`}
                className="block bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-sm transition-all"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{job.title}</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{job.description}</p>
                    <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                      Min {job.minExperience || 0} year(s) experience
                      {job.applicationDeadline ? ` · Deadline: ${new Date(job.applicationDeadline).toLocaleDateString()}` : ''}
                    </div>
                  </div>
                  <StatusBadge status={job.status} size="sm" />
                </div>
              </Link>
            </StaggerItem>
          ))}
        </StaggerContainer>
      )}
    </DashboardLayout>
  );
}
