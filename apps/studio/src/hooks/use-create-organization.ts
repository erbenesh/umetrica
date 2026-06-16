import { useMutation } from '@tanstack/react-query';

import { appToast } from '@/lib/app-toast';
import { createOrganization } from '@/lib/organizations-api';

export function useCreateOrganization() {
  return useMutation({
    mutationFn: (input: { name: string; marketCategory?: string }) =>
      createOrganization(input).then((result) => result.organization),
    onSuccess: () => {
      appToast.success('Компания создана');
    },
  });
}
