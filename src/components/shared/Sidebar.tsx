// src/components/shared/Sidebar.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils/cn';
import {
  User, Briefcase, CheckCircle, Bell, Home, Users, Shield,
  BarChart2, FileText, ClipboardList, Settings, LogOut, HardHat, PanelLeftClose, PanelLeftOpen
} from 'lucide-react';

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

const navByRole: Record<string, NavItem[]> = {
  APPLICANT: [
    { href: '/applicant', label: 'Dashboard', icon: <Home size={18} /> },
    { href: '/applicant/profile', label: 'My Profile', icon: <User size={18} /> },
    { href: '/applicant/verification', label: 'Verification', icon: <CheckCircle size={18} /> },
    { href: '/applicant/jobs', label: 'Matched Jobs', icon: <Briefcase size={18} /> },
    { href: '/applicant/applications', label: 'My Applications', icon: <FileText size={18} /> },
    { href: '/applicant/notifications', label: 'Notifications', icon: <Bell size={18} /> },
  ],
  YOUTH_PRESIDENT: [
    { href: '/youth-president', label: 'Dashboard', icon: <Home size={18} /> },
    { href: '/youth-president/verifications', label: 'Verification Queue', icon: <CheckCircle size={18} /> },
  ],
  // CHIEF_STAFF: [
  //   { href: '/chief-staff', label: 'Dashboard', icon: <Home size={18} /> },
  //   { href: '/chief-staff/confirmations', label: 'Pending Queue', icon: <CheckCircle size={18} /> },
  //   { href: '/chief-staff/history', label: 'Decision History', icon: <Shield size={18} /> },
  // ],
  HR_OFFICER: [
    { href: '/hr', label: 'Dashboard', icon: <Home size={18} /> },
    { href: '/hr/jobs', label: 'Job Postings', icon: <Briefcase size={18} /> },
    { href: '/hr/applications', label: 'Applications', icon: <ClipboardList size={18} /> },
    { href: '/hr/shortlisting', label: 'AI Shortlisting', icon: <BarChart2 size={18} /> },
  ],
  ADMIN: [
    { href: '/admin', label: 'Dashboard', icon: <Home size={18} /> },
    { href: '/admin/users', label: 'All Users', icon: <Users size={18} /> },
    { href: '/admin/roles', label: 'Roles & Permissions', icon: <Shield size={18} /> },
    // { href: '/admin/chief-confirmations', label: 'Chief Confirmations', icon: <CheckCircle size={18} /> },
    { href: '/admin/communities', label: 'Communities', icon: <Shield size={18} /> },
    { href: '/admin/youth-presidents', label: 'Youth Presidents', icon: <User size={18} /> },
    { href: '/admin/jobs', label: 'Job Oversight', icon: <Briefcase size={18} /> },
    { href: '/admin/audit-logs', label: 'Audit Logs', icon: <FileText size={18} /> },
    { href: '/admin/reports', label: 'Reports & Analytics', icon: <BarChart2 size={18} /> },
    { href: '/admin/announcements', label: 'Announcements', icon: <Bell size={18} /> },
    { href: '/admin/settings', label: 'Settings', icon: <Settings size={18} /> },
  ],
};

interface SidebarProps {
  role: string;
  userName: string;
  userEmail: string;
  collapsed: boolean;
  onToggle: () => void;
  onNavigate: () => void;
}

export function Sidebar({ role, userName, userEmail, collapsed, onToggle, onNavigate }: SidebarProps) {
  const pathname = usePathname();
  const navItems = navByRole[role] || [];

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/auth/login';
  };

  return (
    <aside className={cn(
      'fixed inset-y-0 left-0 bg-slate-900 text-white flex flex-col z-40 transition-all duration-200',
      collapsed ? 'w-20' : 'w-64'
    )}>
      {/* Logo */}
      <div className={cn('flex items-center py-5 border-b border-slate-700 relative', collapsed ? 'justify-center px-2' : 'gap-3 px-6')}>
        <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
          <HardHat size={18} className="text-white" />
        </div>
        {!collapsed && (
          <div>
            <div className="text-sm font-semibold leading-tight">Talent Platform</div>
            <div className="text-xs text-slate-400 leading-tight">Mining Recruitment</div>
          </div>
        )}
        {!collapsed && (
          <button
            onClick={onToggle}
            className="absolute top-3 right-3 flex items-center justify-center w-8 h-8 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
            title="Collapse sidebar"
            aria-label="Collapse sidebar"
          >
            <PanelLeftClose size={16} />
          </button>
        )}
      </div>

      <div className={cn('border-b border-slate-700 py-2', collapsed ? 'px-2' : 'px-3')}>
        {!collapsed ? (
          <div className="h-8" />
        ) : (
          <button
            onClick={onToggle}
            className="w-full flex items-center justify-center rounded-lg text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-colors px-2 py-2.5"
            title="Expand sidebar"
            aria-label="Expand sidebar"
          >
            <PanelLeftOpen size={16} />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className={cn('flex-1 py-4 space-y-1 overflow-y-auto', collapsed ? 'px-2' : 'px-3')}>
        {navItems.map(item => {
          const isDashboard = item.label === 'Dashboard';
          const isActive = pathname === item.href || (!isDashboard && pathname.startsWith(item.href + '/'));
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => {
                if (pathname !== item.href) onNavigate();
              }}
              title={collapsed ? item.label : undefined}
              className={cn(
                'flex items-center rounded-lg text-sm font-medium transition-colors',
                collapsed ? 'justify-center px-2 py-2.5' : 'gap-3 px-3 py-2.5',
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              )}
            >
              {item.icon}
              {!collapsed && item.label}
            </Link>
          );
        })}
      </nav>

      {/* User footer */}
      <div className={cn('border-t border-slate-700', collapsed ? 'p-2' : 'p-4')}>
        <div className={cn('mb-3', collapsed ? 'flex justify-center' : 'flex items-center gap-3')}>
          <div className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center text-sm font-medium">
            {userName?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <div className="text-sm font-medium text-white truncate">{userName || userEmail}</div>
              <div className="text-xs text-slate-400 truncate">{role.replace('_', ' ')}</div>
            </div>
          )}
        </div>
        <button
          onClick={handleLogout}
          title={collapsed ? 'Sign out' : undefined}
          className={cn(
            'w-full text-sm text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors',
            collapsed ? 'flex justify-center px-2 py-2.5' : 'flex items-center gap-2 px-3 py-2'
          )}
        >
          <LogOut size={16} />
          {!collapsed && 'Sign out'}
        </button>
      </div>
    </aside>
  );
}
