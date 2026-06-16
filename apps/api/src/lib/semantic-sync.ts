import { eq } from 'drizzle-orm';

import { semanticCubes } from '../db/semantic-cubes.js';
import { semanticViews } from '../db/semantic-views.js';
import { organization } from '../db/schema.js';
import { db } from '../db/index.js';
import { compileOrgSemanticModel } from './semantic-yaml.js';
import { SemanticCubeDefinitionSchema, SemanticViewDefinitionSchema } from '@sellerpool/core';

async function getOrgPrefix(organizationId: string) {
  const [row] = await db
    .select({ slug: organization.slug })
    .from(organization)
    .where(eq(organization.id, organizationId))
    .limit(1);

  return row?.slug ?? organizationId.slice(0, 8);
}

export async function syncOrgSemanticYaml(organizationId: string) {
  const orgPrefix = await getOrgPrefix(organizationId);

  const cubeRows = await db
    .select()
    .from(semanticCubes)
    .where(eq(semanticCubes.organizationId, organizationId));

  const viewRows = await db
    .select()
    .from(semanticViews)
    .where(eq(semanticViews.organizationId, organizationId));

  const cubes = cubeRows
    .filter((row) => row.publishedAt)
    .map((row) => SemanticCubeDefinitionSchema.parse(row.publishedDefinition));

  const views = viewRows
    .filter((row) => row.publishedAt)
    .map((row) => SemanticViewDefinitionSchema.parse(row.publishedDefinition));

  await compileOrgSemanticModel({ orgPrefix, cubes, views });
}
