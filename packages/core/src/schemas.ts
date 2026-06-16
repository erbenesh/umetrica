import { z } from 'zod';

export const OrgRoleSchema = z.enum(['owner', 'admin', 'viewer']);
export type OrgRole = z.infer<typeof OrgRoleSchema>;

export const GridPositionSchema = z.object({
  x: z.number().int().min(0),
  y: z.number().int().min(0),
  w: z.number().int().min(1),
  h: z.number().int().min(1),
});

export const ChartTypeSchema = z.enum([
  'line',
  'bar',
  'area',
  'combined',
  'pivot',
  'pie',
  'donut',
  'kpi',
]);

export const FilterConditionSchema = z.object({
  member: z.string().optional(),
  operator: z.string().optional(),
  values: z.union([z.string(), z.number(), z.array(z.union([z.string(), z.number()]))]).optional(),
});

export const DateRangePresetSchema = z.enum([
  'last 7 days',
  'last 30 days',
  'last 90 days',
  'this month',
  'last month',
]);

export type DateRangePreset = z.infer<typeof DateRangePresetSchema>;

export const TimeGranularitySchema = z.enum(['day', 'week', 'month']);
export type TimeGranularity = z.infer<typeof TimeGranularitySchema>;

export const WidgetSchema = z.object({
  id: z.string().uuid(),
  cubeName: z.string().min(1),
  chartType: ChartTypeSchema,
  title: z.string().min(1).max(200),
  measures: z.array(z.string()),
  dimensions: z.array(z.string()),
  filters: z.array(FilterConditionSchema).default([]),
  timeDimension: z.string().optional(),
  dateRange: DateRangePresetSchema.optional(),
  granularity: TimeGranularitySchema.optional(),
  layout: GridPositionSchema,
});

export type Widget = z.infer<typeof WidgetSchema>;
export type ChartType = z.infer<typeof ChartTypeSchema>;

export const DashboardSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string(),
  name: z.string().min(1).max(200),
  description: z.string().max(500).optional(),
  widgets: z.array(WidgetSchema).default([]),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Dashboard = z.infer<typeof DashboardSchema>;

export const CreateDashboardSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(500).optional(),
});

export type CreateDashboardInput = z.infer<typeof CreateDashboardSchema>;

export const UpdateDashboardSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(500).nullable().optional(),
  widgets: z.array(WidgetSchema).optional(),
});

export type UpdateDashboardInput = z.infer<typeof UpdateDashboardSchema>;

export const AnomalySchema = z.object({
  metric: z.string(),
  changePct: z.number(),
  period: z.string(),
  direction: z.enum(['up', 'down']),
  severity: z.enum(['low', 'medium', 'high']),
});

export const InsightBriefSchema = z.object({
  anomaly: AnomalySchema,
  drivers: z.array(
    z.object({
      dimension: z.string(),
      name: z.string(),
      contributionPct: z.number(),
    })
  ),
  correlations: z.array(
    z.object({
      metric: z.string(),
      changePct: z.number().optional(),
      value: z.number().optional(),
      trend: z.enum(['up', 'down', 'flat']).optional(),
    })
  ),
  dataQuality: z.object({
    completeness: z.number().min(0).max(1),
    lastSync: z.string().datetime().optional(),
  }),
});

export type InsightBrief = z.infer<typeof InsightBriefSchema>;

export const InsightEvaluationSchema = z.object({
  summary: z.string(),
  whatHappened: z.string(),
  hypotheses: z.array(
    z.object({
      cause: z.string(),
      confidence: z.number().min(0).max(1),
    })
  ),
  recommendations: z.array(z.string()),
  confidence: z.number().min(0).max(1),
});

export type InsightEvaluation = z.infer<typeof InsightEvaluationSchema>;

export const InsightSourceSchema = z.enum(['tenant', 'market', 'benchmark']);
export type InsightSource = z.infer<typeof InsightSourceSchema>;

export const InsightSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string(),
  source: InsightSourceSchema.default('tenant'),
  brief: InsightBriefSchema,
  evaluation: InsightEvaluationSchema,
  provider: z.string().optional(),
  createdAt: z.string().datetime(),
});

