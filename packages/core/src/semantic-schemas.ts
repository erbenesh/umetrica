import { z } from 'zod';

export const SemanticMeasureTypeSchema = z.enum(['sum', 'count', 'avg', 'min', 'max']);
export type SemanticMeasureType = z.infer<typeof SemanticMeasureTypeSchema>;

export const SemanticDimensionTypeSchema = z.enum(['string', 'time', 'number', 'boolean']);
export type SemanticDimensionType = z.infer<typeof SemanticDimensionTypeSchema>;

export const SemanticMeasureSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(80),
  title: z.string().min(1).max(200),
  shortTitle: z.string().min(1).max(80).optional(),
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
  shortTitle: z.string().min(1).max(80).optional(),
  description: z.string().min(1).max(500).optional(),
  sql: z.string().min(1).max(500),
  type: SemanticDimensionTypeSchema,
  granularity: z.enum(['day', 'week', 'month', 'year']).optional(),
  primaryKey: z.boolean().optional(),
  locked: z.boolean().optional(),
});

export type SemanticDimension = z.infer<typeof SemanticDimensionSchema>;

export const SemanticSourceSchema = z.object({
  sql: z.string().min(1).max(2000),
  table: z.string().min(1).max(200),
  connectionLabel: z.string().min(1).max(120),
  connectionId: z.string().uuid().optional(),
  columns: z.array(z.string().min(1).max(120)),
});

export type SemanticSource = z.infer<typeof SemanticSourceSchema>;

export const SemanticJoinRelationshipSchema = z.enum(['belongsTo', 'hasMany', 'hasOne']);
export type SemanticJoinRelationship = z.infer<typeof SemanticJoinRelationshipSchema>;

export const SemanticJoinSchema = z.object({
  id: z.string().min(1),
  targetCube: z.string().min(1).max(80),
  relationship: SemanticJoinRelationshipSchema,
  sql: z.string().min(1).max(1000),
});

export type SemanticJoin = z.infer<typeof SemanticJoinSchema>;

export const SemanticSegmentSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(80),
  title: z.string().min(1).max(200).optional(),
  shortTitle: z.string().min(1).max(80).optional(),
  sql: z.string().min(1).max(2000),
});

export type SemanticSegment = z.infer<typeof SemanticSegmentSchema>;

export const SemanticHierarchySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(80),
  title: z.string().min(1).max(200).optional(),
  shortTitle: z.string().min(1).max(80).optional(),
  levels: z.array(z.string().min(1).max(80)).min(2),
});

export type SemanticHierarchy = z.infer<typeof SemanticHierarchySchema>;

export const SemanticPreAggregationRefreshKeySchema = z.object({
  every: z.string().min(1).max(80).optional(),
  sql: z.string().min(1).max(2000).optional(),
});

export type SemanticPreAggregationRefreshKey = z.infer<typeof SemanticPreAggregationRefreshKeySchema>;

export const SemanticPreAggregationSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1).max(80),
    measures: z.array(z.string().min(1).max(80)).min(1),
    dimensions: z.array(z.string().min(1).max(80)).default([]),
    timeDimension: z.string().min(1).max(80).optional(),
    granularity: z.enum(['day', 'week', 'month', 'year']).optional(),
    refreshKey: SemanticPreAggregationRefreshKeySchema.optional(),
  })
  .superRefine((value, ctx) => {
    if (value.timeDimension && !value.granularity) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'granularity is required when timeDimension is set',
        path: ['granularity'],
      });
    }
    if (value.refreshKey && !value.refreshKey.every && !value.refreshKey.sql) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'refreshKey requires every or sql',
        path: ['refreshKey'],
      });
    }
  });

export type SemanticPreAggregation = z.infer<typeof SemanticPreAggregationSchema>;

export const SemanticCubeDefinitionSchema = z.object({
  name: z.string().min(1).max(80),
  displayTitle: z.string().min(1).max(200),
  displayShortTitle: z.string().min(1).max(80).optional(),
  description: z.string().max(1000).optional(),
  source: SemanticSourceSchema,
  measures: z.array(SemanticMeasureSchema).min(1),
  dimensions: z.array(SemanticDimensionSchema).min(1),
  joins: z.array(SemanticJoinSchema).default([]),
  segments: z.array(SemanticSegmentSchema).default([]),
  hierarchies: z.array(SemanticHierarchySchema).default([]),
  preAggregations: z.array(SemanticPreAggregationSchema).default([]),
});

