import { eq, sql } from 'drizzle-orm';

import { db } from '../db/index.js';
import { invitation, organization, user } from '../db/schema.js';

export interface InvitationPreview {
  id: string;
  email: string;
  role: string;
  status: string;
  expiresAt: string;
  organizationName: string;
  expired: boolean;
}

export async function getInvitationPreview(invitationId: string): Promise<InvitationPreview | null> {
  const [row] = await db
    .select({
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      status: invitation.status,
      expiresAt: invitation.expiresAt,
      organizationName: organization.name,
    })
    .from(invitation)
    .innerJoin(organization, eq(invitation.organizationId, organization.id))
    .where(eq(invitation.id, invitationId))
    .limit(1);

  if (!row) return null;

  const expired = row.status !== 'pending' || row.expiresAt.getTime() < Date.now();

  return {
    id: row.id,
    email: row.email,
    role: row.role ?? 'viewer',
    status: row.status,
    expiresAt: row.expiresAt.toISOString(),
    organizationName: row.organizationName,
    expired,
  };
}

export async function verifyInvitedUserEmail(
  userId: string,
  email: string,
  invitationId: string
): Promise<boolean> {
  const preview = await getInvitationPreview(invitationId);
  if (!preview || preview.expired) return false;
  if (preview.email.toLowerCase() !== email.toLowerCase()) return false;

  await db.update(user).set({ emailVerified: true }).where(eq(user.id, userId));
  return true;
}

export async function hasPendingInvitationForEmail(email: string) {
  const normalized = email.toLowerCase();
  const rows = await db
    .select({ email: invitation.email })
    .from(invitation)
    .where(eq(invitation.status, 'pending'));

  return rows.some((row) => row.email.toLowerCase() === normalized);
}

export async function confirmInvitedEmailForSignup(email: string, invitationId: string) {
  const preview = await getInvitationPreview(invitationId);
  if (!preview || preview.expired) return false;
  if (preview.email.toLowerCase() !== email.toLowerCase()) return false;

  const [existingUser] = await db
    .select({ id: user.id })
    .from(user)
    .where(sql`lower(${user.email}) = ${email.toLowerCase()}`)
    .limit(1);

  if (!existingUser) return false;

  await db.update(user).set({ emailVerified: true }).where(eq(user.id, existingUser.id));
  return true;
}
