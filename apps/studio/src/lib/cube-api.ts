const API_BASE = import.meta.env.VITE_API_URL ?? '';

export interface CubeTokenResponse {
  token: string;
  cubeUrl: string;
  expiresIn: number;
}

export function getCubeApiUrl(cubeUrl: string): string {
  if (import.meta.env.DEV) {
    return '/cubejs-api/v1';
  }

  const normalized = cubeUrl.replace(/\/$/, '');
  return `${normalized}/cubejs-api/v1`;
}

export async function fetchCubeToken(): Promise<CubeTokenResponse> {
  const response = await fetch(`${API_BASE}/api/cube/token`, {
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to fetch Cube token' }));
    throw new Error(error.error ?? 'Failed to fetch Cube token');
  }

  return response.json() as Promise<CubeTokenResponse>;
}
