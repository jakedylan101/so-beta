import type { ArtistSearchResult } from '@/types/artist';

export async function fetchSetlistFmResults(query: string): Promise<ArtistSearchResult[]> {
  console.log('Attempting Setlist.fm API call for:', query);
  
  // Safely extract API key and validate it exists
  const apiKey = process.env.SETLIST_FM_API_KEY;
  
  if (!apiKey) {
    console.warn('⚠️ SETLIST_FM_API_KEY environment variable is missing. Setlist.fm search will not work.');
    return [];
  }
  
  console.log(`Setlist.fm API key found (length: ${apiKey.length})`);
  
  try {
    // Make the API request with proper headers
    const res = await fetch(`https://api.setlist.fm/rest/1.0/search/setlists?artistName=${encodeURIComponent(query)}&p=1`, {
      headers: {
        'Accept': 'application/json',
        'x-api-key': apiKey
      }
    });

    // Handle non-successful responses with detailed logging
    if (!res.ok) {
      const statusText = res.statusText;
      const status = res.status;
      let errorText = '';
      
      try {
        errorText = await res.text();
      } catch (e) {
        errorText = 'Could not extract error text';
      }
      
      console.error(`Setlist.fm API error: ${status} ${statusText}`);
      console.error(`Response: ${errorText.substring(0, 200)}${errorText.length > 200 ? '...' : ''}`);
      
      // Don't throw - return empty array to allow other providers to continue
      return [];
    }

    // Process successful response
    const data = await res.json();
    console.log(`Setlist.fm raw response: ${JSON.stringify(data).substring(0, 150)}...`);

    // Handle empty or malformed response
    if (!data.setlist || !Array.isArray(data.setlist)) {
      console.warn('Setlist.fm returned invalid data structure (missing "setlist" array)');
      return [];
    }

    // Map API response to our standardized format
    const results = data.setlist.map((item: any) => ({
      artistName: item.artist?.name ?? '',
      eventName: item.tour?.name ?? item.venue?.name ?? '',
      date: item.eventDate ?? '',
      city: item.venue?.city?.name ?? '',
      country: item.venue?.city?.country?.name ?? '',
      venueName: item.venue?.name ?? 'Unknown Venue',
      url: item.url ?? ''
    }));

    console.log(`Mapped ${results.length} results from Setlist.fm`);
    return results;
  } catch (error) {
    // Log error but don't rethrow to prevent cascading failures
    console.error('Setlist.fm API request failed:', error);
    return [];
  }
} 