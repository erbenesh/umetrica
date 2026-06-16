# Sellerpool (Селлерпул) — Agent Guide

Embedded analytics + AI insights for marketplace sellers. Clean-room project (not BoostixERP).

## Stack

| Layer | Tech |
|-------|------|
| Monorepo | pnpm 9 + Turborepo + TypeScript |
| API | `apps/api` — Fastify, Better Auth, Drizzle, PostgreSQL |
| Studio | `apps/studio` — React 19, Vite, Tailwind 4, TanStack Query |
| Analytics | `cube/` — Cube.js self-hosted, tenant isolation via JWT |
| Shared | `packages/core` (Zod schemas), `packages/insights` (LLM pipeline) |

## Commands

```bash
npx pnpm@9.15.4 install
npx pnpm@9.15.4 dev          # turbo: api + studio
npx pnpm@9.15.4 typecheck
npx pnpm@9.15.4 lint
npx pnpm@9.15.4 db:push      # schema → Postgres (needs approval in prod)
docker compose up -d         # postgres, redis, cubestore, cube, cube_refresh_worker
```

pnpm is not global — always use `npx pnpm@9.15.4`.

## Architecture flows

1. **Auth** — Better Auth at `/api/auth/*`, orgs + roles (owner/admin/viewer)
2. **Cube** — `/api/cube/token` → JWT with `tenantId` → `queryRewrite` in `cube/cube.js`
3. **Dashboards** — widgets JSONB, `buildWidgetQuery()` in `packages/core`
4. **Insights** — `detectAnomalies` → brief → DeepSeek/Qwen → `insights` table

## Where to change what

| Task | Start here |
|------|------------|
| New API route | `apps/api/src/routes/`, register in `index.ts` |
| DB table | `apps/api/src/db/*.ts` + add to `drizzle.config.ts` |
| Studio page | `apps/studio/src/pages/`, route in `main.tsx` |
| Widget/query | `packages/core/src/schemas.ts`, `build-widget-query.ts` |
| Cube model | `cube/model/cubes/*.yml` (not `schema/`) |
| LLM insights | `packages/insights/src/` |
| Brand strings | `packages/core/src/brand.ts`, `apps/studio/src/lib/brand.ts` |

## Subagents (`.cursor/agents/`)

| Agent | Use when |
|-------|----------|
| `feature-builder` | New vertical slice (API + UI + schema) |
| `cube-analyst` | Cube queries, models, widget data issues |
| `sellerpool-debugger` | 400/500, auth, tenant, Docker |

## Rules (`.cursor/rules/`)

| Rule | Scope |
|-------|------|
| `project.mdc` | Always — monorepo layout, commands |
| `clean-room.mdc` | Always — no BoostixERP copying |
| `api.mdc` | `apps/api/**` |
| `studio.mdc` | `apps/studio/**` |
| `cube.mdc` | `cube/**` |
| `packages.mdc` | `packages/core/**` |
| `insights.mdc` | `packages/insights/**` |

## Project skills (`.cursor/skills/`)

| Skill | When |
|-------|------|
| `sellerpool-dev` | Setup, docker, pnpm, troubleshooting |
| `sellerpool-cube` | Models, tenant JWT, widget queries |
| `sellerpool-auth` | Orgs, invites, roles, verification |

## MCP

Copy `.cursor/mcp.json.example` → `.cursor/mcp.json` (gitignored):

```bash
cp .cursor/mcp.json.example .cursor/mcp.json
```

Enables Postgres read-only queries when Docker Postgres is running. Restart Cursor after adding MCP config.

## Constraints

- Minimize diff scope; match existing patterns
- No copying from BoostixERP — experience only
- Do not commit `.env`, secrets, or `mcp.json` with credentials
- Do not run `db:push` / destructive DB ops without user approval
- UI language: Russian for user-facing strings
- Only commit when user asks

## Verification before done

1. `npx pnpm@9.15.4 typecheck`
2. `npx pnpm@9.15.4 lint`
3. Mention if API restart / `db:push` / Docker needed
