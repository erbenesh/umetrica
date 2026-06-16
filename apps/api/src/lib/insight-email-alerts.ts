import type { Insight } from '@sellerpool/core';
import { BRAND_NAME } from '@sellerpool/core';
import { eq } from 'drizzle-orm';

import { db } from '../db/index.js';
import { member, organization, user } from '../db/schema.js';
import { sendEmail, studioUrl } from './email.js';

const METRIC_LABELS: Record<string, string> = {
  'Orders.revenue': 'Выручка',
  'Orders.count': 'Количество заказов',
  'Orders.avgOrder': 'Средний чек',
};

const ALERT_ROLES = ['owner', 'admin', 'member'] as const;

function metricLabel(metric: string) {
  return METRIC_LABELS[metric] ?? metric;
}

function formatChangePct(changePct: number, direction: 'up' | 'down') {
  const sign = direction === 'up' ? '+' : '−';
  return `${sign}${Math.abs(changePct).toFixed(1)}%`;
}

function buildInsightLine(item: Insight) {
  const { anomaly } = item.brief;
  const change = formatChangePct(anomaly.changePct, anomaly.direction);
  const label = metricLabel(anomaly.metric);
  const link = studioUrl(`/insights/${item.id}`);
  return `• ${label}: ${change} (${anomaly.period}) — ${item.evaluation.summary}\n  ${link}`;
}

function buildAlertEmail(input: {
  organizationName: string;
  insights: Insight[];
}) {
  const lines = input.insights.map(buildInsightLine).join('\n\n');
  const count = input.insights.length;
  const subject =
    count === 1
      ? `${BRAND_NAME}: высокая значимость — ${input.organizationName}`
      : `${BRAND_NAME}: ${count} инсайта с высокой значимостью — ${input.organizationName}`;

  const text = [
    `В кабинете «${input.organizationName}» обнаружены аномалии с высокой значимостью:`,
    '',
    lines,
    '',
    `Все инсайты: ${studioUrl('/insights')}`,
    '',
    'Вы получили это письмо, потому что включены email-уведомления в настройках AI-инсайтов.',
    'Отключить: Настройки → AI-инсайты → Email при высокой значимости.',
  ].join('\n');

  return { subject, text };
}

async function getAlertRecipients(organizationId: string) {
  const rows = await db
    .select({
      email: user.email,
      emailVerified: user.emailVerified,
      role: member.role,
    })
    .from(member)
    .innerJoin(user, eq(member.userId, user.id))
    .where(eq(member.organizationId, organizationId));

  const emails = new Set<string>();

  for (const row of rows) {
    if (!row.emailVerified) continue;
    if (!ALERT_ROLES.includes(row.role as (typeof ALERT_ROLES)[number])) continue;
    emails.add(row.email);
  }

  return [...emails];
}

export async function notifyHighSeverityInsights(input: {
  organizationId: string;
  items: Insight[];
  emailAlerts: boolean;
}) {
  if (!input.emailAlerts || input.items.length === 0) return;

  const highSeverity = input.items.filter((item) => item.brief.anomaly.severity === 'high');
  if (highSeverity.length === 0) return;

  const [org] = await db
    .select({ name: organization.name })
    .from(organization)
    .where(eq(organization.id, input.organizationId))
    .limit(1);

  const recipients = await getAlertRecipients(input.organizationId);
  if (recipients.length === 0) {
    console.warn(
      `[insight-alerts] ${input.organizationId}: no verified recipients for high-severity alerts`
    );
    return;
  }

  const { subject, text } = buildAlertEmail({
    organizationName: org?.name ?? 'Кабинет',
    insights: highSeverity,
  });

  await Promise.all(
    recipients.map((to) =>
      sendEmail({ to, subject, text }).catch((error) => {
        const message = error instanceof Error ? error.message : 'send failed';
        console.warn(`[insight-alerts] failed to send to ${to}: ${message}`);
      })
    )
  );

  console.info(
    `[insight-alerts] ${input.organizationId}: sent high-severity alert to ${recipients.length} recipient(s), ${highSeverity.length} insight(s)`
  );
}
