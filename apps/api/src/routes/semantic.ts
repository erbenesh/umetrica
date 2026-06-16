import {
  CreateSemanticCubeSchema,
  CreateSemanticViewSchema,
  SemanticPreviewQueryInputSchema,
  SemanticPublishInputSchema,
  SemanticWorkspaceLayoutSchema,
  UpdateSemanticDraftSchema,
  UpdateSemanticViewDraftSchema,
} from '@umetrica/core';
import type { FastifyInstance } from 'fastify';

import { listPostgresForeignKeys, listPostgresTableColumns, listPostgresTables } from '../lib/semantic-db.js';
import { previewSemanticQuery } from '../lib/semantic-preview.js';
import {
  applySemanticCubeYaml,
  createSemanticCube,
  deleteSemanticCube,
  discardSemanticDraft,
  getSemanticCube,
  getSemanticCubeYaml,
  getSemanticPublishPreview,
  listCubeDefinitionsForJoins,
  listSemanticCubes,
  publishSemanticCube,
  updateSemanticDraft,
} from '../lib/semantic-cubes.js';
import {
  applySemanticViewYaml,
  createSemanticView,
  deleteSemanticView,
  discardSemanticViewDraft,
  getSemanticView,
  getSemanticViewPublishPreview,
  getSemanticViewYaml,
  listSemanticViews,
  publishSemanticView,
  updateSemanticViewDraft,
} from '../lib/semantic-views.js';
import { getSemanticWorkspace, updateSemanticWorkspace } from '../lib/semantic-workspace.js';
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

  app.get('/api/semantic/introspection/foreign-keys', async (request, reply) => {
    const auth = await getAuthContext(request, reply);
    if (!auth) return;

    const { connectionId } = request.query as { connectionId?: string };
    const result = await listPostgresForeignKeys(auth.organizationId, connectionId);

    if ('error' in result) {
      return reply.status(400).send({ error: result.error });
    }

    return result;
  });

  app.get('/api/semantic/workspace', async (request, reply) => {
    const auth = await getAuthContext(request, reply);
    if (!auth) return;

    return getSemanticWorkspace(auth.organizationId);
  });

  app.put('/api/semantic/workspace', async (request, reply) => {
    const auth = await getAuthContext(request, reply);
    if (!auth) return;

    if (!canWriteDashboards(auth.role)) {
      return reply.status(403).send({ error: 'Insufficient permissions' });
    }

    const parsed = SemanticWorkspaceLayoutSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() });
    }

    try {
      return await updateSemanticWorkspace(auth.organizationId, parsed.data);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Не удалось сохранить workspace';
      return reply.status(400).send({ error: message });
    }
  });

  app.post('/api/semantic/preview-query', async (request, reply) => {
    const auth = await getAuthContext(request, reply);
    if (!auth) return;

    const parsed = SemanticPreviewQueryInputSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() });
    }

    try {
      return await previewSemanticQuery({
        organizationId: auth.organizationId,
        userId: auth.userId,
        query: parsed.data.query as Record<string, unknown>,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Не удалось выполнить запрос';
      return reply.status(400).send({ error: message });
    }
  });

  app.get('/api/semantic/views', async (request, reply) => {
    const auth = await getAuthContext(request, reply);
    if (!auth) return;

    const items = await listSemanticViews(auth.organizationId);
    return { items, total: items.length };
  });

  app.post('/api/semantic/views', async (request, reply) => {
    const auth = await getAuthContext(request, reply);
    if (!auth) return;

    if (!canWriteDashboards(auth.role)) {
      return reply.status(403).send({ error: 'Insufficient permissions' });
    }

    const parsed = CreateSemanticViewSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() });
    }

    try {
      const view = await createSemanticView(auth.organizationId, parsed.data);
      return reply.status(201).send(view);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Не удалось создать view';
      return reply.status(400).send({ error: message });
    }
  });

  app.get('/api/semantic/views/:name', async (request, reply) => {
    const auth = await getAuthContext(request, reply);
    if (!auth) return;

    const { name } = request.params as { name: string };
    const view = await getSemanticView(auth.organizationId, name);

    if (!view) {
      return reply.status(404).send({ error: 'View не найден' });
    }

    return view;
  });

  app.put('/api/semantic/views/:name/draft', async (request, reply) => {
    const auth = await getAuthContext(request, reply);
    if (!auth) return;

    if (!canWriteDashboards(auth.role)) {
      return reply.status(403).send({ error: 'Insufficient permissions' });
    }

    const { name } = request.params as { name: string };
    const parsed = UpdateSemanticViewDraftSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() });
    }

    try {
      const view = await updateSemanticViewDraft(auth.organizationId, name, parsed.data);
      if (!view) {
        return reply.status(404).send({ error: 'View не найден' });
      }
      return view;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Не удалось сохранить черновик';
      return reply.status(400).send({ error: message });
    }
  });

  app.post('/api/semantic/views/:name/discard-draft', async (request, reply) => {
    const auth = await getAuthContext(request, reply);
    if (!auth) return;

    if (!canWriteDashboards(auth.role)) {
      return reply.status(403).send({ error: 'Insufficient permissions' });
    }

    const { name } = request.params as { name: string };
    const view = await discardSemanticViewDraft(auth.organizationId, name);

    if (!view) {
      return reply.status(404).send({ error: 'View не найден' });
    }

    return view;
  });

  app.get('/api/semantic/views/:name/publish-preview', async (request, reply) => {
    const auth = await getAuthContext(request, reply);
    if (!auth) return;

    const { name } = request.params as { name: string };
    const preview = await getSemanticViewPublishPreview(auth.organizationId, name);

    if (!preview) {
      return reply.status(404).send({ error: 'View не найден' });
    }

    return preview;
  });

  app.post('/api/semantic/views/:name/publish', async (request, reply) => {
    const auth = await getAuthContext(request, reply);
    if (!auth) return;

    if (!canWriteDashboards(auth.role)) {
      return reply.status(403).send({ error: 'Insufficient permissions' });
    }

    const { name } = request.params as { name: string };

    try {
      const view = await publishSemanticView({
        organizationId: auth.organizationId,
        userId: auth.userId,
        actorName: auth.userName,
        name,
      });

      if (!view) {
        return reply.status(404).send({ error: 'View не найден' });
      }

      return view;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Не удалось опубликовать';
      return reply.status(400).send({ error: message });
    }
  });

  app.delete('/api/semantic/views/:name', async (request, reply) => {
    const auth = await getAuthContext(request, reply);
    if (!auth) return;

    if (!canWriteDashboards(auth.role)) {
      return reply.status(403).send({ error: 'Insufficient permissions' });
    }

    const { name } = request.params as { name: string };

    try {
      const deleted = await deleteSemanticView(auth.organizationId, name);
      if (!deleted) {
        return reply.status(404).send({ error: 'View не найден' });
      }
      return reply.status(204).send();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Не удалось удалить view';
      return reply.status(400).send({ error: message });
    }
  });

  app.get('/api/semantic/views/:name/yaml', async (request, reply) => {
    const auth = await getAuthContext(request, reply);
    if (!auth) return;

    const { name } = request.params as { name: string };
    const variant = (request.query as { variant?: string }).variant === 'published' ? 'published' : 'draft';
    const result = await getSemanticViewYaml(auth.organizationId, name, variant);

    if (!result) {
      return reply.status(404).send({ error: 'View не найден' });
    }

    return result;
  });

  app.put('/api/semantic/views/:name/yaml', async (request, reply) => {
    const auth = await getAuthContext(request, reply);
    if (!auth) return;

    if (!canWriteDashboards(auth.role)) {
      return reply.status(403).send({ error: 'Insufficient permissions' });
    }

    const { name } = request.params as { name: string };
    const yaml = (request.body as { yaml?: string }).yaml;

    if (!yaml) {
      return reply.status(400).send({ error: 'Укажите yaml' });
    }

    try {
      const view = await applySemanticViewYaml(auth.organizationId, name, yaml);
      if (!view) {
        return reply.status(404).send({ error: 'View не найден' });
      }
      return view;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Не удалось применить YAML';
      return reply.status(400).send({ error: message });
    }
  });

  app.get('/api/semantic/join-context', async (request, reply) => {
    const auth = await getAuthContext(request, reply);
    if (!auth) return;

    const cubes = await listCubeDefinitionsForJoins(auth.organizationId);
    return { cubes };
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

  app.get('/api/semantic/cubes/:name/yaml', async (request, reply) => {
    const auth = await getAuthContext(request, reply);
    if (!auth) return;

    const { name } = request.params as { name: string };
    const variant = (request.query as { variant?: string }).variant === 'published' ? 'published' : 'draft';
    const result = await getSemanticCubeYaml(auth.organizationId, name, variant);

    if (!result) {
      return reply.status(404).send({ error: 'Куб не найден' });
    }

    return result;
  });

  app.put('/api/semantic/cubes/:name/yaml', async (request, reply) => {
    const auth = await getAuthContext(request, reply);
    if (!auth) return;

    if (!canWriteDashboards(auth.role)) {
      return reply.status(403).send({ error: 'Insufficient permissions' });
    }

    const { name } = request.params as { name: string };
    const yaml = (request.body as { yaml?: string }).yaml;

    if (!yaml) {
      return reply.status(400).send({ error: 'Укажите yaml' });
    }

    try {
      const cube = await applySemanticCubeYaml(auth.organizationId, name, yaml);
      if (!cube) {
        return reply.status(404).send({ error: 'Куб не найден' });
      }
      return cube;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Не удалось применить YAML';
      return reply.status(400).send({ error: message });
    }
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

    try {
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
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Не удалось опубликовать';
      return reply.status(400).send({ error: message });
    }
  });

  app.delete('/api/semantic/cubes/:name', async (request, reply) => {
    const auth = await getAuthContext(request, reply);
    if (!auth) return;

    if (!canWriteDashboards(auth.role)) {
      return reply.status(403).send({ error: 'Insufficient permissions' });
    }

    const { name } = request.params as { name: string };

    try {
      const deleted = await deleteSemanticCube(auth.organizationId, name);
      if (!deleted) {
        return reply.status(404).send({ error: 'Куб не найден' });
      }
      return reply.status(204).send();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Не удалось удалить куб';
      return reply.status(400).send({ error: message });
    }
  });
}
