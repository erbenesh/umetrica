import { eq } from 'drizzle-orm';

import type { OrgConnectionProfile } from '@sellerpool/core';

import { connections } from '../db/connections.js';
import { db } from '../db/index.js';

export async function getOrgConnectionProfile(organizationId: string): Promise<OrgConnectionProfile> {
  const rows = await db
    .select({ kind: connections.kind, method: connections.method })
    .from(connections)
    .where(eq(connections.organizationId, organizationId));

  return {
    hasMarketplaceApi: rows.some((row) => row.kind === 'marketplace' && row.method === 'api'),
    hasFileImport: rows.some((row) => row.kind === 'csv' || row.method === 'csv'),
    hasDatabase: rows.some((row) => row.kind === 'database'),
  };
}
