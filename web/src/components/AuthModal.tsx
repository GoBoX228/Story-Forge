import React, { useEffect, useMemo, useState } from 'react';
import { Modal } from './Modal';
import { Button, Input } from './UI';
import { COLORS } from '../constants';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  KeyRound,
  Lock,
  Mail,
  RotateCcw,
  Shield,
  User,
} from 'lucide-react';
import { apiRequest, localizeApiMessage, setAccessToken } from '../lib/api';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: () => void;
  initialMode?: 'login' | 'register';
}

interface TokenResponse {
  access_token: string;
}

interface TwoFactorChallengeResponse {
  requires_2fa: true;
  challenge_token: string;
  expires_in?: number;
  retry_after?: number;
  delivery?: string;
  dev_code?: string | null;
}

interface TwoFactorResendResponse {
  challenge_token: string;
  expires_in?: number;
  retry_after?: number;
  dev_code?: string | null;
}

interface PasswordForgotResponse {
  message?: string;
  expires_in?: number;
  dev_code?: string | null;
  dev_code_usable?: boolean | null;
}

const isTokenResponse = (data: any): data is TokenResponse =>
  typeof data?.access_token === 'string' && data.access_token.length > 0;

const isTwoFactorChallengeResponse = (data: any): data is TwoFactorChallengeResponse =>
  data?.requires_2fa === true && typeof data?.challenge_token === 'string';

const normalizeVerificationInput = (value: string): string =>
  value.toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 20);

const normalizeResetCodeInput = (value: string): string => value.replace(/\D/g, '').slice(0, 6);

