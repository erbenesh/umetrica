import { z } from 'zod';

export const SemanticMeasureTypeSchema = z.enum(['sum', 'count', 'avg', 'min', 'max']);
export type SemanticMeasureType = z.infer<typeof SemanticMeasureTypeSchema>;

export const SemanticDimensionTypeSchema = z.enum(['string', 'time', 'number', 'boolean']);
export type SemanticDimensionType = z.infer<typeof SemanticDimensionTypeSchema>;

export const SemanticMeasureSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(80),
  title: z.string().min(1).max(200),
  description: z.string().max(500).optional(),
  sql: z.string().min(1).max(500),
  type: SemanticMeasureTypeSchema,
  format: z.enum(['currency', 'percent', 'number']).optional(),
});

export type SemanticMeasure = z.infer<typeof SemanticMeasureSchema>;

export const SemanticDimensionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(80),
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(500).optional(),
  sql: z.string().min(1).max(500),
  type: SemanticDimensionTypeSchema,
  granularity: z.enum(['day', 'week', 'month', 'year']).optional(),
  locked: z.boolean().optional(),
});

export type SemanticDimension = z.infer<typeof SemanticDimensionSchema>;

export const SemanticSourceSchema = z.object({
  sql: z.string().min(1).max(2000),
  table: z.string().min(1).max(200),
  connectionLabel: z.string().min(1).max(120),
  columns: z.array(z.string().min(1).max(120)),
});

export type SemanticSource = z.infer<typeof SemanticSourceSchema>;

export const SemanticCubeDefinitionSchema = z.object({
  name: z.string().min(1).max(80),
  displayTitle: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  source: SemanticSourceSchema,
  measures: z.array(SemanticMeasureSchema).min(1),
  dimensions: z.array(SemanticDimensionSchema).min(1),
});

export type SemanticCubeDefinition = z.infer<typeof SemanticCubeDefinitionSchema>;

export const SemanticNodePositionSchema = z.object({
  x: z.number(),
  y: z.number(),
});

export const SemanticGraphLayoutSchema = z.record(z.string(), SemanticNodePositionSchema);
export type SemanticGraphLayout = z.infer<typeof SemanticGraphLayoutSchema>;

export const SemanticCubeStatusSchema = z.enum(['published', 'draft']);
export type SemanticCubeStatus = z.infer<typeof SemanticCubeStatusSchema>;

export const SemanticCubeListItemSchema = z.object({
  name: z.string(),
  subtitle: z.string(),
  status: SemanticCubeStatusSchema,
  measureCount: z.number().int().nonnegative(),
  dimensionCount: z.number().int().nonnegative(),
  widgetCount: z.number().int().nonnegative(),
  updatedAt: z.string().datetime(),
  publishedAt: z.string().datetime().nullable(),
});

export type SemanticCubeListItem = z.infer<typeof SemanticCubeListItemSchema>;

export const SemanticCubeDetailSchema = z.object({
  name: z.string(),
  subtitle: z.string(),
  status: SemanticCubeStatusSchema,
  draft: SemanticCubeDefinitionSchema,
  published: SemanticCubeDefinitionSchema,
  layout: SemanticGraphLayoutSchema,
  widgetCount: z.number().int().nonnegative(),
  updatedAt: z.string().datetime(),
  publishedAt: z.string().datetime().nullable(),
});

export type SemanticCubeDetail = z.infer<typeof SemanticCubeDetailSchema>;

export const UpdateSemanticDraftSchema = z.object({
  draft: SemanticCubeDefinitionSchema,
  layout: SemanticGraphLayoutSchema.optional(),
});

export type UpdateSemanticDraftInput = z.infer<typeof UpdateSemanticDraftSchema>;

export const SemanticPublishDiffOpSchema = z.enum(['add', 'change', 'remove']);
export type SemanticPublishDiffOp = z.infer<typeof SemanticPublishDiffOpSchema>;

