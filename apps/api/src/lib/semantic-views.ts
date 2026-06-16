import { randomUUID } from 'node:crypto';

import {
  computeSemanticViewPublishDiff,
  CreateSemanticViewSchema,
  SemanticViewDefinitionSchema,
  SemanticViewDetailSchema,
  SemanticViewListItemSchema,
  type CreateSemanticViewInput,
  type SemanticViewDefinition,
  type SemanticViewDetail,
  type SemanticViewListItem,
  type UpdateSemanticViewDraftInput,
} from '@sellerpool/core';
import { and, desc, eq } from 'drizzle-orm';

import { semanticViews } from '../db/semantic-views.js';
import { db } from '../db/index.js';
import { organization } from '../db/schema.js';
import { recordAuditEvent } from './audit-log.js';
import { getSemanticCube } from './semantic-cubes.js';
import { syncOrgSemanticYaml } from './semantic-sync.js';
import {
  compileSemanticViewToYaml,
  deleteSemanticViewYaml,
  parseSemanticViewYaml,
  writeSemanticViewYaml,
} from './semantic-yaml.js';

function parseDefinition(raw: unknown): SemanticViewDefinition {
  return SemanticViewDefinitionSchema.parse(raw);
}

function hasDraftChanges(draft: SemanticViewDefinition, published: SemanticViewDefinition) {
  return JSON.stringify(draft) !== JSON.stringify(published);
}

function viewStatus(
  draft: SemanticViewDefinition,
  published: SemanticViewDefinition,
  publishedAt: Date | null
) {
  if (!publishedAt || hasDraftChanges(draft, published)) {
    return 'draft' as const;
  }
  return 'published' as const;
}

function toDetail(row: typeof semanticViews.$inferSelect): SemanticViewDetail {
  const draft = parseDefinition(row.draftDefinition);
  const published = parseDefinition(row.publishedDefinition);

  return SemanticViewDetailSchema.parse({
    name: row.name,
    title: row.title,
    status: viewStatus(draft, published, row.publishedAt),
    draft,
    published,
    updatedAt: row.updatedAt.toISOString(),
    publishedAt: row.publishedAt?.toISOString() ?? null,
  });
}

async function getOrgPrefix(organizationId: string) {
  const [row] = await db
    .select({ slug: organization.slug })
    .from(organization)
    .where(eq(organization.id, organizationId))
    .limit(1);

  return row?.slug ?? organizationId.slice(0, 8);
}

function scaffoldView(input: CreateSemanticViewInput, baseCubeName: string): SemanticViewDefinition {
  const name =
    input.name ??
    `${baseCubeName.charAt(0).toLowerCase()}${baseCubeName.slice(1)}Overview`;

  return SemanticViewDefinitionSchema.parse({
    name,
    title: input.title,
    cubes: [
      {
        joinPath: baseCubeName,
        includes: [],
      },
    ],
  });
}

export async function listSemanticViews(organizationId: string): Promise<SemanticViewListItem[]> {
  const rows = await db
    .select()
    .from(semanticViews)
    .where(eq(semanticViews.organizationId, organizationId))
    .orderBy(desc(semanticViews.updatedAt));

  return rows.map((row) => {
    const draft = parseDefinition(row.draftDefinition);
    const published = parseDefinition(row.publishedDefinition);
    const memberCount = draft.cubes.reduce((sum, cube) => sum + cube.includes.length, 0);

    return SemanticViewListItemSchema.parse({
      name: row.name,
      title: row.title,
      status: viewStatus(draft, published, row.publishedAt),
      cubePathCount: draft.cubes.length,
      memberCount,
      updatedAt: row.updatedAt.toISOString(),
      publishedAt: row.publishedAt?.toISOString() ?? null,
    });
  });
}

export async function getSemanticView(organizationId: string, name: string) {
  const [row] = await db
    .select()
    .from(semanticViews)
    .where(and(eq(semanticViews.organizationId, organizationId), eq(semanticViews.name, name)))
    .limit(1);

  if (!row) return null;
  return toDetail(row);
}

