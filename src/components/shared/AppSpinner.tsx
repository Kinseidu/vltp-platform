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
  const [useFallback, setUseFallback] = useState(false);

  if (useFallback) {
    return (
      <div
        className={cn(
          sizeClasses[size],
          'border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin',
          className
        )}
      />
    );
  }

  return (
    <img
      src="/api/assets/pickaxe-spinner"
      alt="Loading"
      className={cn(sizeClasses[size], 'animate-spin', className)}
      onError={() => setUseFallback(true)}
    />
  );
}
