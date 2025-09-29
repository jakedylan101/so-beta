import { useQuery } from '@tanstack/react-query';
import { fetchWithAuth } from '@/lib/api/fetchWithAuth';

export function useUserLikedSets(userId: string) {
  console.log("useUserLikedSets called with", userId);
  
  if (!userId) console.warn('Skipping liked sets query: userId is undefined');
  
  return useQuery({
    queryKey: ['likedSets', userId],
    queryFn: async () => {
      const res = await fetchWithAuth(`/api/users/${userId}/liked`);
      if (!res.ok) throw new Error('Failed to fetch liked sets');
      return res.json();
    },
    enabled: !!userId,
  });
} 