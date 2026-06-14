---
name: umetrica-dev
description: >-
  umetrica local development workflow: pnpm, turbo, docker, db:push, env.
  Use when starting dev, debugging setup, running commands, or onboarding
  to the monorepo.
---

# umetrica Dev Workflow

## Prerequisites

- Node 22+, Docker Desktop
- `.env` at repo root (copy from `.env.example`)

## Install & run

```bash
npx pnpm@9.15.4 install
docker compose up -d
npx pnpm@9.15.4 dev
```

- API: http://localhost:3001
- Studio: http://localhost:5173
- Cube: http://localhost:4000

## Common commands

| Command | Purpose |
|---------|---------|
| `npx pnpm@9.15.4 typecheck` | TS across monorepo |
| `npx pnpm@9.15.4 lint` | ESLint |
| `npx pnpm@9.15.4 db:push` | Push Drizzle schema (ask user first) |
| `npx pnpm@9.15.4 build` | Production build |

## After schema changes

1. Add table file to `apps/api/drizzle.config.ts`
2. Run `db:push` (with user approval)
3. Restart API

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Cube 400 "cube not found" | Models must be in `cube/model/cubes/` |
| `process is not defined` | Vite `define` in `vite.config.ts` |
| pnpm import error | Add transitive dep directly to package |
| Empty JSON body 400 | Only set Content-Type when body exists |
