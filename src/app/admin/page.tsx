'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { DashboardLayout, PageHeader, StatCard } from '@/components/shared/DashboardLayout';
import { NotificationBell } from '@/components/shared/NotificationBell';
import { Users, Shield, FileText, Activity, ArrowRight, Briefcase, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import { format } from 'date-fns';

export default function AdminDashboard() {
  const [user, setUser] = useState<any>(null);
  const [data, setData] = useState<any>({});
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/auth/me').then(r => r.json()),
      fetch('/api/admin/reports').then(r => r.json()),
      fetch('/api/admin/audit-logs?pageSize=10').then(r => r.json()),
    ]).then(([u, r, al]) => {
      if (u.success) setUser(u.data.user);
      if (r.success) setData(r.data);
      if (al.success) setAuditLogs(al.data.logs || []);
      setLoading(false);
    });
  }, []);

  if (!user && !loading) { window.location.href = '/auth/login'; return null; }

  const verifiedCount = data?.verifications?.find((v: any) => v.verificationStatus === 'VERIFIED')?._count?.id || 0;
  const pendingCount = data?.verifications?.find((v: any) => v.verificationStatus === 'PENDING_YP')?._count?.id || 0;
  const applicantCount = data?.roles?.find((r: any) => r.role === 'APPLICANT')?._count?.id || 0;

  return (
    <DashboardLayout role={user?.role || 'ADMIN'} userName={user?.email || ''} userEmail={user?.email || ''}>
      <NotificationBell role={user?.role || 'ADMIN'} />
      <PageHeader title="Admin Dashboard" subtitle="Platform management and oversight" />

      {/* Alerts */}
      {pendingCount > 10 && (
        <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="text-yellow-600 mt-0.5" size={18} />
          <div>
            <h4 className="font-semibold text-yellow-800 text-sm">High Verification Backlog</h4>
            <p className="text-xs text-yellow-700 mt-1">There are {pendingCount} pending verification requests. You may need to follow up with Youth Presidents.</p>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Users" value={data?.overview?.totalUsers || 0} icon={<Users size={18} />} colour="blue" />
        <StatCard label="Applicants" value={applicantCount} icon={<UserIcon />} colour="blue" />
        <StatCard label="Verified Locals" value={verifiedCount} icon={<Shield size={18} />} colour="green" />
        <StatCard label="Pending Verification" value={pendingCount} icon={<Activity size={18} />} colour="yellow" />
        
        <StatCard label="Active Jobs" value={data?.overview?.totalJobs || 0} icon={<Briefcase size={18} />} colour="purple" />
        <StatCard label="Submitted Apps" value={data?.overview?.totalApplications || 0} icon={<FileText size={18} />} colour="blue" />
        <StatCard label="Shortlisted" value="--" sub="Module integrating" icon={<CheckCircle size={18} />} colour="green" />
        <StatCard label="Rejected" value="--" sub="Module integrating" icon={<XCircle size={18} />} colour="red" />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        
        {/* Recent audit logs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden lg:col-span-2">
          <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <Activity size={18} className="text-gray-400" /> Recent Activity Feed
            </h2>
            <Link href="/admin/audit-logs" className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1">
              View all <ArrowRight size={12} />
            </Link>
          </div>
          <div className="divide-y divide-gray-100">
            {auditLogs.map((log: any) => (
              <div key={log.id} className="p-4 flex gap-4 hover:bg-gray-50">
                <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                  <FileText size={14} className="text-blue-600" />
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-900">
                    <span className="font-mono text-xs bg-gray-100 px-1 rounded text-gray-600 mr-2">{log.action}</span>
                    by {log.actor?.email}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {log.entity} #{log.entityId} • {format(new Date(log.createdAt), 'dd MMM HH:mm')}
                  </div>
                </div>
              </div>
            ))}
            {auditLogs.length === 0 && (
              <div className="p-8 text-center text-xs text-gray-400">No activity recorded yet.</div>
            )}
          </div>
        </div>

        {/* Quick Links */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-gray-50">
            <h2 className="text-base font-semibold text-gray-900">Quick Actions</h2>
          </div>
          <div className="p-2 flex flex-col gap-1">
            <Link href="/admin/users" className="flex items-center gap-3 p-3 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 rounded-lg transition-colors">
              <Users size={16} /> Manage Users
            </Link>
            <Link href="/admin/roles" className="flex items-center gap-3 p-3 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 rounded-lg transition-colors">
              <Shield size={16} /> Assign Roles
            </Link>
            <Link href="/admin/communities" className="flex items-center gap-3 p-3 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 rounded-lg transition-colors">
              <MapPinIcon size={16} /> Manage Communities
            </Link>
            <Link href="/admin/announcements" className="flex items-center gap-3 p-3 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 rounded-lg transition-colors">
              <BellIcon size={16} /> Broadcast Announcement
            </Link>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

function UserIcon() { return <Users size={18} />; }
function MapPinIcon({ size }: { size: number }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>; }
function BellIcon({ size }: { size: number }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>; }
