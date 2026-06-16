import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: ['./src/db/schema.ts', './src/db/dashboards.ts', './src/db/orders.ts', './src/db/demo-semantic.ts', './src/db/insights.ts', './src/db/insight-runs.ts', './src/db/connections.ts', './src/db/billing-invoices.ts', './src/db/market-segments.ts', './src/db/benchmark-pool.ts', './src/db/audit-events.ts', './src/db/semantic-cubes.ts', './src/db/semantic-workspace.ts', './src/db/semantic-views.ts'],
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'postgresql://sellerpool:sellerpool@localhost:5432/sellerpool',
  },
});
