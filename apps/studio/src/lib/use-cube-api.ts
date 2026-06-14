import cube from '@cubejs-client/core';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { fetchCubeToken, getCubeApiUrl } from './cube-api';

export const cubeTokenQueryKey = ['cube-token'] as const;

export function useCubeToken() {
  return useQuery({
    queryKey: cubeTokenQueryKey,
    queryFn: fetchCubeToken,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}

export function useCubeApi() {
  const { data, isLoading, error } = useCubeToken();

  const cubeApi = useMemo(() => {
    if (!data?.cubeUrl) return null;

    const apiUrl = getCubeApiUrl(data.cubeUrl);

    return cube(async () => {
      const fresh = await fetchCubeToken();
      return fresh.token;
    }, { apiUrl });
  }, [data?.cubeUrl]);

  return {
    cubeApi,
    isLoading,
    error,
    cubeUrl: data?.cubeUrl,
  };
}
