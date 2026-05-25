'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Bell, CheckCheck, ChevronRight, X } from 'lucide-react';
import { DashboardLayout, EmptyState, PageHeader } from '@/components/shared/DashboardLayout';
import { SkeletonList } from '@/components/shared/Skeleton';

export default function ApplicantNotificationsPage() {
  const [user, setUser] = useState<any>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const loadNotifications = async () => {
    const res = await fetch('/api/notifications');
    const data = await res.json();
    if (data.success) {
      setNotifications(data.data.notifications || []);
      setUnreadCount(data.data.unreadCount || 0);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => {
      if (d.success) setUser(d.data.user);
    });
    loadNotifications();
  }, []);

  const markAllRead = async () => {
    setMarking(true);
    const res = await fetch('/api/notifications', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const data = await res.json();
    if (data.success) {
      await loadNotifications();
    }
    setMarking(false);
  };

  const toggleExpand = (id: number) => {
    setExpandedId(prev => prev === id ? null : id);
    const n = notifications.find(n => n.id === id);
    if (n && !n.isRead) {
      fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [id] }),
      });
    }
  };

  if (loading) {
    return (
      <DashboardLayout role="APPLICANT" userName="" userEmail="">
        <SkeletonList count={6} />
      </DashboardLayout>
    );
  }

  if (!user) {
    window.location.href = '/auth/login';
    return null;
  }

  return (
    <DashboardLayout role={user.role} userName={user.applicantProfile?.fullName || user.email} userEmail={user.email}>
      <PageHeader
        title="Notifications"
        subtitle={`${notifications.length} total · ${unreadCount} unread`}
        action={
          unreadCount > 0 ? (
            <button
              onClick={markAllRead}
              disabled={marking}
              className="inline-flex items-center gap-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm text-gray-700 dark:text-gray-300 font-medium px-3 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CheckCheck size={14} />
              Mark all read
            </button>
          ) : null
        }
      />

      {notifications.length === 0 ? (
        <EmptyState icon={<Bell size={24} />} title="No notifications yet" message="Updates about verification, matching, and applications will appear here." />
      ) : (
        <div className="space-y-3">
          {notifications.map((n: any) => {
            const isExpanded = expandedId === n.id;
            return (
              <div key={n.id} className="relative">
                <div
                  onClick={() => toggleExpand(n.id)}
                  className={`rounded-xl border p-4 cursor-pointer transition-all ${
                    isExpanded
                      ? 'rounded-b-none border-blue-300 dark:border-blue-600 bg-blue-50/50 dark:bg-blue-900/20'
                      : n.isRead
                      ? 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 hover:border-blue-200 dark:hover:border-blue-700 hover:bg-blue-50/20 dark:hover:bg-blue-900/10'
                      : 'bg-white dark:bg-gray-900 border-blue-300 dark:border-blue-600 hover:border-blue-400'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <div className={`text-sm font-semibold text-gray-900 dark:text-gray-100 ${isExpanded ? 'text-blue-700 dark:text-blue-300' : ''}`}>{n.title}</div>
                        {!n.isRead && !isExpanded && (
                          <span className="text-[10px] uppercase tracking-wide text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/40 px-2 py-0.5 rounded-full">Unread</span>
                        )}
                      </div>
                      {!isExpanded && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">{n.message}</p>
                      )}
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">{new Date(n.createdAt).toLocaleString()}</div>
                    </div>
                    <ChevronRight
                      size={16}
                      className={`text-gray-400 dark:text-gray-500 shrink-0 mt-1 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
                    />
                  </div>
                </div>

                {isExpanded && (
                  <div className="rounded-b-xl border-t-0 border-x border-b border-blue-300 dark:border-blue-600 bg-white dark:bg-gray-900 px-4 pb-4">
                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed pt-3">{n.message}</p>
                    {n.linkUrl && (
                      <Link
                        href={n.linkUrl}
                        className="inline-flex items-center gap-1 mt-3 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        Open related page <ChevronRight size={12} />
                      </Link>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </DashboardLayout>
  );
}