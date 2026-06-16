import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';

import { AuthField, AuthSelectField } from '@/components/auth/auth-field';
import { AuthStatusMessage } from '@/components/auth/auth-status';
import { AuthSplitLayout } from '@/components/layout/auth-split-layout';
import { Button } from '@/components/ui/button';
import { useCreateOrganization } from '@/hooks/use-create-organization';
import { DEFAULT_MARKET_CATEGORY, MARKET_CATEGORIES } from '@/lib/market-categories';

export function OnboardingPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const createOrg = useCreateOrganization();
  const [name, setName] = useState('');
  const [category, setCategory] = useState<string>(DEFAULT_MARKET_CATEGORY);
  const [error, setError] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    const trimmed = name.trim();
    if (!trimmed) {
      setNameError('Укажите название магазина или компании');
      return;
    }

    setNameError(null);

    try {
      await createOrg.mutateAsync({ name: trimmed, marketCategory: category });
      await queryClient.invalidateQueries();
      navigate('/onboarding/connect', { replace: true });
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
      <form onSubmit={handleCreate} noValidate>
        <div className="form-fields">
          <AuthField
            id="company-name"
            label="Магазин / компания"
            placeholder="HomeStyle"
            autoComplete="organization"
            required
            autoFocus
            value={name}
            error={nameError ?? undefined}
            onChange={(event) => {
              setName(event.target.value);
              if (nameError) setNameError(null);
            }}
          />
          <AuthSelectField
            id="category"
            label="Категория на WB"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
          >
            {MARKET_CATEGORIES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </AuthSelectField>
        </div>

        {error ? <AuthStatusMessage variant="error">{error}</AuthStatusMessage> : null}

        <div className="form-actions">
          <Button
            className="h-11 w-full text-base"
            disabled={createOrg.isPending}
            type="submit"
            aria-busy={createOrg.isPending}
          >
            {createOrg.isPending ? 'Создание...' : 'Создать компанию'}
          </Button>
        </div>
      </form>
    </AuthSplitLayout>
  );
}