export async function createSemanticView(organizationId: string, input: CreateSemanticViewInput) {
  const parsed = CreateSemanticViewSchema.parse(input);
  const baseCube = await getSemanticCube(organizationId, parsed.baseCube);
  if (!baseCube) {
    throw new Error(`Куб «${parsed.baseCube}» не найден`);
  }

  const definition = scaffoldView(parsed, baseCube.name);

  const [existing] = await db
    .select({ id: semanticViews.id })
    .from(semanticViews)
    .where(
      and(eq(semanticViews.organizationId, organizationId), eq(semanticViews.name, definition.name))
    )
    .limit(1);

  if (existing) {
    throw new Error(`View «${definition.name}» уже существует`);
  }

  const now = new Date();
  const [row] = await db
    .insert(semanticViews)
    .values({
      id: randomUUID(),
      organizationId,
      name: definition.name,
      title: definition.title,
      draftDefinition: definition,
      publishedDefinition: definition,
      publishedAt: null,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  if (!row) {
    throw new Error('Не удалось создать view');
  }

  return toDetail(row);
}

export async function updateSemanticViewDraft(
  organizationId: string,
  name: string,
  input: UpdateSemanticViewDraftInput
) {
  const current = await getSemanticView(organizationId, name);
  if (!current) return null;

  if (input.draft.name !== name) {
    throw new Error('Имя view нельзя изменить');
  }

  const now = new Date();
  const [row] = await db
    .update(semanticViews)
    .set({
      draftDefinition: input.draft,
      title: input.draft.title,
      updatedAt: now,
    })
    .where(and(eq(semanticViews.organizationId, organizationId), eq(semanticViews.name, name)))
    .returning();

  if (!row) return null;
  return toDetail(row);
}

export async function discardSemanticViewDraft(organizationId: string, name: string) {
  const current = await getSemanticView(organizationId, name);
  if (!current) return null;

  const now = new Date();
  const [row] = await db
    .update(semanticViews)
    .set({
      draftDefinition: current.published,
      title: current.published.title,
      updatedAt: now,
    })
    .where(and(eq(semanticViews.organizationId, organizationId), eq(semanticViews.name, name)))
    .returning();

  if (!row) return null;
  return toDetail(row);
}

export async function getSemanticViewPublishPreview(organizationId: string, name: string) {
  const current = await getSemanticView(organizationId, name);
  if (!current) return null;

  return {
    viewName: current.name,
    diff: computeSemanticViewPublishDiff(current.published, current.draft),
  };
}

export async function publishSemanticView(input: {
  organizationId: string;
  userId?: string;
  actorName: string;
  name: string;
}) {
  const current = await getSemanticView(input.organizationId, input.name);
  if (!current) return null;

  const orgPrefix = await getOrgPrefix(input.organizationId);
  await writeSemanticViewYaml(current.draft, orgPrefix);
  await syncOrgSemanticYaml(input.organizationId);

  const now = new Date();
  const [row] = await db
    .update(semanticViews)
    .set({
      publishedDefinition: current.draft,
      title: current.draft.title,
      publishedAt: now,
      updatedAt: now,
    })
    .where(
      and(eq(semanticViews.organizationId, input.organizationId), eq(semanticViews.name, input.name))
    )
    .returning();

  if (!row) return null;

  await recordAuditEvent({
    organizationId: input.organizationId,
    userId: input.userId,
    actorName: input.actorName,
    action: 'semantic.view.publish',
    objectLabel: input.name,
    category: 'semantics',
  });

  return toDetail(row);
}

export async function deleteSemanticView(organizationId: string, name: string) {
  const [row] = await db
    .delete(semanticViews)
    .where(and(eq(semanticViews.organizationId, organizationId), eq(semanticViews.name, name)))
    .returning({ name: semanticViews.name });

  if (!row) return false;

  const orgPrefix = await getOrgPrefix(organizationId);
  await deleteSemanticViewYaml(name, orgPrefix);
  return true;
}

export async function getSemanticViewYaml(
  organizationId: string,
  name: string,
  variant: 'draft' | 'published'
) {
  const current = await getSemanticView(organizationId, name);
  if (!current) return null;

  const definition = variant === 'draft' ? current.draft : current.published;
  return {
    yaml: compileSemanticViewToYaml(definition),
    variant,
  };
}

export async function applySemanticViewYaml(
  organizationId: string,
  name: string,
  yaml: string
) {
  const current = await getSemanticView(organizationId, name);
  if (!current) return null;

  const parsed = parseSemanticViewYaml(yaml);
  if (parsed.name !== name) {
    throw new Error('Имя view в YAML должно совпадать с текущим');
  }

  return updateSemanticViewDraft(organizationId, name, { draft: parsed });
}

export async function listPublishedViewDefinitions(organizationId: string) {
  const rows = await db
    .select()
    .from(semanticViews)
    .where(eq(semanticViews.organizationId, organizationId));

  return rows
    .filter((row) => row.publishedAt)
    .map((row) => parseDefinition(row.publishedDefinition));
}