export const SemanticPublishDiffRowSchema = z.object({
  op: SemanticPublishDiffOpSchema,
  label: z.string(),
  value: z.string(),
});

export type SemanticPublishDiffRow = z.infer<typeof SemanticPublishDiffRowSchema>;

export const SemanticPublishPreviewSchema = z.object({
  cubeName: z.string(),
  widgetCount: z.number().int().nonnegative(),
  diff: z.array(SemanticPublishDiffRowSchema),
});

export type SemanticPublishPreview = z.infer<typeof SemanticPublishPreviewSchema>;

export const SemanticPublishInputSchema = z.object({
  notifyTeam: z.boolean().optional(),
});

export type SemanticPublishInput = z.infer<typeof SemanticPublishInputSchema>;

export const DEFAULT_ORDERS_GRAPH_LAYOUT: SemanticGraphLayout = {
  'source:orders': { x: 48, y: 176 },
  'cube:orders': { x: 296, y: 156 },
  'measure:revenue': { x: 576, y: 32 },
  'measure:count': { x: 576, y: 128 },
  'measure:avgOrder': { x: 576, y: 224 },
  'dimension:status': { x: 576, y: 320 },
  'dimension:createdAt': { x: 296, y: 352 },
  'dimension:tenantId': { x: 48, y: 352 },
};

export const DEFAULT_ORDERS_SEMANTIC_CUBE: SemanticCubeDefinition = {
  name: 'Orders',
  displayTitle: 'Заказы',
  description: 'Заказы компании с суммой, статусом и датой.',
  source: {
    sql: 'SELECT * FROM public.orders',
    table: 'public.orders',
    connectionLabel: 'PostgreSQL',
    columns: ['amount', 'status', 'created_at', 'tenant_id', 'id', 'updated_at'],
  },
  measures: [
    {
      id: 'measure:revenue',
      name: 'revenue',
      title: 'Выручка',
      description: 'sum(amount)',
      sql: 'amount',
      type: 'sum',
      format: 'currency',
    },
    {
      id: 'measure:count',
      name: 'count',
      title: 'Количество заказов',
      description: 'count(*)',
      sql: '*',
      type: 'count',
    },
    {
      id: 'measure:avgOrder',
      name: 'avgOrder',
      title: 'Средний чек',
      description: 'avg(amount)',
      sql: 'amount',
      type: 'avg',
      format: 'currency',
    },
  ],
  dimensions: [
    {
      id: 'dimension:status',
      name: 'status',
      title: 'Статус',
      description: 'status → string',
      sql: 'status',
      type: 'string',
    },
    {
      id: 'dimension:createdAt',
      name: 'createdAt',
      title: 'Дата заказа',
      description: 'created_at → time',
      sql: 'created_at',
      type: 'time',
      granularity: 'day',
    },
    {
      id: 'dimension:tenantId',
      name: 'tenantId',
      title: 'tenantId',
      description: 'Системное измерение · нельзя удалить',
      sql: 'tenant_id',
      type: 'string',
      locked: true,
    },
  ],
};

export function semanticCubeSubtitle(definition: SemanticCubeDefinition) {
  return `${definition.source.table} · ${definition.displayTitle}`;
}

