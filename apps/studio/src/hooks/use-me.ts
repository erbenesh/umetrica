import { useQuery } from '@tanstack/react-query';

import { canWriteDashboards, fetchMe } from '@/lib/me-api';

export const meQueryKey = ['me'] as const;

export function useMe() {
  return useQuery({
    queryKey: meQueryKey,
    queryFn: fetchMe,
    staleTime: 30_000,
  });
}

export function useCanWriteDashboards() {
  const { data } = useMe();
  return canWriteDashboards(data?.role);
}
