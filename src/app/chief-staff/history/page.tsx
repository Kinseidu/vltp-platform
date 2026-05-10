// src/app/chief-staff/history/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { DashboardLayout, PageHeader, EmptyState } from '@/components/shared/DashboardLayout';
import { Shield, Search, CheckCircle, XCircle, Filter, Calendar } from 'lucide-react';
import { AppSpinner } from '@/components/shared/AppSpinner';
import { NotificationBell } from '@/components/shared/NotificationBell';

export default function ChiefHistoryPage() {
  const [user, setUser] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    Promise.all([
      fetch('/api/auth/me').then(r => r.json()),
      fetch('/api/verification/chief-history').then(r => r.json()),
    ]).then(([meData, historyData]) => {
      if (meData.success) setUser(meData.data.user);
      if (historyData.success) setHistory(historyData.data.history || []);
      setLoading(false);
    });
  }, []);

  const filtered = history.filter(h => 
    h.request?.applicant?.fullName?.toLowerCase().includes(search.toLowerCase()) ||
    h.chiefName?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return (
    <DashboardLayout role="CHIEF_STAFF" userName="" userEmail="">
      <div className="h-[70vh] flex flex-col items-center justify-center gap-3 text-gray-500">
        <AppSpinner size="md" />
        <p className="text-sm">Loading history...</p>
      </div>
    </DashboardLayout>
  );

  return (
    <DashboardLayout role={user.role} userName={user.email} userEmail={user.email}>
      <NotificationBell />
      <PageHeader 
        title="Verification History" 
        subtitle="Review all past Chief confirmations and rejections you have recorded."
      />

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50 flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input 
              type="text" 
              placeholder="Search applicant or chief..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" 
            />
          </div>
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-2 text-xs font-semibold text-gray-600 bg-white border border-gray-300 rounded-lg px-3 py-2 hover:bg-gray-50">
              <Calendar size={14} /> Filter Date
            </button>
            <button className="flex items-center gap-2 text-xs font-semibold text-gray-600 bg-white border border-gray-300 rounded-lg px-3 py-2 hover:bg-gray-50">
              <Filter size={14} /> More Filters
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 border-b border-gray-200 text-gray-900">
              <tr>
                <th className="px-6 py-4 font-bold text-[11px] uppercase tracking-wider">Applicant</th>
                <th className="px-6 py-4 font-bold text-[11px] uppercase tracking-wider">Community</th>
                <th className="px-6 py-4 font-bold text-[11px] uppercase tracking-wider">Chief Name</th>
                <th className="px-6 py-4 font-bold text-[11px] uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 font-bold text-[11px] uppercase tracking-wider text-right">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12">
                    <EmptyState 
                      icon={<Shield size={24} className="text-gray-300" />}
                      title="No history found"
                      message={search ? "No records match your search criteria." : "You haven't recorded any confirmations yet."}
                    />
                  </td>
                </tr>
              ) : (
                filtered.map(item => (
                  <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-gray-900">{item.request?.applicant?.fullName}</div>
                      <div className="text-[10px] text-gray-500">{item.request?.applicant?.user?.email}</div>
                    </td>
                    <td className="px-6 py-4 text-xs">
                      {item.request?.applicant?.community?.name}
                    </td>
                    <td className="px-6 py-4 text-xs">
                      {item.chiefName}
                    </td>
                    <td className="px-6 py-4">
                      {item.status === 'CHIEF_CONFIRMED' ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-bold bg-green-50 text-green-700 border border-green-100">
                          <CheckCircle size={12} /> VERIFIED
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-bold bg-red-50 text-red-700 border border-red-100">
                          <XCircle size={12} /> REJECTED
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right text-xs text-gray-400">
                      {new Date(item.confirmedAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}
