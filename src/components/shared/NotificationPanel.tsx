'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { X, Bell, ChevronRight } from 'lucide-react';

interface Notification {
  id: string;
  title: string;
  message: string;
  timestamp: Date;
  linkUrl?: string;
}

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  notifications?: Notification[];
  onMarkRead?: (ids: number[]) => void;
  role?: string;
}

export function NotificationPanel({ isOpen, onClose, notifications = [], onMarkRead, role }: NotificationPanelProps) {
  const [displayedNotifications, setDisplayedNotifications] = useState<Notification[]>(notifications);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const notificationPageUrl: Record<string, string> = {
    APPLICANT: '/applicant/notifications',
    HR_OFFICER: '/hr/notifications',
    YOUTH_PRESIDENT: '/youth-president/notifications',
    CHIEF_STAFF: '/chief-staff/notifications',
    ADMIN: '/admin/notifications',
  };
  const viewAllHref = role ? (notificationPageUrl[role] || '/applicant/notifications') : '/applicant/notifications';

  useEffect(() => {
    setDisplayedNotifications(notifications);
  }, [notifications]);

  useEffect(() => {
    if (!isOpen) {
      setExpandedId(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen || displayedNotifications.length === 0) return;
    const ids = displayedNotifications
      .filter((n: any) => !n.isRead)
      .map((n: any) => parseInt(n.id))
      .filter(id => !isNaN(id));
    if (ids.length > 0 && onMarkRead) {
      onMarkRead(ids);
    }
  }, [isOpen]);

  const handleNotificationClick = (notification: Notification) => {
    setExpandedId(prev => prev === notification.id ? null : notification.id);
  };

  return (
    <>
      {isOpen && !expandedId && (
        <div className="fixed inset-0 z-[100]" onClick={onClose} aria-hidden="true" />
      )}

      <div
        className={`fixed top-20 right-6 w-[22rem] bg-white rounded-2xl shadow-2xl border border-gray-200 z-[101] flex flex-col transition-all duration-200 ease-out ${
          isOpen
            ? 'opacity-100 translate-x-0 visible'
            : 'opacity-0 translate-x-4 invisible pointer-events-none'
        }`}
        style={{ maxHeight: 'calc(100vh - 7rem)' }}
        aria-label="Notifications panel"
        role="dialog"
        aria-modal={!expandedId}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
              <Bell size={16} className="text-blue-600" />
            </div>
            <h2 className="text-sm font-semibold text-gray-900">Notifications</h2>
            {displayedNotifications.length > 0 && (
              <span className="text-[11px] font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                {displayedNotifications.length}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Close notifications"
          >
            <X size={16} className="text-gray-500" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 min-h-0" style={{ maxHeight: 'calc(100vh - 12rem)' }}>
          {displayedNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500 px-6">
              <Bell size={28} className="mb-3 text-gray-300" />
              <p className="text-sm font-medium">No new notifications</p>
              <p className="text-xs text-center mt-1 text-gray-400">You're all caught up!</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {displayedNotifications.map((notification) => {
                const isExpanded = expandedId === notification.id;
                return (
                  <div key={notification.id}>
                    <div
                      onClick={() => handleNotificationClick(notification)}
                      className="px-5 py-4 hover:bg-gray-50 transition-colors cursor-pointer"
                    >
                      <p className="text-sm font-medium text-gray-900 leading-snug">{notification.title}</p>
                      <p className="text-xs text-gray-500 mt-1 leading-relaxed">{notification.message}</p>
                      <p className="text-[11px] text-gray-400 mt-2">
                        {new Date(notification.timestamp).toLocaleString()}
                      </p>
                    </div>
                    {isExpanded && (
                      <div className="px-5 pb-4 bg-blue-50/40 border-x border-b border-blue-100 transition-all">
                        <p className="text-xs text-gray-600 leading-relaxed mb-3">{notification.message}</p>
                        {notification.linkUrl && (
                          <Link
                            href={notification.linkUrl}
                            onClick={onClose}
                            className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline"
                          >
                            Open related page <ChevronRight size={12} />
                          </Link>
                        )}
                        <button
                          onClick={(e) => { e.stopPropagation(); setExpandedId(null); }}
                          className="ml-3 inline-flex items-center text-xs font-medium text-gray-500 hover:text-gray-700"
                        >
                          Collapse
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-700 shrink-0 rounded-b-2xl space-y-2">
          <Link
            href={viewAllHref}
            onClick={onClose}
            className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors"
          >
            View all notifications
            <ChevronRight size={14} />
          </Link>
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-xl border border-gray-200 dark:border-gray-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </>
  );
}