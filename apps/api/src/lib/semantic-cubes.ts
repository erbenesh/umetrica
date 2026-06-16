import { randomUUID } from 'node:crypto';

import {
  buildDefaultGraphLayout,
  computeSemanticPublishDiff,
  DEFAULT_ORDERS_GRAPH_LAYOUT,
  DEFAULT_ORDERS_SEMANTIC_CUBE,
  scaffoldSemanticCubeFromTable,
  SemanticCubeDefinitionSchema,
  SemanticCubeDetailSchema,
  SemanticCubeListItemSchema,
  SemanticGraphLayoutSchema,
  semanticCubeSubtitle,
  semanticDefinitionsEqual,
  type CreateSemanticCubeInput,
  type SemanticColumnInfo,
  type SemanticCubeDefinition,
  type SemanticCubeDetail,
  type SemanticCubeListItem,
  type SemanticGraphLayout,
  type UpdateSemanticDraftInput,
  WidgetSchema,
} from '@umetrica/core';
import { and, desc, eq } from 'drizzle-orm';

import { dashboards } from '../db/dashboards.js';
import { semanticCubes } from '../db/semantic-cubes.js';
import { organization } from '../db/schema.js';
import { db } from '../db/index.js';
import { recordAuditEvent } from './audit-log.js';
import {
  compileSemanticCubeToYaml,
  deleteSemanticCubeYaml,
  parseSemanticCubeYaml,
  writeSemanticCubeYaml,
} from './semantic-yaml.js';
import { syncOrgSemanticYaml } from './semantic-sync.js';

function parseDefinition(raw: unknown): SemanticCubeDefinition {
  const parsed = SemanticCubeDefinitionSchema.safeParse(raw);
  if (parsed.success) return parsed.data;

  const legacy = raw as SemanticCubeDefinition;
  return SemanticCubeDefinitionSchema.parse({ ...legacy, joins: legacy.joins ?? [] });
}

function parseLayout(raw: unknown): SemanticGraphLayout {
  const parsed = SemanticGraphLayoutSchema.safeParse(raw);
  return parsed.success ? parsed.data : DEFAULT_ORDERS_GRAPH_LAYOUT;
}

function hasDraftChanges(
  draft: SemanticCubeDefinition,
  published: SemanticCubeDefinition
) {
  return !semanticDefinitionsEqual(draft, published);
}

function cubeStatus(
  draft: SemanticCubeDefinition,
  published: SemanticCubeDefinition,
  publishedAt: Date | null
) {
  if (!publishedAt || hasDraftChanges(draft, published)) {
    return 'draft' as const;
  }
  return 'published' as const;
}

function toDetail(row: typeof semanticCubes.$inferSelect, widgetCount: number): SemanticCubeDetail {
  const draft = parseDefinition(row.draftDefinition);
  const published = parseDefinition(row.publishedDefinition);
  const layout = parseLayout(row.graphLayout);

  return SemanticCubeDetailSchema.parse({
    name: row.name,
    subtitle: row.subtitle,
    status: cubeStatus(draft, published, row.publishedAt),
    draft,
    published,
    layout,
    widgetCount,
    updatedAt: row.updatedAt.toISOString(),
    publishedAt: row.publishedAt?.toISOString() ?? null,
  });
}

async function countWidgetsForCube(organizationId: string, cubeName: string) {
  const rows = await db
    .select({ widgets: dashboards.widgets })
    .from(dashboards)
    .where(eq(dashboards.organizationId, organizationId));

  let count = 0;

  for (const row of rows) {
    const widgets = WidgetSchema.array().safeParse(row.widgets);
    if (!widgets.success) continue;
    count += widgets.data.filter((widget) => widget.cubeName === cubeName).length;
  }

  return count;
}

async function getOrgPrefix(organizationId: string) {
  const [row] = await db
    .select({ slug: organization.slug })
    .from(organization)
    .where(eq(organization.id, organizationId))
    .limit(1);

  return row?.slug ?? organizationId.slice(0, 8);
}

