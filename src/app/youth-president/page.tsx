'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { DashboardLayout, PageHeader, StatCard, EmptyState } from '@/components/shared/DashboardLayout';
import { ArrowRight, CheckCircle2, Clock3, Users } from 'lucide-react';

export default function YouthPresidentDashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [community, setCommunity] = useState<any>(null);
  const [pending, setPending] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/auth/me').then(r => r.json()),
      fetch('/api/verification/community').then(r => r.json()),
    ]).then(([meData, queueData]) => {
      if (meData.success) setUser(meData.data.user);
      if (queueData.success) {
        setCommunity(queueData.data.community);
        setPending(queueData.data.requests || []);
      }
      setLoading(false);
    });
  }, []);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-sm text-gray-400">Loading dashboard...</div>;
  }

  if (!user) {
    window.location.href = '/auth/login';
    return null;
  }

  return (
    <DashboardLayout role={user.role} userName={user.email} userEmail={user.email}>
      <PageHeader
        title="Youth President Dashboard"
        subtitle={community ? `Assigned community: ${community.name}` : 'Community assignment required'}
      />

      <div className="grid md:grid-cols-3 gap-4 mb-6">
        <StatCard label="Pending Requests" value={pending.length} icon={<Clock3 size={18} />} colour={pending.length ? 'yellow' : 'green'} />
        <StatCard label="Community" value={community?.name || 'Not assigned'} icon={<Users size={18} />} colour="blue" />
        <StatCard label="Queue Status" value={pending.length ? 'Action needed' : 'Up to date'} icon={<CheckCircle2 size={18} />} colour={pending.length ? 'yellow' : 'green'} />
      </div>

      {!community ? (
        <EmptyState
          icon={<Users size={24} />}
          title="No community assignment"
          message="Ask an administrator to assign you as Youth President for a community."
        />
      ) : pending.length === 0 ? (
        <EmptyState
          icon={<CheckCircle2 size={24} />}
          title="No pending verification requests"
          message="All current requests have been reviewed."
        />
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-base font-semibold text-gray-900 mb-2">Review verification queue</h3>
          <p className="text-sm text-gray-500 mb-4">
            You have {pending.length} pending applicant request{pending.length === 1 ? '' : 's'} in {community.name}.
          </p>
          <Link
            href="/youth-president/verifications"
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg"
          >
            Open queue <ArrowRight size={14} />
          </Link>
        </div>
      )}
    </DashboardLayout>
  );
}
