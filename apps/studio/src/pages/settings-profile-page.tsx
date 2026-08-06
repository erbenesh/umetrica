import { useQueryClient } from '@tanstack/react-query';
import { User } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import { DocBlock } from '@/components/doc/doc-block';
import { DocPage } from '@/components/doc/doc-page';
import { FormActions, FormField } from '@/components/doc/form-field';
import { UserAvatar } from '@/components/user-avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useMe, meQueryKey } from '@/hooks/use-me';
import { appToast } from '@/lib/app-toast';
import { authClient } from '@/lib/auth-client';
import { getErrorMessage } from '@/lib/api-client';
import { deleteAvatar, uploadAvatar } from '@/lib/profile-api';

const ROLE_LABELS: Record<string, string> = {
  owner: 'Владелец',
  admin: 'Админ',
  viewer: 'Наблюдатель',
  member: 'Участник',
};

const ACCEPTED_AVATAR_TYPES = 'image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp';

function roleLabel(role?: string) {
  if (!role) return 'Участник';
  return ROLE_LABELS[role] ?? role;
}

export function SettingsProfilePage() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { data: me } = useMe();
  const [name, setName] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarCacheKey, setAvatarCacheKey] = useState<string | null>(null);

  useEffect(() => {
    setName(me?.user?.name ?? '');
  }, [me?.user?.name]);

  const initial = me?.user?.name ?? '';
  const hasAvatar = Boolean(me?.user?.image);

  const handleSave = async () => {
    setStatus(null);
    setSaving(true);
    try {
      const result = await authClient.updateUser({ name: name.trim() });
      if (result.error) {
        throw new Error(result.error.message);
      }
      await queryClient.invalidateQueries({ queryKey: meQueryKey });
      appToast.success('Профиль сохранён');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Не удалось сохранить';
      setStatus(message);
      appToast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) return;

    setAvatarBusy(true);
    try {
      const result = await uploadAvatar(file);
      setAvatarCacheKey(result.updatedAt);
      await queryClient.invalidateQueries({ queryKey: meQueryKey });
      appToast.success('Аватар обновлён');
    } catch (err) {
      appToast.error(getErrorMessage(err, 'Не удалось загрузить аватар'));
    } finally {
      setAvatarBusy(false);
    }
  };

  const handleAvatarDelete = async () => {
    if (!hasAvatar) return;

    setAvatarBusy(true);
    try {
      await deleteAvatar();
      setAvatarCacheKey(null);
      await queryClient.invalidateQueries({ queryKey: meQueryKey });
      appToast.success('Аватар удалён');
    } catch (err) {
      appToast.error(getErrorMessage(err, 'Не удалось удалить аватар'));
    } finally {
      setAvatarBusy(false);
    }
  };

  return (
    <DocPage
      title="Профиль"
      lead="Имя, email и аватар — видны команде"
      icon={User}
      back="auto"
    >
      <DocBlock title="Аватар">
        <div className="flex flex-wrap items-start gap-4">
          <UserAvatar
            name={me?.user?.name}
            email={me?.user?.email}
            image={me?.user?.image}
            cacheKey={avatarCacheKey ?? me?.user?.id}
            className="size-16 rounded-full"
          />
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                type="button"
                disabled={avatarBusy}
                onClick={() => fileInputRef.current?.click()}
              >
                {avatarBusy ? 'Загрузка...' : 'Загрузить'}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                type="button"
                disabled={avatarBusy || !hasAvatar}
                onClick={handleAvatarDelete}
              >
                Удалить
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">JPG, PNG или WebP, до 2 МБ.</p>
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_AVATAR_TYPES}
              className="sr-only"
              onChange={handleAvatarSelect}
            />
          </div>
        </div>
      </DocBlock>

      <DocBlock title="Данные">
        <div className="grid max-w-xl gap-4 sm:grid-cols-2">
          <FormField label="Имя">
            <Input value={name} onChange={(event) => setName(event.target.value)} />
          </FormField>
          <FormField label="Email">
            <Input value={me?.user?.email ?? ''} readOnly />
          </FormField>
        </div>
        <FormField
          className="mt-4 max-w-xl"
          label="Роль в компании"
          hint={
            <>
              Меняется через передачу владения · <Link to="/team" className="text-primary hover:underline">Команда</Link>
            </>
          }
        >
          <Input value={roleLabel(me?.role)} readOnly />
        </FormField>
      </DocBlock>

      <DocBlock>
        {status ? <p className="mb-3 text-xs text-destructive">{status}</p> : null}
        <FormActions>
          <Button type="button" onClick={handleSave} disabled={saving || name.trim() === initial}>
            {saving ? 'Сохранение...' : 'Сохранить'}
          </Button>
          <Link to="/settings">
            <Button variant="ghost" type="button">
              Отмена
            </Button>
          </Link>
        </FormActions>
      </DocBlock>
    </DocPage>
  );
}
