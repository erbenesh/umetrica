import { eq } from 'drizzle-orm';

import { db } from '../db/index.js';
import { ensureOrdersTable, orders } from '../db/orders.js';
import { ozonPost, type OzonCredentials } from './ozon-client.js';
import type { MarketplaceSyncResult } from './wb-sync.js';

const DEFAULT_LOOKBACK_DAYS = 30;
const PAGE_SIZE = 1000;

type OzonSellerInfoResponse = {
  result?: {
    name?: string;
    company_id?: number;
    is_enabled?: boolean;
  };
};

type OzonTransaction = {
  operation_id?: number;
  operation_date?: string;
  accruals_for_sale?: number;
  amount?: number;
  type?: string;
};

type OzonTransactionListResponse = {
  result?: {
    operations?: OzonTransaction[];
    page_count?: number;
    row_count?: number;
  };
};

function lookbackRange(days: number) {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - days);

  return {
    from: from.toISOString(),
    to: to.toISOString(),
  };
}

function parseOzonDate(raw: string): Date | null {
  const normalized = raw.includes('T') ? raw : raw.replace(' ', 'T');
  const withZone = /(?:Z|[+-]\d{2}:\d{2})$/.test(normalized)
    ? normalized
    : `${normalized}+03:00`;
  const date = new Date(withZone);
  return Number.isNaN(date.getTime()) ? null : date;
}

function mapTransactionStatus(row: OzonTransaction) {
  const accrual = row.accruals_for_sale ?? 0;
  if (row.type === 'returns' || accrual < 0 || (row.amount ?? 0) < 0) {
    return 'cancelled';
  }
  return 'completed';
}

function mapTransactionAmount(row: OzonTransaction): number | null {
  const accrual = row.accruals_for_sale;
  if (typeof accrual !== 'number' || !Number.isFinite(accrual) || accrual === 0) {
    return null;
  }

  return Math.abs(accrual);
}

async function fetchOzonTransactionsPage(
  credentials: OzonCredentials,
  range: { from: string; to: string },
  page: number
) {
  return ozonPost<OzonTransactionListResponse>(credentials, '/v3/finance/transaction/list', {
    filter: {
      date: {
        from: range.from,
        to: range.to,
      },
      transaction_type: 'orders',
    },
    page,
    page_size: PAGE_SIZE,
  });
}

async function fetchAllOzonTransactions(credentials: OzonCredentials, lookbackDays: number) {
  const range = lookbackRange(lookbackDays);
  const transactions: OzonTransaction[] = [];
  let page = 1;
  let pageCount = 1;

  while (page <= pageCount) {
    const response = await fetchOzonTransactionsPage(credentials, range, page);
    const result = response.result;
    const batch = result?.operations ?? [];

    transactions.push(...batch);
    pageCount = result?.page_count ?? 1;
    page += 1;

    if (batch.length === 0) {
      break;
    }
  }

  return { transactions, pages: page - 1 };
}

export async function testOzonApiCredentials(credentials: OzonCredentials) {
  try {
    const response = await ozonPost<OzonSellerInfoResponse>(credentials, '/v1/seller/info', {});
    const seller = response.result;

    if (!seller?.name) {
      return { ok: false as const, message: 'Ozon не вернул данные продавца — проверьте ключ' };
    }

    if (seller.is_enabled === false) {
      return { ok: false as const, message: 'Кабинет Ozon отключён' };
    }

    return {
      ok: true as const,
      message: `Ключ действителен · ${seller.name}`,
    };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return { ok: false as const, message: 'Таймаут при обращении к Ozon' };
    }

    const message = error instanceof Error ? error.message : 'Не удалось проверить ключ Ozon';
    return { ok: false as const, message };
  }
}

export async function syncOzonSales(
  tenantId: string,
  clientId: string,
  apiKey: string,
  lookbackDays = DEFAULT_LOOKBACK_DAYS
): Promise<MarketplaceSyncResult> {
  const credentials = { clientId, apiKey };
  const { transactions, pages } = await fetchAllOzonTransactions(credentials, lookbackDays);

  const rowsById = new Map<
    string,
    { id: string; tenantId: string; status: string; amount: string; createdAt: Date }
  >();
  let skipped = 0;

  transactions.forEach((transaction, index) => {
    const createdAt = transaction.operation_date ? parseOzonDate(transaction.operation_date) : null;
    const amount = mapTransactionAmount(transaction);

    if (!createdAt || amount === null) {
      skipped += 1;
      return;
    }

    const id =
      transaction.operation_id != null
        ? `ozon-op-${transaction.operation_id}`
        : `ozon-${transaction.operation_date}-${index}`;

    rowsById.set(id, {
      id,
      tenantId,
      status: mapTransactionStatus(transaction),
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
          ? 'Продажи Ozon за период не распознаны — проверьте права ключа (финансы)'
          : `За последние ${lookbackDays} дней продаж Ozon не найдено`,
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
    message: `Синхронизировано ${rows.length} операций Ozon за ${lookbackDays} дн.${pagesNote}${skipped > 0 ? `, пропущено ${skipped}` : ''}`,
  };
}
