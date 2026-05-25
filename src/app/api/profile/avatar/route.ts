import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getSession } from '@/lib/auth/jwt';
import { ok, error, unauthorized, withErrorHandler } from '@/lib/utils/api';
import { storeFile, getFileUrl } from '@/lib/services/storage.service';
import { UserRole } from '@prisma/client';

const AVATAR_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
const MAX_AVATAR_SIZE = 2 * 1024 * 1024;

export const POST = withErrorHandler(async (req: NextRequest) => {
  const session = await getSession();
  if (!session || session.role !== UserRole.APPLICANT) return unauthorized();

  const formData = await req.formData();
  const file = formData.get('avatar') as File | null;
  if (!file) return error('No avatar file provided', 400);

  if (!AVATAR_MIME_TYPES.includes(file.type)) {
    return error('Avatar must be JPEG, PNG, WebP, or AVIF', 400);
  }

  if (file.size > MAX_AVATAR_SIZE) {
    return error('Avatar must be under 2MB', 400);
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const stored = await storeFile({
    buffer,
    originalName: `avatar-${session.id}${file.name.substring(file.name.lastIndexOf('.'))}`,
    mimeType: file.type,
    subDir: 'avatars',
  });

  const profile = await prisma.applicantProfile.update({
    where: { userId: session.id },
    data: {
      avatarStoragePath: stored.storagePath,
      avatarMimeType: stored.mimeType,
    },
    include: { community: true },
  });

  const avatarUrl = getFileUrl(stored.storagePath);

  return ok({ profile, avatarUrl });
});

export const DELETE = withErrorHandler(async () => {
  const session = await getSession();
  if (!session || session.role !== UserRole.APPLICANT) return unauthorized();

  const profile = await prisma.applicantProfile.findUnique({
    where: { userId: session.id },
    select: { avatarStoragePath: true },
  });

  if (profile?.avatarStoragePath) {
    const { deleteFile } = await import('@/lib/services/storage.service');
    await deleteFile(profile.avatarStoragePath);
  }

  await prisma.applicantProfile.update({
    where: { userId: session.id },
    data: { avatarStoragePath: null, avatarMimeType: null },
  });

  return ok(null, 'Avatar removed');
});
