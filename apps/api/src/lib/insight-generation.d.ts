import type { Insight, InsightRun } from '@sellerpool/core';
export type InsightGenerationResult = {
    ok: true;
    generated: boolean;
    items: Insight[];
    count: number;
    creditsUsed: number;
    message?: string;
} | {
    ok: false;
    status: 400 | 402;
    error: string;
    creditsUsed?: number;
    creditsTotal?: number;
    requiredCredits?: number;
};
export declare function runInsightGeneration(input: {
    organizationId: string;
    userId: string;
    trigger?: InsightRun['trigger'];
}): Promise<InsightGenerationResult>;
//# sourceMappingURL=insight-generation.d.ts.map