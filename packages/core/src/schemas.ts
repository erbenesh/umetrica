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

export const InsightSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string(),
  brief: InsightBriefSchema,
  evaluation: InsightEvaluationSchema,
  provider: z.string().optional(),
  createdAt: z.string().datetime(),
});

export type Insight = z.infer<typeof InsightSchema>;
