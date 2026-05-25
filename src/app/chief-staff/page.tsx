'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { DashboardLayout, PageHeader, StatCard, EmptyState } from '@/components/shared/DashboardLayout';
import { AppSpinner } from '@/components/shared/AppSpinner';
import { CheckCircle2, Shield, Clock3, ArrowRight } from 'lucide-react';
import { NotificationBell } from '@/components/shared/NotificationBell';

export default function ChiefStaffDashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/auth/me').then(r => r.json()),
      fetch('/api/verification/pending-chief').then(r => r.json()),
      fetch('/api/verification/chief-history?limit=5').then(r => r.json()),
    ]).then(([meData, queueData, historyData]) => {
      if (meData.success) setUser(meData.data.user);
      if (queueData.success) setPendingCount(queueData.data.total || 0);
      if (historyData.success) setRecentActivity(historyData.data.history || []);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <DashboardLayout role="CHIEF_STAFF" userName="" userEmail="">
        <div className="h-[70vh] flex flex-col items-center justify-center gap-3 text-gray-500 dark:text-gray-400">
          <AppSpinner size="md" />
          <p className="text-sm">Loading dashboard...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!user) {
    window.location.href = '/auth/login';
    return null;
  }

  return (
    <DashboardLayout role={user.role} userName={user.email} userEmail={user.email}>
      <NotificationBell />
      <PageHeader
        title="Chief Staff Dashboard"
        subtitle="Record Chief confirmations for youth-approved applicants."
      />

      <div className="grid md:grid-cols-3 gap-4 mb-8">
        <StatCard
          label="Pending Confirmations"
          value={pendingCount}
          icon={<Clock3 size={18} />}
          colour={pendingCount > 0 ? 'yellow' : 'green'}
          sub="Waiting for your action"
        />
        <StatCard
          label="Recent Decisions"
          value={recentActivity.length}
          icon={<CheckCircle2 size={18} />}
          colour="blue"
          sub="Last 5 actions"
        />
        <StatCard
          label="Role"
          value="Chief Staff"
          icon={<Shield size={18} />}
          colour="blue"
          sub="Community authority workflow"
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Main Action Area */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
            <div className="p-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">Pending Queue</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                You have {pendingCount} applicant{pendingCount === 1 ? '' : 's'} waiting for Chief confirmation. 
                These have already been approved by the Youth President.
              </p>
              
              {pendingCount > 0 ? (
                <Link
                  href="/chief-staff/confirmations"
                  className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-6 py-3 rounded-xl transition-all shadow-md hover:shadow-lg"
                >
                  Process Queue <ArrowRight size={16} />
                </Link>
              ) : (
                <div className="bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-sm p-4 rounded-xl border border-green-100 dark:border-green-800 flex items-center gap-3">
                  <CheckCircle2 size={18} /> All caught up! No pending confirmations.
                </div>
              )}
            </div>
          </div>

          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl p-6 text-white shadow-lg">
            <h3 className="font-bold mb-2">Quick Tip</h3>
            <p className="text-slate-300 text-sm leading-relaxed">
              When recording a confirmation, ensure you enter the name of the specific Chief who gave the authority. 
              This is critical for the audit trail and future verification audits.
            </p>
          </div>
        </div>

        {/* Recent Activity Sidebar */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between bg-gray-50/50 dark:bg-gray-800/50">
            <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wider">Recent Activity</h3>
            <Link href="/chief-staff/history" className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium">View All</Link>
          </div>
          <div className="flex-1">
            {recentActivity.length === 0 ? (
              <div className="p-8 text-center text-gray-400 dark:text-gray-500 italic text-sm">No recent activity recorded.</div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {recentActivity.map((log) => (
                  <div key={log.id} className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        {log.request?.applicant?.fullName}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                        log.status === 'CHIEF_CONFIRMED' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                      }`}>
                        {log.status === 'CHIEF_CONFIRMED' ? 'Confirmed' : 'Rejected'}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center justify-between">
                      <span>Chief: {log.chiefName}</span>
                      <span>{new Date(log.confirmedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
