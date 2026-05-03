// src/components/shared/DashboardLayout.tsx
'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from './Sidebar';

interface DashboardLayoutProps {
  role: string;
  userName: string;
  userEmail: string;
  children: React.ReactNode;
}

export function DashboardLayout({ role, userName, userEmail, children }: DashboardLayoutProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem('sidebar_collapsed');
    if (stored === '1') setCollapsed(true);
  }, []);

  useEffect(() => {
    window.localStorage.setItem('sidebar_collapsed', collapsed ? '1' : '0');
  }, [collapsed]);

  useEffect(() => {
    setIsNavigating(false);
  }, [pathname]);

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar
        role={role}
        userName={userName}
        userEmail={userEmail}
        collapsed={collapsed}
        onToggle={() => setCollapsed(prev => !prev)}
        onNavigate={() => setIsNavigating(true)}
      />
      <main className={`flex-1 min-h-screen transition-all duration-200 ${collapsed ? 'ml-20' : 'ml-64'}`}>
        {isNavigating && (
          <div className="fixed top-4 right-4 z-50 pointer-events-none">
            <div className="w-5 h-5 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
          </div>
        )}
        <div className="max-w-6xl mx-auto px-6 py-8">
          {children}
        </div>
      </main>
    </div>
  );
}

// Page header component for consistent headings
interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

// Stat card for dashboard overviews
interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  colour?: string;
  sub?: string;
}

export function StatCard({ label, value, icon, colour = 'blue', sub }: StatCardProps) {
  const colourMap: Record<string, string> = {
    blue:   'bg-blue-50 text-blue-600',
    green:  'bg-green-50 text-green-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    purple: 'bg-purple-50 text-purple-600',
    red:    'bg-red-50 text-red-600',
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-gray-500">{label}</span>
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${colourMap[colour] || colourMap.blue}`}>
          {icon}
        </div>
      </div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      {sub && <div className="text-xs text-gray-400 mt-1">{sub}</div>}
    </div>
  );
}

// Empty state component
interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  message: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon, title, message, action }: EmptyStateProps) {
  return (
    <div className="text-center py-16">
      <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-gray-100 text-gray-400 mb-4">
        {icon}
      </div>
      <h3 className="text-base font-semibold text-gray-900 mb-1">{title}</h3>
      <p className="text-sm text-gray-500 max-w-sm mx-auto mb-4">{message}</p>
      {action}
    </div>
  );
}
