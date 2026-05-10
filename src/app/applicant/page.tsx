// src/app/applicant/page.tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { DashboardLayout, PageHeader, StatCard } from '@/components/shared/DashboardLayout';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { AppSpinner } from '@/components/shared/AppSpinner';
import { NotificationBell } from '@/components/shared/NotificationBell';

import { CheckCircle, Briefcase, FileText, Bell, ArrowRight, AlertCircle } from 'lucide-react';


export default function ApplicantDashboard() {
  const [user, setUser] = useState<any>(null);
  const [applications, setApplications] = useState<any[]>([]);
  const [matchedJobs, setMatchedJobs] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);


  useEffect(() => {
    Promise.all([
      fetch('/api/auth/me').then(r => r.json()),
      fetch('/api/applications').then(r => r.json()),
      fetch('/api/jobs/matches').then(r => r.json()),
      fetch('/api/notifications?unread=true').then(r => r.json()),
    ]).then(([userData, appsData, jobsData, notifData]) => {
      if (userData.success) setUser(userData.data.user);
      if (appsData.success) setApplications(appsData.data.applications || []);
      if (jobsData.success) setMatchedJobs(jobsData.data.jobs || []);
      if (notifData.success) setNotifications(notifData.data.notifications || []);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <DashboardLayout role="APPLICANT" userName="" userEmail="">
        <div className="h-[70vh] flex flex-col items-center justify-center gap-3 text-gray-500">
          <AppSpinner size="md" />
          <p className="text-sm">Loading dashboard...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!user) { window.location.href = '/auth/login'; return null; }

  const unreadCount = notifications.length;


  const profile = user.applicantProfile;
  const isVerified = profile?.verificationStatus === 'VERIFIED';
  const verificationStatus = profile?.verificationStatus || 'PENDING';

  return (
<DashboardLayout role={user.role} userName={profile?.fullName || user.email} userEmail={user.email}>
      {/* Top-right notifications bell */}
      <NotificationBell />

      <PageHeader

        title={`Welcome, ${profile?.fullName?.split(' ')[0] || 'there'}!`}
        subtitle={`Community: ${profile?.community?.name || 'Not set'}`}
      />

      {/* Verification banner */}
      {!isVerified && (
        <div className={`rounded-xl border p-4 mb-6 flex items-start gap-3 ${
          verificationStatus === 'REJECTED'
            ? 'bg-red-50 border-red-200'
            : 'bg-amber-50 border-amber-200'
        }`}>
          <AlertCircle size={18} className={verificationStatus === 'REJECTED' ? 'text-red-500 mt-0.5' : 'text-amber-500 mt-0.5'} />
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-800">
              {verificationStatus === 'PENDING' && 'Complete your community verification to unlock job applications'}
              {verificationStatus === 'YOUTH_APPROVED' && 'Youth President approved! Awaiting Chief confirmation.'}
              {verificationStatus === 'REJECTED' && 'Your verification was not approved. Please contact your Youth President.'}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">Current status: <StatusBadge status={verificationStatus} size="sm" /></p>
          </div>
          <Link href="/applicant/verification" className="text-xs font-medium text-blue-600 hover:underline whitespace-nowrap">
            View details →
          </Link>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Verification Status" value={isVerified ? 'Verified ✓' : 'Pending'} icon={<CheckCircle size={18} />} colour={isVerified ? 'green' : 'yellow'} />
        <StatCard label="Matched Jobs" value={matchedJobs.length} icon={<Briefcase size={18} />} colour="blue" sub={isVerified ? 'Available to apply' : 'Get verified to apply'} />
        <StatCard label="Applications" value={applications.length} icon={<FileText size={18} />} colour="purple" />
        <StatCard label="Unread Alerts" value={unreadCount} icon={<Bell size={18} />} colour="yellow" />

      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent applications */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900">My Applications</h2>
            <Link href="/applicant/applications" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
              View all <ArrowRight size={12} />
            </Link>
          </div>
          {applications.length === 0 ? (
            <p className="text-sm text-gray-400 py-6 text-center">No applications yet. Browse matched jobs to get started.</p>
          ) : (
            <div className="space-y-3">
              {applications.slice(0, 4).map((app: any) => (
                <Link key={app.id} href={`/applicant/applications/${app.id}`}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 border border-gray-100 transition-colors">
                  <div>
                    <div className="text-sm font-medium text-gray-900">{app.job?.title}</div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {app.documents?.length || 0} document(s) uploaded
                    </div>
                  </div>
                  <StatusBadge status={app.status} size="sm" />
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Matched jobs */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900">Matched Jobs</h2>
            <Link href="/applicant/jobs" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
              View all <ArrowRight size={12} />
            </Link>
          </div>
          {matchedJobs.length === 0 ? (
            <p className="text-sm text-gray-400 py-6 text-center">
              {isVerified
                ? 'No matched jobs at the moment. Add more skills to your profile.'
                : 'Complete verification to see matched jobs.'}
            </p>
          ) : (
            <div className="space-y-3">
              {matchedJobs.slice(0, 4).map((job: any) => (
                <Link key={job.id} href={`/applicant/jobs/${job.id}`}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 border border-gray-100 transition-colors">
                  <div>
                    <div className="text-sm font-medium text-gray-900">{job.title}</div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      Min. {job.minExperience}yr exp · {job._count?.applications || 0} applicants
                    </div>
                  </div>
                  <StatusBadge status={job.status} size="sm" />
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Recent notifications */}
        {notifications.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-5 lg:col-span-2">

            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-gray-900">Recent Notifications</h2>
              <Link href="/applicant/notifications" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                View all <ArrowRight size={12} />
              </Link>
            </div>
            <div className="space-y-2">
              {notifications.slice(0, 5).map((n: any) => (
                <div key={n.id} className="flex items-start gap-3 p-3 rounded-lg bg-blue-50 border border-blue-100">
                  <Bell size={14} className="text-blue-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="text-sm font-medium text-gray-900">{n.title}</div>
                    <div className="text-xs text-gray-500">{n.message}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
