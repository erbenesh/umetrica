import { Building2 } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';

import { AuthLayout } from '@/components/layout/auth-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCreateOrganization } from '@/hooks/use-create-organization';

export function OnboardingPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const createOrg = useCreateOrganization();
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    setError(null);
    if (!name.trim()) return;

    try {
      await createOrg.mutateAsync(name.trim());
      await queryClient.invalidateQueries();
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось создать компанию');
    }
  };

  return (
    <AuthLayout
      title="Создайте компанию"
      description="Если вы регистрировались как основатель, войдите снова — компания создастся автоматически."
      footer={
        <p className="text-center text-[11px] text-muted-foreground">
          Есть приглашение? Откройте{' '}
          <Link to="/team" className="text-foreground hover:underline">
            Команда
          </Link>{' '}
          или ссылку из письма.
        </p>
      }
    >
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Building2 className="size-3.5 text-primary" />
          Рабочее пространство для дашбордов и команды
        </div>
        <Input
          placeholder="Название компании"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        {error && <p className="text-xs text-insight-warning">{error}</p>}
        <Button className="w-full" disabled={createOrg.isPending} onClick={handleCreate}>
          {createOrg.isPending ? 'Создание...' : 'Создать компанию'}
        </Button>
      </div>
    </AuthLayout>
  );
}
