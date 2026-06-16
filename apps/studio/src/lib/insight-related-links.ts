import type { Dashboard, Insight } from '@sellerpool/core';

export interface InsightRelatedLink {
  label: string;
  to: string;
}

export function buildInsightRelatedLinks(
  insight: Insight,
  dashboards: Dashboard[] | undefined
): InsightRelatedLink[] {
  const metric = insight.brief.anomaly.metric;
  const metricTail = metric.split('.').pop() ?? metric;
  const links: InsightRelatedLink[] = [];
  const seen = new Set<string>();

  for (const dashboard of dashboards ?? []) {
    for (const widget of dashboard.widgets) {
      const matches = widget.measures.some(
        (measure) => measure === metric || measure.endsWith(`.${metricTail}`)
      );
      if (!matches) continue;

      const key = `${dashboard.id}:${widget.id}`;
      if (seen.has(key)) continue;
      seen.add(key);

      links.push({
        label: `${widget.title} · ${dashboard.name}`,
        to: `/dashboards/${dashboard.id}`,
      });
    }
  }

  links.push({ label: 'KPI на главной', to: '/' });
  return links.slice(0, 6);
}

export function pickPrimaryDashboardLink(links: InsightRelatedLink[]) {
  return links.find((link) => link.to.startsWith('/dashboards/'))?.to ?? '/dashboards';
}
