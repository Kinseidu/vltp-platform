'use client';

import { useEffect, useState } from 'react';
import { DashboardLayout, PageHeader } from '@/components/shared/DashboardLayout';
import { NotificationBell } from '@/components/shared/NotificationBell';
import { SkeletonTableRows } from '@/components/shared/Skeleton';
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

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden dark:bg-gray-900 dark:border-gray-700">
        <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-gray-600 dark:text-gray-400">
          <thead className="bg-gray-50 border-b border-gray-200 text-gray-900 dark:bg-gray-800 dark:text-gray-100">
            <tr>
              <th className="px-6 py-3 font-semibold">Job Title</th>
              <th className="px-6 py-3 font-semibold">Posted By (HR)</th>
              <th className="px-6 py-3 font-semibold">Applicants</th>
              <th className="px-6 py-3 font-semibold">Status</th>
              <th className="px-6 py-3 font-semibold">Created Date</th>
              <th className="px-6 py-3 font-semibold text-right">Admin Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
             {loading ? (
                <SkeletonTableRows rows={6} cols={6} />
              ) : jobs.length === 0 ? (
              <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">No jobs posted.</td></tr>
            ) : (
              jobs.map(job => (
                <tr key={job.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center dark:bg-slate-800">
                        <Briefcase size={14} className="text-slate-600 dark:text-slate-400" />
                      </div>
                      <div className="font-medium text-gray-900 dark:text-gray-100">{job.title}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{job.postedBy?.email}</td>
                  <td className="px-6 py-4 font-semibold text-gray-900 dark:text-gray-100">{job._count?.applications || 0}</td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-slate-100 text-slate-700 text-xs rounded-md font-medium">
                      {job.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs text-gray-400 dark:text-gray-500">
                    {format(new Date(job.createdAt), 'dd MMM yyyy')}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/30" title="Suspend Job">
                      <Pause size={16} />
                    </button>
                    <button className="text-yellow-600 hover:text-yellow-800 p-1 rounded hover:bg-yellow-50 dark:hover:bg-yellow-900/30 ml-2" title="Flag for Review">
                      <AlertTriangle size={16} />
                    </button>
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
