'use client';

import { useEffect, useState } from 'react';
import { DashboardLayout, PageHeader } from '@/components/shared/DashboardLayout';
import { NotificationBell } from '@/components/shared/NotificationBell';
import { Shield, Filter, Search, CheckCircle, XCircle } from 'lucide-react';
import { format } from 'date-fns';

export default function AdminChiefConfirmations() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/chief-confirmations').then(r => r.json()).then(data => {
      if (data.success) setLogs(data.data.logs || []);
      setLoading(false);
    });
  }, []);

  return (
    <DashboardLayout role="ADMIN" userName="Admin" userEmail="admin@example.com">
      <NotificationBell role="ADMIN" />
      <PageHeader 
        title="Chief Confirmation Oversight" 
        subtitle="Monitor and audit final verification sign-offs by Chief Staff." 
      />

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50 flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <label className="sr-only" htmlFor="chief-confirmations-search">Search applicant or chief</label>
            <input id="chief-confirmations-search" type="text" placeholder="Search applicant or chief..." className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <button className="flex items-center gap-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg px-4 py-2 hover:bg-gray-50">
            <Filter size={16} /> Filter
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 border-b border-gray-200 text-gray-900">
              <tr>
                <th className="px-6 py-3 font-semibold">Applicant</th>
                <th className="px-6 py-3 font-semibold">Community</th>
                <th className="px-6 py-3 font-semibold">Confirming Chief</th>
                <th className="px-6 py-3 font-semibold">Processed By (Staff)</th>
                <th className="px-6 py-3 font-semibold">Status</th>
                <th className="px-6 py-3 font-semibold">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-500">Loading...</td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-500">No confirmations found.</td></tr>
              ) : (
                logs.map(log => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-900">
                      {log.request?.applicant?.fullName}
                    </td>
                    <td className="px-6 py-4">{log.request?.applicant?.community?.name}</td>
                    <td className="px-6 py-4">{log.chiefName}</td>
                    <td className="px-6 py-4">{log.confirmingStaff?.email}</td>
                    <td className="px-6 py-4">
                      {log.status === 'CHIEF_CONFIRMED' ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 px-2 py-1 rounded-md">
                          <CheckCircle size={12} /> Confirmed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700 bg-red-50 px-2 py-1 rounded-md">
                          <XCircle size={12} /> Rejected
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-gray-400 text-xs">
                      {format(new Date(log.confirmedAt), 'dd MMM yyyy, HH:mm')}
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
