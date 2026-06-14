import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { getSessionFromRequest } from '../lib/auth-request.js';
import {
  confirmInvitedEmailForSignup,
  getInvitationPreview,
  verifyInvitedUserEmail,
} from '../lib/invitation-flow.js';

export async function registerInvitationRoutes(app: FastifyInstance) {
  app.get('/api/invitations/:id/preview', async (request, reply) => {
    const { id } = request.params as { id: string };
    const preview = await getInvitationPreview(id);

    if (!preview) {
      return reply.status(404).send({ error: 'Invitation not found' });
    }

    return { invitation: preview };
  });

  app.post('/api/invitations/:id/prepare-accept', async (request, reply) => {
    const session = await getSessionFromRequest(request);
    if (!session?.user) {
      return reply.status(401).send({ error: 'Сессия не найдена. Войдите и попробуйте снова.' });
    }

    const { id } = request.params as { id: string };
    const preview = await getInvitationPreview(id);

    if (!preview) {
      return reply.status(404).send({ error: 'Invitation not found' });
    }

    if (preview.expired) {
      return reply.status(400).send({ error: 'Invitation is no longer valid' });
    }

    if (preview.email.toLowerCase() !== session.user.email.toLowerCase()) {
      return reply.status(400).send({
        error: `Войдите с email из приглашения: ${preview.email}`,
      });
    }

    if (!session.user.emailVerified) {
      await verifyInvitedUserEmail(session.user.id, session.user.email, id);
    }

    return { invitation: preview };
  });

  app.post('/api/invitations/:id/confirm-signup-email', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = z.object({ email: z.string().email() }).parse(request.body);
    const confirmed = await confirmInvitedEmailForSignup(body.email, id);

    if (!confirmed) {
      return reply.status(400).send({ error: 'Не удалось подтвердить email для приглашения' });
    }

    return { status: true };
  });
}
