import * as XLSX from 'xlsx';

import { parseCsvText } from './csv-text.js';

function cellToString(value: unknown): string {
  if (value == null) return '';
  if (value instanceof Date) {
    return value.toISOString();
  }
  return String(value).trim();
}

export function readSpreadsheetTable(fileBuffer: Buffer, fileName: string): string[][] {
  const lowerName = fileName.toLowerCase();

  if (lowerName.endsWith('.csv')) {
    return parseCsvText(fileBuffer.toString('utf8'));
  }

  if (!lowerName.endsWith('.xlsx') && !lowerName.endsWith('.xls')) {
    throw new Error('Допустимы только CSV или XLSX');
  }

  const workbook = XLSX.read(fileBuffer, { type: 'buffer', cellDates: true });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error('Файл не содержит листов');
  }

  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    throw new Error('Не удалось прочитать лист Excel');
  }

  const rawRows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    raw: false,
    defval: '',
  });

  return rawRows
    .filter((row) => Array.isArray(row) && row.some((cell) => cellToString(cell).length > 0))
    .map((row) => (row as unknown[]).map(cellToString));
}
