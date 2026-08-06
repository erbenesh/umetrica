import type { MultipartFile } from '@fastify/multipart';

export type RasterImageType = 'jpeg' | 'png' | 'webp';

type MultipartPart = MultipartFile | { type: 'field'; fieldname: string; value: unknown };

export function detectImageType(buffer: Buffer): RasterImageType | null {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'jpeg';
  }

  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return 'png';
  }

  if (
    buffer.length >= 12 &&
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return 'webp';
  }

  return null;
}

export function validateRasterImage(
  fileName: string,
  fileBuffer: Buffer,
  maxBytes: number
): string | null {
  if (fileBuffer.length === 0) {
    return 'Файл пустой';
  }

  if (fileBuffer.length > maxBytes) {
    const limitMb = maxBytes / (1024 * 1024);
    return `Файл больше ${limitMb} МБ`;
  }

  const lowerName = fileName.toLowerCase();
  const hasAllowedExt =
    lowerName.endsWith('.jpg') ||
    lowerName.endsWith('.jpeg') ||
    lowerName.endsWith('.png') ||
    lowerName.endsWith('.webp');

  if (!hasAllowedExt) {
    return 'Допустимы только JPG, PNG или WebP';
  }

  if (!detectImageType(fileBuffer)) {
    return 'Некорректный формат изображения';
  }

  return null;
}

export async function parseRasterImageMultipart(
  parts: AsyncIterable<MultipartPart>,
  maxBytes: number
) {
  let fileBuffer: Buffer | null = null;
  let fileName: string | null = null;

  for await (const part of parts) {
    if (part.type !== 'file') continue;

    fileName = part.filename;
    const chunks: Buffer[] = [];
    for await (const chunk of part.file) {
      chunks.push(chunk);
    }
    fileBuffer = Buffer.concat(chunks);
    break;
  }

  if (!fileBuffer || !fileName) {
    return { error: 'Выберите файл изображения' } as const;
  }

  const validationError = validateRasterImage(fileName, fileBuffer, maxBytes);
  if (validationError) {
    return { error: validationError } as const;
  }

  const imageType = detectImageType(fileBuffer);
  if (!imageType) {
    return { error: 'Некорректный формат изображения' } as const;
  }

  return { fileBuffer, imageType } as const;
}
