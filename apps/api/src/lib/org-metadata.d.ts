import { type BillingPlanId, type InsightSettings, type PrivacySettings, type UpdateInsightSettingsInput, type UpdatePrivacySettingsInput } from '@sellerpool/core';
type OrgMetadata = {
    planId?: string;
    insightSettings?: unknown;
    privacySettings?: unknown;
    lastInsightScheduleAt?: string;
};
export declare function parseOrgMetadata(raw: string | null | undefined): OrgMetadata;
export declare function getOrgPlanId(organizationId: string): Promise<BillingPlanId>;
export declare function setOrgPlanId(organizationId: string, planId: BillingPlanId): Promise<void>;
export declare function getInsightSettings(organizationId: string): Promise<InsightSettings>;
export declare function updateInsightSettings(organizationId: string, patch: UpdateInsightSettingsInput): Promise<InsightSettings>;
export declare function getLastInsightScheduleAt(organizationId: string): Promise<Date | null>;
export declare function setLastInsightScheduleAt(organizationId: string, at: Date): Promise<void>;
export declare function getPrivacySettings(organizationId: string): Promise<PrivacySettings>;
export declare function updatePrivacySettings(organizationId: string, patch: UpdatePrivacySettingsInput): Promise<PrivacySettings>;
export {};
//# sourceMappingURL=org-metadata.d.ts.map