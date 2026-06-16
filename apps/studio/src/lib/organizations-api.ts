import { apiFetch } from '@/lib/api-client';

export interface OrganizationItem {
  id: string;
  name: string;
  slug: string;
  role: string;
}

export interface OrganizationsResponse {
  organizations: OrganizationItem[];
}

export function fetchOrganizations() {
  return apiFetch<OrganizationsResponse>('/api/organizations');
}

export function createOrganization(input: { name: string; marketCategory?: string }) {
  return apiFetch<{ organization: OrganizationItem }>('/api/organizations', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}
