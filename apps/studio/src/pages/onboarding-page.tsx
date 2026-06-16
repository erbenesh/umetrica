import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';

import { AuthSplitLayout } from '@/components/layout/auth-split-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCreateOrganization } from '@/hooks/use-create-organization';
import { cn } from '@/lib/utils';

const CATEGORIES = ['Дом и текстиль', 'Одежда', 'Красота', 'Электроника', 'Другое'];

export function OnboardingPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const createOrg = useCreateOrganization();
  const [name, setName] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    setError(null);
    if (!name.trim()) return;

    try {
      await createOrg.mutateAsync(name.trim());
      await queryClient.invalidateQueries();
      navigate('/onboarding/connect', { replace: true, state: { category } });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось создать компанию');
    }
  };

  return (
    <AuthSplitLayout
      topbar="mark"
      showBrandBlock={false}
      brandTitle="Создайте магазин"
      brandDescription="Укажите название и категорию — рыночные инсайты появятся сразу, кабинет подключите позже."
      panelTitle="Название магазина"
      panelDescription="Рабочее пространство для дашбордов, рынка и команды"
      footer={
        <>
          Есть приглашение?{' '}
          <Link to="/team">Откройте ссылку</Link> или <Link to="/team">Команда</Link>
        </>
      }
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="company-name" className="text-xs font-medium text-foreground">
            Магазин / компания
          </label>
          <Input
            id="company-name"
            placeholder="HomeStyle"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="category" className="text-xs font-medium text-foreground">
            Категория на WB
          </label>
          <select
            id="category"
            className={cn(
              'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs',
              'focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 outline-none'
            )}
            value={category}
            onChange={(event) => setCategory(event.target.value)}
          >
            {CATEGORIES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>

        {error ? <p className="text-xs text-insight-warning">{error}</p> : null}

        <Button className="w-full" disabled={createOrg.isPending} onClick={handleCreate} type="button">
          {createOrg.isPending ? 'Создание...' : 'Создать компанию'}
        </Button>
      </div>
    </AuthSplitLayout>
  );
}
