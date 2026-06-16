import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  createDatabaseConnection,
  createMarketplaceApiConnection,
  deleteConnection,
  fetchConnections,
  reuploadCsvConnection,
  syncConnection,
  testDatabaseConnection,
  testMarketplaceApiConnection,
  uploadCsvConnection,
} from '@/lib/connections-api';

export const connectionsQueryKey = ['connections'] as const;

export function useConnections() {
  return useQuery({
    queryKey: connectionsQueryKey,
    queryFn: fetchConnections,
  });
}

export function useCreateMarketplaceConnection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createMarketplaceApiConnection,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: connectionsQueryKey }),
  });
}

export function useCreateDatabaseConnection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createDatabaseConnection,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: connectionsQueryKey }),
  });
}

export function useUploadCsvConnection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: uploadCsvConnection,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: connectionsQueryKey }),
  });
}

export function useReuploadCsvConnection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      connectionId,
      ...payload
    }: {
      connectionId: string;
      file: File;
      provider: string;
      reportType: string;
      deleteAfterImport: boolean;
    }) => reuploadCsvConnection(connectionId, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: connectionsQueryKey }),
  });
}

export function useTestDatabaseConnection() {
  return useMutation({
    mutationFn: testDatabaseConnection,
  });
}

export function useTestMarketplaceConnection() {
  return useMutation({
    mutationFn: testMarketplaceApiConnection,
  });
}

export function useDeleteConnection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteConnection,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: connectionsQueryKey }),
  });
}

export function useSyncConnection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: syncConnection,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: connectionsQueryKey }),
  });
}
