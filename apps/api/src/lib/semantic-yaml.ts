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

type LocalizedMember = {
  title: string;
  shortTitle?: string;
};

type YamlMemberRow = {
  title?: string;
  shortTitle?: string;
  meta?: { umetrica?: { title?: string } };
};

function cubeMemberTitle(member: LocalizedMember) {
  return member.shortTitle ?? member.title;
}

function appendLocalizedTitleLines(lines: string[], member: LocalizedMember, indent: string) {
  const cubeTitle = cubeMemberTitle(member);
  lines.push(`${indent}title: ${yamlQuote(cubeTitle)}`);
  if (member.shortTitle && member.title !== member.shortTitle) {
    lines.push(`${indent}shortTitle: ${yamlQuote(member.shortTitle)}`);
    lines.push(`${indent}meta:`);
    lines.push(`${indent}  umetrica:`);
    lines.push(`${indent}    title: ${yamlQuote(member.title)}`);
  }
}

function parseLocalizedMemberTitles(row: YamlMemberRow, fallbackName: string): LocalizedMember {
  const metaFullTitle = row.meta?.umetrica?.title;
  const yamlTitle = row.title ? String(row.title) : undefined;
  const yamlShortTitle = row.shortTitle ? String(row.shortTitle) : undefined;

  if (metaFullTitle) {
    return {
      title: String(metaFullTitle),
      shortTitle: yamlShortTitle ?? yamlTitle,
    };
  }

  return {
    title: yamlTitle ?? fallbackName,
    ...(yamlShortTitle && yamlShortTitle !== yamlTitle ? { shortTitle: yamlShortTitle } : {}),
  };
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
  if (definition.displayShortTitle && definition.displayShortTitle !== definition.displayTitle) {
    lines.push(`    shortTitle: ${yamlQuote(definition.displayShortTitle)}`);
  }
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
    appendLocalizedTitleLines(lines, measure, '        ');
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
    appendLocalizedTitleLines(lines, dimension, '        ');
    lines.push(`        sql: ${yamlQuote(dimension.sql)}`);
    lines.push(`        type: ${dimension.type}`);
    if (dimension.type === 'time' && dimension.granularity) {
      lines.push(`        granularity: ${dimension.granularity}`);
    }
  }

  const segments = definition.segments ?? [];
  if (segments.length > 0) {
    lines.push('    segments:');
    for (const segment of segments) {
      lines.push(`      - name: ${segment.name}`);
      if (segment.title || segment.shortTitle) {
        appendLocalizedTitleLines(
          lines,
          {
            title: segment.title ?? segment.name,
            shortTitle: segment.shortTitle,
          },
          '        '
        );
      }
      lines.push(`        sql: ${yamlQuote(segment.sql)}`);
    }
  }

  const hierarchies = definition.hierarchies ?? [];
  if (hierarchies.length > 0) {
    lines.push('    hierarchies:');
    for (const hierarchy of hierarchies) {
      lines.push(`      - name: ${hierarchy.name}`);
      if (hierarchy.title || hierarchy.shortTitle) {
        appendLocalizedTitleLines(
          lines,
          {
            title: hierarchy.title ?? hierarchy.name,
            shortTitle: hierarchy.shortTitle,
          },
          '        '
        );
      }
      lines.push('        levels:');
      for (const level of hierarchy.levels) {
        lines.push(`          - ${level}`);
      }
    }
  }

  const preAggregations = definition.preAggregations ?? [];
  if (preAggregations.length > 0) {
    lines.push('    pre_aggregations:');
    for (const preAgg of preAggregations) {
      lines.push(`      - name: ${preAgg.name}`);
      lines.push('        measures:');
      for (const measure of preAgg.measures) {
        lines.push(`          - ${measure}`);
      }
      if (preAgg.dimensions.length > 0) {
        lines.push('        dimensions:');
        for (const dimension of preAgg.dimensions) {
          lines.push(`          - ${dimension}`);
        }
      }
      if (preAgg.timeDimension) {
        lines.push(`        time_dimension: ${preAgg.timeDimension}`);
        if (preAgg.granularity) {
          lines.push(`        granularity: ${preAgg.granularity}`);
        }
      }
      if (preAgg.refreshKey?.every || preAgg.refreshKey?.sql) {
        lines.push('        refresh_key:');
        if (preAgg.refreshKey.every) {
          lines.push(`          every: ${yamlQuote(preAgg.refreshKey.every)}`);
        }
        if (preAgg.refreshKey.sql) {
          lines.push(`          sql: ${yamlQuote(preAgg.refreshKey.sql)}`);
        }
      }
    }
  }

  return `${lines.join('\n')}\n`;
}

