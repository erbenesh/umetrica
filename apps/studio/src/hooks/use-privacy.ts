import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { appToast } from '@/lib/app-toast';
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
      if (typeof result.notice === 'string' && result.notice.trim()) {
        appToast.info(result.notice);
      } else {
        appToast.success('Настройки сохранены');
      }
    },
  });
}
