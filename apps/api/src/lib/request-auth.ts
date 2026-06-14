import { and, eq } from 'drizzle-orm';
import type { FastifyReply, FastifyRequest } from 'fastify';

import { db } from '../db/index.js';
import { member } from '../db/schema.js';
import { getSessionFromRequest } from './auth-request.js';
import { resolveActiveOrganizationId } from './org-context.js';

export type AuthContext = {
  userId: string;
  organizationId: string;
  role: string;
};

export async function getAuthContext(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<AuthContext | null> {
  const session = await getSessionFromRequest(request);

  if (!session?.user) {
    reply.status(401).send({ error: 'Unauthorized' });
    return null;
  }

  const organizationId = await resolveActiveOrganizationId(request);
  if (!organizationId) {
    reply.status(400).send({ error: 'No active organization' });
    return null;
  }

  const [membership] = await db
    .select({ role: member.role })
    .from(member)
    .where(and(eq(member.userId, session.user.id), eq(member.organizationId, organizationId)))
    .limit(1);

  if (!membership) {
    reply.status(403).send({ error: 'Forbidden' });
    return null;
  }

  return {
    userId: session.user.id,
    organizationId,
    role: membership.role,
  };
}

export function canWriteDashboards(role: string): boolean {
  return role === 'owner' || role === 'admin';
}
