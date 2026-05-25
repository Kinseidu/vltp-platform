import { describe, it, expect } from 'vitest';

describe('API: error responses', () => {
  it('creates consistent error responses', async () => {
    const { ok, error, unauthorized, forbidden } = await import('@/lib/utils/api');

    const successResponse = ok({ test: true });
    const successData = await successResponse.json();
    expect(successData.success).toBe(true);
    expect(successData.data.test).toBe(true);

    const errorResponse = error('Something went wrong', 400);
    expect(errorResponse.status).toBe(400);
    const errorData = await errorResponse.json();
    expect(errorData.success).toBe(false);
    expect(errorData.error).toBe('Something went wrong');

    expect((await unauthorized().json()).error).toBe('Authentication required');
    expect((await forbidden().json()).error).toBe('You do not have permission to perform this action');
  });
});
