import { apiFetch } from '@/lib/api-client';

export type FounderSetupResponse =
  | { status: 'created'; company: { id: string; name: string; slug: string; role: string } }
  | { status: 'exists' }
  | { status: 'skipped'; reason: 'no_pending' | 'email_not_verified' }
  | { status: 'failed'; error: string };

export async function registerFounder(data: {
  email: string;
  password: string;
  name: string;
  companyName: string;
  marketCategory?: string;
}) {
  return apiFetch<{ user: { id: string; email: string; name: string } }>('/api/register', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function completeFounderSetup() {
  return apiFetch<FounderSetupResponse>('/api/founder/complete-setup', {
    method: 'POST',
  });
}
