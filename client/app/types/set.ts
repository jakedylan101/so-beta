export interface Set {
  id: string;
  title: string;
  artist_name: string;
  duration: number;
  genre?: string;
  elo_rating: number;
  like_count: number;
  inserted_at: string;
  source?: 'supabase' | 'soundcloud' | 'mixcloud' | 'youtube';
  venue_name?: string;
  cover_image?: string;
  external_url?: string;
} 