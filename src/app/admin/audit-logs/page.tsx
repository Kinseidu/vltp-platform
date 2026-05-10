'use client';

import { useEffect, useState } from 'react';
import { DashboardLayout, PageHeader } from '@/components/shared/DashboardLayout';
import { NotificationBell } from '@/components/shared/NotificationBell';
import { FileText, Search, Activity, Calendar } from 'lucide-react';
import { format } from 'date-fns';

export default function AdminAuditLogs() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/audit-logs?pageSize=100').then(r => r.json()).then(data => {
      if (data.success) setLogs(data.data.logs || []);
      setLoading(false);
    });
  }, []);

  return (
    <DashboardLayout role="ADMIN" userName="Admin" userEmail="admin@example.com">
      <NotificationBell role="ADMIN" />
      <PageHeader 
        title="Audit Logs" 
        subtitle="System-wide trail of actions for compliance and tracking." 
      />

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50 flex gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <label className="sr-only" htmlFor="admin-auditlogs-search">Search actor, action, or entity ID</label>
            <input id="admin-auditlogs-search" type="text" placeholder="Search actor, action, or entity ID..." className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <button className="flex items-center gap-2 px-3 py-2 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-50">
            <Calendar size={16} /> Last 30 Days
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 border-b border-gray-200 text-gray-900">
              <tr>
                <th className="px-6 py-3 font-semibold">Action</th>
                <th className="px-6 py-3 font-semibold">Actor</th>
                <th className="px-6 py-3 font-semibold">Entity</th>
                <th className="px-6 py-3 font-semibold">Metadata</th>
                <th className="px-6 py-3 font-semibold text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-500">Loading...</td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-500">No logs found.</td></tr>
              ) : (
                logs.map(log => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <span className="font-mono text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-1 rounded">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4">{log.actor?.email}</td>
                    <td className="px-6 py-4 text-xs">
                      <span className="font-medium text-gray-900">{log.entity}</span>
                      <span className="text-gray-400 ml-1">#{log.entityId}</span>
                    </td>
                    <td className="px-6 py-4 text-xs font-mono text-gray-500 max-w-xs truncate" title={JSON.stringify(log.after)}>
                      {JSON.stringify(log.after) || '-'}
                    </td>
                    <td className="px-6 py-4 text-right text-xs text-gray-400">
                      {format(new Date(log.createdAt), 'dd MMM HH:mm:ss')}
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
