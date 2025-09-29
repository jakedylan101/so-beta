export interface Set {
  id: string;
  artist_name: string;
  venue_name: string;
  genre: string;
  cover_image: string;
  elo_rating: number;
  event_date?: string;
  listened_date?: string;
  like_count?: number;
  duration?: number;
  location_name?: string;
  title?: string;
  external_url?: string;
  source?: string;
  inserted_at?: string;
  // Display properties for recommendations
  displayTitle?: string;
  displaySubtitle?: string;
  type?: string;
  // Add popularity for sorting
  popularity?: number;
}

export interface ExternalSet {
  id: string;
  title: string;
  artist?: string;
  venue?: string;
  event_date?: string;
  source_type: 'soundcloud' | 'mixcloud' | 'youtube';
  source_url: string;
  media_url?: string;
  popularity?: number;
}

export interface ArtistWithSets {
  id: string;
  artist_name: string;
  cover_image: string;
  genre?: string;
  popularity?: number;
  source?: string;
  sets: Set[];
}

export type TrendingResponse = {
  trending_sets: Array<Set>;
  trending_artists: string[];
  trending_venues: string[];
  trending_genres: string[];
}; 