export async function ensureSemanticCubes(organizationId: string) {
  const [existing] = await db
    .select({ id: semanticCubes.id })
    .from(semanticCubes)
    .where(and(eq(semanticCubes.organizationId, organizationId), eq(semanticCubes.name, 'Orders')))
    .limit(1);

  if (existing) return;

  const now = new Date();
  const definition = DEFAULT_ORDERS_SEMANTIC_CUBE;

  await db.insert(semanticCubes).values({
    id: randomUUID(),
    organizationId,
    name: definition.name,
    subtitle: semanticCubeSubtitle(definition),
    draftDefinition: definition,
    publishedDefinition: definition,
    graphLayout: DEFAULT_ORDERS_GRAPH_LAYOUT,
    publishedAt: now,
    createdAt: now,
    updatedAt: now,
  });

  try {
    await syncOrgSemanticYaml(organizationId);
  } catch (error) {
    console.warn('[semantic] Failed to sync seed Orders YAML:', error);
  }
}

export async function listSemanticCubes(organizationId: string): Promise<SemanticCubeListItem[]> {
  await ensureSemanticCubes(organizationId);

  const rows = await db
    .select()
    .from(semanticCubes)
    .where(eq(semanticCubes.organizationId, organizationId))
    .orderBy(desc(semanticCubes.updatedAt));

  const items: SemanticCubeListItem[] = [];

  for (const row of rows) {
    const draft = parseDefinition(row.draftDefinition);
    const published = parseDefinition(row.publishedDefinition);
    const widgetCount = await countWidgetsForCube(organizationId, row.name);

    items.push(
      SemanticCubeListItemSchema.parse({
        name: row.name,
        subtitle: row.subtitle,
        status: cubeStatus(draft, published, row.publishedAt),
        measureCount: draft.measures.length,
        dimensionCount: draft.dimensions.length,
        widgetCount,
        updatedAt: row.updatedAt.toISOString(),
        publishedAt: row.publishedAt?.toISOString() ?? null,
      })
    );
  }

  return items;
}

export async function getSemanticCube(organizationId: string, name: string) {
  await ensureSemanticCubes(organizationId);

  const [row] = await db
    .select()
    .from(semanticCubes)
    .where(and(eq(semanticCubes.organizationId, organizationId), eq(semanticCubes.name, name)))
    .limit(1);

  if (!row) return null;

  const widgetCount = await countWidgetsForCube(organizationId, name);
  return toDetail(row, widgetCount);
}

export async function updateSemanticDraft(
  organizationId: string,
  name: string,
  input: UpdateSemanticDraftInput
) {
  const current = await getSemanticCube(organizationId, name);
  if (!current) return null;

  if (input.draft.name !== name) {
    throw new Error('Имя куба нельзя изменить');
  }

  const lockedDimensions = current.published.dimensions.filter((item) => item.locked);
  for (const locked of lockedDimensions) {
    const inDraft = input.draft.dimensions.find((item) => item.name === locked.name);
    if (!inDraft) {
      throw new Error(`Системное измерение ${locked.name} нельзя удалить`);
    }
  }

  const now = new Date();
  const subtitle = semanticCubeSubtitle(input.draft);
  const layout = input.layout ?? current.layout;

  const [row] = await db
    .update(semanticCubes)
    .set({
      draftDefinition: input.draft,
      subtitle,
      graphLayout: layout,
      updatedAt: now,
    })
    .where(and(eq(semanticCubes.organizationId, organizationId), eq(semanticCubes.name, name)))
    .returning();

  if (!row) return null;

  const widgetCount = await countWidgetsForCube(organizationId, name);
  return toDetail(row, widgetCount);
}

export async function discardSemanticDraft(organizationId: string, name: string) {
  const current = await getSemanticCube(organizationId, name);
  if (!current) return null;

  const now = new Date();

  const [row] = await db
    .update(semanticCubes)
    .set({
      draftDefinition: current.published,
      subtitle: semanticCubeSubtitle(current.published),
      updatedAt: now,
    })
    .where(and(eq(semanticCubes.organizationId, organizationId), eq(semanticCubes.name, name)))
    .returning();

  if (!row) return null;

  const widgetCount = await countWidgetsForCube(organizationId, name);
  return toDetail(row, widgetCount);
}

export async function getSemanticPublishPreview(organizationId: string, name: string) {
  const current = await getSemanticCube(organizationId, name);
  if (!current) return null;

  return {
    cubeName: current.name,
    widgetCount: current.widgetCount,
    diff: computeSemanticPublishDiff(current.published, current.draft),
  };
}

