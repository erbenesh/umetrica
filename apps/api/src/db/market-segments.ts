import { index, integer, jsonb, pgTable, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';

export const marketSegmentSnapshots = pgTable(
  'market_segment_snapshots',
  {
    id: text('id').primaryKey(),
    category: text('category').notNull(),
    segmentType: text('segment_type').notNull(),
    payload: jsonb('payload').notNull(),
    participantCount: integer('participant_count').notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('market_segment_category_type_idx').on(table.category, table.segmentType),
    index('market_segment_type_idx').on(table.segmentType),
  ]
);
