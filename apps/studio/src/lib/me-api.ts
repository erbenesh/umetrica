export interface MeResponse {
  user: {
    id: string;
    name: string;
    email: string;
    emailVerified: boolean;
  };
  session: {
    id: string;
    activeOrganizationId: string | null;
  };
  role?: string;
  organization?: {
    id: string;
    name: string;
  };
}

const API_BASE = import.meta.env.VITE_API_URL ?? '';

export function fetchMe() {
  return fetch(`${API_BASE}/api/me`, { credentials: 'include' }).then(async (response) => {
    if (!response.ok) {
      throw new Error('Unauthorized');
    }
    return response.json() as Promise<MeResponse>;
  });
}

export function canWriteDashboards(role?: string) {
  return role === 'owner' || role === 'admin';
}
