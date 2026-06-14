import { sql } from 'drizzle-orm';
import type { FastifyRequest } from 'fastify';

import { auth } from '../auth.js';
import { db } from '../db/index.js';
import { pendingFounderCompany } from '../db/schema.js';
import { buildUniqueOrgSlug } from './org-slug.js';
import { listOrganizationsForUser } from './org-context.js';
import { getSessionFromRequest, buildWebRequest } from './auth-request.js';
import { seedDemoOrdersForTenant } from './seed-demo-orders.js';

export async function savePendingFounderCompany(email: string, companyName: string) {
  const normalizedEmail = email.toLowerCase();
  await db
    .insert(pendingFounderCompany)
    .values({ email: normalizedEmail, companyName })
    .onConflictDoUpdate({
      target: pendingFounderCompany.email,
      set: { companyName, createdAt: new Date() },
    });
}

export async function getPendingFounderCompany(email: string) {
  const [row] = await db
    .select({ companyName: pendingFounderCompany.companyName })
    .from(pendingFounderCompany)
    .where(sql`lower(${pendingFounderCompany.email}) = ${email.toLowerCase()}`)
    .limit(1);

  return row ?? null;
}

export async function deletePendingFounderCompany(email: string) {
  await db
    .delete(pendingFounderCompany)
    .where(sql`lower(${pendingFounderCompany.email}) = ${email.toLowerCase()}`);
}

export async function completeFounderSetup(request: FastifyRequest) {
  const session = await getSessionFromRequest(request);
  if (!session?.user) return null;

  const memberships = await listOrganizationsForUser(session.user.id);
  if (memberships.length > 0) return null;

  const pending = await getPendingFounderCompany(session.user.email);
  if (!pending) return null;

  const slug = await buildUniqueOrgSlug(pending.companyName);
  const webRequest = await buildWebRequest(request);

  const created = await auth.api.createOrganization({
    headers: webRequest.headers,
    body: { name: pending.companyName, slug },
  });

  if (!created?.id) return null;

  await auth.api.setActiveOrganization({
    headers: webRequest.headers,
    body: { organizationId: created.id },
  });

  await seedDemoOrdersForTenant(created.id);
  await deletePendingFounderCompany(session.user.email);

  return {
    id: created.id,
    name: created.name,
    slug: created.slug,
    role: 'owner' as const,
  };
}
