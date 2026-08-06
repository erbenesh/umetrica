import type { OrgDataMode, TrustCapabilities } from '@sellerpool/core';

import { apiFetch } from '@/lib/api-client';

export interface MeResponse {
  user: {
    id: string;
    name: string;
    email: string;
    emailVerified: boolean;
    image?: string | null;
  };
  session: {
    id: string;
    activeOrganizationId: string | null;
  };
  role?: string;
  organization?: {
    id: string;
    name: string;
    logo?: string | null;
  };
  dataMode?: OrgDataMode;
  trustCapabilities?: TrustCapabilities;
}

export type { OrgDataMode, TrustCapabilities };

export function fetchMe() {
  return apiFetch<MeResponse>('/api/me');
}

export function canWriteDashboards(role?: string) {
  return role === 'owner' || role === 'admin';
}

export function canManageOrganization(role?: string) {
  return canWriteDashboards(role);
}
