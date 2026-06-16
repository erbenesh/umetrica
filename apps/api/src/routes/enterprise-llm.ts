import { UpdateEnterpriseLlmSettingsSchema } from '@umetrica/core';

import type { FastifyInstance } from 'fastify';



import { recordAuditEvent } from '../lib/audit-log.js';

import { isEnterprisePlan } from '../lib/enterprise-access.js';

import {

  getEnterpriseLlmSettings,

  getOrgPlanId,

  updateEnterpriseLlmSettings,

} from '../lib/org-metadata.js';

import { canWriteDashboards, getAuthContext } from '../lib/request-auth.js';



export async function registerEnterpriseLlmRoutes(app: FastifyInstance) {

  app.get('/api/enterprise/llm', async (request, reply) => {

    const auth = await getAuthContext(request, reply);

    if (!auth) return;



    const planId = await getOrgPlanId(auth.organizationId);

    if (!isEnterprisePlan(planId)) {

      return reply.status(403).send({ error: 'BYOK LLM доступен на тарифе Enterprise' });

    }



    return getEnterpriseLlmSettings(auth.organizationId);

  });



  app.patch('/api/enterprise/llm', async (request, reply) => {

    const auth = await getAuthContext(request, reply);

    if (!auth) return;



    if (!canWriteDashboards(auth.role)) {

      return reply.status(403).send({ error: 'Insufficient permissions' });

    }



    const planId = await getOrgPlanId(auth.organizationId);

    if (!isEnterprisePlan(planId)) {

      return reply.status(403).send({ error: 'BYOK LLM доступен на тарифе Enterprise' });

    }



    const parsed = UpdateEnterpriseLlmSettingsSchema.safeParse(request.body);

    if (!parsed.success) {

      return reply.status(400).send({ error: parsed.error.flatten() });

    }



    const next = await updateEnterpriseLlmSettings(auth.organizationId, parsed.data);



    await recordAuditEvent({

      organizationId: auth.organizationId,

      userId: auth.userId,

      actorName: auth.userName ?? 'User',

      action: 'llm.update',

      objectLabel: next.enabled ? `BYOK · ${next.provider}` : 'BYOK выключен',

      category: 'system',

    });



    return next;

  });

}


