import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  const start = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    const dbLatency = Date.now() - start;

    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      db: { connected: true, latencyMs: dbLatency },
      uptime: process.uptime(),
      memory: process.memoryUsage().rss,
    });
  } catch (error) {
    return NextResponse.json({
      status: 'degraded',
      timestamp: new Date().toISOString(),
      db: { connected: false, error: (error as Error).message },
      uptime: process.uptime(),
    }, { status: 503 });
  }
}
