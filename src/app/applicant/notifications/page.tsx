'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Bell, CheckCheck } from 'lucide-react';
import { DashboardLayout, EmptyState, PageHeader } from '@/components/shared/DashboardLayout';

export default function ApplicantNotificationsPage() {
  const [user, setUser] = useState<any>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);

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

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-sm text-gray-400">Loading notifications...</div>;
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
              className="inline-flex items-center gap-2 border border-gray-300 bg-white hover:bg-gray-50 text-sm text-gray-700 font-medium px-3 py-2 rounded-lg disabled:opacity-50"
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
          {notifications.map((n: any) => (
            <div key={n.id} className={`bg-white rounded-xl border p-4 ${n.isRead ? 'border-gray-200' : 'border-blue-300 bg-blue-50/30'}`}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold text-gray-900">{n.title}</div>
                  <p className="text-sm text-gray-600 mt-1">{n.message}</p>
                  <div className="text-xs text-gray-500 mt-2">{new Date(n.createdAt).toLocaleString()}</div>
                </div>
                {!n.isRead && <span className="text-[10px] uppercase tracking-wide text-blue-700 bg-blue-100 px-2 py-1 rounded-full">Unread</span>}
              </div>
              {n.linkUrl && (
                <Link href={n.linkUrl} className="inline-flex mt-3 text-xs font-medium text-blue-600 hover:underline">
                  Open related page
                </Link>
              )}
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
