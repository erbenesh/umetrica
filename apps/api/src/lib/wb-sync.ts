import { eq } from 'drizzle-orm';

import { db } from '../db/index.js';
import { ensureOrdersTable, orders } from '../db/orders.js';

const WB_SALES_URL = 'https://statistics-api.wildberries.ru/api/v1/supplier/sales';
const DEFAULT_LOOKBACK_DAYS = 30;
const REQUEST_TIMEOUT_MS = 30_000;
const RATE_LIMIT_MS = 60_000;
const WB_PAGE_ROW_LIMIT = 80_000;
const MAX_PAGES = 50;
const MAX_RATE_LIMIT_RETRIES = 3;

export type MarketplaceSyncResult = {
  imported: number;
  skipped: number;
  message: string;
};

type WbSaleRow = {
  date?: string;
  lastChangeDate?: string;
  saleID?: string;
  srid?: string;
  forPay?: number;
  finishedPrice?: number;
  priceWithDisc?: number;
  isCancel?: boolean;
};

function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

function lookbackDate(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
}

function mapSaleStatus(row: WbSaleRow) {
  if (row.isCancel) return 'cancelled';
  const amount = row.forPay ?? row.finishedPrice ?? row.priceWithDisc ?? 0;
  if (amount < 0) return 'cancelled';
  return 'completed';
}

function mapSaleAmount(row: WbSaleRow): number | null {
  if (row.isCancel) return null;

  const value = row.forPay ?? row.finishedPrice ?? row.priceWithDisc;
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    return null;
  }

  return value;
}

function mapSaleId(row: WbSaleRow, index: number) {
  if (row.saleID) return `wb-sale-${row.saleID}`;
  if (row.srid) return `wb-srid-${row.srid}`;
  const stamp = row.date ?? row.lastChangeDate ?? String(index);
  return `wb-${stamp}-${index}`;
}

function parseSaleDate(row: WbSaleRow): Date | null {
  const raw = row.date ?? row.lastChangeDate;
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

function nextPaginationCursor(batch: WbSaleRow[]) {
  const lastRow = batch[batch.length - 1];
  return lastRow?.lastChangeDate ?? lastRow?.date ?? null;
}

async function fetchWildberriesSalesPage(apiKey: string, dateFrom: string): Promise<WbSaleRow[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const url = `${WB_SALES_URL}?dateFrom=${encodeURIComponent(dateFrom)}`;
    let rateLimitAttempts = 0;

    while (rateLimitAttempts <= MAX_RATE_LIMIT_RETRIES) {
      const response = await fetch(url, {
        method: 'GET',
        headers: { Authorization: apiKey },
        signal: controller.signal,
      });

      if (response.status === 429) {
        rateLimitAttempts += 1;
        if (rateLimitAttempts > MAX_RATE_LIMIT_RETRIES) {
          throw new Error('Превышен лимит запросов Wildberries (1 запрос в минуту)');
        }
        console.warn('[wb-sync] rate limited, waiting 60s before retry');
        await sleep(RATE_LIMIT_MS);
        continue;
      }

      if (response.status === 401) {
        throw new Error('Ключ Wildberries недействителен или отозван');
      }

      if (response.status === 403) {
        throw new Error('У ключа нет доступа к статистике продаж');
      }

      if (!response.ok) {
        throw new Error(`Wildberries вернул ошибку ${response.status}`);
      }

      const body = (await response.json()) as unknown;
      if (!Array.isArray(body)) {
        throw new Error('Неожиданный ответ Wildberries');
      }

      return body as WbSaleRow[];
    }

    throw new Error('Превышен лимит запросов Wildberries (1 запрос в минуту)');
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Таймаут при загрузке продаж из Wildberries');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchAllWildberriesSales(apiKey: string, dateFrom: string) {
  const sales: WbSaleRow[] = [];
  let cursor = dateFrom;
  let pages = 0;

  while (pages < MAX_PAGES) {
    if (pages > 0) {
      await sleep(RATE_LIMIT_MS);
    }

    const batch = await fetchWildberriesSalesPage(apiKey, cursor);
    pages += 1;

    if (batch.length === 0) {
      break;
    }

    sales.push(...batch);

    if (batch.length < WB_PAGE_ROW_LIMIT) {
      break;
    }

    const nextCursor = nextPaginationCursor(batch);
    if (!nextCursor) {
      console.warn('[wb-sync] missing lastChangeDate on last row, stopping pagination');
      break;
    }

    if (nextCursor === cursor) {
      console.warn(`[wb-sync] cursor stuck at ${nextCursor}, stopping pagination`);
      break;
    }

    cursor = nextCursor;
  }

  if (pages >= MAX_PAGES) {
    console.warn(`[wb-sync] reached max pages (${MAX_PAGES}), stopping pagination`);
  }

  return { sales, pages };
}

export async function syncWildberriesSales(
  tenantId: string,
  apiKey: string,
  lookbackDays = DEFAULT_LOOKBACK_DAYS
): Promise<MarketplaceSyncResult> {
  const { sales, pages } = await fetchAllWildberriesSales(apiKey, lookbackDate(lookbackDays));

  const rowsById = new Map<
    string,
    { id: string; tenantId: string; status: string; amount: string; createdAt: Date }
  >();
  let skipped = 0;

  sales.forEach((sale, index) => {
    const createdAt = parseSaleDate(sale);
    const amount = mapSaleAmount(sale);

    if (!createdAt || amount === null) {
      skipped += 1;
      return;
    }

    const id = mapSaleId(sale, index);
    rowsById.set(id, {
      id,
      tenantId,
      status: mapSaleStatus(sale),
      amount: amount.toFixed(2),
      createdAt,
    });
  });

  const rows = [...rowsById.values()];

  if (rows.length === 0) {
    return {
      imported: 0,
      skipped,
      message:
        skipped > 0
          ? 'Продажи за период не распознаны — проверьте права токена'
          : `За последние ${lookbackDays} дней продаж не найдено`,
    };
  }

  await ensureOrdersTable(db);
  await db.delete(orders).where(eq(orders.tenantId, tenantId));

  const batchSize = 500;
  for (let offset = 0; offset < rows.length; offset += batchSize) {
    await db.insert(orders).values(rows.slice(offset, offset + batchSize));
  }

  const pagesNote = pages > 1 ? `, ${pages} запросов к API` : '';

  return {
    imported: rows.length,
    skipped,
    message: `Синхронизировано ${rows.length} продаж за ${lookbackDays} дн.${pagesNote}${skipped > 0 ? `, пропущено ${skipped}` : ''}`,
  };
}
