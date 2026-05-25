// src/app/hr/jobs/page.tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { DashboardLayout, PageHeader, EmptyState } from '@/components/shared/DashboardLayout';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { NotificationBell } from '@/components/shared/NotificationBell';
import { StaggerContainer, StaggerItem } from '@/components/shared/AnimatedContainer';
import { SkeletonList } from '@/components/shared/Skeleton';
import { Plus, Briefcase, Users, Calendar, Search, Loader2, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/components/shared/ToastProvider';
import { useFocusTrap } from '@/lib/hooks/useFocusTrap';

export default function HRJobsPage() {
  const [user, setUser] = useState<any>(null);
  const [jobs, setJobs] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [jobToDelete, setJobToDelete] = useState<any>(null);
  const toast = useToast();

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => d.success && setUser(d.data.user));
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (statusFilter) params.set('status', statusFilter);
    else params.set('status', '');

    fetch(`/api/jobs?${params}`)
      .then(r => r.json())
      .then(d => { if (d.success) setJobs(d.data.jobs || []); setLoading(false); });
  }, [search, statusFilter]);

  useEffect(() => {
    if (!jobToDelete) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setJobToDelete(null); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [jobToDelete]);

  const deleteModalRef = useFocusTrap(!!jobToDelete);

  if (!user && !loading) {
    if (typeof window !== 'undefined') window.location.href = '/auth/login';
    return null;
  }

  const handleDelete = async () => {
    if (!jobToDelete) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/jobs/${jobToDelete.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        toast({ title: 'Success', description: 'Job deleted', variant: 'success' });
        setJobs(jobs.filter(j => j.id !== jobToDelete.id));
        setJobToDelete(null);
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to delete job', variant: 'error' });
      }
    } catch {
      toast({ title: 'Error', description: 'Network error. Please try again.', variant: 'error' });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <DashboardLayout role={user?.role || 'HR_OFFICER'} userName={user?.email || ''} userEmail={user?.email || ''}>
      <NotificationBell role={user?.role} />
      <PageHeader
        title="Job Postings"
        subtitle={`${jobs.length} total jobs`}
        action={
          <Link href="/hr/jobs/new"
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors shadow-sm">
            <Plus size={16} /> Post New Job
          </Link>
        }
      />

      {/* removed error */}

      {/* Filters */}
      <div className="flex gap-3 mb-6 flex-wrap">
        <div className="relative flex-1 min-w-[300px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
          <input
            type="text"
            placeholder="Search by job title or description..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 shadow-sm dark:bg-gray-800 dark:text-gray-100"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 bg-white dark:bg-gray-800 dark:text-gray-100 font-medium"
        >
          <option value="">All statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="OPEN">Open</option>
          <option value="CLOSED">Closed</option>
          <option value="FILLED">Filled</option>
        </select>
      </div>

      {loading ? (
        <SkeletonList count={5} />
      ) : jobs.length === 0 ? (
        <EmptyState
          icon={<Briefcase size={24} />}
          title="No jobs found"
          message="Post your first job to start receiving applications from verified community members."
          action={
            <Link href="/hr/jobs/new" className="inline-flex items-center gap-2 bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700">
              <Plus size={15} /> Post a Job
            </Link>
          }
        />
      ) : (
        <StaggerContainer className="space-y-4">
          {jobs.map((job: any) => (
            <StaggerItem key={job.id}>
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-md transition-all group">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors">{job.title}</h3>
                    <StatusBadge status={job.status} size="sm" />
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-1 mb-4">{job.description}</p>
                  
                  <div className="flex items-center gap-6 text-xs text-gray-400 dark:text-gray-500 flex-wrap">
                    <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 px-2 py-1 rounded-md border border-gray-100 dark:border-gray-700">
                      <Users size={14} className="text-gray-400 dark:text-gray-500" />
                      <span className="font-bold text-gray-700 dark:text-gray-300">{job._count?.applications || 0}</span>
                      <span className="text-gray-500 dark:text-gray-400">applicants</span>
                    </div>
                    <span className="flex items-center gap-1.5 font-medium">
                      <Briefcase size={14} />
                      Min {job.minExperience}yr exp.
                    </span>
                    {job.applicationDeadline && (
                      <span className="flex items-center gap-1.5 font-medium">
                        <Calendar size={14} />
                        Ends: {format(new Date(job.applicationDeadline), 'dd MMM yyyy')}
                      </span>
                    )}
                    <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 dark:text-slate-500">
                      Communities: {job.eligibleCommunities?.map((ec: any) => ec.community.name).join(', ')}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-3">
                  <div className="flex items-center gap-1">
                    <Link 
                      href={`/hr/jobs/${job.id}/edit`}
                      className="p-2 text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-all"
                      title="Edit Job"
                    >
                      <Plus size={18} className="rotate-45" />
                      <span className="text-xs font-bold ml-1">Edit</span>
                    </Link>
                    <button 
                      onClick={() => setJobToDelete(job)}
                      className="p-2 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-all"
                      title="Delete Job"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                  <div className="text-[10px] font-bold text-gray-300 dark:text-gray-600 uppercase tracking-widest">
                    Posted {format(new Date(job.createdAt), 'dd MMM yyyy')}
                  </div>
                </div>
              </div>
            </div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      )}

      {/* Delete Confirmation Modal */}
      {jobToDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" role="dialog" aria-modal="true" onClick={() => setJobToDelete(null)}>
          <div ref={deleteModalRef} className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 size={32} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">Delete Job Posting?</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
                Are you sure you want to delete <strong>{jobToDelete.title}</strong>? 
                This action cannot be undone. Jobs with existing applications cannot be deleted.
              </p>
              
              <div className="flex gap-3">
                <button 
                  onClick={() => setJobToDelete(null)}
                  className="flex-1 px-4 py-3 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-bold hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleDelete}
                  disabled={deleting}
                  aria-busy={deleting}
                  className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold shadow-md hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {deleting && <Loader2 size={16} className="animate-spin" />}
                  {deleting ? 'Deleting...' : 'Confirm Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
