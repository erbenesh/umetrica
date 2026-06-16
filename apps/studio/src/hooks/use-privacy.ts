import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { fetchPrivacySettings, privacyQueryKey, updatePrivacySettingsWithNotice } from '@/lib/privacy-api';

export function usePrivacySettings() {
  return useQuery({
    queryKey: privacyQueryKey,
    queryFn: fetchPrivacySettings,
  });
}

export function useUpdatePrivacySettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updatePrivacySettingsWithNotice,
    onSuccess: (result) => {
      const { notice: _notice, ...view } = result;
      queryClient.setQueryData(privacyQueryKey, view);
      queryClient.invalidateQueries({ queryKey: privacyQueryKey });
    },
  });
}
