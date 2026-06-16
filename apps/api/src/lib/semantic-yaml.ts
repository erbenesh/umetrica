import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { SemanticCubeDefinition } from '@umetrica/core';

const repoRoot = fileURLToPath(new URL('../../../../', import.meta.url));

function yamlQuote(value: string) {
  if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(value)) return value;
  return JSON.stringify(value);
}

export function compileSemanticCubeToYaml(definition: SemanticCubeDefinition) {
  const lines: string[] = ['cubes:', `  - name: ${definition.name}`];

  lines.push(`    sql: ${yamlQuote(definition.source.sql)}`);
  lines.push('    measures:');

  for (const measure of definition.measures) {
    lines.push(`      - name: ${measure.name}`);
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
    lines.push(`        sql: ${yamlQuote(dimension.sql)}`);
    lines.push(`        type: ${dimension.type}`);
  }

  return `${lines.join('\n')}\n`;
}

export async function writeSemanticCubeYaml(definition: SemanticCubeDefinition) {
  const fileName = `${definition.name.charAt(0).toLowerCase()}${definition.name.slice(1)}.yml`;
  const targetPath =
    process.env.SEMANTIC_CUBE_YAML_PATH ??
    resolve(repoRoot, 'cube/model/cubes', fileName);

  const yaml = compileSemanticCubeToYaml(definition);
  await mkdir(dirname(targetPath), { recursive: true });
  await writeFile(targetPath, yaml, 'utf8');

  return targetPath;
}