export function compileSemanticViewToYaml(definition: SemanticViewDefinition) {
  const lines: string[] = ['views:', `  - name: ${definition.name}`];
  lines.push(`    title: ${yamlQuote(definition.title)}`);
  if (definition.shortTitle && definition.shortTitle !== definition.title) {
    lines.push(`    shortTitle: ${yamlQuote(definition.shortTitle)}`);
  }

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
  shortTitle?: string;
  sql?: string;
  joins?: Array<{ name?: string; relationship?: string; sql?: string }>;
  measures?: Array<{
    name?: string;
    title?: string;
    shortTitle?: string;
    meta?: { umetrica?: { title?: string } };
    sql?: string;
    type?: string;
    format?: string;
  }>;
  dimensions?: Array<{
    name?: string;
    title?: string;
    shortTitle?: string;
    meta?: { umetrica?: { title?: string } };
    sql?: string;
    type?: string;
    granularity?: string;
  }>;
  segments?: Array<{
    name?: string;
    title?: string;
    shortTitle?: string;
    meta?: { umetrica?: { title?: string } };
    sql?: string;
  }>;
  hierarchies?: Array<{
    name?: string;
    title?: string;
    shortTitle?: string;
    meta?: { umetrica?: { title?: string } };
    levels?: string[];
  }>;
  pre_aggregations?: Array<{
    name?: string;
    measures?: string[];
    dimensions?: string[];
    time_dimension?: string;
    timeDimension?: string;
    granularity?: string;
    refresh_key?: { every?: string; sql?: string };
    refreshKey?: { every?: string; sql?: string };
  }>;
};

type YamlViewRow = {
  name?: string;
  title?: string;
  shortTitle?: string;
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

  const measures = (cube.measures ?? []).map((measure, index) => {
    const memberName = String(measure.name ?? '');
    const titles = parseLocalizedMemberTitles(measure, memberName || String(index));
    return {
      id: `measure:${memberName || index}`,
      name: memberName,
      ...titles,
      sql: String(measure.sql ?? '*'),
      type: (measure.type ?? 'count') as 'sum' | 'count' | 'avg' | 'min' | 'max',
      ...(measure.format ? { format: measure.format as 'currency' | 'percent' | 'number' } : {}),
    };
  });

  const dimensions = (cube.dimensions ?? []).map((dimension, index) => {
    const memberName = String(dimension.name ?? '');
    const titles = parseLocalizedMemberTitles(dimension, memberName || String(index));
    return {
      id: `dimension:${memberName || index}`,
      name: memberName,
      ...titles,
      sql: String(dimension.sql ?? ''),
      type: (dimension.type ?? 'string') as 'string' | 'time' | 'number' | 'boolean',
      ...(dimension.granularity
        ? { granularity: dimension.granularity as 'day' | 'week' | 'month' | 'year' }
        : {}),
    };
  });

  const segments = (cube.segments ?? []).map((segment, index) => {
    const memberName = String(segment.name ?? '');
    const titles = parseLocalizedMemberTitles(segment, memberName || String(index));
    return {
      id: `segment:${memberName || index}`,
      name: memberName,
      ...titles,
      sql: String(segment.sql ?? ''),
    };
  });

  const hierarchies = (cube.hierarchies ?? [])
    .map((hierarchy, index) => {
      const memberName = String(hierarchy.name ?? '');
      const titles = parseLocalizedMemberTitles(hierarchy, memberName || String(index));
      return {
        id: `hierarchy:${memberName || index}`,
        name: memberName,
        ...titles,
        levels: Array.isArray(hierarchy.levels) ? hierarchy.levels.map(String) : [],
      };
    })
    .filter((hierarchy) => hierarchy.name && hierarchy.levels.length >= 2);

  const preAggregations = (cube.pre_aggregations ?? [])
    .map((preAgg, index) => {
      const refreshKeyRaw = preAgg.refresh_key ?? preAgg.refreshKey;
      const refreshKey =
        refreshKeyRaw?.every || refreshKeyRaw?.sql
          ? {
              ...(refreshKeyRaw.every ? { every: String(refreshKeyRaw.every) } : {}),
              ...(refreshKeyRaw.sql ? { sql: String(refreshKeyRaw.sql) } : {}),
            }
          : undefined;

      return {
        id: `preAgg:${preAgg.name ?? index}`,
        name: String(preAgg.name ?? ''),
        measures: Array.isArray(preAgg.measures) ? preAgg.measures.map(String) : [],
        dimensions: Array.isArray(preAgg.dimensions) ? preAgg.dimensions.map(String) : [],
        ...(preAgg.time_dimension ?? preAgg.timeDimension
          ? { timeDimension: String(preAgg.time_dimension ?? preAgg.timeDimension) }
          : {}),
        ...(preAgg.granularity
          ? { granularity: preAgg.granularity as 'day' | 'week' | 'month' | 'year' }
          : {}),
        ...(refreshKey ? { refreshKey } : {}),
      };
    })
    .filter((preAgg) => preAgg.name && preAgg.measures.length > 0);

  const cubeTitles = parseLocalizedMemberTitles(cube, cube.name);

  return SemanticCubeDefinitionSchema.parse({
    name: cube.name,
    displayTitle: cubeTitles.title,
    ...(cubeTitles.shortTitle ? { displayShortTitle: cubeTitles.shortTitle } : {}),
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
    segments,
    hierarchies,
    preAggregations,
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

  const viewTitles = parseLocalizedMemberTitles(view, view.name);

  return SemanticViewDefinitionSchema.parse({
    name: view.name,
    title: viewTitles.title,
    ...(viewTitles.shortTitle ? { shortTitle: viewTitles.shortTitle } : {}),
    ...(view.description ? { description: String(view.description) } : {}),
    cubes,
  });
}
