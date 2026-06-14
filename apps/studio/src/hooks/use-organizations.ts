import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { authClient } from '@/lib/auth-client';
import { fetchOrganizations } from '@/lib/organizations-api';

export const organizationsQueryKey = ['organizations'] as const;

export function useOrganizations() {
  return useQuery({
    queryKey: organizationsQueryKey,
    queryFn: fetchOrganizations,
    staleTime: 30_000,
  });
}

export function useSwitchOrganization() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (organizationId: string) => {
      const result = await authClient.organization.setActive({ organizationId });
      if (result.error) {
        throw new Error(result.error.message);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
    },
  });
}
