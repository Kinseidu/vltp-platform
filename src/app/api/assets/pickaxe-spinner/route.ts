import { NextResponse } from 'next/server';
import fs from 'fs/promises';

const DEFAULT_SPINNER_PATH =
  '/loading.png';

export async function GET() {
  const imagePath = process.env.PICKAXE_SPINNER_PATH || DEFAULT_SPINNER_PATH;

  try {
    const file = await fs.readFile(imagePath);
    return new NextResponse(file, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch {
    return new NextResponse('Spinner asset not found', { status: 404 });
  }
}
