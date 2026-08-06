import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  detectImageType,
  validateRasterImage,
  type RasterImageType,
} from './image-upload.js';

const rootDir = fileURLToPath(new URL('../../../..', import.meta.url));

export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
export const AVATAR_URL_PREFIX = '/api/avatars';

const AVATAR_DIR = process.env.AVATAR_DIR ?? resolve(rootDir, 'data/avatars');

export type AvatarImageType = RasterImageType;

const CONTENT_TYPES: Record<AvatarImageType, string> = {
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

function avatarFilePath(userId: string) {
  return resolve(AVATAR_DIR, userId);
}

export function avatarPublicPath(userId: string) {
  return `${AVATAR_URL_PREFIX}/${userId}`;
}

export async function ensureAvatarDir() {
  await mkdir(AVATAR_DIR, { recursive: true });
}

export { detectImageType };

export function validateAvatarFile(fileName: string, fileBuffer: Buffer): string | null {
  return validateRasterImage(fileName, fileBuffer, AVATAR_MAX_BYTES);
}

export async function saveAvatar(userId: string, fileBuffer: Buffer, imageType: AvatarImageType) {
  await ensureAvatarDir();
  await writeFile(avatarFilePath(userId), fileBuffer);
  return {
    image: avatarPublicPath(userId),
    contentType: CONTENT_TYPES[imageType],
  };
}

export async function deleteAvatarFile(userId: string) {
  try {
    await unlink(avatarFilePath(userId));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
  }
}

export async function readAvatarFile(userId: string) {
  try {
    const buffer = await readFile(avatarFilePath(userId));
    const imageType = detectImageType(buffer);
    if (!imageType) {
      return null;
    }

    return {
      buffer,
      contentType: CONTENT_TYPES[imageType],
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}
