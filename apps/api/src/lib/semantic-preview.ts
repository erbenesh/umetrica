import { SemanticPreviewQueryInputSchema } from '@sellerpool/core';

import { createCubeToken } from './cube-token.js';

const CUBEJS_API_URL =
  process.env.CUBEJS_API_URL ?? process.env.CUBE_API_URL ?? 'http://localhost:4000/cubejs-api/v1';

export async function previewSemanticQuery(input: {
  organizationId: string;
  userId: string;
  query: Record<string, unknown>;
}) {
  const parsed = SemanticPreviewQueryInputSchema.parse({ query: input.query });
  const url = `${CUBEJS_API_URL.replace(/\/$/, '')}/load`;
  const token = await createCubeToken({
    tenantId: input.organizationId,
    userId: input.userId,
  });

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: token,
    },
    body: JSON.stringify({
      query: parsed.query,
      queryType: 'multi',
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Cube query failed (${response.status})`);
  }

  const payload = (await response.json()) as {
    data?: Array<Record<string, unknown>>;
    error?: string;
  };

  if (payload.error) {
    throw new Error(payload.error);
  }

  const firstRow = payload.data?.[0] ?? null;
  const sampleValue =
    firstRow && Object.keys(firstRow).length > 0
      ? String(Object.values(firstRow)[0] ?? '—')
      : '—';

  return {
    data: payload.data ?? [],
    sampleValue,
  };
}
