import { createClient } from '@supabase/supabase-js';
import { getExternalSets } from '../../lib/api/external-sets';

const MIN_DURATION = 1800; // 30 minutes in seconds

export async function GET() {
  console.log('[Trending-Sets API] Processing request');
  
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
    console.error('[Trending-Sets API] Supabase environment variables are not set');
    // Fallback to external sets immediately if Supabase isn't configured
    try {
      console.log('[Trending-Sets API] Falling back to external sets due to missing Supabase config');
      const externalSets = await getExternalSets(20);
      const filteredSets = externalSets.filter(set => set.duration && set.duration >= MIN_DURATION);
      console.log(`[Trending-Sets API] Returning ${filteredSets.length} external sets`);
      return Response.json(filteredSets);
    } catch (error) {
      console.error('[Trending-Sets API] Error fetching external sets:', error);
      return Response.json([]);
  }
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
  );

  try {
    // Default behavior - get trending sets from Supabase
    const { data: sets, error } = await supabase
      .from('sets')
      .select('*')
      .gt('duration', MIN_DURATION)
      .order('elo_rating', { ascending: false })
      .limit(20);

    if (error) {
      console.error('[Trending-Sets API] Supabase error:', error.message);
      // If there's a Supabase error, fall back to external sets
      console.log('[Trending-Sets API] Falling back to external sets due to Supabase error');
      const externalSets = await getExternalSets(20);
      const filteredSets = externalSets.filter(set => set.duration && set.duration >= MIN_DURATION);
      console.log(`[Trending-Sets API] Returning ${filteredSets.length} external sets`);
      return Response.json(filteredSets);
    }

    // If no sets found in Supabase, fall back to external sets
    if (!sets || sets.length === 0) {
      console.log('[Trending-Sets API] No sets found in Supabase, fetching from external providers');
      const externalSets = await getExternalSets(20);
      const filteredSets = externalSets.filter(set => set.duration && set.duration >= MIN_DURATION);
      console.log(`[Trending-Sets API] Returning ${filteredSets.length} external sets`);
      return Response.json(filteredSets);
    }

    console.log(`[Trending-Sets API] Returning ${sets.length} sets from Supabase`);
    return Response.json(sets);
  } catch (error) {
    console.error('[Trending-Sets API] Unexpected error:', error);
    
    // If there's any error, try to get external sets as a last resort
    try {
      console.log('[Trending-Sets API] Attempting to get external sets as fallback after error');
      const externalSets = await getExternalSets(20);
      const filteredSets = externalSets.filter(set => set.duration && set.duration >= MIN_DURATION);
      console.log(`[Trending-Sets API] Returning ${filteredSets.length} external sets`);
      return Response.json(filteredSets);
    } catch (fallbackError) {
      console.error('[Trending-Sets API] Fallback also failed:', fallbackError);
      return Response.json([]);
    }
  }
} 