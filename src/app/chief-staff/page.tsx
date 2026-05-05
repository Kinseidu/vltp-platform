'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { DashboardLayout, PageHeader, StatCard, EmptyState } from '@/components/shared/DashboardLayout';
import { AppSpinner } from '@/components/shared/AppSpinner';
import { CheckCircle2, Shield, Clock3, ArrowRight } from 'lucide-react';

export default function ChiefStaffDashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/auth/me').then(r => r.json()),
      fetch('/api/verification/pending-chief').then(r => r.json()),
    ]).then(([meData, queueData]) => {
      if (meData.success) setUser(meData.data.user);
      if (queueData.success) setPendingCount(queueData.data.total || 0);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <DashboardLayout role="CHIEF_STAFF" userName="" userEmail="">
        <div className="h-[70vh] flex flex-col items-center justify-center gap-3 text-gray-500">
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
      <PageHeader
        title="Chief Staff Dashboard"
        subtitle="Record Chief confirmations for youth-approved applicants."
      />

      <div className="grid md:grid-cols-3 gap-4 mb-6">
        <StatCard
          label="Pending Confirmations"
          value={pendingCount}
          icon={<Clock3 size={18} />}
          colour={pendingCount > 0 ? 'yellow' : 'green'}
          sub="Waiting for your action"
        />
        <StatCard
          label="Role"
          value="Chief Staff"
          icon={<Shield size={18} />}
          colour="blue"
          sub="Community authority workflow"
        />
        <StatCard
          label="Status"
          value={pendingCount > 0 ? 'Action needed' : 'Up to date'}
          icon={<CheckCircle2 size={18} />}
          colour={pendingCount > 0 ? 'yellow' : 'green'}
        />
      </div>

      {pendingCount === 0 ? (
        <EmptyState
          icon={<CheckCircle2 size={24} />}
          title="No confirmations pending"
          message="All youth-approved requests have already been confirmed or resolved."
        />
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-base font-semibold text-gray-900 mb-2">Next action</h3>
          <p className="text-sm text-gray-500 mb-4">
            You have {pendingCount} applicant{pendingCount === 1 ? '' : 's'} waiting for Chief confirmation.
          </p>
          <Link
            href="/chief-staff/confirmations"
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg"
          >
            Open confirmation queue <ArrowRight size={14} />
          </Link>
        </div>
      )}
    </DashboardLayout>
  );
}
