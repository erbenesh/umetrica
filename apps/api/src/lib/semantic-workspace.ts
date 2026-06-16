import { randomUUID } from 'node:crypto';

import {
  buildDefaultWorkspaceLayout,
  SemanticWorkspaceLayoutSchema,
  type SemanticWorkspaceLayout,
} from '@umetrica/core';
import { eq } from 'drizzle-orm';

import { semanticWorkspace } from '../db/semantic-workspace.js';
import { db } from '../db/index.js';
import { listSemanticCubes } from './semantic-cubes.js';
import { listSemanticViews } from './semantic-views.js';

function parseLayout(raw: unknown): SemanticWorkspaceLayout {
  const parsed = SemanticWorkspaceLayoutSchema.safeParse(raw);
  if (parsed.success) return parsed.data;
  return { cubes: {}, views: {} };
}

async function ensureWorkspaceRow(organizationId: string, cubeNames: string[]) {
  const [existing] = await db
    .select()
    .from(semanticWorkspace)
    .where(eq(semanticWorkspace.organizationId, organizationId))
    .limit(1);

  if (existing) return existing;

  const now = new Date();
  const layout = buildDefaultWorkspaceLayout(cubeNames);

  const [row] = await db
    .insert(semanticWorkspace)
    .values({
      id: randomUUID(),
      organizationId,
      layout,
      updatedAt: now,
    })
    .returning();

  return row!;
}

export async function getSemanticWorkspace(organizationId: string) {
  const cubes = await listSemanticCubes(organizationId);
  const views = await listSemanticViews(organizationId);
  const row = await ensureWorkspaceRow(
    organizationId,
    cubes.map((cube) => cube.name)
  );

  const layout = parseLayout(row.layout);
  const cubeNames = cubes.map((cube) => cube.name);
  const viewNames = views.map((view) => view.name);

  for (const name of cubeNames) {
    if (!layout.cubes[name]) {
      const index = cubeNames.indexOf(name);
      layout.cubes[name] = {
        x: 48 + (index % 3) * 268,
        y: 48 + Math.floor(index / 3) * 148,
      };
    }
  }

  for (const name of viewNames) {
    if (!layout.views[name]) {
      const index = viewNames.indexOf(name);
      layout.views[name] = {
        x: 48 + (index % 2) * 320,
        y: 400 + Math.floor(index / 2) * 148,
      };
    }
  }

  return {
    layout,
    cubes,
    views,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function updateSemanticWorkspace(
  organizationId: string,
  layout: SemanticWorkspaceLayout
) {
  const parsed = SemanticWorkspaceLayoutSchema.parse(layout);
  await ensureWorkspaceRow(organizationId, Object.keys(parsed.cubes));

  const now = new Date();
  const [row] = await db
    .update(semanticWorkspace)
    .set({ layout: parsed, updatedAt: now })
    .where(eq(semanticWorkspace.organizationId, organizationId))
    .returning();

  if (!row) {
    throw new Error('Не удалось сохранить workspace');
  }

  return {
    layout: parseLayout(row.layout),
    updatedAt: row.updatedAt.toISOString(),
  };
}
