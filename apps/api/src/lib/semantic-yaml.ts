import { readFile, mkdir, writeFile, unlink, readdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { SemanticCubeDefinition, SemanticViewDefinition } from '@umetrica/core';
import { SemanticCubeDefinitionSchema, SemanticViewDefinitionSchema } from '@umetrica/core';
import { parse as parseYaml } from 'yaml';

const repoRoot = fileURLToPath(new URL('../../../../', import.meta.url));
const cubesDir = resolve(repoRoot, 'cube/model/cubes');
const viewsDir = resolve(repoRoot, 'cube/model/views');
const tenantManifestPath =
  process.env.SEMANTIC_TENANT_MANIFEST_PATH ??
  resolve(repoRoot, 'cube/model/tenant-isolated-cubes.json');

function yamlQuote(value: string) {
  if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(value)) return value;
  return JSON.stringify(value);
}

function cubeYamlFileName(cubeName: string, orgPrefix?: string) {
  const base = `${cubeName.charAt(0).toLowerCase()}${cubeName.slice(1)}.yml`;
  return orgPrefix ? `${orgPrefix}__${base}` : base;
}

function viewYamlFileName(viewName: string, orgPrefix?: string) {
  const base = `${viewName.charAt(0).toLowerCase()}${viewName.slice(1)}.yml`;
  return orgPrefix ? `${orgPrefix}__${base}` : base;
}

export function compileSemanticCubeToYaml(definition: SemanticCubeDefinition) {
  const lines: string[] = ['cubes:', `  - name: ${definition.name}`];

  lines.push(`    title: ${yamlQuote(definition.displayTitle)}`);
  lines.push(`    sql: ${yamlQuote(definition.source.sql)}`);

  const joins = definition.joins ?? [];
  if (joins.length > 0) {
    lines.push('    joins:');
    for (const join of joins) {
      lines.push(`      - name: ${join.targetCube}`);
      lines.push(`        relationship: ${join.relationship}`);
      lines.push(`        sql: ${yamlQuote(join.sql)}`);
    }
  }

  lines.push('    measures:');

  for (const measure of definition.measures) {
    lines.push(`      - name: ${measure.name}`);
    lines.push(`        title: ${yamlQuote(measure.title)}`);
    if (measure.type === 'count') {
      lines.push('        type: count');
    } else {
      lines.push(`        sql: ${yamlQuote(measure.sql)}`);
      lines.push(`        type: ${measure.type}`);
    }
    if (measure.format) {
      lines.push(`        format: ${measure.format}`);
    }
  }

  lines.push('    dimensions:');
  for (const dimension of definition.dimensions) {
    lines.push(`      - name: ${dimension.name}`);
    lines.push(`        title: ${yamlQuote(dimension.title)}`);
    lines.push(`        sql: ${yamlQuote(dimension.sql)}`);
    lines.push(`        type: ${dimension.type}`);
    if (dimension.type === 'time' && dimension.granularity) {
      lines.push(`        granularity: ${dimension.granularity}`);
    }
  }

  return `${lines.join('\n')}\n`;
}

export function compileSemanticViewToYaml(definition: SemanticViewDefinition) {
  const lines: string[] = ['views:', `  - name: ${definition.name}`];
  lines.push(`    title: ${yamlQuote(definition.title)}`);

  if (definition.description) {
    lines.push(`    description: ${yamlQuote(definition.description)}`);
  }

  lines.push('    cubes:');
  for (const cube of definition.cubes) {
    lines.push(`      - join_path: ${yamlQuote(cube.joinPath)}`);
    lines.push('        includes:');
    for (const member of cube.includes) {
      lines.push(`          - ${member}`);
    }
  }

  return `${lines.join('\n')}\n`;
}

function hasTenantIsolation(definition: SemanticCubeDefinition) {
  return definition.dimensions.some((dimension) => dimension.name === 'tenantId');
}

async function readTenantManifest(): Promise<Set<string>> {
  try {
    const raw = await readFile(tenantManifestPath, 'utf8');
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((item): item is string => typeof item === 'string'));
  } catch {
    return new Set();
  }
}

async function writeTenantManifest(cubes: Set<string>) {
  await mkdir(dirname(tenantManifestPath), { recursive: true });
  await writeFile(tenantManifestPath, `${JSON.stringify([...cubes].sort(), null, 2)}\n`, 'utf8');
}

async function syncTenantManifest(definition: SemanticCubeDefinition) {
  const cubes = await readTenantManifest();
  if (hasTenantIsolation(definition)) {
    cubes.add(definition.name);
  } else {
    cubes.delete(definition.name);
  }
  await writeTenantManifest(cubes);
}

export function resolveSemanticCubeYamlPath(definition: SemanticCubeDefinition, orgPrefix?: string) {
  const fileName = cubeYamlFileName(definition.name, orgPrefix);
  return process.env.SEMANTIC_CUBE_YAML_PATH ?? resolve(cubesDir, fileName);
}

export function resolveSemanticViewYamlPath(definition: SemanticViewDefinition, orgPrefix?: string) {
  const fileName = viewYamlFileName(definition.name, orgPrefix);
  return resolve(viewsDir, fileName);
}

export async function writeSemanticCubeYaml(definition: SemanticCubeDefinition, orgPrefix?: string) {
  const targetPath = resolveSemanticCubeYamlPath(definition, orgPrefix);
  const yaml = compileSemanticCubeToYaml(definition);
  await mkdir(dirname(targetPath), { recursive: true });
  await writeFile(targetPath, yaml, 'utf8');
  await syncTenantManifest(definition);
  return targetPath;
}

