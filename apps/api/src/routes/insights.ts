import { randomUUID } from 'node:crypto';

import {
  InsightBriefSchema,
  InsightEvaluationSchema,
  type Insight,
  type InsightBrief,
  type InsightEvaluation,
} from '@umetrica/core';
import {
  buildFallbackEvaluation,
  detectAnomalies,
  createLLMProvider,
  evaluateInsight,
} from '@umetrica/insights';
import { and, desc, eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';

import { insights } from '../db/insights.js';
import { db } from '../db/index.js';
import { createCubeToken } from '../lib/cube-token.js';
import { getAuthContext } from '../lib/request-auth.js';
import { seedDemoOrdersForTenant } from '../lib/seed-demo-orders.js';

function toInsight(row: typeof insights.$inferSelect): Insight {
  return {
    id: row.id,
    organizationId: row.organizationId,
    brief: InsightBriefSchema.parse(row.brief),
    evaluation: InsightEvaluationSchema.parse(row.evaluation),
    provider: row.provider ?? undefined,
    createdAt: row.createdAt.toISOString(),
  };
}

async function evaluateBrief(brief: InsightBrief): Promise<{
  evaluation: InsightEvaluation;
  provider: string;
}> {
  const hasDeepseek = Boolean(process.env.DEEPSEEK_API_KEY);
  const hasQwen = Boolean(process.env.QWEN_API_KEY);

  if (!hasDeepseek && !hasQwen) {
    return {
      evaluation: buildFallbackEvaluation(brief),
      provider: 'rule-based',
    };
  }

  const preferredProvider = hasDeepseek ? 'deepseek' : 'qwen';

  try {
    const llm = createLLMProvider(preferredProvider, {
      deepseekApiKey: process.env.DEEPSEEK_API_KEY,
      deepseekBaseUrl: process.env.DEEPSEEK_BASE_URL,
      qwenApiKey: process.env.QWEN_API_KEY,
      qwenBaseUrl: process.env.QWEN_BASE_URL,
    });

    const evaluation = await evaluateInsight(llm, brief);
    return { evaluation, provider: llm.name };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'LLM evaluation failed';
    console.warn(`[insights] LLM failed, using fallback: ${message}`);

    return {
      evaluation: buildFallbackEvaluation(brief),
      provider: 'rule-based-fallback',
    };
  }
}

export async function registerInsightRoutes(app: FastifyInstance) {
  app.get('/api/insights', async (request, reply) => {
    const auth = await getAuthContext(request, reply);
    if (!auth) return;

    const rows = await db
      .select()
      .from(insights)
      .where(eq(insights.organizationId, auth.organizationId))
      .orderBy(desc(insights.createdAt));

    return {
      items: rows.map(toInsight),
      total: rows.length,
    };
  });

  app.post('/api/insights/generate', async (request, reply) => {
    const auth = await getAuthContext(request, reply);
    if (!auth) return;

    await seedDemoOrdersForTenant(auth.organizationId);

    const cubeUrl = process.env.CUBE_URL ?? 'http://localhost:4000';
    const token = await createCubeToken({
      tenantId: auth.organizationId,
      userId: auth.userId,
    });

    const briefs = await detectAnomalies({ cubeUrl, token });
    if (briefs.length === 0) {
      return reply.status(200).send({
        generated: false,
        items: [],
        message: 'Значимых аномалий за последние 7 дней не обнаружено',
      });
    }

    const now = new Date();
    const items: Insight[] = [];

    for (const brief of briefs) {
      const { evaluation, provider } = await evaluateBrief(brief);
      const id = randomUUID();

      const [row] = await db
        .insert(insights)
        .values({
          id,
          organizationId: auth.organizationId,
          brief,
          evaluation,
          provider,
          createdAt: now,
        })
        .returning();

      items.push(toInsight(row!));
    }

    return reply.status(201).send({
      generated: true,
      items,
      count: items.length,
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
