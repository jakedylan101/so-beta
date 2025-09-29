import useSWR from 'swr';
import type { RecommendationResponse } from '@/types/recommendations';

interface UseRecommendationsOptions {
  enabled?: boolean;
}

const fetcher = async (url: string): Promise<RecommendationResponse> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch recommendations: ${response.statusText}`);
  }
  const data = await response.json();
  return data;
};

export function useRecommendations({ enabled = true }: UseRecommendationsOptions = {}) {
  const { data, error, isLoading } = useSWR<RecommendationResponse>(
    enabled ? '/api/discover/recommendations' : null,
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