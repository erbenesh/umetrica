import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { DocPage } from '@/components/doc/doc-page';
import { TenantInsightDetailView } from '@/components/insights/tenant-insight-detail';
import { Card, CardContent } from '@/components/ui/card';
import { useDashboards } from '@/hooks/use-dashboards';
import { useDeleteInsight } from '@/hooks/use-insights';
import { useMe } from '@/hooks/use-me';
import { fetchInsight, insightQueryKey } from '@/lib/insights-api';
import {
  buildInsightRelatedLinks,
  pickPrimaryDashboardLink,
} from '@/lib/insight-related-links';

export function InsightDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: me } = useMe();
  const { data: dashboards } = useDashboards();
  const deleteInsight = useDeleteInsight();

  const { data: insight, isLoading, error } = useQuery({
    queryKey: insightQueryKey(id ?? ''),
    queryFn: () => fetchInsight(id!),
    enabled: Boolean(id),
  });

  const relatedLinks = useMemo(
    () => (insight ? buildInsightRelatedLinks(insight, dashboards?.items) : []),
    [insight, dashboards?.items]
  );

  const dashboardHref = useMemo(() => pickPrimaryDashboardLink(relatedLinks), [relatedLinks]);

  const handleArchive = async () => {
    if (!id || !confirm('Убрать инсайт в архив?')) return;

    try {
      await deleteInsight.mutateAsync(id);
      navigate('/insights', { replace: true });
    } catch {
      // mutation error surfaced via isError if needed
    }
  };

  if (!id) {
    return null;
  }

  if (isLoading) {
    return (
      <DocPage title="Инсайт" back="auto" mobileTitle="Инсайт" headless>
        <Card className="border-border">
          <CardContent className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Загрузка...
          </CardContent>
        </Card>
      </DocPage>
    );
  }

  if (error || !insight) {
    return (
      <DocPage title="Инсайт" back="auto" mobileTitle="Инсайт" headless>
        <Card className="border-border">
          <CardContent className="p-4 text-sm text-destructive">
            {error instanceof Error ? error.message : 'Инсайт не найден'}
          </CardContent>
        </Card>
      </DocPage>
    );
  }

  return (
    <DocPage title="Инсайт" back="auto" mobileTitle="Инсайт" headless>
      <TenantInsightDetailView
        insight={insight}
        orgName={me?.organization?.name}
        relatedLinks={relatedLinks}
        dashboardHref={dashboardHref}
        onArchive={() => void handleArchive()}
        isArchiving={deleteInsight.isPending}
      />
    </DocPage>
  );
}
