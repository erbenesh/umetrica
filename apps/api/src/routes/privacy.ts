import { UpdatePrivacySettingsSchema } from '@sellerpool/core';
import type { FastifyInstance } from 'fastify';
import { sendValidationError } from '../lib/http-errors.js';

import { getBenchmarkOptInBlockReason, getOrgPolicyContext } from '../lib/policy-gate.js';
import { queueBenchmarkContributionCollect } from '../lib/benchmark-pool.js';
import {
  getInsightSettings,
  getPrivacySettings,
  updateInsightSettings,
  updatePrivacySettings,
} from '../lib/org-metadata.js';
import { canWriteDashboards, getAuthContext } from '../lib/request-auth.js';

async function toPrivacyView(organizationId: string) {
  const { privacy, trustPolicy } = await getOrgPolicyContext(organizationId);
  return { ...privacy, trustPolicy };
}

export async function registerPrivacyRoutes(app: FastifyInstance) {
  app.get('/api/privacy', async (request, reply) => {
    const auth = await getAuthContext(request, reply);
    if (!auth) return;

    return toPrivacyView(auth.organizationId);
  });

  app.patch('/api/privacy', async (request, reply) => {
    const auth = await getAuthContext(request, reply);
    if (!auth) return;

    if (!canWriteDashboards(auth.role)) {
      return reply.status(403).send({ error: 'Insufficient permissions' });
    }

    const parsed = UpdatePrivacySettingsSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendValidationError(reply, parsed.error);
    }

    if (parsed.data.benchmarkOptIn === true) {
      const policy = await getOrgPolicyContext(auth.organizationId);
      const blockReason = getBenchmarkOptInBlockReason(policy.connections);
      if (blockReason) {
        return reply.status(400).send({ error: blockReason });
      }
    }

    const previous = await getPrivacySettings(auth.organizationId);
    await updatePrivacySettings(auth.organizationId, parsed.data);

    if (parsed.data.benchmarkOptIn === true) {
      queueBenchmarkContributionCollect(auth.organizationId);
    }

    if (parsed.data.benchmarkOptIn !== undefined) {
      const insightSettings = await getInsightSettings(auth.organizationId);
      await updateInsightSettings(auth.organizationId, {
        sources: {
          ...insightSettings.sources,
          benchmark: parsed.data.benchmarkOptIn,
        },
      });
    }

    const view = await toPrivacyView(auth.organizationId);

    if (
      parsed.data.benchmarkOptIn === true &&
      !previous.benchmarkOptIn &&
      !view.benchmarkReceiving
    ) {
      return {
        ...view,
        notice:
          'Участие включено. Бенчмарк-инсайты появятся после короткого периода прогрева — ваши агрегаты уже идут в пул.',
      };
    }

    if (parsed.data.benchmarkOptIn === false && previous.benchmarkOptIn) {
      return {
        ...view,
        notice:
          'Просмотр бенчмарков отключён. Обезличенные агрегаты останутся в пуле ещё 14 дней — так пул остаётся честным для всех.',
      };
    }

    return view;
  });
}
