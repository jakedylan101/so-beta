import { NextResponse } from 'next/server';
import { supabase } from '../../lib/supabase';

const THIRTY_DAYS_AGO = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
const FALLBACK_GENRES = ['Electronic', 'Pop', 'Rock', 'House', 'Techno'];

interface GenreCount {
  genre: string;
  count: number;
}

export async function GET() {
  try {
    console.log('[Genres] Fetching genres from Supabase');
    
    // First get all sets with genres from the last 30 days
    const { data: recentSets, error: setsError } = await supabase
      .from('sets')
      .select('genre')
      .not('genre', 'is', null)
      .gt('inserted_at', THIRTY_DAYS_AGO);

    if (setsError) {
      console.error('[Genres] Error fetching sets:', setsError);
      throw setsError;
    }

    console.log('[Genres] Found', recentSets?.length || 0, 'sets with genres');

    if (!recentSets?.length) {
      console.warn('[Genres] No sets found, using fallback genres');
      return NextResponse.json({
        trending_genres: FALLBACK_GENRES,
        genre_counts: FALLBACK_GENRES.map(genre => ({ genre, count: 0 }))
      });
    }

    // Count genres manually
    const genreCounts = recentSets.reduce<Record<string, number>>((acc, set) => {
      if (set.genre) {
        acc[set.genre] = (acc[set.genre] || 0) + 1;
      }
      return acc;
    }, {});

    // Convert to array and sort by count
    const sortedGenres = Object.entries(genreCounts)
      .map(([genre, count]) => ({ genre, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    console.log('[Genres] Top genres:', sortedGenres);

    return NextResponse.json({
      trending_genres: sortedGenres.map(g => g.genre),
      genre_counts: sortedGenres
    });
  } catch (error) {
    console.error('[Genres] Error fetching genres:', error);
    return NextResponse.json(
      {
        trending_genres: FALLBACK_GENRES,
        genre_counts: FALLBACK_GENRES.map(genre => ({ genre, count: 0 }))
      },
      { status: 500 }
  );
  }
} 