import { useQuery } from '@tanstack/react-query';
import { fetchWithAuth } from '@/lib/api/fetchWithAuth';

export function useUserSavedSets(userId: string) {
  console.log("useUserSavedSets called with", userId);
  
  if (!userId) console.warn('Skipping saved sets query: userId is undefined');
  
  return useQuery({
    queryKey: ['savedSets', userId],
    queryFn: async () => {
      const res = await fetchWithAuth(`/api/users/${userId}/saved`);
      if (!res.ok) throw new Error('Failed to fetch saved sets');
      return res.json();
    },
    enabled: !!userId,
  });
} 