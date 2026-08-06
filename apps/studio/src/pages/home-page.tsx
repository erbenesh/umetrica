import { LineChart } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

import { CubeApiProvider } from '@/components/cube/cube-provider';
import { MetricKpi, StatStrip } from '@/components/cube/metric-kpi';
import { RevenueByStatusChart } from '@/components/cube/revenue-chart';
import { DocBlock } from '@/components/doc/doc-block';
import { DocCallout } from '@/components/doc/doc-callout';
import { DocPage } from '@/components/doc/doc-page';
import { Button } from '@/components/ui/button';
import { useConnections } from '@/hooks/use-connections';
import { useCanWriteDashboards, useMe } from '@/hooks/use-me';
import { useSession } from '@/lib/auth-client';
import { connectionHomeLead } from '@/lib/connection-format';
import { buildHomeDocProps } from '@/lib/workspace-status';

const LAST_30_DAYS_QUERY = {
  measures: ['Orders.revenue', 'Orders.count'],
  timeDimensions: [
    {
      dimension: 'Orders.createdAt',
      dateRange: 'last 30 days',
    },
  ],
};

export function HomePage() {
  const location = useLocation();
  const [importFlash, setImportFlash] = useState<string | null>(null);
  const { data: session } = useSession();
  const { data: me } = useMe();
  const canManage = useCanWriteDashboards();
  const { data: connections } = useConnections();
  const userName = session?.user?.name;
  const orgName = me?.organization?.name;
  const lead = connectionHomeLead(connections?.items ?? []);
  const isDemo = me?.dataMode !== 'live';

  const docProps = useMemo(
    () =>
      buildHomeDocProps({
        orgName: orgName ?? undefined,
        dataMode: me?.dataMode,
      }),
    [orgName, me?.dataMode]
  );

  useEffect(() => {
    const flash = (location.state as { importFlash?: string } | null)?.importFlash;
    if (flash) {
      setImportFlash(flash);
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const title = `Привет${userName ? `, ${userName}` : ''}`;

  return (
    <CubeApiProvider>
      <DocPage
        title={title}
        lead={lead}
        icon={LineChart}
        mobileTitle="Главная"
        mobileSubtitle={orgName}
        props={docProps}
      >
        {isDemo && canManage ? (
          <DocCallout variant="info">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="m-0 text-sm">
                Сейчас показаны демо-продажи. Подключите кабинет — увидите свои цифры.
              </p>
              <Link to="/onboarding/connect">
                <Button size="sm" type="button">
                  Подключить данные
                </Button>
              </Link>
            </div>
          </DocCallout>
        ) : null}
        {importFlash ? <DocCallout variant="info">{importFlash}</DocCallout> : null}

        <DocBlock title="Сводка за 30 дней">
          <StatStrip>
            <MetricKpi
              query={LAST_30_DAYS_QUERY}
              title="Выручка"
              measureKey="Orders.revenue"
              format="currency"
            />
            <MetricKpi
              query={LAST_30_DAYS_QUERY}
              title="Заказы"
              measureKey="Orders.count"
              format="number"
            />
          </StatStrip>
        </DocBlock>

        <DocBlock title="Выручка по статусам">
          <RevenueByStatusChart />
        </DocBlock>
      </DocPage>
    </CubeApiProvider>
  );
}
