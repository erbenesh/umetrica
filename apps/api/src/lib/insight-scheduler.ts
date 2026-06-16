import type { InsightSchedule } from '@umetrica/core';
import { and, eq } from 'drizzle-orm';

import { db } from '../db/index.js';
import { member, organization } from '../db/schema.js';
import { runInsightGeneration } from './insight-generation.js';
import {
  getInsightSettings,
  getLastInsightScheduleAt,
  setLastInsightScheduleAt,
} from './org-metadata.js';

const TICK_MS = 60_000;
const MOSCOW_OFFSET_MINUTES = 180;

const running = new Set<string>();

function toMoscowDate(date: Date) {
  return new Date(date.getTime() + (MOSCOW_OFFSET_MINUTES + date.getTimezoneOffset()) * 60_000);
}

function isDailyRunDue(lastRunAt: Date | null, now: Date) {
  const moscowNow = toMoscowDate(now);
  if (moscowNow.getHours() !== 9) return false;
  if (!lastRunAt) return true;

  const moscowLast = toMoscowDate(lastRunAt);
  return moscowLast.toDateString() !== moscowNow.toDateString();
}

function is12hRunDue(lastRunAt: Date | null, now: Date) {
  if (!lastRunAt) return true;
  return now.getTime() - lastRunAt.getTime() >= 12 * 60 * 60 * 1000;
}

function isScheduleDue(schedule: InsightSchedule, lastRunAt: Date | null, now: Date) {
  if (schedule === 'manual') return false;
  if (schedule === 'daily') return isDailyRunDue(lastRunAt, now);
  return is12hRunDue(lastRunAt, now);
}

async function resolveScheduleActorUserId(organizationId: string) {
  const roles = ['owner', 'admin', 'member'] as const;

  for (const role of roles) {
    const [row] = await db
      .select({ userId: member.userId })
      .from(member)
      .where(and(eq(member.organizationId, organizationId), eq(member.role, role)))
      .limit(1);

    if (row?.userId) return row.userId;
  }

  return null;
}

async function runScheduledInsightCheck() {
  const now = new Date();
  const orgRows = await db.select({ id: organization.id }).from(organization);

  for (const org of orgRows) {
    if (running.has(org.id)) continue;

    const settings = await getInsightSettings(org.id);
    if (settings.schedule === 'manual') continue;

    const lastRunAt = await getLastInsightScheduleAt(org.id);
    if (!isScheduleDue(settings.schedule, lastRunAt, now)) continue;

    const userId = await resolveScheduleActorUserId(org.id);
    if (!userId) continue;

    running.add(org.id);

    try {
      const result = await runInsightGeneration({
        organizationId: org.id,
        userId,
        trigger: 'scheduled',
      });

      if (result.ok) {
        console.info(
          `[insight-scheduler] ${org.id}: ${result.generated ? `${result.count} insights` : (result.message ?? 'no anomalies')}`
        );
        await setLastInsightScheduleAt(org.id, now);
      } else {
        console.warn(`[insight-scheduler] ${org.id}: ${result.error}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'scheduled run failed';
      console.warn(`[insight-scheduler] ${org.id}: ${message}`);
    } finally {
      running.delete(org.id);
    }
  }
}

export function startInsightScheduler() {
  if (process.env.INSIGHT_SCHEDULER_ENABLED === 'false') {
    console.info('[insight-scheduler] disabled via INSIGHT_SCHEDULER_ENABLED=false');
    return;
  }

  console.info('[insight-scheduler] started (tick every 60s, MSK daily at 09:00)');

  void runScheduledInsightCheck();
  setInterval(() => {
    void runScheduledInsightCheck();
  }, TICK_MS);
}
