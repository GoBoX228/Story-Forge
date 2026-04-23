import React, { useEffect, useMemo, useState } from 'react';
import { BaseCard } from './BaseCard';
import { Button, SectionHeader } from './UI';
import { Bell, CreditCard, Key, Monitor, Shield } from 'lucide-react';

interface TwoFactorChallengePayload {
  challengeToken: string;
  expiresIn: number;
  retryAfter: number;
  devCode?: string | null;
}

interface SettingsViewProps {
  scale: number;
  setScale: (scale: number) => void;
  currentTheme?: 'oled' | 'low-contrast' | 'light';
  setTheme?: (theme: 'oled' | 'low-contrast' | 'light') => void;
  twoFactorEnabled: boolean;
  onRequestEnableTwoFactor: () => Promise<TwoFactorChallengePayload>;
  onConfirmEnableTwoFactor: (challengeToken: string, code: string) => Promise<string[]>;
  onRequestDisableTwoFactor: () => Promise<TwoFactorChallengePayload>;
  onConfirmDisableTwoFactor: (challengeToken: string, code: string) => Promise<void>;
  onResendTwoFactorCode: (challengeToken: string) => Promise<TwoFactorChallengePayload>;
  onChangePassword: (currentPassword: string, newPassword: string, newPasswordConfirmation: string) => Promise<void>;
}

const validatePasswordComplexity = (value: string): string | null => {
  if (value.length < 8) return 'Пароль должен содержать минимум 8 символов';
  if (!/[a-z]/.test(value)) return 'Пароль должен содержать строчные буквы';
  if (!/[A-Z]/.test(value)) return 'Пароль должен содержать заглавные буквы';
  if (!/\d/.test(value)) return 'Пароль должен содержать цифры';
  if (!/[^A-Za-z0-9]/.test(value)) return 'Пароль должен содержать спецсимволы';
  return null;
};

