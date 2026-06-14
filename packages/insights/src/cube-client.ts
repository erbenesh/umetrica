export interface CubeQuery {
  measures?: string[];
  dimensions?: string[];
  timeDimensions?: Array<{
    dimension: string;
    dateRange?: string | string[];
    granularity?: string;
  }>;
  filters?: unknown[];
  limit?: number;
}

export interface CubeLoadResponse {
  data: Record<string, string | number | null>[];
}

export async function loadCubeQuery(
  cubeUrl: string,
  token: string,
  query: CubeQuery
): Promise<CubeLoadResponse> {
  const response = await fetch(`${cubeUrl}/cubejs-api/v1/load`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: token,
    },
    body: JSON.stringify({ query }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Cube query failed (${response.status}): ${body}`);
  }

  const payload = (await response.json()) as { data?: CubeLoadResponse['data'] };
  return { data: payload.data ?? [] };
}

export function readMeasure(
  rows: CubeLoadResponse['data'],
  key: string
): number {
  const value = rows[0]?.[key];
  if (value === null || value === undefined) return 0;
  return Number(value) || 0;
}
