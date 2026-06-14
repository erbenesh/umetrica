export interface OrganizationItem {
  id: string;
  name: string;
  slug: string;
  role: string;
}

export interface OrganizationsResponse {
  organizations: OrganizationItem[];
}

const API_BASE = import.meta.env.VITE_API_URL ?? '';

export function fetchOrganizations() {
  return fetch(`${API_BASE}/api/organizations`, { credentials: 'include' }).then(async (response) => {
    if (!response.ok) {
      throw new Error('Failed to load organizations');
    }
    return response.json() as Promise<OrganizationsResponse>;
  });
}

export function createOrganization(name: string) {
  return fetch(`${API_BASE}/api/organizations`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  }).then(async (response) => {
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error ?? 'Failed to create organization');
    }
    return data as { organization: OrganizationItem };
  });
}
