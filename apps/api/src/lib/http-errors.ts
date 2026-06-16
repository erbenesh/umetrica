import type { ApiErrorCode } from '@sellerpool/core';
import type { FastifyError, FastifyInstance, FastifyReply } from 'fastify';
import { ZodError } from 'zod';

export function formatZodError(error: ZodError): string {
  const issue = error.issues[0];
  if (!issue) return 'Некорректные данные';
  const path = issue.path.length > 0 ? `${issue.path.join('.')}: ` : '';
  return `${path}${issue.message}`;
}

export function sendValidationError(reply: FastifyReply, error: ZodError) {
  return reply.status(400).send({
    error: formatZodError(error),
    code: 'VALIDATION_ERROR' satisfies ApiErrorCode,
    details: error.flatten(),
  });
}

export function sendApiError(
  reply: FastifyReply,
  status: number,
  message: string,
  code?: ApiErrorCode,
  details?: unknown,
) {
  return reply.status(status).send({
    error: message,
    ...(code ? { code } : {}),
    ...(details !== undefined ? { details } : {}),
  });
}

export function registerHttpErrorHandler(app: FastifyInstance) {
  app.setErrorHandler((error: FastifyError | Error, request, reply) => {
    if (error instanceof ZodError) {
      return sendValidationError(reply, error);
    }

    const statusCode = 'statusCode' in error && typeof error.statusCode === 'number' ? error.statusCode : 500;
    const isServerError = statusCode >= 500;

    if (isServerError) {
      request.log.error(error);
    }

    const exposeMessage = !isServerError || process.env.NODE_ENV !== 'production';

    return reply.status(statusCode).send({
      error: exposeMessage ? error.message || 'Ошибка запроса' : 'Внутренняя ошибка сервера',
      ...(isServerError ? { code: 'INTERNAL' satisfies ApiErrorCode } : {}),
    });
  });
}
