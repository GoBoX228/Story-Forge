export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';
const ACCESS_TOKEN_KEY = 'sf_access_token';

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

export const getAccessToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(ACCESS_TOKEN_KEY);
};

export const setAccessToken = (token: string): void => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(ACCESS_TOKEN_KEY, token);
};

export const clearAccessToken = (): void => {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
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
  const token = getAccessToken();
  if (token) {
    result.set('Authorization', `Bearer ${token}`);
  }
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

export const refreshAccessToken = async (): Promise<boolean> => {
  const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
    method: 'POST',
    headers: buildHeaders(undefined, null),
    credentials: 'include',
  });

  if (!response.ok) {
    return false;
  }

  const data = await response.json().catch(() => null);
  if (data?.access_token) {
    setAccessToken(data.access_token);
    return true;
  }

  return false;
};

export const apiRequest = async <T>(path: string, options: RequestInit = {}, retryOnAuth = true): Promise<T> => {
  const response = await fetch(`${API_BASE_URL}/api${path}`, {
    ...options,
    headers: buildHeaders(options.headers, options.body ?? null),
    credentials: 'include',
  });

  if (response.status === 401 && retryOnAuth) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      return apiRequest<T>(path, options, false);
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
