import type { MultipartFile } from '@fastify/multipart';

import { importOrdersFromSpreadsheet, type CsvImportResult } from './csv-import.js';

export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;

export type ParsedCsvUpload = {
  provider: string;
  reportType: string;
  deleteAfterImport: boolean;
  fileBuffer: Buffer;
  fileName: string;
};

type MultipartPart = MultipartFile | { type: 'field'; fieldname: string; value: unknown };

export function validateSpreadsheetFile(fileName: string, fileBuffer: Buffer): string | null {
  if (fileBuffer.length > MAX_UPLOAD_BYTES) {
    return 'Файл больше 20 МБ';
  }

  const lowerName = fileName.toLowerCase();
  if (!lowerName.endsWith('.csv') && !lowerName.endsWith('.xlsx') && !lowerName.endsWith('.xls')) {
    return 'Допустимы только CSV или XLSX';
  }

  return null;
}

export async function parseCsvMultipart(
  parts: AsyncIterable<MultipartPart>
): Promise<ParsedCsvUpload | { error: string }> {
  let provider = 'wildberries';
  let reportType = 'sales';
  let deleteAfterImport = true;
  let fileBuffer: Buffer | null = null;
  let fileName: string | null = null;

  for await (const part of parts) {
    if (part.type === 'file') {
      fileName = part.filename;
      const chunks: Buffer[] = [];
      for await (const chunk of part.file) {
        chunks.push(chunk);
      }
      fileBuffer = Buffer.concat(chunks);
      continue;
    }

    const value = String(part.value);
    if (part.fieldname === 'provider') provider = value;
    if (part.fieldname === 'reportType') reportType = value;
    if (part.fieldname === 'deleteAfterImport') deleteAfterImport = value === 'true';
  }

  if (!fileBuffer || !fileName) {
    return { error: 'Файл не передан' };
  }

  const validationError = validateSpreadsheetFile(fileName, fileBuffer);
  if (validationError) {
    return { error: validationError };
  }

  return {
    provider,
    reportType,
    deleteAfterImport,
    fileBuffer,
    fileName,
  };
}

export async function importCsvForTenant(
  tenantId: string,
  upload: ParsedCsvUpload
): Promise<CsvImportResult | { error: string }> {
  try {
    const importResult = await importOrdersFromSpreadsheet(
      tenantId,
      upload.fileBuffer,
      upload.fileName,
      upload.reportType
    );
    if (importResult.imported === 0) {
      return { error: importResult.message };
    }
    return importResult;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Не удалось разобрать файл';
    return { error: message };
  }
}

/** @deprecated use MAX_UPLOAD_BYTES */
export const MAX_CSV_BYTES = MAX_UPLOAD_BYTES;
