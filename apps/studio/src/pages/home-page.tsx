import { CubeApiProvider } from '@/components/cube/cube-provider';
import { MetricKpi } from '@/components/cube/metric-kpi';
import { RevenueByStatusChart } from '@/components/cube/revenue-chart';
import { PageHeader } from '@/components/layout/page-header';
import { useSession } from '@/lib/auth-client';

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
  const { data: session } = useSession();

  return (
    <CubeApiProvider>
      <div className="space-y-4">
        <PageHeader
          title={`Привет${session?.user?.name ? `, ${session.user.name}` : ''}`}
          description="Данные из Cube.js за последние 30 дней"
        />

        <div className="grid gap-3 md:grid-cols-3">
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
            description="Сравнение с более длинным окном"
            measureKey="Orders.revenue"
            format="currency"
          />
        </div>

        <RevenueByStatusChart />
      </div>
    </CubeApiProvider>
  );
}
