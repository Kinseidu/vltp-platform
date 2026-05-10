'use client';

import { useEffect, useState } from 'react';
import { DashboardLayout, PageHeader } from '@/components/shared/DashboardLayout';
import { NotificationBell } from '@/components/shared/NotificationBell';
import { Briefcase, AlertTriangle, Play, Pause } from 'lucide-react';
import { format } from 'date-fns';

export default function AdminJobs() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/jobs').then(r => r.json()).then(data => {
      if (data.success) setJobs(data.data.jobs || []);
      setLoading(false);
    });
  }, []);

  return (
    <DashboardLayout role="ADMIN" userName="Admin" userEmail="admin@example.com">
      <NotificationBell role="ADMIN" />
      <PageHeader 
        title="Job Oversight" 
        subtitle="Monitor HR recruitment campaigns across the platform." 
      />

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-left text-sm text-gray-600">
          <thead className="bg-gray-50 border-b border-gray-200 text-gray-900">
            <tr>
              <th className="px-6 py-3 font-semibold">Job Title</th>
              <th className="px-6 py-3 font-semibold">Posted By (HR)</th>
              <th className="px-6 py-3 font-semibold">Applicants</th>
              <th className="px-6 py-3 font-semibold">Status</th>
              <th className="px-6 py-3 font-semibold">Created Date</th>
              <th className="px-6 py-3 font-semibold text-right">Admin Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-500">Loading...</td></tr>
            ) : jobs.length === 0 ? (
              <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-500">No jobs posted.</td></tr>
            ) : (
              jobs.map(job => (
                <tr key={job.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center">
                        <Briefcase size={14} className="text-slate-600" />
                      </div>
                      <div className="font-medium text-gray-900">{job.title}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-500">{job.postedBy?.email}</td>
                  <td className="px-6 py-4 font-semibold text-gray-900">{job._count?.applications || 0}</td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-slate-100 text-slate-700 text-xs rounded-md font-medium">
                      {job.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs text-gray-400">
                    {format(new Date(job.createdAt), 'dd MMM yyyy')}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-50" title="Suspend Job">
                      <Pause size={16} />
                    </button>
                    <button className="text-yellow-600 hover:text-yellow-800 p-1 rounded hover:bg-yellow-50 ml-2" title="Flag for Review">
                      <AlertTriangle size={16} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </DashboardLayout>
  );
}
