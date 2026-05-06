import React, { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { BaseCard } from './BaseCard';
import { Button, Input, TextArea } from './UI';
import { Camera, Image as ImageIcon, Edit3, User } from 'lucide-react';
import { UserProfile } from '../types';

interface ProfileEditorProps {
  user: UserProfile | null;
  scenariosCount: number;
  mapsCount: number;
  onSaveProfile: (payload: {
    name: string;
    email: string;
    bio?: string | null;
    avatarFile?: File | null;
    bannerFile?: File | null;
    removeAvatar?: boolean;
    removeBanner?: boolean;
  }) => Promise<UserProfile>;
}

const MAX_AVATAR_SIZE = 2 * 1024 * 1024;
const MAX_BANNER_SIZE = 4 * 1024 * 1024;

const ProfileEditor: React.FC<ProfileEditorProps> = ({
  user,
  scenariosCount,
  mapsCount,
  onSaveProfile,
}) => {
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const avatarObjectUrlRef = useRef<string | null>(null);
  const bannerObjectUrlRef = useRef<string | null>(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const [removeBanner, setRemoveBanner] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (avatarObjectUrlRef.current) {
      URL.revokeObjectURL(avatarObjectUrlRef.current);
      avatarObjectUrlRef.current = null;
    }
    if (bannerObjectUrlRef.current) {
      URL.revokeObjectURL(bannerObjectUrlRef.current);
      bannerObjectUrlRef.current = null;
    }

    setName(user?.name ?? '');
    setEmail(user?.email ?? '');
    setBio(user?.bio ?? '');
    setAvatarUrl(user?.avatarUrl ?? null);
    setBannerUrl(user?.bannerUrl ?? null);
    setAvatarFile(null);
    setBannerFile(null);
    setRemoveAvatar(false);
    setRemoveBanner(false);
    setError('');
    setSuccess('');
  }, [user]);

  useEffect(
    () => () => {
      if (avatarObjectUrlRef.current) {
        URL.revokeObjectURL(avatarObjectUrlRef.current);
      }
      if (bannerObjectUrlRef.current) {
        URL.revokeObjectURL(bannerObjectUrlRef.current);
      }
    },
    []
  );

  const initials = useMemo(() => {
    if (!name.trim()) return 'GM';
    const parts = name.trim().split(/\s+/).slice(0, 2);
    return parts.map((part) => part.charAt(0).toUpperCase()).join('');
  }, [name]);

  const onAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Можно загрузить только изображение');
      event.target.value = '';
      return;
    }

    if (file.size > MAX_AVATAR_SIZE) {
      setError('Фото профиля должно быть меньше 2 МБ');
      event.target.value = '';
      return;
    }

    if (avatarObjectUrlRef.current) {
      URL.revokeObjectURL(avatarObjectUrlRef.current);
    }

    const localUrl = URL.createObjectURL(file);
    avatarObjectUrlRef.current = localUrl;
    setAvatarFile(file);
    setAvatarUrl(localUrl);
    setRemoveAvatar(false);
    setError('');
    event.target.value = '';
  };

  const onBannerChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Можно загрузить только изображение');
      event.target.value = '';
      return;
    }

    if (file.size > MAX_BANNER_SIZE) {
      setError('Шапка профиля должна быть меньше 4 МБ');
      event.target.value = '';
      return;
    }

    if (bannerObjectUrlRef.current) {
      URL.revokeObjectURL(bannerObjectUrlRef.current);
    }

    const localUrl = URL.createObjectURL(file);
    bannerObjectUrlRef.current = localUrl;
    setBannerFile(file);
    setBannerUrl(localUrl);
    setRemoveBanner(false);
    setError('');
    event.target.value = '';
  };

  const clearAvatar = () => {
    if (avatarObjectUrlRef.current) {
      URL.revokeObjectURL(avatarObjectUrlRef.current);
      avatarObjectUrlRef.current = null;
    }
    setAvatarFile(null);
    setAvatarUrl(null);
    setRemoveAvatar(Boolean(user?.avatarUrl));
  };

  const clearBanner = () => {
    if (bannerObjectUrlRef.current) {
      URL.revokeObjectURL(bannerObjectUrlRef.current);
      bannerObjectUrlRef.current = null;
    }
    setBannerFile(null);
    setBannerUrl(null);
    setRemoveBanner(Boolean(user?.bannerUrl));
  };

  const handleSave = async () => {
    const nextName = name.trim();
    const nextEmail = email.trim();

    if (!nextName) {
      setError('Имя не может быть пустым');
      return;
    }

    if (!nextEmail) {
      setError('Email не может быть пустым');
      return;
    }

    setIsSaving(true);
    setError('');
    setSuccess('');

    try {
      await onSaveProfile({
        name: nextName,
        email: nextEmail,
        bio: bio.trim() ? bio.trim() : null,
        avatarFile,
        bannerFile,
        removeAvatar,
        removeBanner,
      });
      setSuccess('Профиль обновлен');
    } catch (saveError: any) {
      setError(saveError?.message ?? 'Не удалось сохранить профиль');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="h-full overflow-auto bauhaus-bg">
      <input
        ref={avatarInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onAvatarChange}
      />
      <input
        ref={bannerInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onBannerChange}
      />

      <div className="relative h-72 bg-[var(--bg-surface)] border-b border-[var(--border-color)] group overflow-hidden">
        {bannerUrl ? (
          <Image
            src={bannerUrl}
            alt="Шапка профиля пользователя"
            title="Шапка профиля"
            fill
            sizes="100vw"
            priority
            unoptimized
            className="object-cover"
          />
        ) : (
          <div className="absolute inset-0 opacity-25 flex flex-wrap pointer-events-none">
            {Array.from({ length: 12 }).map((_, index) => (
              <div
                key={index}
                className="w-1/4 h-1/2 border border-[var(--border-color)] bg-[radial-gradient(var(--col-grey)_1px,transparent_1px)] bg-[size:20px_20px]"
              />
            ))}
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-main)] via-transparent to-transparent" />

        <div className="absolute top-6 right-6 flex gap-2">
          <button
            onClick={() => bannerInputRef.current?.click()}
            className="px-4 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:border-[var(--text-main)] transition-all flex items-center gap-2 mono text-[10px] uppercase font-black tracking-widest"
          >
            <ImageIcon size={14} />
            Сменить шапку
          </button>
          {bannerUrl && (
            <button
              onClick={clearBanner}
              className="px-4 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--col-red)] hover:border-[var(--col-red)] transition-all mono text-[10px] uppercase font-black tracking-widest"
            >
              Удалить
            </button>
          )}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-12 -mt-20 relative z-20 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="space-y-8">
            <button
              onClick={() => avatarInputRef.current?.click()}
              className="w-48 h-48 bg-[var(--bg-main)] border-4 border-[var(--col-red)] flex items-center justify-center relative overflow-hidden group/avatar shadow-[0_0_30px_rgba(0,0,0,0.5)]"
            >
              {avatarUrl ? (
                <Image
                  src={avatarUrl}
                  alt="Аватар пользователя"
                  title="Аватар пользователя"
                  fill
                  sizes="192px"
                  unoptimized
                  className="object-cover"
                />
              ) : (
                <div className="text-4xl font-black text-[var(--text-muted)]/40">{initials}</div>
              )}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 bg-black/70 transition-all">
                <div className="flex flex-col items-center gap-2">
                  <Camera className="text-white" size={24} />
                  <span className="mono text-[9px] uppercase font-bold text-white">Обновить</span>
                </div>
              </div>
            </button>
            {avatarUrl && (
              <button
                onClick={clearAvatar}
                className="mono text-[9px] uppercase font-black text-[var(--text-muted)] hover:text-[var(--col-red)] border border-[var(--border-color)] px-3 py-2"
              >
                Удалить фото профиля
              </button>
            )}

            <BaseCard title="Статистика" accentColor="var(--col-blue)" className="!h-auto">
              <div className="grid grid-cols-2 gap-4">
                <div className="border-l-2 border-[var(--col-red)] pl-3">
                  <div className="text-2xl font-bold mono text-[var(--text-main)]">{scenariosCount}</div>
                  <div className="text-[10px] text-[var(--text-muted)] uppercase mono">Сценариев</div>
                </div>
                <div className="border-l-2 border-[var(--col-yellow)] pl-3">
                  <div className="text-2xl font-bold mono text-[var(--text-main)]">{mapsCount}</div>
                  <div className="text-[10px] text-[var(--text-muted)] uppercase mono">Карт</div>
                </div>
              </div>
            </BaseCard>
          </div>

          <div className="lg:col-span-2 space-y-8">
            <div className="flex justify-between items-end pb-2 border-b border-[var(--border-color)]">
              <div>
                <h1 className="text-4xl font-black uppercase tracking-tighter text-[var(--text-main)] mb-1">
                  {name || 'Без имени'}
                </h1>
                <p className="mono text-xs text-[var(--col-red)] uppercase font-bold flex items-center gap-2">
                  <User size={14} />
                  Профиль мастера
                </p>
              </div>
              <div className="flex gap-2">
                <span className="px-2 py-1 border border-[var(--border-color)] mono text-[9px] uppercase text-[var(--text-muted)]">
                  {user?.role === 'admin' ? 'Администратор' : 'Пользователь'}
                </span>
              </div>
            </div>

            <BaseCard title="Личные данные" accentColor="var(--col-red)" className="!h-auto">
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="mono text-[10px] text-[var(--text-muted)] block mb-1 uppercase">
                      Имя
                    </label>
                    <Input value={name} onChange={(event) => setName(event.target.value)} accentColor="var(--col-red)" />
                  </div>
                  <div>
                    <label className="mono text-[10px] text-[var(--text-muted)] block mb-1 uppercase">
                      Электронная почта
                    </label>
                    <Input
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      accentColor="var(--col-red)"
                    />
                  </div>
                </div>
                <div>
                  <label className="mono text-[10px] text-[var(--text-muted)] block mb-1 uppercase">
                    О себе
                  </label>
                  <TextArea
                    value={bio}
                    onChange={(event) => setBio(event.target.value)}
                    placeholder="Добавьте короткое описание"
                    accentColor="var(--col-red)"
                    className="h-24"
                  />
                </div>

                {error && (
                  <div className="px-4 py-3 border border-[var(--col-red)] text-[var(--col-red)] mono text-[10px] uppercase font-black">
                    {error}
                  </div>
                )}

                {success && (
                  <div className="px-4 py-3 border border-[var(--col-teal)] text-[var(--col-teal)] mono text-[10px] uppercase font-black">
                    {success}
                  </div>
                )}

                <Button variant="accent-red" className="w-full" onClick={handleSave} disabled={isSaving}>
                  <Edit3 size={16} />
                  {isSaving ? 'Сохранение...' : 'Сохранить изменения'}
                </Button>
              </div>
            </BaseCard>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileEditor;


