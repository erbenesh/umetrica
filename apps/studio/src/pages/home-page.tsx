import { LineChart, Settings } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

import { CubeApiProvider } from '@/components/cube/cube-provider';
import { MetricKpi, StatStrip } from '@/components/cube/metric-kpi';
import { RevenueByStatusChart } from '@/components/cube/revenue-chart';
import { DocBlock } from '@/components/doc/doc-block';
import { DocCallout } from '@/components/doc/doc-callout';
import { DocPage } from '@/components/doc/doc-page';
import { Button } from '@/components/ui/button';
import { useSession } from '@/lib/auth-client';
import { useMe } from '@/hooks/use-me';
import { useConnections } from '@/hooks/use-connections';
import { connectionHomeLead } from '@/lib/connection-format';

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
  const { data: connections } = useConnections();
  const userName = session?.user?.name;
  const orgName = me?.organization?.name;
  const lead = connectionHomeLead(connections?.items ?? []);

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
        mobileActions={
          <Link to="/settings" aria-label="Настройки">
            <Button variant="ghost" size="icon-sm" type="button">
              <Settings size={16} />
            </Button>
          </Link>
        }
        props={
          orgName
            ? [
                { label: 'Магазин', value: orgName },
                { label: 'Период', value: '30 дней' },
                {
                  label: 'Данные',
                  value: 'Подключить API →',
                  href: '/settings/connections/add-marketplace',
                },
              ]
            : [
                { label: 'Период', value: '30 дней' },
                {
                  label: 'Данные',
                  value: 'Подключить API →',
                  href: '/settings/connections/add-marketplace',
                },
              ]
        }
      >
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
