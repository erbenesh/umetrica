import { AuditFilterSchema } from '@sellerpool/core';
import type { FastifyInstance } from 'fastify';

import {
  auditEventsToCsv,
  ensureAuditDemoEvents,
  listAuditEvents,
} from '../lib/audit-log.js';
import { isEnterprisePlan } from '../lib/enterprise-access.js';
import { getOrgPlanId } from '../lib/org-metadata.js';
import { canWriteDashboards, getAuthContext } from '../lib/request-auth.js';

export async function registerAuditRoutes(app: FastifyInstance) {
  app.get('/api/audit', async (request, reply) => {
    const auth = await getAuthContext(request, reply);
    if (!auth) return;

    const planId = await getOrgPlanId(auth.organizationId);
    if (!isEnterprisePlan(planId)) {
      return reply.status(403).send({ error: 'Audit log доступен на тарифе Enterprise' });
    }

    const filterParsed = AuditFilterSchema.safeParse(
      (request.query as { filter?: string }).filter ?? 'all'
    );
    const filter = filterParsed.success ? filterParsed.data : 'all';

    if (process.env.NODE_ENV !== 'production') {
      await ensureAuditDemoEvents(auth.organizationId, auth.userName);
    }

    const items = await listAuditEvents(auth.organizationId, filter);
    return { items, total: items.length };
  });

  app.get('/api/audit/export', async (request, reply) => {
    const auth = await getAuthContext(request, reply);
    if (!auth) return;

    if (!canWriteDashboards(auth.role)) {
      return reply.status(403).send({ error: 'Insufficient permissions' });
    }

    const planId = await getOrgPlanId(auth.organizationId);
    if (!isEnterprisePlan(planId)) {
      return reply.status(403).send({ error: 'Audit log доступен на тарифе Enterprise' });
    }

    const items = await listAuditEvents(auth.organizationId, 'all', 500);
    const csv = auditEventsToCsv(items);

    reply.header('Content-Type', 'text/csv; charset=utf-8');
    reply.header('Content-Disposition', 'attachment; filename="audit-log.csv"');
    return reply.send(csv);
  });
}
