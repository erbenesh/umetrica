import { UpdateSsoSettingsSchema } from '@umetrica/core';
import type { FastifyInstance } from 'fastify';

import { isEnterprisePlan } from '../lib/enterprise-access.js';
import { recordAuditEvent } from '../lib/audit-log.js';
import { getOrgPlanId, getSsoSettings, updateSsoSettings } from '../lib/org-metadata.js';
import { canWriteDashboards, getAuthContext } from '../lib/request-auth.js';

export async function registerSsoRoutes(app: FastifyInstance) {
  app.get('/api/sso', async (request, reply) => {
    const auth = await getAuthContext(request, reply);
    if (!auth) return;

    const planId = await getOrgPlanId(auth.organizationId);
    if (!isEnterprisePlan(planId)) {
      return reply.status(403).send({ error: 'SSO доступен на тарифе Enterprise' });
    }

    return getSsoSettings(auth.organizationId);
  });

  app.patch('/api/sso', async (request, reply) => {
    const auth = await getAuthContext(request, reply);
    if (!auth) return;

    if (!canWriteDashboards(auth.role)) {
      return reply.status(403).send({ error: 'Insufficient permissions' });
    }

    const planId = await getOrgPlanId(auth.organizationId);
    if (!isEnterprisePlan(planId)) {
      return reply.status(403).send({ error: 'SSO доступен на тарифе Enterprise' });
    }

    const parsed = UpdateSsoSettingsSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() });
    }

    const next = await updateSsoSettings(auth.organizationId, parsed.data);

    await recordAuditEvent({
      organizationId: auth.organizationId,
      userId: auth.userId,
      actorName: auth.userName ?? 'User',
      action: 'sso.update',
      objectLabel: next.enabled ? 'SSO включён' : 'SSO выключен',
      category: 'team',
    });

    return next;
  });
}