export type SemanticCubeDefinition = z.infer<typeof SemanticCubeDefinitionSchema>;

export const SemanticNodePositionSchema = z.object({
  x: z.number(),
  y: z.number(),
});

export const SemanticGraphLayoutSchema = z.record(z.string(), SemanticNodePositionSchema);
export type SemanticGraphLayout = z.infer<typeof SemanticGraphLayoutSchema>;

export const SemanticWorkspaceLayoutSchema = z.object({
  cubes: z.record(z.string(), SemanticNodePositionSchema).default({}),
  views: z.record(z.string(), SemanticNodePositionSchema).default({}),
});

export type SemanticWorkspaceLayout = z.infer<typeof SemanticWorkspaceLayoutSchema>;

export const SemanticViewCubeIncludeSchema = z.object({
  joinPath: z.string().min(1).max(200),
  includes: z.array(z.string().min(1).max(80)).min(1),
});

export type SemanticViewCubeInclude = z.infer<typeof SemanticViewCubeIncludeSchema>;

export const SemanticViewDefinitionSchema = z.object({
  name: z.string().min(1).max(80),
  title: z.string().min(1).max(200),
  shortTitle: z.string().min(1).max(80).optional(),
  description: z.string().max(1000).optional(),
  cubes: z.array(SemanticViewCubeIncludeSchema).min(1),
});

export type SemanticViewDefinition = z.infer<typeof SemanticViewDefinitionSchema>;

export const SemanticViewStatusSchema = z.enum(['published', 'draft']);
export type SemanticViewStatus = z.infer<typeof SemanticViewStatusSchema>;

export const SemanticViewListItemSchema = z.object({
  name: z.string(),
  title: z.string(),
  status: SemanticViewStatusSchema,
  cubePathCount: z.number().int().nonnegative(),
  memberCount: z.number().int().nonnegative(),
  updatedAt: z.string().datetime(),
  publishedAt: z.string().datetime().nullable(),
});

export type SemanticViewListItem = z.infer<typeof SemanticViewListItemSchema>;

export const SemanticViewDetailSchema = z.object({
  name: z.string(),
  title: z.string(),
  status: SemanticViewStatusSchema,
  draft: SemanticViewDefinitionSchema,
  published: SemanticViewDefinitionSchema,
  updatedAt: z.string().datetime(),
  publishedAt: z.string().datetime().nullable(),
});

export type SemanticViewDetail = z.infer<typeof SemanticViewDetailSchema>;

export const UpdateSemanticViewDraftSchema = z.object({
  draft: SemanticViewDefinitionSchema,
});

export type UpdateSemanticViewDraftInput = z.infer<typeof UpdateSemanticViewDraftSchema>;

export const CreateSemanticViewSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  title: z.string().min(1).max(200),
  baseCube: z.string().min(1).max(80),
});

export type CreateSemanticViewInput = z.infer<typeof CreateSemanticViewSchema>;

export const SemanticForeignKeyInfoSchema = z.object({
  fromTable: z.string(),
  fromColumn: z.string(),
  toTable: z.string(),
  toColumn: z.string(),
  suggestedSql: z.string(),
});

export type SemanticForeignKeyInfo = z.infer<typeof SemanticForeignKeyInfoSchema>;

export const SemanticPreviewQueryInputSchema = z.object({
  query: z.record(z.unknown()),
});

export type SemanticPreviewQueryInput = z.infer<typeof SemanticPreviewQueryInputSchema>;

export const SemanticYamlResponseSchema = z.object({
  yaml: z.string(),
  variant: z.enum(['draft', 'published']),
});

export type SemanticYamlResponse = z.infer<typeof SemanticYamlResponseSchema>;

export const SemanticCubeStatusSchema = z.enum(['published', 'draft']);
export type SemanticCubeStatus = z.infer<typeof SemanticCubeStatusSchema>;

