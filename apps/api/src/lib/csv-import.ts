import { randomUUID } from 'node:crypto';

import { eq } from 'drizzle-orm';

import { readSpreadsheetTable } from './spreadsheet-import.js';

import { db } from '../db/index.js';
import { ensureOrdersTable, orders } from '../db/orders.js';

export type CsvImportResult = {
  imported: number;
  skipped: number;
  message: string;
};

const DATE_HEADERS = [
  'дата',
  'date',
  'дата заказа',
  'дата продажи',
  'дата и время продажи',
  'дата оформления',
  'created_at',
  'order_date',
];

const AMOUNT_HEADERS = [
  'сумма',
  'amount',
  'к перечислению',
  'к перечислению продавцу',
  'цена',
  'выручка',
  'итого',
  'сумма заказа',
  'price',
  'revenue',
  'сумма продаж',
];

const STATUS_HEADERS = ['статус', 'status', 'статус заказа'];

const QUANTITY_HEADERS = ['кол-во', 'количество', 'qty', 'quantity'];

function normalizeHeader(value: string) {
  return value
    .replace(/^\uFEFF/, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function findColumnIndex(headers: string[], candidates: string[]) {
  const normalized = headers.map(normalizeHeader);
  for (const candidate of candidates) {
    const index = normalized.findIndex(
      (header) => header === candidate || header.includes(candidate)
    );
    if (index >= 0) return index;
  }
  return -1;
}

function parseAmount(raw: string): number | null {
  const cleaned = raw
    .replace(/\s/g, '')
    .replace(/₽|руб\.?/gi, '')
    .replace(',', '.')
    .replace(/[^\d.-]/g, '');

  if (!cleaned) return null;
  const value = Number.parseFloat(cleaned);
  return Number.isFinite(value) && value >= 0 ? value : null;
}

function parseDate(raw: string): Date | null {
  const value = raw.trim();
  if (!value) return null;

  const ruMatch = value.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})(?:\s+(\d{1,2}):(\d{2}))?/);
  if (ruMatch) {
    const [, day, month, year, hour = '0', minute = '0'] = ruMatch;
    const date = new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute)
    );
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const iso = new Date(value);
  return Number.isNaN(iso.getTime()) ? null : iso;
}

function mapStatus(raw: string | undefined): string {
  if (!raw) return 'completed';

  const value = raw.trim().toLowerCase();
  if (
    value.includes('отмен') ||
    value.includes('cancel') ||
    value.includes('возврат') ||
    value.includes('refund')
  ) {
    return 'cancelled';
  }

  if (
    value.includes('ожид') ||
    value.includes('нов') ||
    value.includes('пути') ||
    value.includes('pending') ||
    value.includes('process')
  ) {
    return 'pending';
  }

  return 'completed';
}

export function parseOrdersFromSpreadsheet(
  fileBuffer: Buffer,
  fileName: string,
  reportType: string
): { rows: Array<{ amount: string; status: string; createdAt: Date }>; skipped: number } {
  if (reportType === 'stock') {
    throw new Error('Импорт остатков пока не поддерживается — выберите «Продажи» или «Заказы»');
  }

  const table = readSpreadsheetTable(fileBuffer, fileName);
  if (table.length < 2) {
    throw new Error('Файл пустой или содержит только заголовок');
  }

  return parseOrdersFromTable(table);
}

function parseOrdersFromTable(table: string[][]): {
  rows: Array<{ amount: string; status: string; createdAt: Date }>;
  skipped: number;
} {
  const headers = table[0]!;
  const dateIdx = findColumnIndex(headers, DATE_HEADERS);
  const amountIdx = findColumnIndex(headers, AMOUNT_HEADERS);
  const statusIdx = findColumnIndex(headers, STATUS_HEADERS);
  const quantityIdx = findColumnIndex(headers, QUANTITY_HEADERS);

  if (dateIdx < 0) {
    throw new Error('Не найдена колонка с датой (ожидаем «Дата», «Дата заказа» и т.п.)');
  }

  if (amountIdx < 0 && quantityIdx < 0) {
    throw new Error('Не найдена колонка с суммой или количеством');
  }

  const rows: Array<{ amount: string; status: string; createdAt: Date }> = [];
  let skipped = 0;

  for (const line of table.slice(1)) {
    const dateRaw = line[dateIdx] ?? '';
    const createdAt = parseDate(dateRaw);
    if (!createdAt) {
      skipped += 1;
      continue;
    }

    let amount = amountIdx >= 0 ? parseAmount(line[amountIdx] ?? '') : null;
    if (amount === null && quantityIdx >= 0) {
      amount = parseAmount(line[quantityIdx] ?? '');
    }

    if (amount === null || amount === 0) {
      skipped += 1;
      continue;
    }

    const status = mapStatus(statusIdx >= 0 ? line[statusIdx] : undefined);
    rows.push({
      amount: amount.toFixed(2),
      status,
      createdAt,
    });
  }

  return { rows, skipped };
}

export async function importOrdersFromSpreadsheet(
  tenantId: string,
  fileBuffer: Buffer,
  fileName: string,
  reportType: string
): Promise<CsvImportResult> {
  const { rows, skipped } = parseOrdersFromSpreadsheet(fileBuffer, fileName, reportType);

  if (rows.length === 0) {
    return {
      imported: 0,
      skipped,
      message: 'Не удалось распознать ни одной строки — проверьте формат отчёта',
    };
  }

  await ensureOrdersTable(db);
  await db.delete(orders).where(eq(orders.tenantId, tenantId));

  const batchSize = 500;
  for (let offset = 0; offset < rows.length; offset += batchSize) {
    const chunk = rows.slice(offset, offset + batchSize).map((row) => ({
      id: randomUUID(),
      tenantId,
      status: row.status,
      amount: row.amount,
      createdAt: row.createdAt,
    }));

    await db.insert(orders).values(chunk);
  }

  return {
    imported: rows.length,
    skipped,
    message: `Импортировано ${rows.length} строк${skipped > 0 ? `, пропущено ${skipped}` : ''}`,
  };
}

/** @deprecated use importOrdersFromSpreadsheet */
export async function importOrdersFromCsv(
  tenantId: string,
  fileBuffer: Buffer,
  reportType: string
) {
  return importOrdersFromSpreadsheet(tenantId, fileBuffer, 'upload.csv', reportType);
}
