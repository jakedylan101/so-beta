import { useQuery } from '@tanstack/react-query';
import { fetchWithAuth } from '@/lib/api/fetchWithAuth';

// Define a proper UserStats type for better type safety
export type UserStats = {
  totalSets: number;
  likedSets: number;
  savedSets: number;
  comparisonsMade: number;
  mostLoggedArtists?: { artist_name: string; count: number }[];
  mostVisitedVenues?: { location_name: string; count: number }[];
  preferredGenres?: { genre: string; count: number }[];
  globalRanking?: {
    rank: number;
    totalUsers: number;
    percentile: number;
  };
};

// Default values for when the API returns null or empty data
const DEFAULT_STATS: UserStats = {
  totalSets: 0,
  likedSets: 0,
  savedSets: 0,
  comparisonsMade: 0,
  mostLoggedArtists: [],
  mostVisitedVenues: [],
  preferredGenres: [],
};

export function useUserStats(userId: string) {
  if (!userId) {
    // Skip if no userId provided
  }
  
  return useQuery<UserStats>({
    queryKey: ['userStats', userId],
    queryFn: async () => {
      try {
        const res = await fetchWithAuth(`/api/users/${userId}/stats`);
        
        if (!res.ok) throw new Error('Failed to fetch user stats');
        
        // Clone the response to read the raw text
        const clonedRes = res.clone();
        const rawText = await clonedRes.text();
        
        try {
          // Parse the JSON manually to better handle errors
          const data = JSON.parse(rawText);
          
          // Normalize keys from snake_case to camelCase if needed
          const normalizedData: UserStats = {
            totalSets: data.total_sets ?? data.totalSets ?? 0,
            likedSets: data.liked_sets ?? data.likedSets ?? data.totalLikedSets ?? 0,
            savedSets: data.saved_sets ?? data.savedSets ?? data.totalSavedSets ?? 0,
            comparisonsMade: data.comparisons_made ?? data.comparisonsMade ?? data.totalComparisons ?? 0,
            mostLoggedArtists: data.mostLoggedArtists ?? [],
            mostVisitedVenues: data.mostVisitedVenues ?? [],
            preferredGenres: data.preferredGenres ?? [],
            globalRanking: data.globalRanking,
          };
          
          return normalizedData;
        } catch (parseError) {
          // Return default stats instead of throwing to avoid breaking the UI
          return DEFAULT_STATS;
        }
      } catch (err) {
        // Return default stats instead of throwing to avoid breaking the UI
        return DEFAULT_STATS;
      }
    },
    enabled: !!userId,
  });
} 