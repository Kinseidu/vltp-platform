'use client';

import { useEffect, useState, useCallback } from 'react';
import { Bell } from 'lucide-react';
import { NotificationPanel } from './NotificationPanel';

interface NotificationBellProps {
  role?: string;
}

export function NotificationBell({ role }: NotificationBellProps) {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [count, setCount] = useState(0);

  const fetchUnread = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications?unread=true');
      const data = await res.json();
      if (data.success) {
        setNotifications(data.data.notifications || []);
        setCount(data.data.unreadCount ?? data.data.notifications?.length ?? 0);
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, [fetchUnread]);

  const handleMarkRead = useCallback(async (ids: number[]) => {
    try {
      await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });
      setCount(0);
    } catch {}
  }, []);

  return (
    <>
      <div className="fixed top-6 right-6 z-[200]">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className={
            count > 0
              ? 'relative rounded-full bg-blue-600 text-white p-3 shadow-lg hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-300 animate-[pulse_1.6s_ease-in-out_infinite]'
              : 'relative rounded-full bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 p-3 border border-gray-200 dark:border-gray-700 shadow hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-300'
          }
          aria-label="Open notifications"
        >
          <Bell size={18} className={count > 0 ? 'text-white' : ''} />
          {count > 0 && (
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full ring-2 ring-white dark:ring-gray-800" aria-hidden="true" />
          )}
        </button>
      </div>
      <NotificationPanel
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        notifications={notifications.map((n: any) => ({
          id: n.id,
          title: n.title,
          message: n.message,
          timestamp: n.createdAt ? new Date(n.createdAt) : new Date(),
          isRead: n.isRead,
          linkUrl: n.linkUrl,
        }))}
        onMarkRead={handleMarkRead}
        role={role}
      />
    </>
  );
}