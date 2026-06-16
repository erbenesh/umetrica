import { randomUUID } from 'node:crypto';

import type { AuditEvent, AuditEventCategory, AuditFilter } from '@sellerpool/core';
import { and, desc, eq, inArray } from 'drizzle-orm';

import { auditEvents } from '../db/audit-events.js';
import { db } from '../db/index.js';

function formatAuditDate(value: Date) {
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(value);
}

function filterCategories(filter: AuditFilter): AuditEventCategory[] | null {
  if (filter === 'team') return ['team', 'billing'];
  if (filter === 'semantics') return ['semantics'];
  return null;
}

export async function recordAuditEvent(input: {
  organizationId: string;
  userId?: string;
  actorName: string;
  action: string;
  objectLabel: string;
  category: AuditEventCategory;
}) {
  const id = randomUUID();
  const now = new Date();

  await db.insert(auditEvents).values({
    id,
    organizationId: input.organizationId,
    userId: input.userId,
    actorName: input.actorName,
    action: input.action,
    objectLabel: input.objectLabel,
    category: input.category,
    createdAt: now,
  });

  return id;
}

export async function listAuditEvents(
  organizationId: string,
  filter: AuditFilter = 'all',
  limit = 100
): Promise<AuditEvent[]> {
  const categories = filterCategories(filter);

  const rows = await db
    .select()
    .from(auditEvents)
    .where(
      categories
        ? and(eq(auditEvents.organizationId, organizationId), inArray(auditEvents.category, categories))
        : eq(auditEvents.organizationId, organizationId)
    )
    .orderBy(desc(auditEvents.createdAt))
    .limit(limit);

  return rows.map((row) => ({
    id: row.id,
    date: formatAuditDate(row.createdAt),
    actorName: row.actorName,
    action: row.action,
    objectLabel: row.objectLabel,
    category: row.category as AuditEventCategory,
  }));
}

export async function ensureAuditDemoEvents(organizationId: string, actorName = 'Егор') {
  const [existing] = await db
    .select({ id: auditEvents.id })
    .from(auditEvents)
    .where(eq(auditEvents.organizationId, organizationId))
    .limit(1);

  if (existing) return { seeded: false };

  const now = Date.now();
  const samples = [
    {
      actorName,
      action: 'semantic.publish',
      objectLabel: 'Orders',
      category: 'semantics' as const,
      offsetMs: 0,
    },
    {
      actorName: 'Анна',
      action: 'dashboard.update',
      objectLabel: 'Операционный обзор',
      category: 'semantics' as const,
      offsetMs: 24 * 60 * 60 * 1000,
    },
    {
      actorName,
      action: 'member.invite',
      objectLabel: 'new@partner.ru',
      category: 'team' as const,
      offsetMs: 2 * 24 * 60 * 60 * 1000,
    },
    {
      actorName: 'System',
      action: 'billing.charge',
      objectLabel: 'Pro · месяц',
      category: 'billing' as const,
      offsetMs: 3 * 24 * 60 * 60 * 1000,
    },
  ];

  for (const sample of samples) {
    await db.insert(auditEvents).values({
      id: randomUUID(),
      organizationId,
      actorName: sample.actorName,
      action: sample.action,
      objectLabel: sample.objectLabel,
      category: sample.category,
      createdAt: new Date(now - sample.offsetMs),
    });
  }

  return { seeded: true, count: samples.length };
}

export function auditEventsToCsv(events: AuditEvent[]) {
  const header = 'date,actor,action,object';
  const lines = events.map(
    (event) =>
      `"${event.date.replace(/"/g, '""')}","${event.actorName.replace(/"/g, '""')}","${event.action}","${event.objectLabel.replace(/"/g, '""')}"`
  );
  return [header, ...lines].join('\n');
}
