import { Building2 } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useCreateOrganization } from '@/hooks/use-create-organization';
import { useQueryClient } from '@tanstack/react-query';

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
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="mb-2 flex items-center gap-2 text-insight-info">
            <Building2 className="size-5" />
            <CardTitle>Создайте компанию</CardTitle>
          </div>
          <CardDescription>
            Компания — это рабочее пространство для дашбордов, аналитики и команды. Если вы
            регистрировались как основатель, войдите снова — компания создастся автоматически.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            placeholder="Название компании"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          {error && <p className="text-sm text-insight-warning">{error}</p>}
          <Button className="w-full" disabled={createOrg.isPending} onClick={handleCreate}>
            {createOrg.isPending ? 'Создание...' : 'Создать компанию'}
          </Button>
          <p className="text-xs text-muted-foreground">
            Если вас пригласили в компанию, перейдите в{' '}
            <Link to="/team" className="text-foreground underline-offset-2 hover:underline">
              Команда
            </Link>{' '}
            или откройте ссылку из письма.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
