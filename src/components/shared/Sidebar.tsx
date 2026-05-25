// src/components/shared/Sidebar.tsx
'use client';

import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils/cn';
import { useTheme } from './ThemeProvider';
import { Tooltip } from './Tooltip';
import {
  User, Briefcase, CheckCircle, Bell, Home, Users, Shield, Key,
  BarChart2, FileText, ClipboardList, Settings, LogOut, HardHat, MapPin, Sun, Moon, X
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
  onNavigate?: () => void;
  sidebarOpen?: boolean;
  onSidebarToggle?: () => void;
}

export function Sidebar({ role, userName, userEmail, onNavigate, sidebarOpen, onSidebarToggle }: SidebarProps) {
  const pathname = usePathname();
  const navItems = navByRole[role] || [];
  const { resolvedTheme, setTheme } = useTheme();

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/auth/login';
  };

  const sidebarContent = (
    <>
      <div className="flex items-center gap-3 py-5 border-b border-slate-700 px-4 shrink-0">
        <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center shrink-0">
          <HardHat size={18} className="text-white" />
        </div>
        <div className="min-w-0 overflow-hidden whitespace-nowrap">
          <div className="text-sm font-semibold leading-tight">Talent Platform</div>
          <div className="text-xs text-slate-400 leading-tight">Mining Recruitment</div>
        </div>
        <button
          onClick={onSidebarToggle}
          className="md:hidden ml-auto text-slate-400 hover:text-white p-1 rounded"
          aria-label="Close sidebar"
        >
          <X size={20} />
        </button>
      </div>

      <nav className="flex-1 py-4 space-y-1 overflow-y-auto overflow-x-hidden px-3">
        {navItems.map(item => {
          const isDashboard = item.label === 'Dashboard';
          const isActive = pathname === item.href || (!isDashboard && pathname.startsWith(item.href + '/'));
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => {
                if (pathname !== item.href) onNavigate?.();
              }}
              title={item.label}
              aria-label={item.label}
              className={cn(
                'flex items-center rounded-lg text-sm font-medium transition-colors py-2.5 active:scale-[0.97]',
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              )}>
              <span className="shrink-0 flex items-center justify-center w-8">
                {item.icon}
              </span>
              <span className="ml-3 overflow-hidden whitespace-nowrap">
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-700 p-4 shrink-0">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center text-sm font-medium shrink-0">
            {userName?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <div className="min-w-0 overflow-hidden whitespace-nowrap">
            <div className="text-sm font-medium text-white truncate">{userName || userEmail}</div>
            <div className="text-xs text-slate-400 truncate">{role.replace('_', ' ')}</div>
          </div>
        </div>

        <Tooltip content={resolvedTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
            className="w-full flex items-center text-sm text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors py-2.5"
          >
            <span className="shrink-0 flex items-center justify-center w-8">
              {resolvedTheme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </span>
            <span className="ml-3 overflow-hidden whitespace-nowrap">
              {resolvedTheme === 'dark' ? 'Light mode' : 'Dark mode'}
            </span>
          </motion.button>
        </Tooltip>

        <Tooltip content="Sign out">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleLogout}
            className="w-full flex items-center text-sm text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors py-2.5"
          >
            <span className="shrink-0 flex items-center justify-center w-8">
              <LogOut size={16} />
            </span>
            <span className="ml-3 overflow-hidden whitespace-nowrap">Sign out</span>
          </motion.button>
        </Tooltip>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile drawer */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.aside
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="fixed inset-y-0 left-0 z-50 w-56 bg-slate-900 text-white flex flex-col overflow-hidden md:hidden"
          >
            {sidebarContent}
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Desktop sidebar */}
      <motion.aside
        animate={{ width: 64 }}
        whileHover={{ width: 208 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="hidden md:flex fixed inset-y-0 left-0 bg-slate-900 text-white flex-col z-40 overflow-hidden"
      >
        {sidebarContent}
      </motion.aside>
    </>
  );
}