export async function publishSemanticCube(input: {
  organizationId: string;
  userId?: string;
  actorName: string;
  name: string;
  notifyTeam?: boolean;
}) {
  const current = await getSemanticCube(input.organizationId, input.name);
  if (!current) return null;

  const orgPrefix = await getOrgPrefix(input.organizationId);
  await writeSemanticCubeYaml(current.draft, orgPrefix);
  await syncOrgSemanticYaml(input.organizationId);

  const now = new Date();

  const [row] = await db
    .update(semanticCubes)
    .set({
      publishedDefinition: current.draft,
      subtitle: semanticCubeSubtitle(current.draft),
      publishedAt: now,
      updatedAt: now,
    })
    .where(
      and(eq(semanticCubes.organizationId, input.organizationId), eq(semanticCubes.name, input.name))
    )
    .returning();

  if (!row) return null;

  await recordAuditEvent({
    organizationId: input.organizationId,
    userId: input.userId,
    actorName: input.actorName,
    action: 'semantic.publish',
    objectLabel: input.name,
    category: 'semantics',
  });

  if (input.notifyTeam) {
    await recordAuditEvent({
      organizationId: input.organizationId,
      userId: input.userId,
      actorName: input.actorName,
      action: 'semantic.notify',
      objectLabel: `${input.name} · обновление семантики`,
      category: 'semantics',
    });
  }

  const widgetCount = await countWidgetsForCube(input.organizationId, input.name);
  return toDetail(row, widgetCount);
}

export async function createSemanticCube(
  organizationId: string,
  input: CreateSemanticCubeInput,
  columns: SemanticColumnInfo[],
  connectionLabel: string
) {
  const definition = scaffoldSemanticCubeFromTable({
    table: input.table,
    columns,
    connectionLabel,
    connectionId: input.connectionId,
    name: input.name,
    displayTitle: input.displayTitle,
  });

  const [existing] = await db
    .select({ id: semanticCubes.id })
    .from(semanticCubes)
    .where(and(eq(semanticCubes.organizationId, organizationId), eq(semanticCubes.name, definition.name)))
    .limit(1);

  if (existing) {
    throw new Error(`Куб «${definition.name}» уже существует`);
  }

  const now = new Date();
  const layout = buildDefaultGraphLayout(definition);

  const [row] = await db
    .insert(semanticCubes)
    .values({
      id: randomUUID(),
      organizationId,
      name: definition.name,
      subtitle: semanticCubeSubtitle(definition),
      draftDefinition: definition,
      publishedDefinition: definition,
      graphLayout: layout,
      publishedAt: null,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  if (!row) {
    throw new Error('Не удалось создать куб');
  }

  const widgetCount = await countWidgetsForCube(organizationId, definition.name);
  return toDetail(row, widgetCount);
}

export async function deleteSemanticCube(organizationId: string, name: string) {
  if (name === 'Orders') {
    throw new Error('Куб Orders нельзя удалить');
  }

  const widgetCount = await countWidgetsForCube(organizationId, name);
  if (widgetCount > 0) {
    throw new Error(`Куб используется в ${widgetCount} виджетах — сначала удалите их`);
  }

  const [row] = await db
    .delete(semanticCubes)
    .where(and(eq(semanticCubes.organizationId, organizationId), eq(semanticCubes.name, name)))
    .returning({ name: semanticCubes.name });

  if (!row) return false;

  const orgPrefix = await getOrgPrefix(organizationId);
  await deleteSemanticCubeYaml(name, orgPrefix);
  await syncOrgSemanticYaml(organizationId);
  return true;
}

export async function getSemanticCubeYaml(
  organizationId: string,
  name: string,
  variant: 'draft' | 'published'
) {
  const current = await getSemanticCube(organizationId, name);
  if (!current) return null;

  const definition = variant === 'draft' ? current.draft : current.published;
  return {
    yaml: compileSemanticCubeToYaml(definition),
    variant,
  };
}

export async function applySemanticCubeYaml(
  organizationId: string,
  name: string,
  yaml: string
) {
  const current = await getSemanticCube(organizationId, name);
  if (!current) return null;

  const parsed = parseSemanticCubeYaml(yaml);
  if (parsed.name !== name) {
    throw new Error('Имя куба в YAML должно совпадать с текущим');
  }

  return updateSemanticDraft(organizationId, name, { draft: parsed, layout: current.layout });
}

export async function listCubeDefinitionsForJoins(organizationId: string) {
  const cubes = await listSemanticCubes(organizationId);
  const details = await Promise.all(
    cubes.map((cube) => getSemanticCube(organizationId, cube.name))
  );

  return details
    .filter((cube): cube is SemanticCubeDetail => cube !== null)
    .map((cube) => cube.draft);
}

export { computeSemanticPublishDiff };
