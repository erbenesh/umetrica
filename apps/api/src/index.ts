import { config } from 'dotenv';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = fileURLToPath(new URL('../../..', import.meta.url));
config({ path: resolve(rootDir, '.env') });

import type { OrgDataMode, TrustCapabilities } from '@sellerpool/core';
import { BRAND_NAME } from '@sellerpool/core';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import multipart from '@fastify/multipart';
import Fastify from 'fastify';

import { getSessionFromRequest, handleAuthRequest, buildWebRequest, sendAuthResponse } from './lib/auth-request.js';
import { createCubeToken } from './lib/cube-token.js';
import {
  ensureDemoDataForRequest,
  listOrganizationsForUser,
  resolveActiveOrganizationId,
} from './lib/org-context.js';
import { updatePrivacySettings } from './lib/org-metadata.js';
import { startInsightScheduler } from './lib/insight-scheduler.js';
import { ensureBenchmarkPoolReady } from './lib/benchmark-pool.js';
import { startBenchmarkPoolScheduler } from './lib/benchmark-pool-scheduler.js';
import { getOrgPolicyContext } from './lib/policy-gate.js';
import { ensureMarketSegmentSnapshots } from './lib/seed-market-segments.js';
import { seedDemoSemanticForTenant } from './lib/seed-demo-semantic.js';
import { registerBillingRoutes } from './routes/billing.js';
import { registerConnectionRoutes } from './routes/connections.js';
import { registerDashboardRoutes } from './routes/dashboards.js';
import { registerInsightRoutes } from './routes/insights.js';
import { registerInvitationRoutes } from './routes/invitations.js';
import { registerPrivacyRoutes } from './routes/privacy.js';
import { registerAuthRoutes } from './routes/register.js';
import { registerAuditRoutes } from './routes/audit.js';
import { registerEnterpriseLlmRoutes } from './routes/enterprise-llm.js';
import { registerSemanticRoutes } from './routes/semantic.js';
import { registerSsoRoutes } from './routes/sso.js';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';

import { auth } from './auth.js';
import { db } from './db/index.js';
import { member, organization } from './db/schema.js';
import { buildUniqueOrgSlug } from './lib/org-slug.js';
import { registerHttpErrorHandler } from './lib/http-errors.js';

const PORT = Number(process.env.API_PORT ?? 3001);
const HOST = process.env.API_HOST ?? '0.0.0.0';
const CORS_ORIGIN = process.env.CORS_ORIGIN ?? 'http://localhost:5173';

const app = Fastify({
  logger: true,
});

registerHttpErrorHandler(app);

await app.register(cors, {
  origin: CORS_ORIGIN,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
});

await app.register(cookie);
await app.register(multipart, {
  limits: {
    fileSize: 20 * 1024 * 1024,
    files: 1,
  },
});

app.route({
  method: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  url: '/api/auth/*',
  handler: async (request, reply) => {
    const response = await handleAuthRequest(request);
    return sendAuthResponse(reply, response);
  },
});

app.get('/api/health', async () => ({ status: 'ok', service: 'sellerpool-api' }));

app.get('/api/cube/token', async (request, reply) => {
  const session = await getSessionFromRequest(request);

  if (!session?.user) {
    return reply.status(401).send({ error: 'Unauthorized' });
  }

  const tenantId = await resolveActiveOrganizationId(request);
  if (!tenantId) {
    return reply.status(400).send({ error: 'No organization found. Create or join an organization first.' });
  }

  await seedDemoSemanticForTenant(tenantId);

  const token = await createCubeToken({
    tenantId,
    userId: session.user.id,
  });

  return {
    token,
    cubeUrl: process.env.CUBE_URL ?? 'http://localhost:4000',
    expiresIn: 900,
  };
});

app.post('/api/seed/demo', async (request, reply) => {
  const session = await getSessionFromRequest(request);
  if (!session?.user) {
    return reply.status(401).send({ error: 'Unauthorized' });
  }

  const result = await ensureDemoDataForRequest(request);
  if (!result) {
    return reply.status(400).send({ error: 'No organization found' });
  }

  return result;
});

