import { CubeProvider } from '@cubejs-client/react';
import type { ReactNode } from 'react';

import { useCubeApi } from '@/lib/use-cube-api';

export function CubeApiProvider({ children }: { children: ReactNode }) {
  const { cubeApi, isLoading, error } = useCubeApi();

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-muted-foreground">
        Подключение к аналитике...
      </div>
    );
  }

  if (error || !cubeApi) {
    return (
      <div className="rounded-xl border border-insight-warning/40 bg-card p-6 text-sm text-muted-foreground">
        Не удалось подключиться к Cube.js. Убедитесь, что Docker запущен (`docker compose up -d`).
        {error instanceof Error ? ` ${error.message}` : ''}
      </div>
    );
  }

  return <CubeProvider cubeApi={cubeApi}>{children}</CubeProvider>;
}
