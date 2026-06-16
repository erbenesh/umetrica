import { type BillingOverview } from '@sellerpool/core';
export declare function getBillingOverview(organizationId: string): Promise<BillingOverview>;
export declare function getAvailableCredits(organizationId: string): Promise<{
    creditsUsed: number;
    creditsTotal: number;
    available: number;
}>;
//# sourceMappingURL=billing.d.ts.map