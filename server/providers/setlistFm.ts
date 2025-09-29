import type { ArtistSearchResult } from '../../shared/types/artist';

// Get the API key - try all possible environment variable names
const SETLISTFM_API_KEY = process.env.SETLIST_FM_API_KEY || 
                         process.env.SETLISTFM_API_KEY ||
                         process.env.VITE_SETLIST_FM_API_KEY;

/**
 * Search Setlist.fm for artist setlists
 */
export async function setlistFmSearch(query: string): Promise<ArtistSearchResult[]> {
  // Detailed logging to help debug environment variable issues
  console.log(`Setlist.fm API key check: ${Boolean(SETLISTFM_API_KEY)}`);
  
  // Masked key logging for debugging - only show first and last 4 characters
  if (SETLISTFM_API_KEY) {
    const maskedKey = SETLISTFM_API_KEY.length > 8 ? 
      `${SETLISTFM_API_KEY.substring(0, 4)}...${SETLISTFM_API_KEY.substring(SETLISTFM_API_KEY.length - 4)}` : 
      '****';
    console.log(`Using Setlist.fm API key: ${maskedKey}`);
  }
  
  if (!SETLISTFM_API_KEY) {
    console.warn('⚠️ Setlist.fm API key missing');
    return [];
  }
  
  console.log(`Searching Setlist.fm for: ${query}`);
  
  // Using the artistName parameter ensures exact matching for artist names
  // This fixes the issue with multi-word artists like "Charli XCX"
  const url = `https://api.setlist.fm/rest/1.0/search/setlists?artistName=${encodeURIComponent(query)}&p=1&sort=date`;

  try {
    // Make API request
    const res = await fetch(url, {
      headers: {
        'x-api-key': SETLISTFM_API_KEY,
        'Accept': 'application/json',
      },
    });
    
    if (!res.ok) {
      console.error(`Setlist.fm API error: ${res.status} ${res.statusText}`);
      if (res.status === 401 || res.status === 403) {
        console.error('Authentication error - API key may be invalid or expired');
        // Log response body for additional error details
        const errorText = await res.text();
        console.error(`Response body: ${errorText}`);
      }
      return [];
    }
    
    const data = await res.json();
    if (!data.setlist || !Array.isArray(data.setlist)) {
      console.log('No results from Setlist.fm');
      return [];
    }
    
    console.log(`Found ${data.setlist.length} setlists from Setlist.fm`);
    
    // Map results to our standard format
    return data.setlist.map((set: any): ArtistSearchResult => ({
      id: set.id || `setlist-${Math.random().toString(36).substr(2, 9)}`,
      artistName: set.artist?.name || '',
      eventDate: set.eventDate || '',
      venueName: set.venue?.name || '',
      city: set.venue?.city?.name || '',
      country: set.venue?.city?.country?.name || '',
      url: set.url || '',
      eventName: (set.tour?.name || set.festival?.name || ''),
      date: '', // This will be formatted in the route handler
      source: 'setlistfm',
    })).filter((a: ArtistSearchResult) => a.artistName);
  } catch (e) {
    console.error('Setlist.fm search error:', e);
    return [];
  }
} 