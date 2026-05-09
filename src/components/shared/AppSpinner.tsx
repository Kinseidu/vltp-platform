'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils/cn';

interface AppSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'w-5 h-5',
  md: 'w-8 h-8',
  lg: 'w-12 h-12',
};

export function AppSpinner({ size = 'md', className }: AppSpinnerProps) {
  return (
    <div
      className={cn(
        sizeClasses[size],
        'rounded-full border-2 border-gray-200 border-t-blue-500 animate-spin',
        className
      )}
      role="status"
      aria-label="Loading"
    />
  );
}
