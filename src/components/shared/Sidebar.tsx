// src/components/shared/Sidebar.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils/cn';
import {
  User, Briefcase, CheckCircle, Bell, Home, Users, Shield,
  BarChart2, FileText, ClipboardList, Settings, LogOut, HardHat
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
  CHIEF_STAFF: [
    { href: '/chief-staff', label: 'Dashboard', icon: <Home size={18} /> },
    { href: '/chief-staff/confirmations', label: 'Chief Confirmations', icon: <Shield size={18} /> },
  ],
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
    { href: '/admin/chief-confirmations', label: 'Chief Confirmations', icon: <CheckCircle size={18} /> },
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
}

export function Sidebar({ role, userName, userEmail }: SidebarProps) {
  const pathname = usePathname();
  const navItems = navByRole[role] || [];

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/auth/login';
  };

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-slate-900 text-white flex flex-col z-40">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-700">
        <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
          <HardHat size={18} className="text-white" />
        </div>
        <div>
          <div className="text-sm font-semibold leading-tight">Talent Platform</div>
          <div className="text-xs text-slate-400 leading-tight">Mining Recruitment</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map(item => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              )}
            >
              {item.icon}
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User footer */}
      <div className="border-t border-slate-700 p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center text-sm font-medium">
            {userName?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-medium text-white truncate">{userName || userEmail}</div>
            <div className="text-xs text-slate-400 truncate">{role.replace('_', ' ')}</div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
        >
          <LogOut size={16} />
          Sign out
        </button>
      </div>
    </aside>
  );
}
