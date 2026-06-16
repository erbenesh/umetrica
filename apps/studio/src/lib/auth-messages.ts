export const EMAIL_NOT_VERIFIED_MESSAGE =
  'Подтвердите email перед входом. Проверьте почту — мы отправили письмо со ссылкой.';

export const SESSION_REQUIRED_MESSAGE = 'Войдите в аккаунт, чтобы продолжить.';

type AuthErrorLike = {
  message?: string | null;
  code?: string | null;
  status?: number | string | null;
};

const AUTH_ERROR_MESSAGES_RU: Record<string, string> = {
  EMAIL_NOT_VERIFIED: EMAIL_NOT_VERIFIED_MESSAGE,
  EMAIL_VERIFICATION_REQUIRED: EMAIL_NOT_VERIFIED_MESSAGE,
  EMAIL_VERIFICATION_REQUIRED_FOR_INVITATION:
    'Подтвердите email, чтобы принять приглашение в команду.',
  INVALID_EMAIL_OR_PASSWORD: 'Неверный email или пароль',
  INVALID_CREDENTIALS: 'Неверный email или пароль',
  USER_NOT_FOUND: 'Пользователь с таким email не найден',
  USER_ALREADY_EXISTS: 'Пользователь с таким email уже зарегистрирован',
  EMAIL_ALREADY_EXISTS: 'Пользователь с таким email уже зарегистрирован',
  INVALID_TOKEN: 'Ссылка недействительна или устарела',
  TOKEN_EXPIRED: 'Ссылка устарела. Запросите новую.',
  TOO_MANY_REQUESTS: 'Слишком много попыток. Подождите и попробуйте снова.',
  UNAUTHORIZED: 'Требуется вход в аккаунт',
  FORBIDDEN: 'Недостаточно прав для этого действия',
  SESSION_EXPIRED: 'Сессия истекла. Войдите снова.',
};

const MESSAGE_PATTERNS_RU: Array<{ pattern: RegExp; message: string }> = [
  { pattern: /email.*verif|verif.*email/i, message: EMAIL_NOT_VERIFIED_MESSAGE },
  { pattern: /invalid.*(email|password|credential)/i, message: 'Неверный email или пароль' },
  { pattern: /user.*already.*exist|email.*already/i, message: 'Пользователь с таким email уже зарегистрирован' },
  { pattern: /too many/i, message: 'Слишком много попыток. Подождите и попробуйте снова.' },
  { pattern: /unauthorized/i, message: SESSION_REQUIRED_MESSAGE },
  { pattern: /forbidden/i, message: 'Недостаточно прав для этого действия' },
  { pattern: /invalid.*token|token.*invalid/i, message: 'Ссылка недействительна или устарела' },
];

export function isEmailVerificationError(error: AuthErrorLike | string | null | undefined) {
  const value =
    typeof error === 'string'
      ? error
      : [error?.code, error?.message].filter(Boolean).join(' ');

  return /email.*verif|verif.*email|EMAIL_NOT_VERIFIED|EMAIL_VERIFICATION/i.test(value);
}

export function getAuthErrorMessage(
  error: AuthErrorLike | string | null | undefined,
  fallback = 'Ошибка авторизации',
): string {
  if (!error) return fallback;

  if (typeof error === 'string') {
    if (AUTH_ERROR_MESSAGES_RU[error]) return AUTH_ERROR_MESSAGES_RU[error];
    const matched = MESSAGE_PATTERNS_RU.find((item) => item.pattern.test(error));
    return matched?.message ?? error;
  }

  const code = error.code?.trim();
  if (code && AUTH_ERROR_MESSAGES_RU[code]) {
    return AUTH_ERROR_MESSAGES_RU[code];
  }

  const message = error.message?.trim();
  if (message) {
    if (AUTH_ERROR_MESSAGES_RU[message]) return AUTH_ERROR_MESSAGES_RU[message];
    const matched = MESSAGE_PATTERNS_RU.find((item) => item.pattern.test(message));
    if (matched) return matched.message;
    return message;
  }

  return fallback;
}