app.get('/api/organizations', async (request, reply) => {
  const session = await getSessionFromRequest(request);
  if (!session?.user) {
    return reply.status(401).send({ error: 'Unauthorized' });
  }

  const organizations = await listOrganizationsForUser(session.user.id);
  return { organizations };
});

app.post('/api/organizations', async (request, reply) => {
  const session = await getSessionFromRequest(request);
  if (!session?.user) {
    return reply.status(401).send({ error: 'Unauthorized' });
  }

  const body = z
    .object({
      name: z.string().min(2).max(100),
      marketCategory: z.string().min(1).max(120).optional(),
    })
    .parse(request.body);
  const slug = await buildUniqueOrgSlug(body.name);
  const webRequest = await buildWebRequest(request);

  try {
    const created = await auth.api.createOrganization({
      headers: webRequest.headers,
      body: { name: body.name, slug },
    });

    if (!created?.id) {
      return reply.status(400).send({ error: 'Failed to create organization' });
    }

    await auth.api.setActiveOrganization({
      headers: webRequest.headers,
      body: { organizationId: created.id },
    });

    await seedDemoSemanticForTenant(created.id);

    if (body.marketCategory) {
      await updatePrivacySettings(created.id, { marketCategory: body.marketCategory });
    }

    return {
      organization: {
        id: created.id,
        name: created.name,
        slug: created.slug,
        role: 'owner',
      },
    };
  } catch (error) {
    request.log.error(error);
    return reply.status(400).send({
      error: error instanceof Error ? error.message : 'Failed to create organization',
    });
  }
});

app.get('/api/me', async (request, reply) => {
  const session = await getSessionFromRequest(request);

  if (!session?.user) {
    return reply.status(401).send({ error: 'Unauthorized' });
  }

  const activeOrganizationId = await resolveActiveOrganizationId(request);

  let role: string | undefined;
  let activeOrganization: { id: string; name: string } | undefined;
  let dataMode: OrgDataMode | undefined;
  let trustCapabilities: TrustCapabilities | undefined;

  if (activeOrganizationId) {
    const [membership] = await db
      .select({
        role: member.role,
        name: organization.name,
      })
      .from(member)
      .innerJoin(organization, eq(member.organizationId, organization.id))
      .where(
        and(eq(member.userId, session.user.id), eq(member.organizationId, activeOrganizationId))
      )
      .limit(1);

    if (membership) {
      role = membership.role;
      activeOrganization = {
        id: activeOrganizationId,
        name: membership.name,
      };

      const policy = await getOrgPolicyContext(activeOrganizationId);
      dataMode = policy.dataMode;
      trustCapabilities = policy.capabilities;
    }
  }

  return {
    user: session.user,
    session: {
      id: session.session.id,
      activeOrganizationId,
    },
    role,
    organization: activeOrganization,
    dataMode,
    trustCapabilities,
  };
});

await registerDashboardRoutes(app);
await registerInsightRoutes(app);
await registerInvitationRoutes(app);
await registerAuthRoutes(app);
await registerConnectionRoutes(app);
await registerBillingRoutes(app);
await registerPrivacyRoutes(app);
await registerSemanticRoutes(app);
await registerAuditRoutes(app);
await registerSsoRoutes(app);
await registerEnterpriseLlmRoutes(app);

try {
  await ensureMarketSegmentSnapshots();
} catch (error) {
  app.log.warn(
    { err: error },
    'Не удалось загрузить market_segment_snapshots — выполните pnpm db:push и перезапустите API'
  );
}

try {
  await ensureBenchmarkPoolReady();
} catch (error) {
  app.log.warn(
    { err: error },
    'Не удалось инициализировать benchmark_pool_contributions — выполните pnpm db:push и перезапустите API'
  );
}

try {
  await app.listen({ port: PORT, host: HOST });
  app.log.info(`${BRAND_NAME} API listening on http://${HOST}:${PORT}`);
  startInsightScheduler();
  startBenchmarkPoolScheduler();
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