export function computeSemanticPublishDiff(
  published: SemanticCubeDefinition,
  draft: SemanticCubeDefinition
): SemanticPublishDiffRow[] {
  const rows: SemanticPublishDiffRow[] = [];

  if (published.displayTitle !== draft.displayTitle) {
    rows.push({
      op: 'change',
      label: 'Куб',
      value: `заголовок: «${published.displayTitle}» → «${draft.displayTitle}»`,
    });
  }

  const publishedMeasures = new Map(published.measures.map((item) => [item.name, item]));
  const draftMeasures = new Map(draft.measures.map((item) => [item.name, item]));

  for (const [name, measure] of draftMeasures) {
    const prev = publishedMeasures.get(name);
    if (!prev) {
      rows.push({
        op: 'add',
        label: `Мера ${name}`,
        value: `${measure.type}(${measure.sql})${measure.format ? ` · ${measure.format}` : ''}`,
      });
      continue;
    }

    const changes: string[] = [];
    if (prev.title !== measure.title) changes.push(`заголовок: «${prev.title}» → «${measure.title}»`);
    if (prev.sql !== measure.sql) changes.push(`SQL: ${prev.sql} → ${measure.sql}`);
    if (prev.type !== measure.type) changes.push(`агрегация: ${prev.type} → ${measure.type}`);
    if (prev.format !== measure.format) {
      changes.push(`формат: ${prev.format ?? '—'} → ${measure.format ?? '—'}`);
    }

    if (changes.length > 0) {
      rows.push({ op: 'change', label: `Мера ${name}`, value: changes.join(' · ') });
    }
  }

  for (const name of publishedMeasures.keys()) {
    if (!draftMeasures.has(name)) {
      rows.push({ op: 'remove', label: `Мера ${name}`, value: 'удалена из черновика' });
    }
  }

  const publishedDimensions = new Map(published.dimensions.map((item) => [item.name, item]));
  const draftDimensions = new Map(draft.dimensions.map((item) => [item.name, item]));

  for (const [name, dimension] of draftDimensions) {
    const prev = publishedDimensions.get(name);
    if (!prev) {
      rows.push({
        op: 'add',
        label: `Измерение ${name}`,
        value: `${dimension.type} · ${dimension.sql}`,
      });
      continue;
    }

    const changes: string[] = [];
    if (prev.title !== dimension.title) changes.push(`заголовок: «${prev.title}» → «${dimension.title}»`);
    if (prev.sql !== dimension.sql) changes.push(`SQL: ${prev.sql} → ${dimension.sql}`);
    if (prev.type !== dimension.type) changes.push(`тип: ${prev.type} → ${dimension.type}`);

    if (changes.length > 0) {
      rows.push({ op: 'change', label: `Измерение ${name}`, value: changes.join(' · ') });
    }
  }

  for (const name of publishedDimensions.keys()) {
    if (!draftDimensions.has(name)) {
      rows.push({ op: 'remove', label: `Измерение ${name}`, value: 'удалено из черновика' });
    }
  }

  return rows;
}

