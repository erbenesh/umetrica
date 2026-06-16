import type { FastifyReply, FastifyRequest } from 'fastify';

import { auth } from '../auth.js';

export async function buildWebRequest(request: FastifyRequest): Promise<Request> {
  const protocol = request.protocol;
  const host = request.headers?.host ?? 'localhost:3001';
  const url = `${protocol}://${host}${request.url}`;

  const headers = new Headers();
  for (const [key, value] of Object.entries(request.headers ?? {})) {
    if (value === undefined) continue;
    headers.set(key, Array.isArray(value) ? value.join(', ') : value);
  }

  let body: string | undefined;
  if (request.method !== 'GET' && request.method !== 'HEAD' && request.body !== undefined) {
    body = typeof request.body === 'string' ? request.body : JSON.stringify(request.body);
  }

  return new Request(url, {
    method: request.method,
    headers,
    body,
  });
}

/** Internal auth call with a different path/body — do not spread FastifyRequest (headers are getters). */
export async function buildDerivedAuthRequest(
  request: FastifyRequest,
  path: string,
  body: unknown,
): Promise<Request> {
  const protocol = request.protocol;
  const host = request.headers?.host ?? 'localhost:3001';
  const url = `${protocol}://${host}${path}`;

  const headers = new Headers();
  for (const [key, value] of Object.entries(request.headers ?? {})) {
    if (value === undefined) continue;
    headers.set(key, Array.isArray(value) ? value.join(', ') : value);
  }

  return new Request(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}

export async function handleAuthRequest(request: FastifyRequest): Promise<Response> {
  const webRequest = await buildWebRequest(request);
  return auth.handler(webRequest);
}

export async function getSessionFromRequest(request: FastifyRequest) {
  const webRequest = await buildWebRequest(request);
  return auth.api.getSession({ headers: webRequest.headers });
}

export async function sendAuthResponse(reply: FastifyReply, response: Response) {
  reply.status(response.status);

  response.headers.forEach((value, key) => {
    if (key.toLowerCase() === 'set-cookie') return;
    reply.header(key, value);
  });

  if (typeof response.headers.getSetCookie === 'function') {
    for (const cookie of response.headers.getSetCookie()) {
      reply.header('Set-Cookie', cookie);
    }
  } else {
    const cookie = response.headers.get('set-cookie');
    if (cookie) reply.header('Set-Cookie', cookie);
  }

  const text = await response.text();
  const contentType = response.headers.get('content-type');
  if (contentType?.includes('application/json')) {
    return reply.send(JSON.parse(text));
  }
  return reply.send(text);
}
