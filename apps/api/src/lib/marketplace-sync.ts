import { syncOzonSales } from './ozon-sync.js';
import { syncWildberriesSales, type MarketplaceSyncResult } from './wb-sync.js';

export type MarketplaceApiCredentials = {
  apiKey: string;
  clientId?: string;
};

export type { MarketplaceSyncResult };

export async function syncMarketplaceConnection(
  tenantId: string,
  provider: string,
  credentials: MarketplaceApiCredentials
): Promise<MarketplaceSyncResult> {
  if (provider === 'wildberries') {
    return syncWildberriesSales(tenantId, credentials.apiKey);
  }

  if (provider === 'ozon') {
    if (!credentials.clientId) {
      throw new Error('Для Ozon нужен Client-Id');
    }
    return syncOzonSales(tenantId, credentials.clientId, credentials.apiKey);
  }

  throw new Error('Синхронизация для этого маркетплейса пока не реализована');
}
