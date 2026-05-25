// src/components/shared/StatusBadge.tsx
'use client';

import { cn } from '@/lib/utils/cn';

const statusConfig: Record<string, { label: string; className: string }> = {
  // Verification
  PENDING:          { label: 'Pending',           className: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  YOUTH_APPROVED:   { label: 'Youth Approved',    className: 'bg-blue-100 text-blue-800 border-blue-200' },
  CHIEF_CONFIRMED:  { label: 'Chief Confirmed',   className: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
  VERIFIED:         { label: 'Verified Local ✓',  className: 'bg-green-100 text-green-800 border-green-200' },
  REJECTED:         { label: 'Rejected',          className: 'bg-red-100 text-red-800 border-red-200' },
  // Applications
  DRAFT:            { label: 'Draft',             className: 'bg-gray-100 text-gray-700 border-gray-200' },
  SUBMITTED:        { label: 'Submitted',         className: 'bg-blue-100 text-blue-800 border-blue-200' },
  UNDER_REVIEW:     { label: 'Under Review',      className: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  SHORTLISTED:      { label: 'Shortlisted',       className: 'bg-purple-100 text-purple-800 border-purple-200' },
  INVITED_FOR_INTERVIEW: { label: 'Interview Invited', className: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  HIRED:                { label: 'Hired ✓',           className: 'bg-green-200 text-green-900 border-green-300' },
  // Jobs
  OPEN:    { label: 'Open',   className: 'bg-green-100 text-green-800 border-green-200' },
  CLOSED:  { label: 'Closed', className: 'bg-gray-100 text-gray-700 border-gray-200' },
  FILLED:  { label: 'Filled', className: 'bg-blue-100 text-blue-800 border-blue-200' },
  // Eligibility
  ELIGIBLE:                   { label: 'Eligible',             className: 'bg-green-100 text-green-800 border-green-200' },
  INELIGIBLE_NOT_VERIFIED:    { label: 'Not Verified',         className: 'bg-red-100 text-red-800 border-red-200' },
  INELIGIBLE_COMMUNITY:       { label: 'Wrong Community',      className: 'bg-orange-100 text-orange-800 border-orange-200' },
  INELIGIBLE_EXPERIENCE:      { label: 'Insufficient Exp.',    className: 'bg-orange-100 text-orange-800 border-orange-200' },
  INELIGIBLE_MISSING_CERTS:   { label: 'Missing Certs',       className: 'bg-red-100 text-red-800 border-red-200' },
};

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

export function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const config = statusConfig[status] || { label: status, className: 'bg-gray-100 text-gray-700' };
  return (
    <span className={cn(
      'inline-flex items-center font-medium border rounded-full',
      size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm',
      config.className
    )}>
      {config.label}
    </span>
  );
}
