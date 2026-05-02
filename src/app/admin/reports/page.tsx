'use client';

import { useEffect, useState } from 'react';
import { DashboardLayout, PageHeader, StatCard } from '@/components/shared/DashboardLayout';
import { BarChart2, PieChart, Users, FileText, CheckCircle } from 'lucide-react';

export default function AdminReports() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/reports').then(r => r.json()).then(res => {
      if (res.success) setData(res.data);
      setLoading(false);
    });
  }, []);

  return (
    <DashboardLayout role="ADMIN" userName="Admin" userEmail="admin@example.com">
      <PageHeader 
        title="Reports & Analytics" 
        subtitle="Platform usage, verification rates, and system analytics." 
      />

      {loading ? (
        <div className="py-12 text-center text-gray-500">Loading analytics...</div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Total Users" value={data?.overview?.totalUsers || 0} icon={<Users size={18} />} colour="blue" />
            <StatCard label="Active Jobs" value={data?.overview?.totalJobs || 0} icon={<FileText size={18} />} colour="purple" />
            <StatCard label="Applications" value={data?.overview?.totalApplications || 0} icon={<CheckCircle size={18} />} colour="green" />
            <StatCard label="Verifications" value={
              data?.verifications?.find((v: any) => v.verificationStatus === 'VERIFIED')?._count?.id || 0
            } icon={<CheckCircle size={18} />} colour="yellow" />
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <PieChart size={18} className="text-gray-400" /> Users by Role
              </h3>
              <div className="space-y-3">
                {data?.roles?.map((r: any) => (
                  <div key={r.role} className="flex justify-between items-center text-sm border-b border-gray-100 pb-2 last:border-0 last:pb-0">
                    <span className="text-gray-600">{r.role.replace('_', ' ')}</span>
                    <span className="font-semibold text-gray-900">{r._count?.id}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <BarChart2 size={18} className="text-gray-400" /> Verification Status Breakdown
              </h3>
              <div className="space-y-3">
                {data?.verifications?.map((v: any) => (
                  <div key={v.verificationStatus} className="flex justify-between items-center text-sm border-b border-gray-100 pb-2 last:border-0 last:pb-0">
                    <span className="text-gray-600">{v.verificationStatus.replace('_', ' ')}</span>
                    <span className="font-semibold text-gray-900">{v._count?.id}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
