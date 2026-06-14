import { useMutation } from '@tanstack/react-query';

import { createOrganization } from '@/lib/organizations-api';

export function useCreateOrganization() {
  return useMutation({
    mutationFn: (name: string) => createOrganization(name).then((result) => result.organization),
  });
}