const validatePasswordComplexity = (value: string): string | null => {
  if (value.length < 8) return 'Пароль должен содержать минимум 8 символов';
  if (!/[a-z]/.test(value)) return 'Пароль должен содержать строчные буквы';
  if (!/[A-Z]/.test(value)) return 'Пароль должен содержать заглавные буквы';
  if (!/\d/.test(value)) return 'Пароль должен содержать цифры';
  if (!/[^A-Za-z0-9]/.test(value)) return 'Пароль должен содержать спецсимволы';
  return null;
};

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onLogin, initialMode = 'login' }) => {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [step, setStep] = useState<'credentials' | 'twoFactor' | 'forgotRequest' | 'forgotReset'>('credentials');
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [challengeToken, setChallengeToken] = useState<string | null>(null);
  const [challengeTtl, setChallengeTtl] = useState(0);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [isDevResetCodeUsable, setIsDevResetCodeUsable] = useState<boolean | null>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [username, setUsername] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [resetCode, setResetCode] = useState('');

  useEffect(() => {
    if (challengeTtl <= 0 && resendCooldown <= 0) {
      return;
    }

    const timer = window.setInterval(() => {
      setChallengeTtl((prev) => Math.max(0, prev - 1));
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [challengeTtl, resendCooldown]);

  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setStep('credentials');
      setError('');
      setNotice('');
      setChallengeToken(null);
      setChallengeTtl(0);
      setResendCooldown(0);
      setDevCode(null);
      setIsDevResetCodeUsable(null);
      setVerificationCode('');
      setResetCode('');
      setPassword('');
      setPasswordConfirmation('');
    }
  }, [isOpen, initialMode]);

  const submitCredentials = async () => {
    if (mode === 'register') {
      const passwordError = validatePasswordComplexity(password);
      if (passwordError) {
        throw new Error(passwordError);
      }

      if (password !== passwordConfirmation) {
        throw new Error('Пароли не совпадают');
      }

      const displayName = username.trim();
      if (!displayName) {
        throw new Error('Введите имя пользователя');
      }

      const data = await apiRequest<TokenResponse>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          name: displayName,
          email,
          password,
          password_confirmation: passwordConfirmation,
        }),
      });

      if (!isTokenResponse(data)) {
        throw new Error('Не удалось создать аккаунт');
      }

      setAccessToken(data.access_token);
      onLogin();
      return;
    }

    const data = await apiRequest<any>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    if (isTokenResponse(data)) {
      setAccessToken(data.access_token);
      onLogin();
      return;
    }

    if (isTwoFactorChallengeResponse(data)) {
      setStep('twoFactor');
      setChallengeToken(data.challenge_token);
      setChallengeTtl(Number(data.expires_in ?? 0));
      setResendCooldown(Number(data.retry_after ?? 30));
      setDevCode(data.dev_code ?? null);
      return;
    }

    throw new Error('Неверный ответ сервера');
  };

  const submitTwoFactorCode = async () => {
    if (!challengeToken) {
      throw new Error('Сессия подтверждения отсутствует');
    }

    const data = await apiRequest<TokenResponse>('/auth/2fa/verify', {
      method: 'POST',
      body: JSON.stringify({
        challenge_token: challengeToken,
        code: verificationCode,
      }),
    });

    if (!isTokenResponse(data)) {
      throw new Error('Не удалось подтвердить код');
    }

    setAccessToken(data.access_token);
    onLogin();
  };

  const requestPasswordReset = async () => {
    const loginEmail = email.trim();
    if (!loginEmail) {
      throw new Error('Введите адрес электронной почты для восстановления');
    }

    const response = await apiRequest<PasswordForgotResponse>('/auth/password/forgot', {
      method: 'POST',
      body: JSON.stringify({ email: loginEmail }),
    });

    const responseDevCode = response.dev_code ?? null;
    const responseDevCodeUsable = typeof response.dev_code_usable === 'boolean' ? response.dev_code_usable : null;

    setStep('forgotReset');
    setChallengeTtl(Number(response.expires_in ?? 0));
    setResetCode(responseDevCode ?? '');
    setPassword('');
    setPasswordConfirmation('');
    setDevCode(responseDevCode);
    setIsDevResetCodeUsable(responseDevCodeUsable);
    setNotice(
      localizeApiMessage(
        response.message ?? 'Если аккаунт с такой электронной почтой существует, код восстановления отправлен'
      ).toUpperCase()
    );
  };

  const submitPasswordReset = async () => {
    if (resetCode.length !== 6) {
      throw new Error('Введите 6-значный код восстановления');
    }

    if (password !== passwordConfirmation) {
      throw new Error('Пароли не совпадают');
    }

    const passwordError = validatePasswordComplexity(password);
    if (passwordError) {
      throw new Error(passwordError);
    }

    await apiRequest('/auth/password/reset', {
      method: 'POST',
      body: JSON.stringify({
        email,
        token: resetCode,
        password,
        password_confirmation: passwordConfirmation,
      }),
    });

    setMode('login');
    setStep('credentials');
    setPassword('');
    setPasswordConfirmation('');
    setResetCode('');
    setDevCode(null);
    setNotice('ПАРОЛЬ ОБНОВЛЕН. ВОЙДИТЕ С НОВЫМ ПАРОЛЕМ.');
  };

  const resendTwoFactorCode = async () => {
    if (!challengeToken || resendCooldown > 0) return;

    setError('');
    setNotice('');
    setIsResending(true);
    try {
      const response = await apiRequest<TwoFactorResendResponse>('/auth/2fa/resend', {
        method: 'POST',
        body: JSON.stringify({
          challenge_token: challengeToken,
        }),
      });

      setChallengeToken(response.challenge_token ?? challengeToken);
      setChallengeTtl(Number(response.expires_in ?? 0));
      setResendCooldown(Number(response.retry_after ?? 30));
      setDevCode(response.dev_code ?? null);
    } catch (submitError: any) {
      setError((submitError?.message || 'Не удалось отправить код повторно').toUpperCase());
    } finally {
      setIsResending(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setNotice('');
    setIsLoading(true);

    try {
      if (step === 'twoFactor') {
        await submitTwoFactorCode();
      } else if (step === 'forgotRequest') {
        await requestPasswordReset();
      } else if (step === 'forgotReset') {
        await submitPasswordReset();
      } else {
        await submitCredentials();
      }
    } catch (submitError: any) {
      setError((submitError?.message || 'Ошибка авторизации').toUpperCase());
    } finally {
      setIsLoading(false);
    }
  };

  const clearChallengeState = () => {
    setChallengeToken(null);
    setChallengeTtl(0);
    setResendCooldown(0);
    setDevCode(null);
    setVerificationCode('');
  };

  const toggleMode = () => {
    setMode(mode === 'login' ? 'register' : 'login');
    setStep('credentials');
    clearChallengeState();
    setResetCode('');
    setPassword('');
    setPasswordConfirmation('');
    setNotice('');
    setError('');
  };

  const backToCredentials = () => {
    setStep('credentials');
    clearChallengeState();
    setResetCode('');
    setPassword('');
    setPasswordConfirmation('');
    setNotice('');
    setError('');
  };

  const openForgotPassword = () => {
    setStep('forgotRequest');
    clearChallengeState();
    setResetCode('');
    setPassword('');
    setPasswordConfirmation('');
    setNotice('');
    setError('');
  };

  const challengeTtlMinutes = useMemo(
    () => (challengeTtl > 0 ? Math.max(1, Math.ceil(challengeTtl / 60)) : 0),
    [challengeTtl]
  );

  const submitDisabled =
    isLoading ||
    (step === 'twoFactor' && verificationCode.length < 6) ||
    (step === 'forgotRequest' && email.trim().length === 0) ||
    (step === 'forgotReset' && (resetCode.length !== 6 || password.length === 0 || passwordConfirmation.length === 0)) ||
    (step === 'credentials' &&
      mode === 'register' &&
      (username.trim().length === 0 || passwordConfirmation.length === 0));

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={step === 'twoFactor' ? 'ПОДТВЕРЖДЕНИЕ 2FA' : step.startsWith('forgot') ? 'ВОССТАНОВЛЕНИЕ ПАРОЛЯ' : mode === 'login' ? 'ИДЕНТИФИКАЦИЯ' : 'РЕГИСТРАЦИЯ'}
      accentColor={COLORS.accentRed}
      maxWidth="max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {step === 'twoFactor' ? (
          <div className="space-y-4 animate-appear">
            <div className="p-3 border border-[var(--border-color)] bg-[var(--bg-main)]">
              <div className="mono text-[10px] uppercase font-black text-[var(--text-main)] flex items-center gap-2">
                <Shield size={14} /> ВВЕДИТЕ КОД ИЗ ПИСЬМА
              </div>
              <div className="mono text-[9px] uppercase text-[var(--text-muted)] mt-2">
                Код действует {challengeTtlMinutes > 0 ? challengeTtlMinutes : 10} мин.
              </div>
              {devCode && (
                <div className="mono text-[9px] uppercase text-[var(--col-blue)] mt-2">
                  ТЕСТ-КОД: {devCode}
                </div>
              )}
              {devCode && (
                <div className="mono text-[8px] uppercase text-[var(--text-muted)] mt-1">
                  Код автоматически подставлен в поле ниже.
                </div>
              )}
            </div>

            <div className="space-y-1">
              <label className="mono text-[9px] uppercase font-black text-[var(--text-muted)] tracking-widest flex items-center gap-2">
                  <KeyRound size={10} /> Код подтверждения / резервный код
              </label>
              <Input
                value={verificationCode}
                onChange={(e) => setVerificationCode(normalizeVerificationInput(e.target.value))}
                placeholder="123456 или ABCDE-12345"
                accentColor={COLORS.accentRed}
                required
                autoFocus
                className="tracking-[0.2em]"
              />
            </div>

            <Button
              type="button"
              color="white"
              inverted
              className="w-full h-11"
              disabled={isResending || resendCooldown > 0 || !challengeToken}
              onClick={resendTwoFactorCode}
            >
              <RotateCcw size={14} />
              {resendCooldown > 0 ? `ОТПРАВИТЬ СНОВА ЧЕРЕЗ ${resendCooldown}с` : 'ОТПРАВИТЬ КОД СНОВА'}
            </Button>
          </div>
        ) : step === 'forgotRequest' ? (
          <div className="space-y-4 animate-appear">
            <div className="p-3 border border-[var(--border-color)] bg-[var(--bg-main)]">
              <div className="mono text-[10px] uppercase font-black text-[var(--text-main)] flex items-center gap-2">
                <Mail size={14} /> ВОССТАНОВЛЕНИЕ ДОСТУПА
              </div>
              <div className="mono text-[9px] uppercase text-[var(--text-muted)] mt-2">
                Отправим 6-значный код на указанную почту.
              </div>
            </div>

            <div className="space-y-1">
              <label className="mono text-[9px] uppercase font-black text-[var(--text-muted)] tracking-widest flex items-center gap-2">
                <Mail size={10} /> Электронная почта
              </label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="USER@STORYFORGE.NET"
                accentColor={COLORS.accentRed}
                required
                autoFocus
              />
            </div>
          </div>
        ) : step === 'forgotReset' ? (
          <div className="space-y-4 animate-appear">
            <div className="p-3 border border-[var(--border-color)] bg-[var(--bg-main)]">
              <div className="mono text-[10px] uppercase font-black text-[var(--text-main)] flex items-center gap-2">
                <KeyRound size={14} /> ВВЕДИТЕ КОД И НОВЫЙ ПАРОЛЬ
              </div>
              <div className="mono text-[9px] uppercase text-[var(--text-muted)] mt-2">
                Код действует {challengeTtlMinutes > 0 ? challengeTtlMinutes : 60} мин.
              </div>
              {devCode && (
                <div className="mono text-[9px] uppercase text-[var(--col-blue)] mt-2">
                  ТЕСТ-КОД: {devCode}
                </div>
              )}
              {devCode && isDevResetCodeUsable === false && (
                <div className="mono text-[8px] uppercase text-[var(--text-muted)] mt-1">
                  Электронная почта не зарегистрирована: этот код только для теста интерфейса.
                </div>
              )}
            </div>

            <div className="space-y-1">
              <label className="mono text-[9px] uppercase font-black text-[var(--text-muted)] tracking-widest flex items-center gap-2">
                <Mail size={10} /> Электронная почта
              </label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="USER@STORYFORGE.NET"
                accentColor={COLORS.accentRed}
                required
              />
            </div>

            <div className="space-y-1">
              <label className="mono text-[9px] uppercase font-black text-[var(--text-muted)] tracking-widest flex items-center gap-2">
                <KeyRound size={10} /> Код восстановления
              </label>
              <Input
                value={resetCode}
                onChange={(e) => setResetCode(normalizeResetCodeInput(e.target.value))}
                placeholder="123456"
                accentColor={COLORS.accentRed}
                required
                className="tracking-[0.2em]"
              />
            </div>

            <div className="space-y-1">
              <label className="mono text-[9px] uppercase font-black text-[var(--text-muted)] tracking-widest flex items-center gap-2">
                <Lock size={10} /> Новый пароль
              </label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                accentColor={COLORS.accentRed}
                required
              />
              <div className="mono text-[8px] uppercase text-[var(--text-muted)]">
                Мин. 8 символов, A-Z, a-z, цифра и спецсимвол.
              </div>
            </div>

            <div className="space-y-1">
              <label className="mono text-[9px] uppercase font-black text-[var(--text-muted)] tracking-widest flex items-center gap-2">
                <Lock size={10} /> Повторите пароль
              </label>
              <Input
                type="password"
                value={passwordConfirmation}
                onChange={(e) => setPasswordConfirmation(e.target.value)}
                placeholder="••••••••"
                accentColor={COLORS.accentRed}
                required
              />
            </div>

            <button
              type="button"
              onClick={requestPasswordReset}
              className="mono text-[10px] uppercase font-bold text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors border-b border-transparent hover:border-[var(--text-main)] pb-0.5 self-start"
            >
              Запросить новый код
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {mode === 'register' && (
              <div className="space-y-1 animate-appear">
                <label className="mono text-[9px] uppercase font-black text-[var(--text-muted)] tracking-widest flex items-center gap-2">
                  <User size={10} /> Позывной (имя пользователя)
                </label>
                <Input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="MASTER_ARCHITECT"
                  accentColor={COLORS.accentRed}
                  required
                />
              </div>
            )}

            <div className="space-y-1 animate-appear" style={{ animationDelay: '0.1s' }}>
              <label className="mono text-[9px] uppercase font-black text-[var(--text-muted)] tracking-widest flex items-center gap-2">
                <Mail size={10} /> Электронная почта
              </label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="USER@STORYFORGE.NET"
                accentColor={COLORS.accentRed}
                required
              />
            </div>

            <div className="space-y-1 animate-appear" style={{ animationDelay: '0.2s' }}>
              <label className="mono text-[9px] uppercase font-black text-[var(--text-muted)] tracking-widest flex items-center gap-2">
                <Lock size={10} /> Пароль доступа
              </label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                accentColor={COLORS.accentRed}
                required
              />
              {mode === 'register' && (
                <div className="mono text-[8px] uppercase text-[var(--text-muted)]">
                  Мин. 8 символов, A-Z, a-z, цифра и спецсимвол.
                </div>
              )}
            </div>

            {mode === 'register' && (
              <div className="space-y-1 animate-appear" style={{ animationDelay: '0.3s' }}>
                <label className="mono text-[9px] uppercase font-black text-[var(--text-muted)] tracking-widest flex items-center gap-2">
                  <Lock size={10} /> Подтверждение пароля
                </label>
                <Input
                  type="password"
                  value={passwordConfirmation}
                  onChange={(e) => setPasswordConfirmation(e.target.value)}
                  placeholder="••••••••"
                  accentColor={COLORS.accentRed}
                  required
                />
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="p-3 border border-[var(--col-red)] bg-[var(--col-red)]/10 flex items-center gap-3 animate-appear">
            <AlertCircle size={16} className="text-[var(--col-red)]" />
            <span className="mono text-[10px] font-black text-[var(--col-red)] uppercase">{error}</span>
          </div>
        )}

        {notice && (
          <div className="p-3 border border-[var(--col-teal)] bg-[var(--col-teal)]/10 flex items-center gap-3 animate-appear">
            <Shield size={16} className="text-[var(--col-teal)]" />
            <span className="mono text-[10px] font-black text-[var(--col-teal)] uppercase">{notice}</span>
          </div>
        )}

        <div className="pt-4 space-y-4">
          <Button color="red" size="lg" className="w-full h-14 relative overflow-hidden" disabled={submitDisabled}>
            {isLoading ? (
              <span className="animate-pulse">ОБРАБОТКА...</span>
            ) : (
              <span className="flex items-center gap-2">
                {step === 'twoFactor'
                  ? 'ПОДТВЕРДИТЬ КОД'
                  : step === 'forgotRequest'
                    ? 'ОТПРАВИТЬ КОД'
                    : step === 'forgotReset'
                      ? 'СБРОСИТЬ ПАРОЛЬ'
                      : mode === 'login'
                        ? 'ПОДКЛЮЧИТЬСЯ'
                        : 'СОЗДАТЬ АККАУНТ'}{' '}
                <ArrowRight size={16} />
              </span>
            )}
          </Button>

          <div className="text-center space-y-2">
            {step === 'twoFactor' || step === 'forgotRequest' || step === 'forgotReset' ? (
              <button
                type="button"
                onClick={backToCredentials}
                className="mono text-[10px] uppercase font-bold text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors border-b border-transparent hover:border-[var(--text-main)] pb-0.5 inline-flex items-center gap-2"
              >
                <ArrowLeft size={12} /> Назад к входу
              </button>
            ) : (
              <>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={openForgotPassword}
                    className="mono text-[10px] uppercase font-bold text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors border-b border-transparent hover:border-[var(--text-main)] pb-0.5"
                  >
                    Забыли пароль?
                  </button>
                )}
                <div>
                  <button
                    type="button"
                    onClick={toggleMode}
                    className="mono text-[10px] uppercase font-bold text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors border-b border-transparent hover:border-[var(--text-main)] pb-0.5"
                  >
                    {mode === 'login' ? 'Нет аккаунта? Зарегистрироваться' : 'Уже есть доступ? Войти'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </form>
    </Modal>
  );
};

