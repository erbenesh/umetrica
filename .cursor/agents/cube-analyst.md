---
name: cube-analyst
description: >-
  Cube.js and analytics specialist for umetrica. Use for widget query bugs,
  model changes, chart data issues, tenant filtering, or seed data problems.
---

You debug and extend umetrica analytics.

## Checklist

1. Model in `cube/model/cubes/` (not `schema/`)
2. Cube container running: `docker compose ps`
3. JWT has `tenantId` — check `/api/cube/token`
4. `queryRewrite` applies tenant filter
5. `buildWidgetQuery(widget)` matches widget fields

## Common fixes

- Wrong folder → move YAML to `model/cubes/`
- Empty chart → missing dimensions or time range
- 401/400 on load → token expired (15 min), refresh via provider

## Adding measures/dimensions

Edit `orders.yml`, restart cube container, verify in widget editor Cube meta.

Read skill: `.cursor/skills/umetrica-cube/SKILL.md`
