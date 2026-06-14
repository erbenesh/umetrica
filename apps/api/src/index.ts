import { config } from 'dotenv';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = fileURLToPath(new URL('../../..', import.meta.url));
config({ path: resolve(rootDir, '.env') });

import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import Fastify from 'fastify';

import { getSessionFromRequest, handleAuthRequest, buildWebRequest, sendAuthResponse } from './lib/auth-request.js';
import { createCubeToken } from './lib/cube-token.js';
import {
  ensureDemoDataForRequest,
  listOrganizationsForUser,
  resolveActiveOrganizationId,
} from './lib/org-context.js';
import { seedDemoOrdersForTenant } from './lib/seed-demo-orders.js';
import { registerDashboardRoutes } from './routes/dashboards.js';
import { registerInsightRoutes } from './routes/insights.js';
import { registerInvitationRoutes } from './routes/invitations.js';
import { registerAuthRoutes } from './routes/register.js';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';

import { auth } from './auth.js';
import { db } from './db/index.js';
import { member, organization } from './db/schema.js';
import { buildUniqueOrgSlug } from './lib/org-slug.js';

const PORT = Number(process.env.API_PORT ?? 3001);
const HOST = process.env.API_HOST ?? '0.0.0.0';
const CORS_ORIGIN = process.env.CORS_ORIGIN ?? 'http://localhost:5173';

const app = Fastify({
  logger: true,
});

await app.register(cors, {
  origin: CORS_ORIGIN,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
});

await app.register(cookie);

app.route({
  method: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  url: '/api/auth/*',
  handler: async (request, reply) => {
    const response = await handleAuthRequest(request);
    return sendAuthResponse(reply, response);
  },
});

app.get('/api/health', async () => ({ status: 'ok', service: 'umetrica-api' }));

app.get('/api/cube/token', async (request, reply) => {
  const session = await getSessionFromRequest(request);

  if (!session?.user) {
    return reply.status(401).send({ error: 'Unauthorized' });
  }

  const tenantId = await resolveActiveOrganizationId(request);
  if (!tenantId) {
    return reply.status(400).send({ error: 'No organization found. Create or join an organization first.' });
  }

  await seedDemoOrdersForTenant(tenantId);

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

  const body = z.object({ name: z.string().min(2).max(100) }).parse(request.body);
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

    await seedDemoOrdersForTenant(created.id);

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
  };
});

await registerDashboardRoutes(app);
await registerInsightRoutes(app);
await registerInvitationRoutes(app);
await registerAuthRoutes(app);

try {
  await app.listen({ port: PORT, host: HOST });
  app.log.info(`umetrica API listening on http://${HOST}:${PORT}`);
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
