import { eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';

import { db } from '../db/index.js';
import { organization, user } from '../db/schema.js';
import {
  avatarPublicPath,
  deleteAvatarFile,
  readAvatarFile,
  saveAvatar,
} from '../lib/avatar-storage.js';
import { getSessionFromRequest } from '../lib/auth-request.js';
import { parseRasterImageMultipart } from '../lib/image-upload.js';
import {
  deleteOrgLogoFile,
  orgLogoPublicPath,
  ORG_LOGO_MAX_BYTES,
  readOrgLogoFile,
  saveOrgLogo,
} from '../lib/org-logo-storage.js';
import { canWriteDashboards, getAuthContext } from '../lib/request-auth.js';

const AVATAR_MAX_BYTES = 2 * 1024 * 1024;

export async function registerProfileRoutes(app: FastifyInstance) {
  app.post('/api/profile/avatar', async (request, reply) => {
    const session = await getSessionFromRequest(request);
    if (!session?.user) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const parsed = await parseRasterImageMultipart(request.parts(), AVATAR_MAX_BYTES);
    if ('error' in parsed) {
      return reply.status(400).send({ error: parsed.error });
    }

    const imagePath = avatarPublicPath(session.user.id);
    await saveAvatar(session.user.id, parsed.fileBuffer, parsed.imageType);

    const [updated] = await db
      .update(user)
      .set({ image: imagePath, updatedAt: new Date() })
      .where(eq(user.id, session.user.id))
      .returning({ image: user.image, updatedAt: user.updatedAt });

    return {
      image: updated?.image ?? imagePath,
      updatedAt: updated?.updatedAt?.toISOString() ?? new Date().toISOString(),
    };
  });

  app.delete('/api/profile/avatar', async (request, reply) => {
    const session = await getSessionFromRequest(request);
    if (!session?.user) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    await deleteAvatarFile(session.user.id);

    await db
      .update(user)
      .set({ image: null, updatedAt: new Date() })
      .where(eq(user.id, session.user.id));

    return reply.status(204).send();
  });

  app.get('/api/avatars/:userId', async (request, reply) => {
    const session = await getSessionFromRequest(request);
    if (!session?.user) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const { userId } = request.params as { userId: string };
    const avatar = await readAvatarFile(userId);

    if (!avatar) {
      return reply.status(404).send({ error: 'Avatar not found' });
    }

    return reply
      .header('Cache-Control', 'private, max-age=3600')
      .type(avatar.contentType)
      .send(avatar.buffer);
  });

  app.post('/api/organization/logo', async (request, reply) => {
    const auth = await getAuthContext(request, reply);
    if (!auth) return;

    if (!canWriteDashboards(auth.role)) {
      return reply.status(403).send({ error: 'Недостаточно прав' });
    }

    const parsed = await parseRasterImageMultipart(request.parts(), ORG_LOGO_MAX_BYTES);
    if ('error' in parsed) {
      return reply.status(400).send({ error: parsed.error });
    }

    const logoPath = orgLogoPublicPath(auth.organizationId);
    await saveOrgLogo(auth.organizationId, parsed.fileBuffer, parsed.imageType);

    const [updated] = await db
      .update(organization)
      .set({ logo: logoPath })
      .where(eq(organization.id, auth.organizationId))
      .returning({ logo: organization.logo });

    return {
      logo: updated?.logo ?? logoPath,
      updatedAt: new Date().toISOString(),
    };
  });

  app.delete('/api/organization/logo', async (request, reply) => {
    const auth = await getAuthContext(request, reply);
    if (!auth) return;

    if (!canWriteDashboards(auth.role)) {
      return reply.status(403).send({ error: 'Недостаточно прав' });
    }

    await deleteOrgLogoFile(auth.organizationId);

    await db
      .update(organization)
      .set({ logo: null })
      .where(eq(organization.id, auth.organizationId));

    return reply.status(204).send();
  });

  app.get('/api/org-logos/:organizationId', async (request, reply) => {
    const session = await getSessionFromRequest(request);
    if (!session?.user) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const { organizationId } = request.params as { organizationId: string };
    const logo = await readOrgLogoFile(organizationId);

    if (!logo) {
      return reply.status(404).send({ error: 'Logo not found' });
    }

    return reply
      .header('Cache-Control', 'private, max-age=3600')
      .type(logo.contentType)
      .send(logo.buffer);
  });
}
