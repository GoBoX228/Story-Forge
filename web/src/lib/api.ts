export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';
const LEGACY_ACCESS_TOKEN_KEY = 'sf_access_token';
const CSRF_HEADER_NAME = 'X-CSRF-TOKEN';
const UNSAFE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

let csrfToken: string | null = null;
let csrfTokenRequest: Promise<string> | null = null;

const FIELD_LABELS: Record<string, string> = {
  email: 'Электронная почта',
  password: 'Пароль',
  password_confirmation: 'Подтверждение пароля',
  current_password: 'Текущий пароль',
  code: 'Код',
  token: 'Код',
  challenge_token: 'Токен подтверждения',
  name: 'Имя',
};

const API_MESSAGE_TRANSLATIONS: Record<string, string> = {
  Deleted: 'Удалено',
  'Invalid credentials': 'Неверная электронная почта или пароль',
  'Account is banned': 'Аккаунт заблокирован',
  'Two-factor code sent': 'Код двухфакторной аутентификации отправлен',
  'If an account exists for this email, a password reset code was sent':
    'Если аккаунт с такой электронной почтой существует, код восстановления отправлен',
  'Password reset token is invalid or expired': 'Код восстановления неверный или истек',
  'Password has been reset': 'Пароль успешно сброшен',
  'Current password is incorrect': 'Текущий пароль указан неверно',
  'New password must be different from current password':
    'Новый пароль должен отличаться от текущего',
  'Password has been changed': 'Пароль успешно изменен',
  'Two-factor challenge invalid': 'Сессия двухфакторной проверки недействительна',
  'Invalid verification code': 'Неверный код подтверждения',
  'Resend is temporarily limited': 'Повторная отправка временно ограничена',
  'Two-factor is already enabled': 'Двухфакторная аутентификация уже включена',
  'Two-factor enabled': 'Двухфакторная аутентификация включена',
  'Two-factor is already disabled': 'Двухфакторная аутентификация уже выключена',
  'Two-factor disabled': 'Двухфакторная аутентификация выключена',
  'Refresh token missing': 'Токен обновления не найден',
  'Refresh token invalid': 'Токен обновления недействителен',
  'Logged out': 'Вы вышли из аккаунта',
  'You cannot remove your own admin role': 'Нельзя снять роль администратора с самого себя',
  'You cannot ban yourself': 'Нельзя заблокировать самого себя',
  'Invalid content id': 'Некорректный идентификатор контента',
  'Content not found': 'Контент не найден',
  'Target not found': 'Цель не найдена',
  'You cannot report yourself': 'Нельзя отправить жалобу на самого себя',
};

const humanizeField = (field: string): string => FIELD_LABELS[field] ?? field.replace(/_/g, ' ');

export const localizeApiMessage = (raw: string): string => {
  const message = raw.trim();
  if (!message) {
    return 'Ошибка запроса';
  }

  const direct = API_MESSAGE_TRANSLATIONS[message];
  if (direct) {
    return direct;
  }

  let match = message.match(/^The ([a-zA-Z0-9_]+) field is required\.$/);
  if (match) {
    return `Поле "${humanizeField(match[1])}" обязательно для заполнения`;
  }

  match = message.match(/^The ([a-zA-Z0-9_]+) must be a valid email address\.$/);
  if (match) {
    return 'Укажите корректный адрес электронной почты';
  }

  match = message.match(/^The ([a-zA-Z0-9_]+) field confirmation does not match\.$/);
  if (match) {
    return `Поле "${humanizeField(match[1])}" и подтверждение не совпадают`;
  }

  match = message.match(/^The ([a-zA-Z0-9_]+) must be at least (\d+) characters\.$/);
  if (match) {
    return `Поле "${humanizeField(match[1])}" должно содержать минимум ${match[2]} символов`;
  }

  return message;
};

export const clearAccessToken = (): void => {
  clearCsrfToken();

  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(LEGACY_ACCESS_TOKEN_KEY);
  }
};

const isFormDataBody = (body: BodyInit | null | undefined): body is FormData =>
  typeof FormData !== 'undefined' && body instanceof FormData;

const buildHeaders = (headers?: HeadersInit, body?: BodyInit | null): Headers => {
  const result = new Headers(headers);
  if (!result.has('Accept')) {
    result.set('Accept', 'application/json');
  }
  if (!result.has('Content-Type') && !isFormDataBody(body)) {
    result.set('Content-Type', 'application/json');
  }
  return result;
};

const requestMethod = (method?: string): string => (method ?? 'GET').toUpperCase();

const isUnsafeRequest = (method?: string): boolean => UNSAFE_METHODS.has(requestMethod(method));

const fetchCsrfToken = async (): Promise<string> => {
  const response = await fetch(`${API_BASE_URL}/api/auth/csrf`, {
    method: 'GET',
    headers: buildHeaders(undefined, null),
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data = await response.json().catch(() => null);
  const token = typeof data?.csrf_token === 'string' ? data.csrf_token : '';
  if (!token) {
    throw new Error('CSRF token missing');
  }

  csrfToken = token;
  return token;
};

export const clearCsrfToken = (): void => {
  csrfToken = null;
  csrfTokenRequest = null;
};

export const ensureCsrfToken = async (): Promise<string> => {
  if (csrfToken) {
    return csrfToken;
  }

  if (!csrfTokenRequest) {
    csrfTokenRequest = fetchCsrfToken().finally(() => {
      csrfTokenRequest = null;
    });
  }

  return csrfTokenRequest;
};

export const withCsrfHeader = async (headers?: HeadersInit): Promise<Headers> => {
  const result = new Headers(headers);
  result.set(CSRF_HEADER_NAME, await ensureCsrfToken());
  return result;
};

const parseError = async (response: Response): Promise<string> => {
  try {
    const data = await response.json();
    if (data?.message) return localizeApiMessage(String(data.message));
    if (data?.errors) {
      const firstKey = Object.keys(data.errors)[0];
      const first = firstKey ? data.errors[firstKey]?.[0] : null;
      if (first) return localizeApiMessage(String(first));
    }
  } catch {
    // ignore
  }
  return `Ошибка запроса (${response.status})`;
};

export const refreshAccessToken = async (retryOnCsrf = true): Promise<boolean> => {
  const headers = buildHeaders(undefined, null);
  headers.set(CSRF_HEADER_NAME, await ensureCsrfToken());

  const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
    method: 'POST',
    headers,
    credentials: 'include',
  });

  if (response.status === 419 && retryOnCsrf) {
    clearCsrfToken();
    return refreshAccessToken(false);
  }

  if (!response.ok) {
    return false;
  }

  const data = await response.json().catch(() => null);
  return Boolean(data?.user);
};

export const apiRequest = async <T>(
  path: string,
  options: RequestInit = {},
  retryOnAuth = true,
  retryOnCsrf = true
): Promise<T> => {
  const headers = buildHeaders(options.headers, options.body ?? null);
  if (isUnsafeRequest(options.method)) {
    headers.set(CSRF_HEADER_NAME, await ensureCsrfToken());
  }

  const response = await fetch(`${API_BASE_URL}/api${path}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (response.status === 419 && retryOnCsrf) {
    clearCsrfToken();
    return apiRequest<T>(path, options, retryOnAuth, false);
  }

  if (response.status === 401 && retryOnAuth) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      return apiRequest<T>(path, options, false, retryOnCsrf);
    }
  }

  if (!response.ok) {
    const message = await parseError(response);
    throw new Error(message);
  }

  if (response.status === 204) {
    return null as T;
  }

  return response.json() as Promise<T>;
};
