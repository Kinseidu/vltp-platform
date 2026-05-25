import { describe, it, expect } from 'vitest';

describe('Utility: cn', () => {
  it('merges Tailwind class names correctly', async () => {
    const { cn } = await import('@/lib/utils/cn');
    expect(cn('px-4', 'py-2')).toBe('px-4 py-2');
    expect(cn('px-4', 'px-6')).toBe('px-6');
    expect(cn('text-red-500', 'text-red-500')).toBe('text-red-500');
  });
});

describe('Utility: getPagination', () => {
  it('returns default pagination values', async () => {
    const { getPagination } = await import('@/lib/utils/api');
    const req = new Request('http://localhost:3000/api/test');
    const { page, pageSize, skip } = getPagination(req as any);
    expect(page).toBe(1);
    expect(pageSize).toBe(20);
    expect(skip).toBe(0);
  });

  it('parses pagination from query params', async () => {
    const { getPagination } = await import('@/lib/utils/api');
    const req = new Request('http://localhost:3000/api/test?page=3&pageSize=10');
    const { page, pageSize, skip } = getPagination(req as any);
    expect(page).toBe(3);
    expect(pageSize).toBe(10);
    expect(skip).toBe(20);
  });
});