export function semanticDefinitionsEqual(a: SemanticCubeDefinition, b: SemanticCubeDefinition) {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function semanticSourceNodeId(table: string) {
  const slug = (table.split('.').pop() ?? 'source').replace(/[^a-z0-9_]/gi, '_').toLowerCase();
  return `source:${slug}`;
}

export function semanticCubeNodeId(cubeName: string) {
  return `cube:${cubeName.charAt(0).toLowerCase()}${cubeName.slice(1)}`;
}

export function tableToCubeName(table: string) {
  const base = table.split('.').pop() ?? table;
  return base.charAt(0).toUpperCase() + base.slice(1);
}

export function buildDefaultGraphLayout(definition: SemanticCubeDefinition): SemanticGraphLayout {
  const sourceId = semanticSourceNodeId(definition.source.table);
  const cubeId = semanticCubeNodeId(definition.name);

  const layout: SemanticGraphLayout = {
    [sourceId]: { x: 48, y: 176 },
    [cubeId]: { x: 296, y: 156 },
  };

  definition.measures.forEach((measure, index) => {
    layout[measure.id] = { x: 576, y: 32 + index * 96 };
  });

  definition.dimensions.forEach((dimension, index) => {
    layout[dimension.id] = {
      x: dimension.locked ? 48 : index % 2 === 0 ? 576 : 296,
      y: dimension.locked ? 352 : 320 + index * 72,
    };
  });

  return layout;
}

export const SemanticTableInfoSchema = z.object({
  schema: z.string(),
  name: z.string(),
  qualifiedName: z.string(),
  columnCount: z.number().int().nonnegative(),
});

export type SemanticTableInfo = z.infer<typeof SemanticTableInfoSchema>;

export const SemanticColumnInfoSchema = z.object({
  name: z.string(),
  dataType: z.string(),
  isNullable: z.boolean(),
});

export type SemanticColumnInfo = z.infer<typeof SemanticColumnInfoSchema>;

export const CreateSemanticCubeSchema = z.object({
  table: z.string().min(1).max(200),
  name: z.string().min(1).max(80).optional(),
  displayTitle: z.string().min(1).max(200).optional(),
  connectionId: z.string().uuid().optional(),
});

export type CreateSemanticCubeInput = z.infer<typeof CreateSemanticCubeSchema>;

const NUMERIC_TYPES = new Set([
  'smallint',
  'integer',
  'bigint',
  'decimal',
  'numeric',
  'real',
  'double precision',
  'money',
]);

const TIME_TYPES = new Set(['timestamp without time zone', 'timestamp with time zone', 'date', 'time']);

function columnToMemberName(column: string) {
  return column.replace(/_([a-z])/g, (_, char: string) => char.toUpperCase());
}

export function scaffoldSemanticCubeFromTable(input: {
  table: string;
  columns: SemanticColumnInfo[];
  connectionLabel: string;
  name?: string;
  displayTitle?: string;
}): SemanticCubeDefinition {
  const qualifiedTable = input.table.includes('.') ? input.table : `public.${input.table}`;
  const cubeName = input.name ?? tableToCubeName(qualifiedTable);
  const displayTitle = input.displayTitle ?? cubeName;

  const columnNames = input.columns.map((column) => column.name);
  const measures: SemanticMeasure[] = [];
  const dimensions: SemanticDimension[] = [];

  for (const column of input.columns) {
    const memberName = columnToMemberName(column.name);

    if (column.name === 'tenant_id') {
      dimensions.push({
        id: `dimension:tenantId`,
        name: 'tenantId',
        title: 'tenantId',
        description: 'Системное измерение · нельзя удалить',
        sql: column.name,
        type: 'string',
        locked: true,
      });
      continue;
    }

    if (column.name === 'id' || column.name.endsWith('_id')) {
      dimensions.push({
        id: `dimension:${memberName}`,
        name: memberName,
        title: memberName,
        sql: column.name,
        type: 'string',
      });
      continue;
    }

    if (TIME_TYPES.has(column.dataType)) {
      dimensions.push({
        id: `dimension:${memberName}`,
        name: memberName,
        title: memberName,
        sql: column.name,
        type: 'time',
        granularity: 'day',
      });
      continue;
    }

    if (NUMERIC_TYPES.has(column.dataType)) {
      measures.push({
        id: `measure:${memberName}`,
        name: memberName,
        title: memberName,
        sql: column.name,
        type: 'sum',
        format: column.dataType === 'money' ? 'currency' : undefined,
      });
      continue;
    }

    dimensions.push({
      id: `dimension:${memberName}`,
      name: memberName,
      title: memberName,
      sql: column.name,
      type: 'string',
    });
  }

  if (!measures.some((item) => item.type === 'count')) {
    measures.unshift({
      id: 'measure:count',
      name: 'count',
      title: 'Количество строк',
      sql: '*',
      type: 'count',
    });
  }

  if (!dimensions.some((item) => item.locked)) {
    dimensions.push({
      id: 'dimension:tenantId',
      name: 'tenantId',
      title: 'tenantId',
      description: 'Добавьте tenant_id в таблицу для multi-tenant фильтра',
      sql: 'tenant_id',
      type: 'string',
      locked: true,
    });
    columnNames.push('tenant_id');
  }

  return SemanticCubeDefinitionSchema.parse({
    name: cubeName,
    displayTitle,
    description: `Куб из ${qualifiedTable}`,
    source: {
      sql: `SELECT * FROM ${qualifiedTable}`,
      table: qualifiedTable,
      connectionLabel: input.connectionLabel,
      columns: columnNames,
    },
    measures: measures.slice(0, 8),
    dimensions: dimensions.slice(0, 8),
  });
}
