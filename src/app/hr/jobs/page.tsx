// src/app/hr/jobs/page.tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { DashboardLayout, PageHeader, EmptyState } from '@/components/shared/DashboardLayout';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Plus, Briefcase, Users, Calendar, Search } from 'lucide-react';
import { format } from 'date-fns';

export default function HRJobsPage() {
  const [user, setUser] = useState<any>(null);
  const [jobs, setJobs] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => d.success && setUser(d.data.user));
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (statusFilter) params.set('status', statusFilter);
    else params.set('status', ''); // get all for HR

    fetch(`/api/jobs?${params}`)
      .then(r => r.json())
      .then(d => { if (d.success) setJobs(d.data.jobs || []); setLoading(false); });
  }, [search, statusFilter]);

  if (!user && !loading) { window.location.href = '/auth/login'; return null; }

  const filtered = jobs.filter(j =>
    !statusFilter || j.status === statusFilter
  );

  return (
    <DashboardLayout role={user?.role || 'HR_OFFICER'} userName={user?.email || ''} userEmail={user?.email || ''}>
      <PageHeader
        title="Job Postings"
        subtitle={`${jobs.length} total jobs`}
        action={
          <Link href="/hr/jobs/new"
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors">
            <Plus size={16} /> Post New Job
          </Link>
        }
      />

      {/* Filters */}
      <div className="flex gap-3 mb-6 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search jobs..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="">All statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="OPEN">Open</option>
          <option value="CLOSED">Closed</option>
          <option value="FILLED">Filled</option>
        </select>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400 text-sm">Loading jobs...</div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Briefcase size={24} />}
          title="No jobs found"
          message="Post your first job to start receiving applications from verified community members."
          action={
            <Link href="/hr/jobs/new" className="inline-flex items-center gap-2 bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700">
              <Plus size={15} /> Post a Job
            </Link>
          }
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((job: any) => (
            <Link key={job.id} href="/hr/jobs"
              className="block bg-white rounded-xl border border-gray-200 p-5 hover:border-blue-300 hover:shadow-sm transition-all">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-base font-semibold text-gray-900">{job.title}</h3>
                    <StatusBadge status={job.status} size="sm" />
                  </div>
                  <p className="text-sm text-gray-500 line-clamp-2 mb-3">{job.description}</p>
                  <div className="flex items-center gap-4 text-xs text-gray-400 flex-wrap">
                    <span className="flex items-center gap-1">
                      <Users size={12} />
                      {job._count?.applications || 0} application(s)
                    </span>
                    <span className="flex items-center gap-1">
                      <Briefcase size={12} />
                      Min {job.minExperience}yr experience
                    </span>
                    {job.applicationDeadline && (
                      <span className="flex items-center gap-1">
                        <Calendar size={12} />
                        Deadline: {format(new Date(job.applicationDeadline), 'dd MMM yyyy')}
                      </span>
                    )}
                    <span>
                      Communities: {job.eligibleCommunities?.map((ec: any) => ec.community.name).join(', ')}
                    </span>
                  </div>
                </div>
                <div className="flex-shrink-0 text-right">
                  <div className="text-xs text-gray-400">{format(new Date(job.createdAt), 'dd MMM yyyy')}</div>
                  <div className="text-xs text-blue-600 mt-1 font-medium">
                    {job.requirements?.length || 0} skill req.
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
