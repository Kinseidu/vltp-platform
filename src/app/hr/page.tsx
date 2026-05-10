// src/app/hr/page.tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { DashboardLayout, PageHeader, StatCard } from '@/components/shared/DashboardLayout';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { NotificationBell } from '@/components/shared/NotificationBell';
import { Briefcase, Users, BarChart2, FileText, ArrowRight, Plus, Zap } from 'lucide-react';
import { AppSpinner } from '@/components/shared/AppSpinner';

export default function HRDashboard() {
  const [user, setUser] = useState<any>(null);
  const [jobs, setJobs] = useState<any[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/auth/me').then(r => r.json()),
      fetch('/api/jobs').then(r => r.json()),
      fetch('/api/applications').then(r => r.json()),
    ]).then(([u, j, a]) => {
      if (u.success) setUser(u.data.user);
      if (j.success) setJobs(j.data.jobs || []);
      if (a.success) setApplications(a.data.applications || []);
      setLoading(false);
    });
  }, []);

  if (loading) return (
    <DashboardLayout role="HR_OFFICER" userName="" userEmail="">
      <div className="h-[70vh] flex flex-col items-center justify-center gap-3 text-gray-500">
        <AppSpinner size="md" />
        <p className="text-sm">Loading dashboard...</p>
      </div>
    </DashboardLayout>
  );
  if (!user) { window.location.href = '/auth/login'; return null; }

  const openJobs = jobs.filter(j => j.status === 'OPEN');
  const pendingReview = applications.filter(a => a.status === 'SUBMITTED' || a.status === 'UNDER_REVIEW');
  const shortlisted = applications.filter(a => a.status === 'SHORTLISTED');

  return (
    <DashboardLayout role={user.role} userName={user.email} userEmail={user.email}>
      <NotificationBell role={user.role} />
      <PageHeader
        title="HR Dashboard"
        subtitle="Manage jobs, applications, and AI-assisted shortlisting"
        action={
          <Link href="/hr/jobs/new"
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors">
            <Plus size={16} /> Post New Job
          </Link>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Open Jobs" value={openJobs.length} icon={<Briefcase size={18} />} colour="blue" />
        <StatCard label="Pending Review" value={pendingReview.length} icon={<Users size={18} />} colour="yellow" sub="Submitted applications" />
        <StatCard label="Shortlisted" value={shortlisted.length} icon={<BarChart2 size={18} />} colour="purple" />
        <StatCard label="Total Jobs" value={jobs.length} icon={<FileText size={18} />} colour="green" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Active jobs */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900">Job Postings</h2>
            <Link href="/hr/jobs" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
              Manage all <ArrowRight size={12} />
            </Link>
          </div>
          <div className="space-y-3">
            {jobs.slice(0, 5).map((job: any) => (
              <Link key={job.id} href="/hr/jobs"
                className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 border border-gray-100 transition-colors">
                <div>
                  <div className="text-sm font-medium text-gray-900">{job.title}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{job._count?.applications || 0} applications · Min {job.minExperience}yr</div>
                </div>
                <StatusBadge status={job.status} size="sm" />
              </Link>
            ))}
            {jobs.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-6">No jobs posted yet.</p>
            )}
          </div>
        </div>

        {/* Recent applications needing attention */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900">Needs Attention</h2>
            <Link href="/hr/applications" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
              All applications <ArrowRight size={12} />
            </Link>
          </div>
          <div className="space-y-3">
            {pendingReview.slice(0, 5).map((app: any) => (
              <Link key={app.id} href={`/hr/applications/${app.id}`}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 border border-gray-100 transition-colors">
                <div>
                  <div className="text-sm font-medium text-gray-900">{app.applicant?.fullName}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{app.job?.title}</div>
                </div>
                <StatusBadge status={app.status} size="sm" />
              </Link>
            ))}
            {pendingReview.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-6">No applications pending review.</p>
            )}
          </div>
        </div>

        {/* Quick AI tools */}
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl p-5 text-white lg:col-span-2">
          <div className="flex items-center gap-2 mb-2">
            <Zap size={18} />
            <h2 className="text-base font-semibold">AI-Assisted Tools</h2>
          </div>
          <p className="text-sm text-blue-100 mb-4">Use AI to shortlist applicants and generate interview questions. AI assists — you decide.</p>
          <div className="flex flex-wrap gap-3">
            <Link href="/hr/shortlisting"
              className="inline-flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
              <BarChart2 size={15} /> Run Shortlisting
            </Link>
            <Link href="/hr/applications"
              className="inline-flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
              <FileText size={15} /> Generate Interview Questions
            </Link>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
