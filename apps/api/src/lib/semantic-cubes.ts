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
import { db } from '../db/index.js';
import { recordAuditEvent } from './audit-log.js';
import { writeSemanticCubeYaml } from './semantic-yaml.js';

function parseDefinition(raw: unknown): SemanticCubeDefinition {
  return SemanticCubeDefinitionSchema.parse(raw);
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

function toDetail(row: typeof semanticCubes.$inferSelect, widgetCount: number): SemanticCubeDetail {
  const draft = parseDefinition(row.draftDefinition);
  const published = parseDefinition(row.publishedDefinition);
  const layout = parseLayout(row.graphLayout);

  return SemanticCubeDetailSchema.parse({
    name: row.name,
    subtitle: row.subtitle,
    status: hasDraftChanges(draft, published) ? 'draft' : 'published',
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
        status: hasDraftChanges(draft, published) ? 'draft' : 'published',
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

  try {
    await writeSemanticCubeYaml(current.draft);
  } catch (error) {
    console.warn('[semantic] Failed to write Cube YAML:', error);
  }

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
      publishedAt: now,
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

export { computeSemanticPublishDiff };