export async function writeSemanticViewYaml(definition: SemanticViewDefinition, orgPrefix?: string) {
  const targetPath = resolveSemanticViewYamlPath(definition, orgPrefix);
  const yaml = compileSemanticViewToYaml(definition);
  await mkdir(dirname(targetPath), { recursive: true });
  await writeFile(targetPath, yaml, 'utf8');
  return targetPath;
}

export async function deleteSemanticCubeYaml(cubeName: string, orgPrefix?: string) {
  const targetPath = resolve(cubesDir, cubeYamlFileName(cubeName, orgPrefix));
  const legacyPath = resolve(cubesDir, cubeYamlFileName(cubeName));

  for (const path of [targetPath, legacyPath]) {
    try {
      await unlink(path);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }
  }

  const cubes = await readTenantManifest();
  cubes.delete(cubeName);
  await writeTenantManifest(cubes);
}

export async function deleteSemanticViewYaml(viewName: string, orgPrefix?: string) {
  const targetPath = resolve(viewsDir, viewYamlFileName(viewName, orgPrefix));
  try {
    await unlink(targetPath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
  }
}

export async function compileOrgSemanticModel(input: {
  orgPrefix: string;
  cubes: SemanticCubeDefinition[];
  views: SemanticViewDefinition[];
}) {
  const tenantCubes = new Set<string>();

  for (const definition of input.cubes) {
    await writeSemanticCubeYaml(definition, input.orgPrefix);
    if (hasTenantIsolation(definition)) {
      tenantCubes.add(definition.name);
    }
  }

  await writeTenantManifest(tenantCubes);

  for (const definition of input.views) {
    await writeSemanticViewYaml(definition, input.orgPrefix);
  }
}

export async function listOrgYamlCubeNames(orgPrefix: string) {
  try {
    const files = await readdir(cubesDir);
    return files
      .filter((file) => file.startsWith(`${orgPrefix}__`) && file.endsWith('.yml'))
      .map((file) => file.slice(orgPrefix.length + 2, -4));
  } catch {
    return [];
  }
}

type YamlCubeRow = {
  name?: string;
  title?: string;
  sql?: string;
  joins?: Array<{ name?: string; relationship?: string; sql?: string }>;
  measures?: Array<{ name?: string; title?: string; sql?: string; type?: string; format?: string }>;
  dimensions?: Array<{
    name?: string;
    title?: string;
    sql?: string;
    type?: string;
    granularity?: string;
  }>;
};

type YamlViewRow = {
  name?: string;
  title?: string;
  description?: string;
  cubes?: Array<{ join_path?: string; joinPath?: string; includes?: string[] }>;
};

export function parseSemanticCubeYaml(yaml: string): SemanticCubeDefinition {
  const parsed = parseYaml(yaml) as { cubes?: YamlCubeRow[] };
  const cube = parsed.cubes?.[0];
  if (!cube?.name) {
    throw new Error('Не найден куб в YAML');
  }

  const sql = String(cube.sql ?? '');
  const tableMatch = sql.match(/FROM\s+(.+)$/i);
  const table = tableMatch?.[1]?.trim() ?? 'public.unknown';

  const joins = (cube.joins ?? []).map((join, index) => ({
    id: `join:${join.name ?? index}`,
    targetCube: String(join.name ?? ''),
    relationship: (join.relationship ?? 'belongsTo') as 'belongsTo' | 'hasMany' | 'hasOne',
    sql: String(join.sql ?? ''),
  }));

  const measures = (cube.measures ?? []).map((measure, index) => ({
    id: `measure:${measure.name ?? index}`,
    name: String(measure.name ?? ''),
    title: String(measure.title ?? measure.name ?? ''),
    sql: String(measure.sql ?? '*'),
    type: (measure.type ?? 'count') as 'sum' | 'count' | 'avg' | 'min' | 'max',
    ...(measure.format ? { format: measure.format as 'currency' | 'percent' | 'number' } : {}),
  }));

  const dimensions = (cube.dimensions ?? []).map((dimension, index) => ({
    id: `dimension:${dimension.name ?? index}`,
    name: String(dimension.name ?? ''),
    title: String(dimension.title ?? dimension.name ?? ''),
    sql: String(dimension.sql ?? ''),
    type: (dimension.type ?? 'string') as 'string' | 'time' | 'number' | 'boolean',
    ...(dimension.granularity
      ? { granularity: dimension.granularity as 'day' | 'week' | 'month' | 'year' }
      : {}),
  }));

  return SemanticCubeDefinitionSchema.parse({
    name: cube.name,
    displayTitle: String(cube.title ?? cube.name),
    source: {
      sql,
      table,
      connectionLabel: 'PostgreSQL',
      columns: dimensions.map((item) => item.sql),
    },
    measures:
      measures.length > 0
        ? measures
        : [{ id: 'measure:count', name: 'count', title: 'count', sql: '*', type: 'count' }],
    dimensions:
      dimensions.length > 0
        ? dimensions
        : [{ id: 'dimension:id', name: 'id', title: 'id', sql: 'id', type: 'string' }],
    joins,
  });
}

export function parseSemanticViewYaml(yaml: string): SemanticViewDefinition {
  const parsed = parseYaml(yaml) as { views?: YamlViewRow[] };
  const view = parsed.views?.[0];
  if (!view?.name) {
    throw new Error('Не найден view в YAML');
  }

  const cubes = (view.cubes ?? []).map((cube) => ({
    joinPath: String(cube.join_path ?? cube.joinPath ?? ''),
    includes: Array.isArray(cube.includes) ? cube.includes.map(String) : [],
  }));

  return SemanticViewDefinitionSchema.parse({
    name: view.name,
    title: String(view.title ?? view.name),
    ...(view.description ? { description: String(view.description) } : {}),
    cubes,
  });
}