export type Insight = z.infer<typeof InsightSchema>;

export const InsightRunTriggerSchema = z.enum(['manual', 'scheduled']);
export type InsightRunTrigger = z.infer<typeof InsightRunTriggerSchema>;

export const InsightRunResultSchema = z.enum(['insights', 'no_anomalies', 'error']);
export type InsightRunResult = z.infer<typeof InsightRunResultSchema>;

export const InsightRunSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string(),
  trigger: InsightRunTriggerSchema,
  triggeredByName: z.string().optional(),
  insightCount: z.number().int().nonnegative(),
  creditsUsed: z.number().int().positive(),
  result: InsightRunResultSchema,
  message: z.string().optional(),
  firstInsightId: z.string().uuid().optional(),
  createdAt: z.string().datetime(),
});

export type InsightRun = z.infer<typeof InsightRunSchema>;

export const InsightHistoryResponseSchema = z.object({
  items: z.array(InsightRunSchema),
  total: z.number().int().nonnegative(),
  monthCredits: z.number().int().nonnegative(),
  monthInsights: z.number().int().nonnegative(),
});

export type InsightHistoryResponse = z.infer<typeof InsightHistoryResponseSchema>;

export const InsightScheduleSchema = z.enum(['daily', '12h', 'manual']);
export type InsightSchedule = z.infer<typeof InsightScheduleSchema>;

export const InsightMetricSettingSchema = z.object({
  key: z.string().min(1),
  enabled: z.boolean(),
});

export type InsightMetricSetting = z.infer<typeof InsightMetricSettingSchema>;

export const InsightSettingsSchema = z.object({
  sources: z.object({
    tenant: z.boolean(),
    market: z.boolean(),
    benchmark: z.boolean(),
  }),
  schedule: InsightScheduleSchema,
  emailAlerts: z.boolean(),
  metrics: z.array(InsightMetricSettingSchema),
});

export type InsightSettings = z.infer<typeof InsightSettingsSchema>;

export const UpdateInsightSettingsSchema = InsightSettingsSchema.partial().deepPartial();

export type UpdateInsightSettingsInput = z.infer<typeof UpdateInsightSettingsSchema>;

export const PrivacySettingsSchema = z.object({
  marketCategory: z.string().min(1).max(120),
  benchmarkOptIn: z.boolean(),
  benchmarkOptInAt: z.string().datetime().nullable().optional(),
  benchmarkOptOutUntil: z.string().datetime().nullable().optional(),
});

export type PrivacySettings = z.infer<typeof PrivacySettingsSchema>;

/** API view: privacy prefs + live benchmark pool stats for the org category */
export const PrivacySettingsViewSchema = PrivacySettingsSchema.extend({
  benchmarkPoolParticipants: z.number().int().nonnegative(),
  benchmarkContributing: z.boolean(),
  benchmarkReceiving: z.boolean(),
  benchmarkWarmupEndsAt: z.string().datetime().nullable(),
  benchmarkContributionEndsAt: z.string().datetime().nullable(),
});

export type PrivacySettingsView = z.infer<typeof PrivacySettingsViewSchema>;

export const UpdatePrivacySettingsSchema = PrivacySettingsSchema.partial();

export type UpdatePrivacySettingsInput = z.infer<typeof UpdatePrivacySettingsSchema>;

export const DEFAULT_PRIVACY_SETTINGS: PrivacySettings = {
  marketCategory: 'Дом и текстиль',
  benchmarkOptIn: false,
  benchmarkOptInAt: null,
  benchmarkOptOutUntil: null,
};

export const DEFAULT_INSIGHT_SETTINGS: InsightSettings = {
  sources: {
    tenant: true,
    market: true,
    benchmark: false,
  },
  schedule: 'manual',
  emailAlerts: true,
  metrics: [
    { key: 'Orders.revenue', enabled: true },
    { key: 'Orders.count', enabled: true },
    { key: 'Orders.avgOrder', enabled: false },
  ],
};
