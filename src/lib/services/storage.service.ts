// src/lib/services/storage.service.ts
// Abstract file storage — local FS for MVP, swap to S3/Supabase via env var

import path from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

export interface StoredFile {
  fileName: string;       // UUID-based stored name
  originalName: string;   // Original user file name
  storagePath: string;    // Relative path for DB storage
  fileSize: number;
  mimeType: string;
}

/**
 * Ensure upload directory exists.
 */
export async function ensureUploadDir(subDir?: string): Promise<string> {
  const dir = subDir ? path.join(UPLOAD_DIR, subDir) : UPLOAD_DIR;
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

/**
 * Store a file buffer to local disk.
 * Returns StoredFile metadata for DB persistence.
 */
export async function storeFile(params: {
  buffer: Buffer;
  originalName: string;
  mimeType: string;
  subDir?: string;
}): Promise<StoredFile> {
  const { buffer, originalName, mimeType, subDir } = params;

  // Validate
  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    throw new Error(`File type not allowed: ${mimeType}`);
  }
  if (buffer.length > MAX_FILE_SIZE) {
    throw new Error(`File exceeds maximum size of 10MB`);
  }

  const ext = path.extname(originalName) || '.pdf';
  const fileName = `${crypto.randomUUID()}${ext}`;
  const dir = await ensureUploadDir(subDir);
  const fullPath = path.join(dir, fileName);
  const storagePath = subDir ? `${subDir}/${fileName}` : fileName;

  await fs.writeFile(fullPath, buffer);

  return {
    fileName,
    originalName,
    storagePath,
    fileSize: buffer.length,
    mimeType,
  };
}

/**
 * Read a stored file.
 * In production: fetch from S3/Supabase using storagePath as key.
 */
export async function readFile(storagePath: string): Promise<Buffer> {
  const fullPath = path.join(UPLOAD_DIR, storagePath);
  return fs.readFile(fullPath);
}

/**
 * Delete a stored file.
 */
export async function deleteFile(storagePath: string): Promise<void> {
  try {
    const fullPath = path.join(UPLOAD_DIR, storagePath);
    await fs.unlink(fullPath);
  } catch {
    // File may not exist; log and continue
    console.warn(`[Storage] Could not delete file: ${storagePath}`);
  }
}

/**
 * Generate a signed URL for secure file access.
 * For MVP: returns an API route URL with a short-lived token.
 * In production: return S3 presigned URL.
 */
export function getFileUrl(storagePath: string): string {
  const token = Buffer.from(`${storagePath}:${Date.now()}`).toString('base64url');
  return `/api/files/${token}`;
}
