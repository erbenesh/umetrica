import { z } from 'zod';

export const AuditEventCategorySchema = z.enum(['team', 'semantics', 'billing', 'system']);
export type AuditEventCategory = z.infer<typeof AuditEventCategorySchema>;

export const AuditEventSchema = z.object({
  id: z.string(),
  date: z.string(),
  actorName: z.string(),
  action: z.string(),
  objectLabel: z.string(),
  category: AuditEventCategorySchema,
});

export type AuditEvent = z.infer<typeof AuditEventSchema>;

export const AuditEventsResponseSchema = z.object({
  items: z.array(AuditEventSchema),
  total: z.number().int().nonnegative(),
});

export type AuditEventsResponse = z.infer<typeof AuditEventsResponseSchema>;

export const AuditFilterSchema = z.enum(['all', 'semantics', 'team']);
export type AuditFilter = z.infer<typeof AuditFilterSchema>;

export const SsoSettingsSchema = z.object({
  enabled: z.boolean(),
  requireForAll: z.boolean(),
  idpSsoUrl: z.string().max(500).optional(),
  idpCertificate: z.string().max(10000).optional(),
  entityId: z.string(),
});

export type SsoSettings = z.infer<typeof SsoSettingsSchema>;

export const UpdateSsoSettingsSchema = z.object({
  enabled: z.boolean().optional(),
  requireForAll: z.boolean().optional(),
  idpSsoUrl: z.string().max(500).optional(),
  idpCertificate: z.string().max(10000).optional(),
});

export type UpdateSsoSettingsInput = z.infer<typeof UpdateSsoSettingsSchema>;

export const EnterpriseLlmProviderSchema = z.enum(['deepseek', 'qwen']);
export type EnterpriseLlmProvider = z.infer<typeof EnterpriseLlmProviderSchema>;

export const EnterpriseLlmSettingsSchema = z.object({
  enabled: z.boolean(),
  provider: EnterpriseLlmProviderSchema,
  hasApiKey: z.boolean(),
  apiKeyMask: z.string().optional(),
  baseUrl: z.string().optional(),
});

export type EnterpriseLlmSettings = z.infer<typeof EnterpriseLlmSettingsSchema>;

export const UpdateEnterpriseLlmSettingsSchema = z.object({
  enabled: z.boolean().optional(),
  provider: EnterpriseLlmProviderSchema.optional(),
  apiKey: z.string().min(8).max(500).optional(),
  clearApiKey: z.boolean().optional(),
  baseUrl: z.string().max(500).optional(),
});

export type UpdateEnterpriseLlmSettingsInput = z.infer<typeof UpdateEnterpriseLlmSettingsSchema>;
