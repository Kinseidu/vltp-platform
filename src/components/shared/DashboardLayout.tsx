// src/components/shared/DashboardLayout.tsx
'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { AnimatedContainer } from './AnimatedContainer';
import { Menu } from 'lucide-react';

interface DashboardLayoutProps {
  role: string;
  userName: string;
  userEmail: string;
  children: React.ReactNode;
}

export function DashboardLayout({ role, userName, userEmail, children }: DashboardLayoutProps) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleSidebarToggle = () => setSidebarOpen(prev => !prev);
  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={closeSidebar}
        />
      )}

      <Sidebar
        role={role}
        userName={userName}
        userEmail={userEmail}
        sidebarOpen={sidebarOpen}
        onSidebarToggle={handleSidebarToggle}
        onNavigate={closeSidebar}
      />

      {/* Mobile hamburger button */}
      <button
        onClick={handleSidebarToggle}
        className="fixed top-4 left-4 z-50 md:hidden bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-2 shadow-sm"
        aria-label="Open sidebar menu"
      >
        <Menu size={20} className="text-gray-700 dark:text-gray-300" />
      </button>

      <main className="flex-1 min-h-screen ml-0 md:ml-16">
        <AnimatedContainer key={pathname} animation="fadeUp" className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
          {children}
        </AnimatedContainer>
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
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{title}</h1>
        {subtitle && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{subtitle}</p>}
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
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</span>
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${colourMap[colour] || colourMap.blue}`}>
          {icon}
        </div>
      </div>
      <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{value}</div>
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
      <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 mb-4">
        {icon}
      </div>
      <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-1">{title}</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mx-auto mb-4">{message}</p>
      {action}
    </div>
  );
}