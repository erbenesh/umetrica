import { CreateSemanticCubeSchema, SemanticPublishInputSchema, UpdateSemanticDraftSchema } from '@umetrica/core';
import type { FastifyInstance } from 'fastify';

import { listPostgresTableColumns, listPostgresTables } from '../lib/semantic-db.js';
import {
  createSemanticCube,
  discardSemanticDraft,
  getSemanticCube,
  getSemanticPublishPreview,
  listSemanticCubes,
  publishSemanticCube,
  updateSemanticDraft,
} from '../lib/semantic-cubes.js';
import { canWriteDashboards, getAuthContext } from '../lib/request-auth.js';

export async function registerSemanticRoutes(app: FastifyInstance) {
  app.get('/api/semantic/introspection/tables', async (request, reply) => {
    const auth = await getAuthContext(request, reply);
    if (!auth) return;

    const connectionId = (request.query as { connectionId?: string }).connectionId;
    const result = await listPostgresTables(auth.organizationId, connectionId);

    if ('error' in result) {
      return reply.status(400).send({ error: result.error });
    }

    return result;
  });

  app.get('/api/semantic/introspection/columns', async (request, reply) => {
    const auth = await getAuthContext(request, reply);
    if (!auth) return;

    const { table, connectionId } = request.query as { table?: string; connectionId?: string };
    if (!table) {
      return reply.status(400).send({ error: 'Укажите table' });
    }

    const result = await listPostgresTableColumns(auth.organizationId, table, connectionId);

    if ('error' in result) {
      return reply.status(400).send({ error: result.error });
    }

    return result;
  });

  app.post('/api/semantic/cubes', async (request, reply) => {
    const auth = await getAuthContext(request, reply);
    if (!auth) return;

    if (!canWriteDashboards(auth.role)) {
      return reply.status(403).send({ error: 'Insufficient permissions' });
    }

    const parsed = CreateSemanticCubeSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() });
    }

    const columnsResult = await listPostgresTableColumns(
      auth.organizationId,
      parsed.data.table,
      parsed.data.connectionId
    );

    if ('error' in columnsResult) {
      return reply.status(400).send({ error: columnsResult.error });
    }

    if (columnsResult.items.length === 0) {
      return reply.status(400).send({ error: 'Таблица не содержит колонок' });
    }

    const tablesResult = await listPostgresTables(auth.organizationId, parsed.data.connectionId);
    const connectionLabel =
      'error' in tablesResult ? 'PostgreSQL' : tablesResult.connectionLabel;

    try {
      const cube = await createSemanticCube(
        auth.organizationId,
        parsed.data,
        columnsResult.items,
        connectionLabel
      );
      return reply.status(201).send(cube);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Не удалось создать куб';
      return reply.status(400).send({ error: message });
    }
  });

  app.get('/api/semantic/cubes', async (request, reply) => {
    const auth = await getAuthContext(request, reply);
    if (!auth) return;

    const items = await listSemanticCubes(auth.organizationId);
    return { items, total: items.length };
  });

  app.get('/api/semantic/cubes/:name', async (request, reply) => {
    const auth = await getAuthContext(request, reply);
    if (!auth) return;

    const { name } = request.params as { name: string };
    const cube = await getSemanticCube(auth.organizationId, name);

    if (!cube) {
      return reply.status(404).send({ error: 'Куб не найден' });
    }

    return cube;
  });

  app.put('/api/semantic/cubes/:name/draft', async (request, reply) => {
    const auth = await getAuthContext(request, reply);
    if (!auth) return;

    if (!canWriteDashboards(auth.role)) {
      return reply.status(403).send({ error: 'Insufficient permissions' });
    }

    const { name } = request.params as { name: string };
    const parsed = UpdateSemanticDraftSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() });
    }

    try {
      const cube = await updateSemanticDraft(auth.organizationId, name, parsed.data);
      if (!cube) {
        return reply.status(404).send({ error: 'Куб не найден' });
      }
      return cube;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Не удалось сохранить черновик';
      return reply.status(400).send({ error: message });
    }
  });

  app.post('/api/semantic/cubes/:name/discard-draft', async (request, reply) => {
    const auth = await getAuthContext(request, reply);
    if (!auth) return;

    if (!canWriteDashboards(auth.role)) {
      return reply.status(403).send({ error: 'Insufficient permissions' });
    }

    const { name } = request.params as { name: string };
    const cube = await discardSemanticDraft(auth.organizationId, name);

    if (!cube) {
      return reply.status(404).send({ error: 'Куб не найден' });
    }

    return cube;
  });

  app.get('/api/semantic/cubes/:name/publish-preview', async (request, reply) => {
    const auth = await getAuthContext(request, reply);
    if (!auth) return;

    const { name } = request.params as { name: string };
    const preview = await getSemanticPublishPreview(auth.organizationId, name);

    if (!preview) {
      return reply.status(404).send({ error: 'Куб не найден' });
    }

    return preview;
  });

  app.post('/api/semantic/cubes/:name/publish', async (request, reply) => {
    const auth = await getAuthContext(request, reply);
    if (!auth) return;

    if (!canWriteDashboards(auth.role)) {
      return reply.status(403).send({ error: 'Insufficient permissions' });
    }

    const { name } = request.params as { name: string };
    const parsed = SemanticPublishInputSchema.safeParse(request.body ?? {});

    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() });
    }

    const cube = await publishSemanticCube({
      organizationId: auth.organizationId,
      userId: auth.userId,
      actorName: auth.userName,
      name,
      notifyTeam: parsed.data.notifyTeam,
    });

    if (!cube) {
      return reply.status(404).send({ error: 'Куб не найден' });
    }

    return cube;
  });
}
