import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: ['./src/db/schema.ts', './src/db/dashboards.ts', './src/db/orders.ts', './src/db/insights.ts'],
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'postgresql://umetrica:umetrica@localhost:5432/umetrica',
  },
});
