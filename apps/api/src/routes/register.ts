import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { auth } from '../auth.js';
import { buildDerivedAuthRequest, sendAuthResponse } from '../lib/auth-request.js';
import { completeFounderSetup, savePendingFounderCompany } from '../lib/founder-setup.js';
import { sendValidationError } from '../lib/http-errors.js';

export async function registerAuthRoutes(app: FastifyInstance) {
  app.post('/api/register', async (request, reply) => {
    const parsed = z
      .object({
        email: z.string().email(),
        password: z.string().min(8),
        name: z.string().min(2),
        companyName: z.string().min(2).max(100),
        marketCategory: z.string().min(1).max(120).optional(),
      })
      .safeParse(request.body);

    if (!parsed.success) {
      return sendValidationError(reply, parsed.error);
    }

    const body = parsed.data;

    const signUpRequest = await buildDerivedAuthRequest(request, '/api/auth/sign-up/email', {
      email: body.email,
      password: body.password,
      name: body.name,
    });

    const response = await auth.handler(signUpRequest);

    if (response.ok) {
      await savePendingFounderCompany(body.email, body.companyName, body.marketCategory);
    }

    return sendAuthResponse(reply, response);
  });

  app.post('/api/founder/complete-setup', async (request, reply) => {
    const result = await completeFounderSetup(request);
    return reply.send(result);
  });
}
