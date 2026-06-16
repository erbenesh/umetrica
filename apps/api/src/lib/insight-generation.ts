import { randomUUID } from 'node:crypto';

import type { Insight, InsightBrief, InsightEvaluation, InsightRun } from '@umetrica/core';
import {
  buildFallbackEvaluation,
  createLLMProvider,
  detectAnomalies,
  evaluateInsight,
} from '@umetrica/insights';

import { insightRuns } from '../db/insight-runs.js';
import { db } from '../db/index.js';
import { getAvailableCredits } from './billing.js';
import { createCubeToken } from './cube-token.js';
import { generateBenchmarkInsights } from './benchmark-insight-generation.js';
import { shouldGenerateBenchmarkInsights } from './benchmark-access.js';
import { generateMarketInsights, persistTenantInsight } from './market-insight-generation.js';
import { notifyHighSeverityInsights } from './insight-email-alerts.js';
import { getInsightSettings } from './org-metadata.js';
import { seedDemoSemanticForTenant } from './seed-demo-semantic.js';

export type InsightGenerationResult =
  | {
      ok: true;
      generated: boolean;
      items: Insight[];
      count: number;
      creditsUsed: number;
      message?: string;
    }
  | {
      ok: false;
      status: 400 | 402;
      error: string;
      creditsUsed?: number;
      creditsTotal?: number;
      requiredCredits?: number;
    };

async function recordInsightRun(input: {
  organizationId: string;
  userId: string | null;
  trigger: InsightRun['trigger'];
  insightCount: number;
  creditsUsed: number;
  result: InsightRun['result'];
  message?: string;
  firstInsightId?: string;
}) {
  await db.insert(insightRuns).values({
    id: randomUUID(),
    organizationId: input.organizationId,
    trigger: input.trigger,
    triggeredBy: input.userId,
    insightCount: input.insightCount,
    creditsUsed: input.creditsUsed,
    result: input.result,
    message: input.message,
    firstInsightId: input.firstInsightId,
    createdAt: new Date(),
  });
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

async function generateTenantInsights(input: {
  organizationId: string;
  userId: string;
  enabledMetrics: string[];
  creditsAvailable: number;
}): Promise<
  | { ok: true; items: Insight[]; creditsUsed: number; message?: string }
  | { ok: false; status: 400 | 402; error: string; requiredCredits?: number }
> {
  await seedDemoSemanticForTenant(input.organizationId);

  const cubeUrl = process.env.CUBE_URL ?? 'http://localhost:4000';
  const token = await createCubeToken({
    tenantId: input.organizationId,
    userId: input.userId,
  });

  const briefs = await detectAnomalies({
    cubeUrl,
    token,
    enabledMetrics: input.enabledMetrics,
  });

  if (briefs.length === 0) {
    return {
      ok: true,
      items: [],
      creditsUsed: 1,
      message: 'Значимых аномалий за последние 7 дней не обнаружено',
    };
  }

  if (briefs.length > input.creditsAvailable) {
    return {
      ok: false,
      status: 402,
      error: `Нужно ${briefs.length} кредитов, доступно ${input.creditsAvailable}`,
      requiredCredits: briefs.length,
    };
  }

  const items: Insight[] = [];

  for (const brief of briefs) {
    const { evaluation, provider } = await evaluateBrief(brief);
    const item = await persistTenantInsight({
      organizationId: input.organizationId,
      brief,
      evaluation,
      provider,
    });
    items.push(item);
  }

  return { ok: true, items, creditsUsed: items.length };
}

export async function runInsightGeneration(input: {
  organizationId: string;
  userId: string;
  trigger?: InsightRun['trigger'];
}): Promise<InsightGenerationResult> {
  const trigger = input.trigger ?? 'manual';
  const settings = await getInsightSettings(input.organizationId);
  const credits = await getAvailableCredits(input.organizationId);

  const items: Insight[] = [];
  let tenantCreditsUsed = 0;
  let tenantMessage: string | undefined;

  if (settings.sources.market) {
    const marketItems = await generateMarketInsights({
      organizationId: input.organizationId,
    });
    items.push(...marketItems);
  }

  if (settings.sources.benchmark) {
    const canGenerate = await shouldGenerateBenchmarkInsights(input.organizationId);
    if (canGenerate) {
      const benchmarkItems = await generateBenchmarkInsights({
        organizationId: input.organizationId,
      });
      items.push(...benchmarkItems);
    }
  }

  if (settings.sources.tenant) {
    const enabledMetrics = settings.metrics
      .filter((metric) => metric.enabled)
      .map((metric) => metric.key);

    if (enabledMetrics.length === 0) {
      if (items.length === 0) {
        return {
          ok: false,
          status: 400,
          error: 'Включите хотя бы одну метрику в настройках AI-инсайтов',
        };
      }
    } else if (credits.available < 1) {
      if (items.length === 0) {
        return {
          ok: false,
          status: 402,
          error: `Лимит AI-кредитов исчерпан (${credits.creditsUsed} / ${credits.creditsTotal})`,
          creditsUsed: credits.creditsUsed,
          creditsTotal: credits.creditsTotal,
        };
      }
    } else {
      const tenantResult = await generateTenantInsights({
        organizationId: input.organizationId,
        userId: input.userId,
        enabledMetrics,
        creditsAvailable: credits.available,
      });

      if (!tenantResult.ok) {
        if (items.length === 0) {
          return {
            ok: false,
            status: tenantResult.status,
            error: tenantResult.error,
            creditsUsed: credits.creditsUsed,
            creditsTotal: credits.creditsTotal,
            requiredCredits: tenantResult.requiredCredits,
          };
        }
      } else {
        items.push(...tenantResult.items);
        tenantCreditsUsed = tenantResult.creditsUsed;
        tenantMessage = tenantResult.message;
      }
    }
  } else if (items.length === 0) {
    return {
      ok: true,
      generated: false,
      items: [],
      count: 0,
      creditsUsed: 0,
      message: 'Инсайты по кабинету отключены в настройках AI',
    };
  }

  if (items.length === 0) {
    await recordInsightRun({
      organizationId: input.organizationId,
      userId: input.userId,
      trigger,
      insightCount: 0,
      creditsUsed: tenantCreditsUsed,
      result: 'no_anomalies',
      message: tenantMessage ?? 'Новых инсайтов не обнаружено',
    });

    return {
      ok: true,
      generated: false,
      items: [],
      count: 0,
      creditsUsed: tenantCreditsUsed,
      message: tenantMessage ?? 'Новых инсайтов не обнаружено',
    };
  }

  await recordInsightRun({
    organizationId: input.organizationId,
    userId: input.userId,
    trigger,
    insightCount: items.length,
    creditsUsed: tenantCreditsUsed,
    result: 'insights',
    firstInsightId: items[0]?.id,
  });

  const tenantItems = items.filter((item) => item.source === 'tenant');
  if (tenantItems.length > 0) {
    void notifyHighSeverityInsights({
      organizationId: input.organizationId,
      items: tenantItems,
      emailAlerts: settings.emailAlerts,
    }).catch((error) => {
      const message = error instanceof Error ? error.message : 'alert delivery failed';
      console.warn(`[insight-alerts] ${input.organizationId}: ${message}`);
    });
  }

  return {
    ok: true,
    generated: true,
    items,
    count: items.length,
    creditsUsed: tenantCreditsUsed,
  };
}
