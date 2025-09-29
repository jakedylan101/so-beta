import { useAuth } from '@/context/auth-context';
import { useRecommendations } from '@/services/recommendations';
import { useTrendingDiscover } from '@/services/trending';
import { SetCard } from '@/components/ui/SetCard';
import { TagList } from '@/components/ui/TagList';
import { Spinner } from '@/components/ui/Spinner';
import type { SetRecommendation } from '@/types/recommendations';

export default function DiscoverPage() {
  const { user } = useAuth();
  const { data: personalized, isLoading: loadingPersonalized } = useRecommendations({ enabled: !!user });
  const { data: trending, isLoading: loadingTrending } = useTrendingDiscover();

  const isLoading = user ? loadingPersonalized : loadingTrending;
  const feedData = user ? personalized : trending;

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Spinner />
      </div>
    );
  }

  if (!feedData) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <p className="text-gray-500">No recommendations available</p>
      </div>
    );
  }

  const sets = 'recommended_sets' in feedData ? feedData.recommended_sets : feedData.trending_sets;
  const artists = 'recommended_artists' in feedData ? feedData.recommended_artists : feedData.trending_artists;
  const genres = 'top_genres' in feedData ? feedData.top_genres : feedData.trending_genres;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sets.map((set: SetRecommendation, index: number) => (
          <SetCard 
            key={set.id} 
            setId={set.id}
            displayMode="ranking"
            ranking={index + 1}
          />
        ))}
      </div>
      
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">
          {user ? 'Recommended Artists' : 'Trending Artists'}
        </h2>
        <TagList tags={artists} />
      </div>
      
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">
          {user ? 'Top Genres' : 'Trending Genres'}
        </h2>
        <TagList tags={genres} />
      </div>
    </div>
  );
} 