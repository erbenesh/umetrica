import { UpdatePrivacySettingsSchema, buildBenchmarkParticipationView } from '@umetrica/core';
import type { FastifyInstance } from 'fastify';

import { resolveBenchmarkParticipants } from '../lib/market-aggregates.js';
import {
  getInsightSettings,
  getPrivacySettings,
  updateInsightSettings,
  updatePrivacySettings,
} from '../lib/org-metadata.js';
import { canWriteDashboards, getAuthContext } from '../lib/request-auth.js';

async function toPrivacyView(organizationId: string) {
  const settings = await getPrivacySettings(organizationId);
  const benchmarkPoolParticipants = await resolveBenchmarkParticipants(settings.marketCategory);

  return buildBenchmarkParticipationView(settings, benchmarkPoolParticipants);
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
      return reply.status(400).send({ error: parsed.error.flatten() });
    }

    const previous = await getPrivacySettings(auth.organizationId);
    await updatePrivacySettings(auth.organizationId, parsed.data);

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
