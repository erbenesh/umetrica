import { apiFetch } from '@/lib/api-client';

export async function registerFounder(data: {
  email: string;
  password: string;
  name: string;
  companyName: string;
}) {
  return apiFetch<{ user: { id: string; email: string; name: string } }>('/api/register', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function completeFounderSetup() {
  await apiFetch<void>('/api/founder/complete-setup', {
    method: 'POST',
  });
}
