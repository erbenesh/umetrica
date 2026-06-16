import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useEnterpriseInquiry } from '@/hooks/use-billing';
import { useMe } from '@/hooks/use-me';

interface EnterpriseInquiryDialogProps {
  open: boolean;
  onClose: () => void;
}

export function EnterpriseInquiryDialog({ open, onClose }: EnterpriseInquiryDialogProps) {
  const { data: me } = useMe();
  const inquiry = useEnterpriseInquiry();
  const [email, setEmail] = useState('');
  const [note, setNote] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setEmail(me?.user.email ?? '');
    setNote('');
    setSent(false);
    setError(null);
  }, [open, me?.user.email]);

  if (!open) return null;

  const handleSubmit = async () => {
    setError(null);

    try {
      await inquiry.mutateAsync({ email, note: note.trim() || undefined });
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось отправить заявку');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4">
      <Card className="w-full max-w-md rounded-b-none sm:rounded-b-lg">
        <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-border sm:hidden" aria-hidden />
        <CardHeader className="pb-2">
          <CardTitle>Переход на Enterprise</CardTitle>
          <p className="m-0 text-[13px] text-muted-foreground">
            Pro → Enterprise · индивидуальные условия
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3 rounded-lg border border-border p-3 text-sm">
            <div>
              <p className="m-0 text-xs text-muted-foreground">Сейчас</p>
              <p className="m-0 font-semibold">Pro</p>
              <p className="m-0 text-xs text-muted-foreground">12 900 ₽ / мес</p>
            </div>
            <div>
              <p className="m-0 text-xs text-muted-foreground">Enterprise</p>
              <p className="m-0 font-semibold">от 49 000 ₽</p>
              <p className="m-0 text-xs text-muted-foreground">договор · счёт</p>
            </div>
          </div>

          <ul className="m-0 list-none space-y-1 p-0 text-[13px] text-muted-foreground">
            <li>· Безлимит AI-инсайтов и участников</li>
            <li>· SSO, SLA, выделенная поддержка</li>
            <li>· Опционально BYOK LLM</li>
          </ul>

          {sent ? (
            <p className="m-0 text-sm text-foreground">
              Заявка отправлена — менеджер свяжется с вами по email.
            </p>
          ) : (
            <div className="form-fields">
              <div className="field">
                <label htmlFor="enterprise-email">Контакт для связи</label>
                <input
                  id="enterprise-email"
                  type="email"
                  className="flex h-8 w-full rounded-md border border-input bg-card px-2.5 text-[13px]"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="enterprise-note">Комментарий</label>
                <textarea
                  id="enterprise-note"
                  rows={3}
                  className="min-h-[88px] w-full rounded-md border border-input bg-card px-2.5 py-2 text-[13px]"
                  placeholder="SSO через Google Workspace, ~30 пользователей…"
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                />
              </div>
            </div>
          )}

          {error ? <p className="m-0 text-xs text-destructive">{error}</p> : null}

          <div className="flex justify-end gap-2">
            <Button variant="outline" type="button" onClick={onClose}>
              {sent ? 'Закрыть' : 'Отмена'}
            </Button>
            {!sent ? (
              <Button type="button" disabled={!email || inquiry.isPending} onClick={() => void handleSubmit()}>
                {inquiry.isPending ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    Отправка...
                  </>
                ) : (
                  'Отправить заявку'
                )}
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
