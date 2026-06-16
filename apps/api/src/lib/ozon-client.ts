const OZON_API_BASE = 'https://api-seller.ozon.ru';
const REQUEST_TIMEOUT_MS = 30_000;

export type OzonCredentials = {
  clientId: string;
  apiKey: string;
};

async function fetchWithTimeout(url: string, init: RequestInit) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

export async function ozonPost<T>(credentials: OzonCredentials, path: string, body: unknown): Promise<T> {
  const response = await fetchWithTimeout(`${OZON_API_BASE}${path}`, {
    method: 'POST',
    headers: {
      'Client-Id': credentials.clientId,
      'Api-Key': credentials.apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (response.status === 401) {
    throw new Error('Client-Id или Api-Key Ozon недействителен');
  }

  if (response.status === 403) {
    throw new Error('У ключа нет доступа к этому разделу Ozon API');
  }

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(text ? `Ozon вернул ошибку ${response.status}` : `Ozon вернул ошибку ${response.status}`);
  }

  return (await response.json()) as T;
}
