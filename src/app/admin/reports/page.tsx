'use client';

import { useEffect, useState } from 'react';
import { DashboardLayout, PageHeader, StatCard } from '@/components/shared/DashboardLayout';
import { NotificationBell } from '@/components/shared/NotificationBell';
import { SkeletonStatCard } from '@/components/shared/Skeleton';
import { BarChart2, PieChart, Users, FileText, CheckCircle, TrendingUp } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart as RPieChart, Pie, Cell, Legend,
} from 'recharts';

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316'];

const ROLE_LABELS: Record<string, string> = {
  APPLICANT: 'Applicant',
  YOUTH_PRESIDENT: 'Youth President',
  HR_OFFICER: 'HR Officer',
  CHIEF_STAFF: 'Chief Staff',
  ADMIN: 'Admin',
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pending',
  YOUTH_APPROVED: 'Youth Approved',
  CHIEF_CONFIRMED: 'Chief Confirmed',
  VERIFIED: 'Verified',
  REJECTED: 'Rejected',
  NONE: 'None',
};

const JOB_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Draft',
  OPEN: 'Open',
  CLOSED: 'Closed',
  FILLED: 'Filled',
};

interface ReportData {
  overview: { totalUsers: number; totalJobs: number; totalApplications: number };
  roles: { role: string; _count: { id: number } }[];
  verifications: { verificationStatus: string; _count: { id: number } }[];
  jobsByStatus: { status: string; _count: { id: number } }[];
  userRegistrations: { date: string; role: string }[];
  applicationsByMonth: { date: string; status: string }[];
  communityBreakdown: { community: string; status: string; count: number }[];
}

