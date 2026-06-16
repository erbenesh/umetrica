import {
  BENCHMARK_WARMUP_DAYS,
  PERSONAL_INSIGHTS_REQUIRES_SOURCE,
  UpdateInsightSettingsSchema,
  type Insight,
  type InsightRun,
} from '@sellerpool/core';
import { and, desc, eq, gte } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { sendValidationError } from '../lib/http-errors.js';

import { insightRuns } from '../db/insight-runs.js';
import { insights } from '../db/insights.js';
import { db } from '../db/index.js';
import { user } from '../db/schema.js';
import { recordAuditEvent } from '../lib/audit-log.js';
import {
  canReceiveBenchmarkInsights,
  canReceiveBenchmarkParticipation,
} from '../lib/benchmark-access.js';
import { runInsightGeneration } from '../lib/insight-generation.js';
import { toInsightRow } from '../lib/market-insight-generation.js';
import { getInsightSettings, getPrivacySettings, updateInsightSettings } from '../lib/org-metadata.js';
import { canUsePersonalInsights } from '../lib/policy-gate.js';
import { canWriteDashboards, getAuthContext } from '../lib/request-auth.js';

function toInsightRun(
  row: typeof insightRuns.$inferSelect,
  triggeredByName?: string | null
): InsightRun {
  return {
    id: row.id,
    organizationId: row.organizationId,
    trigger: row.trigger as InsightRun['trigger'],
    triggeredByName: triggeredByName ?? undefined,
    insightCount: row.insightCount,
    creditsUsed: row.creditsUsed,
    result: row.result as InsightRun['result'],
    message: row.message ?? undefined,
    firstInsightId: row.firstInsightId ?? undefined,
    createdAt: row.createdAt.toISOString(),
  };
}

function monthStart() {
  const date = new Date();
  date.setDate(1);
  date.setHours(0, 0, 0, 0);
  return date;
}