export const SettingsView: React.FC<SettingsViewProps> = ({
  scale,
  setScale,
  currentTheme = 'oled',
  setTheme,
  twoFactorEnabled,
  onRequestEnableTwoFactor,
  onConfirmEnableTwoFactor,
  onRequestDisableTwoFactor,
  onConfirmDisableTwoFactor,
  onResendTwoFactorCode,
  onChangePassword,
}) => {
  const [challengeToken, setChallengeToken] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<'enable' | 'disable' | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [challengeTtl, setChallengeTtl] = useState(0);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

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

  const clearTwoFactorChallenge = () => {
    setChallengeToken(null);
    setPendingAction(null);
    setVerificationCode('');
    setChallengeTtl(0);
    setResendCooldown(0);
    setDevCode(null);
  };

  const requestTwoFactorChallenge = async () => {
    setIsSubmitting(true);
    setError('');
    setSuccess('');
    setRecoveryCodes([]);

    try {
      const response = twoFactorEnabled
        ? await onRequestDisableTwoFactor()
        : await onRequestEnableTwoFactor();

      setChallengeToken(response.challengeToken);
      setPendingAction(twoFactorEnabled ? 'disable' : 'enable');
      setChallengeTtl(response.expiresIn);
      setResendCooldown(response.retryAfter);
      setDevCode(response.devCode ?? null);
      setSuccess(
        twoFactorEnabled
          ? 'КОД ДЛЯ ОТКЛЮЧЕНИЯ 2FA ОТПРАВЛЕН НА ЭЛЕКТРОННУЮ ПОЧТУ'
          : 'КОД ДЛЯ ВКЛЮЧЕНИЯ 2FA ОТПРАВЛЕН НА ЭЛЕКТРОННУЮ ПОЧТУ'
      );
    } catch (requestError: any) {
      setError((requestError?.message ?? 'НЕ УДАЛОСЬ ЗАПРОСИТЬ КОД').toUpperCase());
    } finally {
      setIsSubmitting(false);
    }
  };

  const resendTwoFactorCode = async () => {
    if (!challengeToken || resendCooldown > 0) return;

    setIsSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const response = await onResendTwoFactorCode(challengeToken);
      setChallengeTtl(response.expiresIn);
      setResendCooldown(response.retryAfter);
      setDevCode(response.devCode ?? null);
      setSuccess('КОД ОТПРАВЛЕН ПОВТОРНО');
    } catch (resendError: any) {
      setError((resendError?.message ?? 'НЕ УДАЛОСЬ ОТПРАВИТЬ КОД ПОВТОРНО').toUpperCase());
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmTwoFactorChange = async () => {
    if (!challengeToken || verificationCode.length !== 6) return;

    setIsSubmitting(true);
    setError('');
    setSuccess('');

    try {
      if (pendingAction === 'enable') {
        const codes = await onConfirmEnableTwoFactor(challengeToken, verificationCode);
        setRecoveryCodes(codes);
        setSuccess('ДВУХФАКТОРНАЯ ЗАЩИТА ВКЛЮЧЕНА');
      } else if (pendingAction === 'disable') {
        await onConfirmDisableTwoFactor(challengeToken, verificationCode);
        setRecoveryCodes([]);
        setSuccess('ДВУХФАКТОРНАЯ ЗАЩИТА ОТКЛЮЧЕНА');
      }
      clearTwoFactorChallenge();
    } catch (confirmError: any) {
      setError((confirmError?.message ?? 'НЕВЕРНЫЙ КОД ПОДТВЕРЖДЕНИЯ').toUpperCase());
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyRecoveryCodes = async () => {
    if (recoveryCodes.length === 0) return;
    const payload = recoveryCodes.join('\n');
    try {
      await navigator.clipboard.writeText(payload);
      setSuccess('РЕЗЕРВНЫЕ КОДЫ СКОПИРОВАНЫ');
    } catch {
      setError('НЕ УДАЛОСЬ СКОПИРОВАТЬ РЕЗЕРВНЫЕ КОДЫ');
    }
  };

  const clearChangePasswordForm = () => {
    setCurrentPassword('');
    setNewPassword('');
    setNewPasswordConfirm('');
  };

  const toggleChangePassword = () => {
    setError('');
    setSuccess('');
    setIsChangePasswordOpen((prev) => {
      const next = !prev;
      if (!next) {
        clearChangePasswordForm();
      }
      return next;
    });
  };

  const submitChangePassword = async () => {
    if (!currentPassword || !newPassword || !newPasswordConfirm) {
      setError('ЗАПОЛНИТЕ ВСЕ ПОЛЯ СМЕНЫ ПАРОЛЯ');
      return;
    }

    if (newPassword !== newPasswordConfirm) {
      setError('НОВЫЙ ПАРОЛЬ И ПОДТВЕРЖДЕНИЕ НЕ СОВПАДАЮТ');
      return;
    }

    if (currentPassword === newPassword) {
      setError('НОВЫЙ ПАРОЛЬ ДОЛЖЕН ОТЛИЧАТЬСЯ ОТ ТЕКУЩЕГО');
      return;
    }

    const complexityError = validatePasswordComplexity(newPassword);
    if (complexityError) {
      setError(complexityError.toUpperCase());
      return;
    }

    setIsChangingPassword(true);
    setError('');
    setSuccess('');

    try {
      await onChangePassword(currentPassword, newPassword, newPasswordConfirm);
      clearChangePasswordForm();
      setIsChangePasswordOpen(false);
      setSuccess('ПАРОЛЬ УСПЕШНО ИЗМЕНЕН');
    } catch (changeError: any) {
      setError((changeError?.message ?? 'НЕ УДАЛОСЬ ИЗМЕНИТЬ ПАРОЛЬ').toUpperCase());
    } finally {
      setIsChangingPassword(false);
    }
  };

  const challengeTtlMinutes = useMemo(
    () => (challengeTtl > 0 ? Math.max(1, Math.ceil(challengeTtl / 60)) : 0),
    [challengeTtl]
  );

  return (
    <div className="h-full overflow-auto bauhaus-bg p-12">
      <div className="max-w-4xl mx-auto space-y-12">
        <SectionHeader
          title="КОНФИГУРАЦИЯ"
          subtitle="СИСТЕМНЫЕ НАСТРОЙКИ И БЕЗОПАСНОСТЬ"
          accentColor="#6C757D"
        />

        <div className="grid grid-cols-1 gap-8">
          <BaseCard title="ИНТЕРФЕЙС" accentColor="#FFFFFF">
            <div className="space-y-8">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <label className="mono text-[10px] uppercase font-black text-[var(--text-muted)] flex items-center gap-2">
                    <Monitor size={14} /> Масштаб интерфейса
                  </label>
                  <span className="mono text-[10px] font-black text-[var(--text-main)]">
                    {Math.round(scale * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.75"
                  max="1.25"
                  step="0.05"
                  value={scale}
                  onChange={(e) => setScale(parseFloat(e.target.value))}
                  className="w-full h-2 bg-[var(--border-color)] rounded-lg appearance-none cursor-pointer accent-[var(--text-main)] hover:accent-[#E63946] transition-all"
                />
                <div className="flex justify-between text-[8px] mono text-[var(--text-muted)] uppercase">
                  <span>Компактный</span>
                  <span>Стандарт</span>
                  <span>Крупный</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 border-t border-[var(--border-color)] pt-6">
                <button
                  onClick={() => setTheme?.('oled')}
                  className={`p-4 border-2 flex flex-col items-center gap-2 transition-all ${currentTheme === 'oled' ? 'border-[var(--text-main)] bg-[var(--bg-surface)]' : 'border-[var(--border-color)] bg-transparent hover:border-[var(--border-color-hover)]'}`}
                >
                  <div className="w-8 h-8 rounded-full bg-black border border-white/20" />
                  <span
                    className={`mono text-[9px] uppercase font-black ${currentTheme === 'oled' ? 'text-[var(--text-main)]' : 'text-[var(--text-muted)]'}`}
                  >
                    ГЛУБОКИЙ ЧЕРНЫЙ
                  </span>
                </button>

                <button
                  onClick={() => setTheme?.('low-contrast')}
                  className={`p-4 border-2 flex flex-col items-center gap-2 transition-all ${currentTheme === 'low-contrast' ? 'border-[var(--text-main)] bg-[var(--bg-surface)]' : 'border-[var(--border-color)] bg-transparent hover:border-[var(--border-color-hover)]'}`}
                >
                  <div className="w-8 h-8 rounded-full bg-[#222] border border-white/10" />
                  <span
                    className={`mono text-[9px] uppercase font-black ${currentTheme === 'low-contrast' ? 'text-[var(--text-main)]' : 'text-[var(--text-muted)]'}`}
                  >
                    МЯГКИЙ КОНТРАСТ
                  </span>
                </button>

                <button
                  onClick={() => setTheme?.('light')}
                  className={`p-4 border-2 flex flex-col items-center gap-2 transition-all ${currentTheme === 'light' ? 'border-[var(--text-main)] bg-[var(--bg-surface)]' : 'border-[var(--border-color)] bg-transparent hover:border-[var(--border-color-hover)]'}`}
                >
                  <div className="w-8 h-8 rounded-full bg-[#E5E5E5] border border-black/10" />
                  <span
                    className={`mono text-[9px] uppercase font-black ${currentTheme === 'light' ? 'text-[var(--text-main)]' : 'text-[var(--text-muted)]'}`}
                  >
                    СВЕТЛАЯ ТЕМА
                  </span>
                </button>
              </div>
            </div>
          </BaseCard>

          <BaseCard title="БЕЗОПАСНОСТЬ" accentColor="#FFC300">
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-4">
                <div className="flex items-center gap-4">
                  <Shield className="text-[#FFC300]" size={24} />
                  <div>
                    <div className="mono text-sm uppercase font-black text-[var(--text-main)]">
                      ДВУХФАКТОРНАЯ ЗАЩИТА (2FA)
                    </div>
                    <div className="text-[9px] text-[var(--text-muted)] uppercase mono">
                      Код подтверждения при входе в аккаунт
                    </div>
                  </div>
                </div>
                <div
                  className={`px-3 py-1 border mono text-[9px] font-black uppercase ${
                    twoFactorEnabled
                      ? 'bg-[var(--col-teal)]/10 border-[var(--col-teal)] text-[var(--col-teal)]'
                      : 'bg-[#FFC300]/10 border-[#FFC300] text-[#FFC300]'
                  }`}
                >
                  {twoFactorEnabled ? 'ВКЛЮЧЕНО' : 'ОТКЛЮЧЕНО'}
                </div>
              </div>

              <div className="space-y-4 border-b border-[var(--border-color)] pb-6">
                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    color={twoFactorEnabled ? 'grey' : 'yellow'}
                    inverted={twoFactorEnabled}
                    disabled={isSubmitting}
                    onClick={requestTwoFactorChallenge}
                  >
                    {twoFactorEnabled ? 'ОТКЛЮЧИТЬ 2FA' : 'ВКЛЮЧИТЬ 2FA'}
                  </Button>
                  {challengeToken && (
                    <>
                      <Button
                        color="grey"
                        inverted
                        disabled={isSubmitting || resendCooldown > 0}
                        onClick={resendTwoFactorCode}
                      >
                        {resendCooldown > 0 ? `ПОВТОР ЧЕРЕЗ ${resendCooldown}с` : 'ОТПРАВИТЬ КОД СНОВА'}
                      </Button>
                      <Button
                        color="grey"
                        inverted
                        disabled={isSubmitting}
                        onClick={clearTwoFactorChallenge}
                      >
                        ОТМЕНА
                      </Button>
                    </>
                  )}
                </div>

                {challengeToken && (
                  <div className="space-y-3 p-4 border border-[var(--border-color)] bg-[var(--bg-main)]">
                    <div className="mono text-[9px] uppercase text-[var(--text-muted)] tracking-[0.15em]">
                      ВВЕДИТЕ 6-ЗНАЧНЫЙ КОД ИЗ ПИСЬМА
                    </div>
                    <div className="flex flex-col md:flex-row gap-3">
                      <input
                        value={verificationCode}
                        onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="123456"
                        className="w-full md:w-[220px] bg-[var(--input-bg)] border-2 border-[var(--border-color)] px-5 py-3 text-xs mono tracking-[0.35em] text-[var(--text-main)] focus:outline-none focus:border-[var(--col-yellow)]"
                      />
                      <Button
                        color="yellow"
                        disabled={isSubmitting || verificationCode.length !== 6}
                        onClick={confirmTwoFactorChange}
                      >
                        ПОДТВЕРДИТЬ
                      </Button>
                    </div>
                    {challengeTtlMinutes > 0 && (
                      <div className="mono text-[9px] uppercase text-[var(--text-muted)]">
                        КОД ДЕЙСТВУЕТ {challengeTtlMinutes} МИН.
                      </div>
                    )}
                    {devCode && (
                      <div className="mono text-[9px] uppercase text-[var(--col-blue)]">
                        ТЕСТ-КОД: {devCode}
                      </div>
                    )}
                  </div>
                )}

                {error && <div className="mono text-[10px] uppercase font-black text-[var(--col-red)]">{error}</div>}
                {success && (
                  <div className="mono text-[10px] uppercase font-black text-[var(--col-teal)]">{success}</div>
                )}
              </div>

              {recoveryCodes.length > 0 && (
                <div className="space-y-3 border-b border-[var(--border-color)] pb-6">
                  <div className="mono text-[10px] uppercase font-black text-[var(--col-yellow)]">
                    РЕЗЕРВНЫЕ КОДЫ ВОССТАНОВЛЕНИЯ
                  </div>
                  <div className="mono text-[9px] uppercase text-[var(--text-muted)]">
                    Сохраните их в надежном месте. Каждый код можно использовать только один раз.
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {recoveryCodes.map((code) => (
                      <div
                        key={code}
                        className="border border-[var(--border-color)] px-3 py-2 mono text-[10px] tracking-[0.15em] text-[var(--text-main)]"
                      >
                        {code}
                      </div>
                    ))}
                  </div>
                  <Button color="yellow" inverted onClick={copyRecoveryCodes}>
                    СКОПИРОВАТЬ КОДЫ
                  </Button>
                </div>
              )}

              <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-4">
                <div className="flex items-center gap-4">
                  <Bell className="text-[#4361EE]" size={24} />
                  <div>
                    <div className="mono text-sm uppercase font-black text-[var(--text-main)]">УВЕДОМЛЕНИЯ</div>
                    <div className="text-[9px] text-[var(--text-muted)] uppercase mono">
                      Отчеты о входе на электронную почту
                    </div>
                  </div>
                </div>
                <div className="w-12 h-6 bg-[var(--bg-main)] border border-[var(--border-color)] relative cursor-pointer group">
                  <div className="absolute right-0 top-0 bottom-0 w-6 bg-[#E63946] border-l border-[var(--border-color)] group-hover:bg-[var(--text-main)] transition-colors" />
                </div>
              </div>

              <div className="flex items-center justify-between pb-2">
                <div className="flex items-center gap-4">
                  <Key className="text-[var(--text-muted)]" size={24} />
                  <div>
                    <div className="mono text-sm uppercase font-black text-[var(--text-main)]">СМЕНА ПАРОЛЯ</div>
                    <div className="text-[9px] text-[var(--text-muted)] uppercase mono">
                      Введите текущий пароль и задайте новый
                    </div>
                  </div>
                </div>
                <Button size="sm" color="white" inverted disabled={isChangingPassword} onClick={toggleChangePassword}>
                  {isChangePasswordOpen ? 'СКРЫТЬ' : 'ИЗМЕНИТЬ'}
                </Button>
              </div>

              {isChangePasswordOpen && (
                <div className="space-y-3 border border-[var(--border-color)] p-4 bg-[var(--bg-main)]">
                  <div className="space-y-1.5">
                    <label className="mono text-[9px] uppercase text-[var(--text-muted)] tracking-[0.15em]">
                      ТЕКУЩИЙ ПАРОЛЬ
                    </label>
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(event) => setCurrentPassword(event.target.value)}
                      className="w-full bg-[var(--input-bg)] border-2 border-[var(--border-color)] px-4 py-2.5 text-xs mono text-[var(--text-main)] focus:outline-none focus:border-[var(--col-yellow)]"
                      placeholder="••••••••"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="mono text-[9px] uppercase text-[var(--text-muted)] tracking-[0.15em]">
                      НОВЫЙ ПАРОЛЬ
                    </label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(event) => setNewPassword(event.target.value)}
                      className="w-full bg-[var(--input-bg)] border-2 border-[var(--border-color)] px-4 py-2.5 text-xs mono text-[var(--text-main)] focus:outline-none focus:border-[var(--col-yellow)]"
                      placeholder="••••••••"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="mono text-[9px] uppercase text-[var(--text-muted)] tracking-[0.15em]">
                      ПОДТВЕРЖДЕНИЕ ПАРОЛЯ
                    </label>
                    <input
                      type="password"
                      value={newPasswordConfirm}
                      onChange={(event) => setNewPasswordConfirm(event.target.value)}
                      className="w-full bg-[var(--input-bg)] border-2 border-[var(--border-color)] px-4 py-2.5 text-xs mono text-[var(--text-main)] focus:outline-none focus:border-[var(--col-yellow)]"
                      placeholder="••••••••"
                    />
                  </div>

                  <div className="mono text-[9px] uppercase text-[var(--text-muted)]">
                    Минимум 8 символов, заглавная/строчная буква, цифра и спецсимвол.
                  </div>

                  <div className="flex gap-3">
                    <Button color="yellow" disabled={isChangingPassword} onClick={submitChangePassword}>
                      {isChangingPassword ? 'СОХРАНЕНИЕ...' : 'СОХРАНИТЬ'}
                    </Button>
                    <Button color="grey" inverted disabled={isChangingPassword} onClick={toggleChangePassword}>
                      ОТМЕНА
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </BaseCard>

          <BaseCard title="ПОДПИСКА" accentColor="#E63946">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <CreditCard className="text-[#E63946]" size={24} />
                <div>
                  <div className="mono text-sm uppercase font-black text-[var(--text-main)]">ТАРИФ МАСТЕР</div>
                  <div className="text-[9px] text-[var(--text-muted)] uppercase mono">Активна до 14.02.2026</div>
                </div>
              </div>
              <Button color="red" size="sm">
                УПРАВЛЕНИЕ
              </Button>
            </div>
          </BaseCard>
        </div>
      </div>
    </div>
  );
};
