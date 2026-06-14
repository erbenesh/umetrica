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
