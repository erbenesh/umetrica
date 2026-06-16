import { useQueryClient } from '@tanstack/react-query';
import { User } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { DocBlock } from '@/components/doc/doc-block';
import { DocPage } from '@/components/doc/doc-page';
import { FormActions, FormField } from '@/components/doc/form-field';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useMe, meQueryKey } from '@/hooks/use-me';
import { authClient } from '@/lib/auth-client';

const ROLE_LABELS: Record<string, string> = {
  owner: 'Владелец',
  admin: 'Админ',
  viewer: 'Наблюдатель',
  member: 'Участник',
};

function roleLabel(role?: string) {
  if (!role) return 'Участник';
  return ROLE_LABELS[role] ?? role;
}

export function SettingsProfilePage() {
  const queryClient = useQueryClient();
  const { data: me } = useMe();
  const [name, setName] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setName(me?.user?.name ?? '');
  }, [me?.user?.name]);

  const initial = me?.user?.name ?? '';

  const handleSave = async () => {
    setStatus(null);
    setSaving(true);
    try {
      const result = await authClient.updateUser({ name: name.trim() });
      if (result.error) {
        throw new Error(result.error.message);
      }
      await queryClient.invalidateQueries({ queryKey: meQueryKey });
      setStatus('Профиль сохранён');
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Не удалось сохранить');
    } finally {
      setSaving(false);
    }
  };

  const userInitial = (me?.user?.name ?? me?.user?.email ?? '?').charAt(0).toUpperCase();

  return (
    <DocPage
      title="Профиль"
      lead="Имя, email и аватар — видны команде"
      icon={User}
      back="auto"
    >
      <DocBlock title="Аватар">
        <div className="flex flex-wrap items-start gap-4">
          <div className="flex size-16 items-center justify-center rounded-full bg-primary/10 text-xl font-semibold text-primary">
            {userInitial}
          </div>
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" type="button" disabled>
                Загрузить
              </Button>
              <Button variant="ghost" size="sm" type="button" disabled>
                Удалить
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">JPG или PNG, до 2 МБ. Скоро.</p>
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
        {status ? <p className="mb-3 text-xs text-muted-foreground">{status}</p> : null}
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
