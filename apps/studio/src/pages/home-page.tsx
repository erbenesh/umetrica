import { LineChart } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

import { CubeApiProvider } from '@/components/cube/cube-provider';
import { MetricKpi, StatStrip } from '@/components/cube/metric-kpi';
import { RevenueByStatusChart } from '@/components/cube/revenue-chart';
import { DocBlock } from '@/components/doc/doc-block';
import { DocCallout } from '@/components/doc/doc-callout';
import { DocPage } from '@/components/doc/doc-page';
import { WorkspaceStatusCard } from '@/components/workspace/workspace-status-card';
import { Button } from '@/components/ui/button';
import { useBilling } from '@/hooks/use-billing';
import { useConnections } from '@/hooks/use-connections';
import { useCanWriteDashboards, useMe } from '@/hooks/use-me';
import { usePrivacySettings } from '@/hooks/use-privacy';
import { useSession } from '@/lib/auth-client';
import { connectionHomeLead } from '@/lib/connection-format';
import { buildHomeDocProps, buildWorkspaceStatusItems } from '@/lib/workspace-status';

const LAST_30_DAYS_QUERY = {
  measures: ['Orders.revenue', 'Orders.count'],
  timeDimensions: [
    {
      dimension: 'Orders.createdAt',
      dateRange: 'last 30 days',
    },
  ],
};

const PREVIOUS_30_DAYS_QUERY = {
  measures: ['Orders.revenue'],
  timeDimensions: [
    {
      dimension: 'Orders.createdAt',
      dateRange: 'last 60 days',
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
  const { data: privacy } = usePrivacySettings();
  const { data: billing } = useBilling();
  const userName = session?.user?.name;
  const orgName = me?.organization?.name;
  const lead = connectionHomeLead(connections?.items ?? []);
  const isDemo = me?.dataMode !== 'live';

  const statusItems = useMemo(
    () =>
      buildWorkspaceStatusItems({
        dataMode: me?.dataMode,
        connections,
        privacy,
        billing: billing ?? null,
        capabilities: me?.trustCapabilities,
        canManage,
      }),
    [me?.dataMode, me?.trustCapabilities, connections, privacy, billing, canManage]
  );

  const docProps = useMemo(
    () =>
      buildHomeDocProps({
        orgName: orgName ?? undefined,
        dataMode: me?.dataMode,
        billing: billing ?? null,
        canManage,
      }),
    [orgName, me?.dataMode, billing, canManage]
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
        <DocBlock title="Статус workspace">
          <WorkspaceStatusCard items={statusItems} />
        </DocBlock>

        {isDemo && canManage ? (
          <DocCallout variant="info">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="m-0">
                Сейчас демо-данные. Подключите файл, API или БД — появятся свои продажи и инсайты по
                кабинету.
              </p>
              <Link to="/onboarding/connect">
                <Button size="sm" type="button">
                  Подключить данные
                </Button>
              </Link>
            </div>
          </DocCallout>
        ) : null}
        {isDemo && !canManage ? (
          <DocCallout variant="info">
            Сейчас демо-данные. Подключение источников доступно владельцу и администратору компании.
          </DocCallout>
        ) : null}
        {importFlash ? <DocCallout>{importFlash}</DocCallout> : null}

        <DocBlock title="Сводка" hint="· KPI">
          <StatStrip>
            <MetricKpi
              query={LAST_30_DAYS_QUERY}
              title="Выручка (30д)"
              measureKey="Orders.revenue"
              format="currency"
            />
            <MetricKpi
              query={LAST_30_DAYS_QUERY}
              title="Заказы (30д)"
              measureKey="Orders.count"
              format="number"
            />
            <MetricKpi
              query={PREVIOUS_30_DAYS_QUERY}
              title="Выручка (60д)"
              description="Расширенное окно сравнения"
              measureKey="Orders.revenue"
              format="currency"
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
