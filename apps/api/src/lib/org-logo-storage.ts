import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { detectImageType, type RasterImageType } from './image-upload.js';

const rootDir = fileURLToPath(new URL('../../../..', import.meta.url));

export const ORG_LOGO_MAX_BYTES = 1024 * 1024;
export const ORG_LOGO_URL_PREFIX = '/api/org-logos';

const ORG_LOGO_DIR = process.env.ORG_LOGO_DIR ?? resolve(rootDir, 'data/org-logos');

const CONTENT_TYPES: Record<RasterImageType, string> = {
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

function orgLogoFilePath(organizationId: string) {
  return resolve(ORG_LOGO_DIR, organizationId);
}

export function orgLogoPublicPath(organizationId: string) {
  return `${ORG_LOGO_URL_PREFIX}/${organizationId}`;
}

async function ensureOrgLogoDir() {
  await mkdir(ORG_LOGO_DIR, { recursive: true });
}

export async function saveOrgLogo(
  organizationId: string,
  fileBuffer: Buffer,
  imageType: RasterImageType
) {
  await ensureOrgLogoDir();
  await writeFile(orgLogoFilePath(organizationId), fileBuffer);
  return {
    logo: orgLogoPublicPath(organizationId),
    contentType: CONTENT_TYPES[imageType],
  };
}

export async function deleteOrgLogoFile(organizationId: string) {
  try {
    await unlink(orgLogoFilePath(organizationId));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
  }
}

export async function readOrgLogoFile(organizationId: string) {
  try {
    const buffer = await readFile(orgLogoFilePath(organizationId));
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
