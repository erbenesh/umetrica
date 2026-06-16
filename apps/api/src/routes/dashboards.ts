import { randomUUID } from 'node:crypto';

import {
  CreateDashboardSchema,
  UpdateDashboardSchema,
  WidgetSchema,
  type Dashboard,
  type Widget,
} from '@sellerpool/core';
import { and, desc, eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { sendValidationError } from '../lib/http-errors.js';

import { dashboards } from '../db/dashboards.js';
import { db } from '../db/index.js';
import { recordAuditEvent } from '../lib/audit-log.js';
import { canWriteDashboards, getAuthContext } from '../lib/request-auth.js';

function toDashboard(row: typeof dashboards.$inferSelect): Dashboard {
  const widgets = WidgetSchema.array().safeParse(row.widgets).success
    ? (row.widgets as Widget[])
    : [];

  return {
    id: row.id,
    organizationId: row.organizationId,
    name: row.name,
    description: row.description ?? undefined,
    widgets,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function registerDashboardRoutes(app: FastifyInstance) {
  app.get('/api/dashboards', async (request, reply) => {
    const auth = await getAuthContext(request, reply);
    if (!auth) return;

    const rows = await db
      .select()
      .from(dashboards)
      .where(eq(dashboards.organizationId, auth.organizationId))
      .orderBy(desc(dashboards.updatedAt));

    return {
      items: rows.map(toDashboard),
      total: rows.length,
    };
  });

  app.get('/api/dashboards/:id', async (request, reply) => {
    const auth = await getAuthContext(request, reply);
    if (!auth) return;

    const { id } = request.params as { id: string };

    const [row] = await db
      .select()
      .from(dashboards)
      .where(and(eq(dashboards.id, id), eq(dashboards.organizationId, auth.organizationId)))
      .limit(1);

    if (!row) {
      return reply.status(404).send({ error: 'Dashboard not found' });
    }

    return toDashboard(row);
  });

  app.post('/api/dashboards', async (request, reply) => {
    const auth = await getAuthContext(request, reply);
    if (!auth) return;

    if (!canWriteDashboards(auth.role)) {
      return reply.status(403).send({ error: 'Insufficient permissions' });
    }

    const parsed = CreateDashboardSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendValidationError(reply, parsed.error);
    }

    const now = new Date();
    const id = randomUUID();

    const [row] = await db
      .insert(dashboards)
      .values({
        id,
        organizationId: auth.organizationId,
        name: parsed.data.name,
        description: parsed.data.description,
        widgets: [],
        createdBy: auth.userId,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    await recordAuditEvent({
      organizationId: auth.organizationId,
      userId: auth.userId,
      actorName: auth.userName,
      action: 'dashboard.create',
      objectLabel: parsed.data.name,
      category: 'semantics',
    });

    return reply.status(201).send(toDashboard(row!));
  });

  app.put('/api/dashboards/:id', async (request, reply) => {
    const auth = await getAuthContext(request, reply);
    if (!auth) return;

    if (!canWriteDashboards(auth.role)) {
      return reply.status(403).send({ error: 'Insufficient permissions' });
    }

    const { id } = request.params as { id: string };
    const parsed = UpdateDashboardSchema.safeParse(request.body);

    if (!parsed.success) {
      return sendValidationError(reply, parsed.error);
    }

    const [existing] = await db
      .select()
      .from(dashboards)
      .where(and(eq(dashboards.id, id), eq(dashboards.organizationId, auth.organizationId)))
      .limit(1);

    if (!existing) {
      return reply.status(404).send({ error: 'Dashboard not found' });
    }

    const [row] = await db
      .update(dashboards)
      .set({
        ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
        ...(parsed.data.description !== undefined ? { description: parsed.data.description } : {}),
        ...(parsed.data.widgets !== undefined ? { widgets: parsed.data.widgets } : {}),
        updatedAt: new Date(),
      })
      .where(eq(dashboards.id, id))
      .returning();

    const label = parsed.data.name ?? existing.name;

    await recordAuditEvent({
      organizationId: auth.organizationId,
      userId: auth.userId,
      actorName: auth.userName,
      action: 'dashboard.update',
      objectLabel: label,
      category: 'semantics',
    });

    return toDashboard(row!);
  });

  app.delete('/api/dashboards/:id', async (request, reply) => {
    const auth = await getAuthContext(request, reply);
    if (!auth) return;

    if (!canWriteDashboards(auth.role)) {
      return reply.status(403).send({ error: 'Insufficient permissions' });
    }

    const { id } = request.params as { id: string };

    const [existing] = await db
      .select()
      .from(dashboards)
      .where(and(eq(dashboards.id, id), eq(dashboards.organizationId, auth.organizationId)))
      .limit(1);

    if (!existing) {
      return reply.status(404).send({ error: 'Dashboard not found' });
    }

    const [deleted] = await db
      .delete(dashboards)
      .where(and(eq(dashboards.id, id), eq(dashboards.organizationId, auth.organizationId)))
      .returning({ id: dashboards.id, name: dashboards.name });

    if (!deleted) {
      return reply.status(404).send({ error: 'Dashboard not found' });
    }

    await recordAuditEvent({
      organizationId: auth.organizationId,
      userId: auth.userId,
      actorName: auth.userName,
      action: 'dashboard.delete',
      objectLabel: deleted.name,
      category: 'semantics',
    });

    return reply.status(204).send();
  });
}