export async function registerInsightRoutes(app: FastifyInstance) {
  app.get('/api/insights/history', async (request, reply) => {
    const auth = await getAuthContext(request, reply);
    if (!auth) return;

    const rows = await db
      .select({
        run: insightRuns,
        userName: user.name,
      })
      .from(insightRuns)
      .leftJoin(user, eq(insightRuns.triggeredBy, user.id))
      .where(eq(insightRuns.organizationId, auth.organizationId))
      .orderBy(desc(insightRuns.createdAt))
      .limit(100);

    const monthRows = await db
      .select({
        creditsUsed: insightRuns.creditsUsed,
        insightCount: insightRuns.insightCount,
      })
      .from(insightRuns)
      .where(
        and(
          eq(insightRuns.organizationId, auth.organizationId),
          gte(insightRuns.createdAt, monthStart())
        )
      );

    const monthCredits = monthRows.reduce((sum, row) => sum + row.creditsUsed, 0);
    const monthInsights = monthRows.reduce((sum, row) => sum + row.insightCount, 0);

    return {
      items: rows.map(({ run, userName }) => toInsightRun(run, userName)),
      total: rows.length,
      monthCredits,
      monthInsights,
    };
  });

  app.get('/api/insights/settings', async (request, reply) => {
    const auth = await getAuthContext(request, reply);
    if (!auth) return;

    return getInsightSettings(auth.organizationId);
  });

  app.patch('/api/insights/settings', async (request, reply) => {
    const auth = await getAuthContext(request, reply);
    if (!auth) return;

    if (!canWriteDashboards(auth.role)) {
      return reply.status(403).send({ error: 'Insufficient permissions' });
    }

    const parsed = UpdateInsightSettingsSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendValidationError(reply, parsed.error);
    }

    if (parsed.data.sources?.benchmark === true) {
      const personalAllowed = await canUsePersonalInsights(auth.organizationId);
      if (!personalAllowed) {
        return reply.status(400).send({ error: PERSONAL_INSIGHTS_REQUIRES_SOURCE });
      }

      const privacy = await getPrivacySettings(auth.organizationId);
      if (!privacy.benchmarkOptIn) {
        return reply.status(400).send({
          error:
            'Бенчмарки доступны только при участии в пуле. Включите «Получать и делиться» в настройках конфиденциальности.',
        });
      }
      if (!canReceiveBenchmarkParticipation(privacy)) {
        return reply.status(400).send({
          error: `Бенчмарк-инсайты появятся через ${BENCHMARK_WARMUP_DAYS} дн. после включения участия — идёт период прогрева.`,
        });
      }
    }

    if (parsed.data.sources?.tenant === true) {
      const personalAllowed = await canUsePersonalInsights(auth.organizationId);
      if (!personalAllowed) {
        return reply.status(400).send({ error: PERSONAL_INSIGHTS_REQUIRES_SOURCE });
      }
    }

    const next = await updateInsightSettings(auth.organizationId, parsed.data);

    await recordAuditEvent({
      organizationId: auth.organizationId,
      userId: auth.userId,
      actorName: auth.userName,
      action: 'insights.settings',
      objectLabel: `Расписание: ${next.schedule}`,
      category: 'system',
    });

    return next;
  });

  app.get('/api/insights', async (request, reply) => {
    const auth = await getAuthContext(request, reply);
    if (!auth) return;

    const source = (request.query as { source?: string }).source;

    const receiveBenchmarks = await canReceiveBenchmarkInsights(auth.organizationId);
    const personalAllowed = await canUsePersonalInsights(auth.organizationId);

    const rows = await db
      .select()
      .from(insights)
      .where(eq(insights.organizationId, auth.organizationId))
      .orderBy(desc(insights.createdAt));

    const items = rows
      .map(toInsightRow)
      .filter((item) => !source || item.source === source)
      .filter((item) => item.source !== 'benchmark' || receiveBenchmarks)
      .filter((item) => item.source !== 'tenant' || personalAllowed);

    return {
      items,
      total: items.length,
    };
  });

  app.get('/api/insights/:id', async (request, reply) => {
    const auth = await getAuthContext(request, reply);
    if (!auth) return;

    const { id } = request.params as { id: string };

    const [row] = await db
      .select()
      .from(insights)
      .where(and(eq(insights.id, id), eq(insights.organizationId, auth.organizationId)))
      .limit(1);

    if (!row) {
      return reply.status(404).send({ error: 'Insight not found' });
    }

    const item = toInsightRow(row);

    if (item.source === 'benchmark') {
      const receiveBenchmarks = await canReceiveBenchmarkInsights(auth.organizationId);
      if (!receiveBenchmarks) {
        return reply.status(403).send({
          error: 'Бенчмарк-инсайты недоступны без участия в пуле или до окончания прогрева.',
        });
      }
    }

    if (item.source === 'tenant') {
      const personalAllowed = await canUsePersonalInsights(auth.organizationId);
      if (!personalAllowed) {
        return reply.status(403).send({ error: PERSONAL_INSIGHTS_REQUIRES_SOURCE });
      }
    }

    return item;
  });

  app.post('/api/insights/generate', async (request, reply) => {
    const auth = await getAuthContext(request, reply);
    if (!auth) return;

    const result = await runInsightGeneration({
      organizationId: auth.organizationId,
      userId: auth.userId,
      trigger: 'manual',
    });

    if (!result.ok) {
      return reply.status(result.status).send({
        error: result.error,
        creditsUsed: result.creditsUsed,
        creditsTotal: result.creditsTotal,
        requiredCredits: result.requiredCredits,
      });
    }

    if (!result.generated) {
      return reply.status(200).send({
        generated: false,
        items: [],
        message: result.message,
      });
    }

    return reply.status(201).send({
      generated: true,
      items: result.items,
      count: result.count,
    });
  });

  app.delete('/api/insights/:id', async (request, reply) => {
    const auth = await getAuthContext(request, reply);
    if (!auth) return;

    const { id } = request.params as { id: string };

    const [deleted] = await db
      .delete(insights)
      .where(and(eq(insights.id, id), eq(insights.organizationId, auth.organizationId)))
      .returning({ id: insights.id });

    if (!deleted) {
      return reply.status(404).send({ error: 'Insight not found' });
    }

    return reply.status(204).send();
  });
}
