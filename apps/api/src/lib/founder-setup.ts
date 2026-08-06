import { eq, sql } from 'drizzle-orm';
import type { FastifyRequest } from 'fastify';

import { auth } from '../auth.js';
import { db } from '../db/index.js';
import { pendingFounderCompany, user } from '../db/schema.js';
import { buildUniqueOrgSlug } from './org-slug.js';
import { listOrganizationsForUser } from './org-context.js';
import { getSessionFromRequest, buildWebRequest } from './auth-request.js';
import { updatePrivacySettings } from './org-metadata.js';
import { seedDemoSemanticForTenant } from './seed-demo-semantic.js';

export type FounderSetupOutcome =
  | { status: 'created'; company: { id: string; name: string; slug: string; role: 'owner' } }
  | { status: 'exists' }
  | { status: 'skipped'; reason: 'no_pending' | 'email_not_verified' }
  | { status: 'failed'; error: string };

export async function savePendingFounderCompany(
  email: string,
  companyName: string,
  marketCategory?: string,
) {
  const normalizedEmail = email.toLowerCase();
  await db
    .insert(pendingFounderCompany)
    .values({
      email: normalizedEmail,
      companyName,
      marketCategory: marketCategory ?? null,
    })
    .onConflictDoUpdate({
      target: pendingFounderCompany.email,
      set: {
        companyName,
        marketCategory: marketCategory ?? null,
        createdAt: new Date(),
      },
    });
}

export async function getPendingFounderCompany(email: string) {
  const [row] = await db
    .select({
      companyName: pendingFounderCompany.companyName,
      marketCategory: pendingFounderCompany.marketCategory,
    })
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

export async function completeFounderSetup(request: FastifyRequest): Promise<FounderSetupOutcome> {
  const session = await getSessionFromRequest(request);
  if (!session?.user) {
    return { status: 'skipped', reason: 'no_pending' };
  }

  const memberships = await listOrganizationsForUser(session.user.id);
  if (memberships.length > 0) {
    return { status: 'exists' };
  }

  const pending = await getPendingFounderCompany(session.user.email);
  if (!pending) {
    return { status: 'skipped', reason: 'no_pending' };
  }

  const [dbUser] = await db
    .select({ emailVerified: user.emailVerified })
    .from(user)
    .where(eq(user.id, session.user.id))
    .limit(1);

  if (!dbUser?.emailVerified) {
    return { status: 'skipped', reason: 'email_not_verified' };
  }

  try {
    const slug = await buildUniqueOrgSlug(pending.companyName);
    const webRequest = await buildWebRequest(request);

    const created = await auth.api.createOrganization({
      headers: webRequest.headers,
      body: { name: pending.companyName, slug },
    });

    if (!created?.id) {
      return { status: 'failed', error: 'Не удалось создать компанию' };
    }

    await auth.api.setActiveOrganization({
      headers: webRequest.headers,
      body: { organizationId: created.id },
    });

    await seedDemoSemanticForTenant(created.id);

    if (pending.marketCategory) {
      await updatePrivacySettings(created.id, { marketCategory: pending.marketCategory });
    }

    await deletePendingFounderCompany(session.user.email);

    return {
      status: 'created',
      company: {
        id: created.id,
        name: created.name,
        slug: created.slug,
        role: 'owner',
      },
    };
  } catch (error) {
    return {
      status: 'failed',
      error: error instanceof Error ? error.message : 'Не удалось создать компанию',
    };
  }
}
