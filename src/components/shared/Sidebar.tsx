// src/components/shared/Sidebar.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils/cn';
import { useTheme } from './ThemeProvider';
import {
  User, Briefcase, CheckCircle, Bell, Home, Users, Shield, Key,
  BarChart2, FileText, ClipboardList, Settings, LogOut, HardHat, MapPin, Sun, Moon
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
  ],
  YOUTH_PRESIDENT: [
    { href: '/youth-president', label: 'Dashboard', icon: <Home size={18} /> },
    { href: '/youth-president/verifications', label: 'Verification Queue', icon: <CheckCircle size={18} /> },
    { href: '/youth-president/notifications', label: 'Notifications', icon: <Bell size={18} /> },
  ],
  CHIEF_STAFF: [
    { href: '/chief-staff', label: 'Dashboard', icon: <Home size={18} /> },
    { href: '/chief-staff/confirmations', label: 'Confirmations', icon: <CheckCircle size={18} /> },
    { href: '/chief-staff/history', label: 'History', icon: <FileText size={18} /> },
  ],
  HR_OFFICER: [
    { href: '/hr', label: 'Dashboard', icon: <Home size={18} /> },
    { href: '/hr/jobs', label: 'Job Postings', icon: <Briefcase size={18} /> },
    { href: '/hr/applications', label: 'Applications', icon: <ClipboardList size={18} /> },
    { href: '/hr/shortlisting', label: 'AI Shortlisting', icon: <BarChart2 size={18} /> },
    { href: '/hr/notifications', label: 'Notifications', icon: <Bell size={18} /> },
  ],
  ADMIN: [
    { href: '/admin', label: 'Dashboard', icon: <Home size={18} /> },
    { href: '/admin/users', label: 'All Users', icon: <Users size={18} /> },
    { href: '/admin/roles', label: 'Roles & Permissions', icon: <Key size={18} /> },
    { href: '/admin/communities', label: 'Communities', icon: <MapPin size={18} /> },
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
  onNavigate: () => void;
}

export function Sidebar({ role, userName, userEmail, onNavigate }: SidebarProps) {
  const pathname = usePathname();
  const navItems = navByRole[role] || [];
  const { resolvedTheme, setTheme } = useTheme();

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/auth/login';
  };

  return (
    <aside
      className="fixed inset-y-0 left-0 bg-slate-900 text-white flex flex-col z-40 group transition-all duration-300 ease-out w-16 hover:w-52"
    >
      <div className="flex items-center justify-center py-5 border-b border-slate-700 px-2 group-hover:px-6 transition-all duration-300 ease-out">
        <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center shrink-0">
          <HardHat size={18} className="text-white" />
        </div>
        <div className="ml-3 min-w-0 opacity-0 group-hover:opacity-100 transition-all duration-300 ease-out">
          <div className="text-sm font-semibold leading-tight whitespace-nowrap">Talent Platform</div>
          <div className="text-xs text-slate-400 leading-tight whitespace-nowrap">Mining Recruitment</div>
        </div>
      </div>

      <nav className="flex-1 py-4 space-y-1 overflow-y-auto overflow-x-hidden px-2 group-hover:px-3 transition-all duration-300 ease-out">
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
              title={item.label}
              aria-label={item.label}
              className={cn(
                'flex items-center rounded-lg text-sm font-medium transition-colors',
                'py-2.5 px-0 group-hover:px-2 group-hover:py-2.5',
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              )}>
              <span className="shrink-0 flex items-center justify-center w-8">
                {item.icon}
              </span>
              <span className="ml-3 overflow-hidden whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all duration-300 ease-out">
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-700 p-2 group-hover:p-4 transition-all duration-300 ease-out">
        <div className="flex items-center justify-center mb-3">
          <div className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center text-sm font-medium shrink-0">
            {userName?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <div className="ml-3 min-w-0 overflow-hidden whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all duration-300 ease-out">
            <div className="text-sm font-medium text-white truncate">{userName || userEmail}</div>
            <div className="text-xs text-slate-400 truncate">{role.replace('_', ' ')}</div>
          </div>
        </div>
        <button
          onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
          className="w-full flex items-center justify-center text-sm text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors py-2.5 px-0 group-hover:px-2 group-hover:py-2.5"
          aria-label={resolvedTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {resolvedTheme === 'dark' ? <Sun size={16} className="shrink-0" /> : <Moon size={16} className="shrink-0" />}
          <span className="ml-3 overflow-hidden whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all duration-300 ease-out">
            {resolvedTheme === 'dark' ? 'Light mode' : 'Dark mode'}
          </span>
        </button>
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center text-sm text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors py-2.5 px-0 group-hover:px-2 group-hover:py-2.5"
        >
          <LogOut size={16} className="shrink-0" />
          <span className="ml-3 overflow-hidden whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all duration-300 ease-out">
            Sign out
          </span>
        </button>
      </div>
    </aside>
  );
}