import { InsightEvaluationSchema, type Insight, type InsightBrief, type InsightSource } from '@sellerpool/core';
import { insights } from '../db/insights.js';
export declare function generateMarketInsights(input: {
    organizationId: string;
}): Promise<Insight[]>;
export declare function parseInsightSource(value: string | null | undefined): InsightSource;
export declare function toInsightRow(row: typeof insights.$inferSelect): Insight;
export declare function persistTenantInsight(input: {
    organizationId: string;
    brief: InsightBrief;
    evaluation: ReturnType<typeof InsightEvaluationSchema.parse>;
    provider: string;
}): Promise<Insight>;
//# sourceMappingURL=market-insight-generation.d.ts.map