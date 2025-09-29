export interface SetRecommendation {
  id: string;
  artist_name: string;
  venue_name: string;
  genre: string;
  cover_image: string;
  elo_rating: number;
  event_date?: string;
  listened_date?: string;
}

export interface RecommendationResponse {
  recommended_sets: Array<SetRecommendation>;
  recommended_artists: string[];
  recommended_venues: string[];
  top_genres: string[];
}

export type TrendingResponse = {
  trending_sets: Array<SetRecommendation>;
  trending_artists: string[];
  trending_venues: string[];
  trending_genres: string[];
}; 