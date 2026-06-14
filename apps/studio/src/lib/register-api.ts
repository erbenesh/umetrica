const API_BASE = import.meta.env.VITE_API_URL ?? '';

export async function registerFounder(data: {
  email: string;
  password: string;
  name: string;
  companyName: string;
}) {
  const response = await fetch(`${API_BASE}/api/register`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  const body = (await response.json().catch(() => ({}))) as { message?: string; error?: string };

  if (!response.ok) {
    throw new Error(body.message ?? body.error ?? 'Ошибка регистрации');
  }

  return body;
}

export async function completeFounderSetup() {
  await fetch(`${API_BASE}/api/founder/complete-setup`, {
    method: 'POST',
    credentials: 'include',
  });
}