export default function AdminReports() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/reports').then(r => r.json()).then(res => {
      if (res.success) setData(res.data);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <DashboardLayout role="ADMIN" userName="Admin" userEmail="admin@example.com">
        <NotificationBell role="ADMIN" />
        <PageHeader title="Reports & Analytics" subtitle="Platform usage, verification rates, and system analytics." />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonStatCard key={i} />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
              <div className="animate-pulse space-y-4">
                <div className="h-5 w-40 bg-gray-200 dark:bg-gray-800 rounded" />
                <div className="h-64 bg-gray-200 dark:bg-gray-800 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      </DashboardLayout>
    );
  }

  const verifiedCount = data?.verifications?.find((v) => v.verificationStatus === 'VERIFIED')?._count?.id || 0;

  const roleData = (data?.roles || []).map((r) => ({
    name: ROLE_LABELS[r.role] || r.role,
    value: r._count.id,
  }));

  const verificationData = (data?.verifications || []).map((v) => ({
    name: STATUS_LABELS[v.verificationStatus] || v.verificationStatus,
    value: v._count.id,
  }));

  const jobStatusData = (data?.jobsByStatus || []).map((j) => ({
    name: JOB_STATUS_LABELS[j.status] || j.status,
    value: j._count.id,
  }));

  const regByDate = (data?.userRegistrations || []).reduce<Record<string, Record<string, number>>>((acc, u) => {
    if (!acc[u.date]) acc[u.date] = {};
    acc[u.date][u.role] = (acc[u.date][u.role] || 0) + 1;
    return acc;
  }, {});
  const regDates = Object.keys(regByDate).sort().slice(-14);
  const regRoles = Array.from(new Set((data?.userRegistrations || []).map((u) => u.role)));
  const registrationData = regDates.map(date => {
    const entry: Record<string, number | string> = { date };
    regRoles.forEach(role => { entry[ROLE_LABELS[role] || role] = regByDate[date][role] || 0; });
    return entry;
  });

  const appByDate = (data?.applicationsByMonth || []).reduce<Record<string, number>>((acc, a) => {
    acc[a.date] = (acc[a.date] || 0) + 1;
    return acc;
  }, {});
  const applicationData = Object.keys(appByDate).sort().slice(-14).map(date => ({ date, applications: appByDate[date] }));

  const communityData = (data?.communityBreakdown || []).reduce<Record<string, Record<string, number>>>((acc, c) => {
    if (!acc[c.community]) acc[c.community] = {};
    acc[c.community][c.status] = c.count;
    return acc;
  }, {});
  const communityBars = Object.keys(communityData);
  const communityStatuses = Array.from(new Set((data?.communityBreakdown || []).map((c) => c.status)));
  const communityBarData = communityBars.map(community => {
    const entry: Record<string, number | string> = { community };
    communityStatuses.forEach(status => { entry[STATUS_LABELS[status] || status] = communityData[community][status] || 0; });
    return entry;
  });

  const hasChartData = (arr: any[]) => arr && arr.length > 0 && arr.some((d) => d.value > 0);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3 text-sm">
          <p className="font-semibold text-gray-900 dark:text-gray-100 mb-1">{label}</p>
          {payload.map((entry: any, idx: number) => (
            <p key={idx} style={{ color: entry.color }} className="text-xs">
              {entry.name}: <span className="font-medium">{entry.value}</span>
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <DashboardLayout role="ADMIN" userName="Admin" userEmail="admin@example.com">
      <NotificationBell role="ADMIN" />
      <PageHeader title="Reports & Analytics" subtitle="Platform usage, verification rates, and system analytics." />

      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total Users" value={data?.overview?.totalUsers || 0} icon={<Users size={18} />} colour="blue" />
          <StatCard label="Active Jobs" value={data?.overview?.totalJobs || 0} icon={<FileText size={18} />} colour="purple" />
          <StatCard label="Applications" value={data?.overview?.totalApplications || 0} icon={<CheckCircle size={18} />} colour="green" />
          <StatCard label="Verified Locals" value={verifiedCount} icon={<CheckCircle size={18} />} colour="yellow" />
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <a
            href="/api/admin/export?type=applicants"
            className="inline-flex items-center gap-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-sm px-4 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <TrendingUp size={14} /> Export Applicants CSV
          </a>
          <a
            href="/api/admin/export?type=applications"
            className="inline-flex items-center gap-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-sm px-4 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <FileText size={14} /> Export Applications CSV
          </a>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-6">
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <PieChart size={16} className="text-gray-400" /> Users by Role
            </h3>
            {hasChartData(roleData) ? (
              <ResponsiveContainer width="100%" height={260}>
                <RPieChart>
                  <Pie data={roleData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} paddingAngle={2}>
                    {roleData.map((_: any, idx: number) => <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12, color: '#6b7280' }} />
                </RPieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[260px] flex items-center justify-center text-sm text-gray-400">No data available</div>
            )}
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-6">
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <CheckCircle size={16} className="text-gray-400" /> Verification Status Breakdown
            </h3>
            {hasChartData(verificationData) ? (
              <ResponsiveContainer width="100%" height={260}>
                <RPieChart>
                  <Pie data={verificationData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} paddingAngle={2}>
                    {verificationData.map((_: any, idx: number) => <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12, color: '#6b7280' }} />
                </RPieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[260px] flex items-center justify-center text-sm text-gray-400">No data available</div>
            )}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-6">
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <TrendingUp size={16} className="text-gray-400" /> User Registrations (Last 14 Days)
            </h3>
            {registrationData.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={registrationData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-gray-700" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9ca3af' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                  {regRoles.map((role: string, idx: number) => (
                    <Bar key={role} dataKey={ROLE_LABELS[role] || role} stackId="users" fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[240px] flex items-center justify-center text-sm text-gray-400">No registrations in last 30 days</div>
            )}
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-6">
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <FileText size={16} className="text-gray-400" /> Applications (Last 14 Days)
            </h3>
            {applicationData.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={applicationData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-gray-700" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9ca3af' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="applications" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[240px] flex items-center justify-center text-sm text-gray-400">No applications in last 30 days</div>
            )}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-6">
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <BarChart2 size={16} className="text-gray-400" /> Jobs by Status
            </h3>
            {hasChartData(jobStatusData) ? (
              <ResponsiveContainer width="100%" height={260}>
                <RPieChart>
                  <Pie data={jobStatusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} paddingAngle={2}>
                    {jobStatusData.map((_: any, idx: number) => <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12, color: '#6b7280' }} />
                </RPieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[260px] flex items-center justify-center text-sm text-gray-400">No jobs found</div>
            )}
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-6">
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <Users size={16} className="text-gray-400" /> Community Verification
            </h3>
            {communityBarData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={communityBarData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-gray-700" />
                  <XAxis dataKey="community" tick={{ fontSize: 10, fill: '#9ca3af' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                  {communityStatuses.map((status: string, idx: number) => (
                    <Bar key={status} dataKey={STATUS_LABELS[status] || status} stackId="community" fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[260px] flex items-center justify-center text-sm text-gray-400">No community data available</div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
