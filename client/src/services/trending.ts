import useSWR from 'swr';
import type { TrendingResponse } from '@/types/recommendations';

const fetcher = async (url: string): Promise<TrendingResponse> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch trending data: ${response.statusText}`);
  }
  const data = await response.json();
  return data;
};

export function useTrendingDiscover() {
  const { data, error, isLoading } = useSWR<TrendingResponse>(
    '/api/discover/trending',
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    }
  );

  return {
    data,
    isLoading,
    error: error as Error | undefined,
  };
} 