---
name: umetrica-cube
description: >-
  Cube.js integration for umetrica: models, tenant JWT, widget queries,
  seed data. Use when editing cube models, fixing chart data, or widget
  query issues.
---

# umetrica Cube.js

## Model location

```yaml
# cube/model/cubes/orders.yml
cubes:
  - name: Orders
    measures: [count, revenue, avgOrder]
    dimensions: [tenantId, status, createdAt]
```

## Tenant filter

`cube/cube.js` `queryRewrite` adds `Orders.tenantId = jwt.tenantId`.

## Server-side queries

```ts
import { loadCubeQuery } from '@umetrica/insights';

await loadCubeQuery(cubeUrl, token, {
  measures: ['Orders.revenue'],
  timeDimensions: [{ dimension: 'Orders.createdAt', dateRange: 'last 7 days' }],
});
```

Token from `createCubeToken({ tenantId, userId })`.

## Widget → query

`buildWidgetQuery(widget)` in `packages/core`:
- `timeDimension` + `dateRange` → `timeDimensions`
- `filters` → Cube filters
- Charts need dimensions; KPI needs measures only

## Date ranges (Cube syntax)

`last 7 days`, `last 30 days`, `from 14 days ago to 7 days ago`

## Pre-aggregations

- Определяются в Studio → куб → вкладка **Rollups**, публикуются в YAML как `pre_aggregations`
- Dev: `docker compose up -d` поднимает `cubestore` + `cube_refresh_worker`
- Статус сборки: Cube Playground http://localhost:4000 → Pre-aggregations
- После publish: `docker compose restart cube cube_refresh_worker` если meta не обновилась
