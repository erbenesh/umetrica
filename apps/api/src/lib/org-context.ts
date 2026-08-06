import { eq } from 'drizzle-orm';

import { db } from '../db/index.js';
import { member, organization, session } from '../db/schema.js';
import { getSessionFromRequest } from './auth-request.js';
import { seedDemoSemanticForTenant } from './seed-demo-semantic.js';
import type { FastifyRequest } from 'fastify';

export async function resolveActiveOrganizationId(request: FastifyRequest): Promise<string | null> {
  const authSession = await getSessionFromRequest(request);
  if (!authSession?.user) return null;

  if (authSession.session.activeOrganizationId) {
    return authSession.session.activeOrganizationId;
  }

  const [firstMembership] = await db
    .select({ organizationId: member.organizationId })
    .from(member)
    .where(eq(member.userId, authSession.user.id))
    .limit(1);

  if (!firstMembership) return null;

  await db
    .update(session)
    .set({ activeOrganizationId: firstMembership.organizationId })
    .where(eq(session.id, authSession.session.id));

  return firstMembership.organizationId;
}

export async function ensureDemoDataForRequest(request: FastifyRequest) {
  const tenantId = await resolveActiveOrganizationId(request);
  if (!tenantId) return null;

  const result = await seedDemoSemanticForTenant(tenantId);
  return { tenantId, ...result };
}

export async function listOrganizationsForUser(userId: string) {
  return db
    .select({
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      logo: organization.logo,
      role: member.role,
    })
    .from(member)
    .innerJoin(organization, eq(member.organizationId, organization.id))
    .where(eq(member.userId, userId));
}