export const SemanticCubeListItemSchema = z.object({
  name: z.string(),
  title: z.string(),
  shortTitle: z.string().optional(),
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
  displayShortTitle: 'Заказы',
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
      title: 'Выручка по заказам',
      shortTitle: 'Выручка',
      description: 'sum(amount)',
      sql: 'amount',
      type: 'sum',
      format: 'currency',
    },
    {
      id: 'measure:count',
      name: 'count',
      title: 'Количество заказов',
      shortTitle: 'Заказы',
      description: 'count(*)',
      sql: '*',
      type: 'count',
    },
    {
      id: 'measure:avgOrder',
      name: 'avgOrder',
      title: 'Средний чек',
      shortTitle: 'Ср. чек',
      description: 'avg(amount)',
      sql: 'amount',
      type: 'avg',
      format: 'currency',
    },
  ],
  joins: [],
  segments: [],
  hierarchies: [],
  preAggregations: [],
  dimensions: [
    {
      id: 'dimension:status',
      name: 'status',
      title: 'Статус заказа',
      shortTitle: 'Статус',
      description: 'status → string',
      sql: 'status',
      type: 'string',
    },
    {
      id: 'dimension:createdAt',
      name: 'createdAt',
      title: 'Дата заказа',
      shortTitle: 'Дата',
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

export function semanticCubeLabel(cube: {
  name: string;
  displayTitle?: string;
  displayShortTitle?: string;
  title?: string;
  shortTitle?: string;
}) {
  return (
    cube.displayShortTitle ??
    cube.shortTitle ??
    cube.displayTitle ??
    cube.title ??
    cube.name
  );
}

export function semanticMemberLabel(member: {
  name: string;
  title?: string;
  shortTitle?: string;
}) {
  return member.shortTitle ?? member.title ?? member.name;
}

/** Cube.js требует primary key на измерении id (особенно для кубов в join-графе). */
export function ensureCubePrimaryKey(definition: SemanticCubeDefinition): SemanticCubeDefinition {
  const dimensions = [...definition.dimensions];
  const idIndex = dimensions.findIndex((dimension) => dimension.name === 'id' || dimension.sql === 'id');

  if (idIndex >= 0) {
    const existing = dimensions[idIndex];
    if (!existing) return definition;
    if (existing.primaryKey) return definition;
    dimensions[idIndex] = { ...existing, primaryKey: true };
    return { ...definition, dimensions };
  }

  if (!definition.source.columns.includes('id')) return definition;

  return {
    ...definition,
    dimensions: [
      {
        id: 'dimension:id',
        name: 'id',
        title: 'ID',
        sql: 'id',
        type: 'string',
        primaryKey: true,
      },
      ...dimensions,
    ],
  };
}

/** @deprecated alias — используйте ensureCubePrimaryKey */
export function ensureJoinPrimaryKeys(definition: SemanticCubeDefinition): SemanticCubeDefinition {
  return ensureCubePrimaryKey(definition);
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

  if ((published.displayShortTitle ?? '') !== (draft.displayShortTitle ?? '')) {
    rows.push({
      op: 'change',
      label: 'Куб',
      value: `краткий заголовок: «${published.displayShortTitle ?? '—'}» → «${draft.displayShortTitle ?? '—'}»`,
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
    if ((prev.shortTitle ?? '') !== (measure.shortTitle ?? '')) {
      changes.push(
        `краткий заголовок: «${prev.shortTitle ?? '—'}» → «${measure.shortTitle ?? '—'}»`
      );
    }
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
    if ((prev.shortTitle ?? '') !== (dimension.shortTitle ?? '')) {
      changes.push(
        `краткий заголовок: «${prev.shortTitle ?? '—'}» → «${dimension.shortTitle ?? '—'}»`
      );
    }
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

  const publishedJoins = new Map((published.joins ?? []).map((item) => [item.targetCube, item]));
  const draftJoins = new Map((draft.joins ?? []).map((item) => [item.targetCube, item]));

  for (const [target, join] of draftJoins) {
    const prev = publishedJoins.get(target);
    if (!prev) {
      rows.push({
        op: 'add',
        label: `Join ${target}`,
        value: `${join.relationship} · ${join.sql}`,
      });
      continue;
    }

    const changes: string[] = [];
    if (prev.relationship !== join.relationship) {
      changes.push(`тип: ${prev.relationship} → ${join.relationship}`);
    }
    if (prev.sql !== join.sql) changes.push(`SQL: ${prev.sql} → ${join.sql}`);

    if (changes.length > 0) {
      rows.push({ op: 'change', label: `Join ${target}`, value: changes.join(' · ') });
    }
  }

  for (const target of publishedJoins.keys()) {
    if (!draftJoins.has(target)) {
      rows.push({ op: 'remove', label: `Join ${target}`, value: 'удалён из черновика' });
    }
  }

  const publishedSegments = new Map((published.segments ?? []).map((item) => [item.name, item]));
  const draftSegments = new Map((draft.segments ?? []).map((item) => [item.name, item]));

  for (const [name, segment] of draftSegments) {
    const prev = publishedSegments.get(name);
    if (!prev) {
      rows.push({
        op: 'add',
        label: `Сегмент ${name}`,
        value: segment.sql,
      });
      continue;
    }

    const changes: string[] = [];
    if ((prev.title ?? prev.name) !== (segment.title ?? segment.name)) {
      changes.push(`заголовок: «${prev.title ?? prev.name}» → «${segment.title ?? segment.name}»`);
    }
    if ((prev.shortTitle ?? '') !== (segment.shortTitle ?? '')) {
      changes.push(
        `краткий заголовок: «${prev.shortTitle ?? '—'}» → «${segment.shortTitle ?? '—'}»`
      );
    }
    if (prev.sql !== segment.sql) changes.push(`SQL: ${prev.sql} → ${segment.sql}`);

    if (changes.length > 0) {
      rows.push({ op: 'change', label: `Сегмент ${name}`, value: changes.join(' · ') });
    }
  }

  for (const name of publishedSegments.keys()) {
    if (!draftSegments.has(name)) {
      rows.push({ op: 'remove', label: `Сегмент ${name}`, value: 'удалён из черновика' });
    }
  }

  const publishedHierarchies = new Map((published.hierarchies ?? []).map((item) => [item.name, item]));
  const draftHierarchies = new Map((draft.hierarchies ?? []).map((item) => [item.name, item]));

  for (const [name, hierarchy] of draftHierarchies) {
    const prev = publishedHierarchies.get(name);
    if (!prev) {
      rows.push({
        op: 'add',
        label: `Иерархия ${name}`,
        value: hierarchy.levels.join(' → '),
      });
      continue;
    }

    const changes: string[] = [];
    if ((prev.title ?? prev.name) !== (hierarchy.title ?? hierarchy.name)) {
      changes.push(
        `заголовок: «${prev.title ?? prev.name}» → «${hierarchy.title ?? hierarchy.name}»`
      );
    }
    if ((prev.shortTitle ?? '') !== (hierarchy.shortTitle ?? '')) {
      changes.push(
        `краткий заголовок: «${prev.shortTitle ?? '—'}» → «${hierarchy.shortTitle ?? '—'}»`
      );
    }
    if (prev.levels.join('>') !== hierarchy.levels.join('>')) {
      changes.push(`уровни: ${prev.levels.join(' → ')} → ${hierarchy.levels.join(' → ')}`);
    }

    if (changes.length > 0) {
      rows.push({ op: 'change', label: `Иерархия ${name}`, value: changes.join(' · ') });
    }
  }

  for (const name of publishedHierarchies.keys()) {
    if (!draftHierarchies.has(name)) {
      rows.push({ op: 'remove', label: `Иерархия ${name}`, value: 'удалена из черновика' });
    }
  }

  const summarizePreAggregation = (preAgg: {
    measures: string[];
    dimensions: string[];
    timeDimension?: string;
    granularity?: string;
    refreshKey?: { every?: string; sql?: string };
  }) => {
    const parts = [`меры: ${preAgg.measures.join(', ')}`];
    if (preAgg.dimensions.length > 0) {
      parts.push(`изм.: ${preAgg.dimensions.join(', ')}`);
    }
    if (preAgg.timeDimension) {
      parts.push(`время: ${preAgg.timeDimension} (${preAgg.granularity ?? 'day'})`);
    }
    if (preAgg.refreshKey?.every) {
      parts.push(`refresh: ${preAgg.refreshKey.every}`);
    } else if (preAgg.refreshKey?.sql) {
      parts.push('refresh: sql');
    }
    return parts.join(' · ');
  };

  const preAggregationSignature = (preAgg: {
    measures: string[];
    dimensions: string[];
    timeDimension?: string;
    granularity?: string;
    refreshKey?: { every?: string; sql?: string };
  }) =>
    JSON.stringify({
      measures: [...preAgg.measures].sort(),
      dimensions: [...preAgg.dimensions].sort(),
      timeDimension: preAgg.timeDimension ?? null,
      granularity: preAgg.granularity ?? null,
      refreshEvery: preAgg.refreshKey?.every ?? null,
      refreshSql: preAgg.refreshKey?.sql ?? null,
    });

  const publishedPreAggregations = new Map(
    (published.preAggregations ?? []).map((item) => [item.name, item])
  );
  const draftPreAggregations = new Map((draft.preAggregations ?? []).map((item) => [item.name, item]));

  for (const [name, preAgg] of draftPreAggregations) {
    const prev = publishedPreAggregations.get(name);
    if (!prev) {
      rows.push({
        op: 'add',
        label: `Pre-aggregation ${name}`,
        value: summarizePreAggregation(preAgg),
      });
      continue;
    }

    if (preAggregationSignature(prev) !== preAggregationSignature(preAgg)) {
      rows.push({
        op: 'change',
        label: `Pre-aggregation ${name}`,
        value: `${summarizePreAggregation(prev)} → ${summarizePreAggregation(preAgg)}`,
      });
    }
  }

  for (const name of publishedPreAggregations.keys()) {
    if (!draftPreAggregations.has(name)) {
      rows.push({ op: 'remove', label: `Pre-aggregation ${name}`, value: 'удалена из черновика' });
    }
  }

  return rows;
}

export function computeSemanticViewPublishDiff(
  published: SemanticViewDefinition,
  draft: SemanticViewDefinition
): SemanticPublishDiffRow[] {
  const rows: SemanticPublishDiffRow[] = [];

  if (published.title !== draft.title) {
    rows.push({
      op: 'change',
      label: 'View',
      value: `заголовок: «${published.title}» → «${draft.title}»`,
    });
  }

  const publishedPaths = new Map(published.cubes.map((item) => [item.joinPath, item]));
  const draftPaths = new Map(draft.cubes.map((item) => [item.joinPath, item]));

  for (const [path, cube] of draftPaths) {
    const prev = publishedPaths.get(path);
    if (!prev) {
      rows.push({
        op: 'add',
        label: `Путь ${path}`,
        value: cube.includes.join(', '),
      });
      continue;
    }

    const added = cube.includes.filter((item) => !prev.includes.includes(item));
    const removed = prev.includes.filter((item) => !cube.includes.includes(item));

    if (added.length > 0 || removed.length > 0) {
      const parts: string[] = [];
      if (added.length > 0) parts.push(`+${added.join(', ')}`);
      if (removed.length > 0) parts.push(`−${removed.join(', ')}`);
      rows.push({ op: 'change', label: `Путь ${path}`, value: parts.join(' · ') });
    }
  }

  for (const path of publishedPaths.keys()) {
    if (!draftPaths.has(path)) {
      rows.push({ op: 'remove', label: `Путь ${path}`, value: 'удалён из черновика' });
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

export function semanticJoinId(sourceCube: string, targetCube: string) {
  return `join:${sourceCube}->${targetCube}`;
}

export function buildSuggestedJoinSql(sourceCube: string, sourceColumn: string, targetCube: string, targetColumn: string) {
  return `\${${sourceCube}}.${sourceColumn} = \${${targetCube}}.${targetColumn}`;
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

const WORKSPACE_CARD_W = 220;
const WORKSPACE_CARD_H = 100;
const WORKSPACE_PAD = 48;
const WORKSPACE_MIN_W = 900;
const WORKSPACE_MIN_H = 500;

export function buildDefaultWorkspaceLayout(cubeNames: string[]): SemanticWorkspaceLayout {
  const cubes: SemanticWorkspaceLayout['cubes'] = {};
  cubeNames.forEach((name, index) => {
    const col = index % 3;
    const row = Math.floor(index / 3);
    cubes[name] = { x: WORKSPACE_PAD + col * (WORKSPACE_CARD_W + 48), y: WORKSPACE_PAD + row * (WORKSPACE_CARD_H + 48) };
  });
  return { cubes, views: {} };
}

export function computeWorkspaceBounds(
  layout: SemanticWorkspaceLayout,
  cubeNames: string[],
  viewNames: string[]
) {
  const positions: Array<{ x: number; y: number }> = [];

  for (const name of cubeNames) {
    positions.push(layout.cubes[name] ?? { x: WORKSPACE_PAD, y: WORKSPACE_PAD });
  }
  for (const name of viewNames) {
    positions.push(layout.views[name] ?? { x: WORKSPACE_PAD + 400, y: WORKSPACE_PAD });
  }

  if (positions.length === 0) {
    return { width: WORKSPACE_MIN_W, height: WORKSPACE_MIN_H, originX: 0, originY: 0 };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const pos of positions) {
    minX = Math.min(minX, pos.x);
    minY = Math.min(minY, pos.y);
    maxX = Math.max(maxX, pos.x + WORKSPACE_CARD_W);
    maxY = Math.max(maxY, pos.y + WORKSPACE_CARD_H);
  }

  const originX = Math.min(0, minX - WORKSPACE_PAD);
  const originY = Math.min(0, minY - WORKSPACE_PAD);
  const width = Math.max(WORKSPACE_MIN_W, maxX + WORKSPACE_PAD - originX);
  const height = Math.max(WORKSPACE_MIN_H, maxY + WORKSPACE_PAD - originY);

  return { width, height, originX, originY };
}

export function buildMemberPreviewQuery(
  draft: SemanticCubeDefinition,
  selected: string,
  sourceNodeId: string,
  cubeNodeId: string
): Record<string, unknown> {
  const cubeName = draft.name;

  if (selected === cubeNodeId) {
    return { meta: `cube ${cubeName}` };
  }

  if (selected === sourceNodeId) {
    return { source: draft.source.table };
  }

  const measure = draft.measures.find((item) => item.id === selected);
  if (measure) {
    const timeDim = draft.dimensions.find((item) => item.type === 'time');
    if (timeDim) {
      return {
        measures: [`${cubeName}.${measure.name}`],
        timeDimensions: [
          {
            dimension: `${cubeName}.${timeDim.name}`,
            dateRange: 'last 7 days',
          },
        ],
      };
    }
    return { measures: [`${cubeName}.${measure.name}`] };
  }

  const dimension = draft.dimensions.find((item) => item.id === selected);
  if (dimension) {
    const countMeasure = draft.measures.find((item) => item.type === 'count') ?? draft.measures[0];
    return {
      dimensions: [`${cubeName}.${dimension.name}`],
      measures: countMeasure ? [`${cubeName}.${countMeasure.name}`] : [],
      limit: 10,
    };
  }

  return { measures: [`${cubeName}.count`] };
}

export function listJoinPathsForCube(
  cubeName: string,
  cubes: SemanticCubeDefinition[]
): string[] {
  const paths = new Set<string>([cubeName]);
  const byName = new Map(cubes.map((cube) => [cube.name, cube]));

  function walk(current: string, prefix: string) {
    const cube = byName.get(current);
    if (!cube) return;
    for (const join of cube.joins ?? []) {
      const nextPath = `${prefix}.${join.targetCube}`;
      if (paths.has(nextPath)) continue;
      paths.add(nextPath);
      walk(join.targetCube, nextPath);
    }
  }

  walk(cubeName, cubeName);
  return [...paths];
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
  connectionId?: string;
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
        ...(column.name === 'id' ? { primaryKey: true } : {}),
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

  return SemanticCubeDefinitionSchema.parse({
    name: cubeName,
    displayTitle,
    description: `Куб из ${qualifiedTable}`,
    source: {
      sql: `SELECT * FROM ${qualifiedTable}`,
      table: qualifiedTable,
      connectionLabel: input.connectionLabel,
      ...(input.connectionId ? { connectionId: input.connectionId } : {}),
      columns: columnNames,
    },
    measures: measures.slice(0, 8),
    dimensions: dimensions.slice(0, 8),
    joins: [],
  });
}
