import type { ArtistSearchResult } from '@/types/artist';

export async function fetchMixcloudResults(query: string): Promise<ArtistSearchResult[]> {
  console.log('Attempting Mixcloud API call for:', query);
  
  try {
    // Make the API request - Mixcloud is open API, no key needed
    const url = `https://api.mixcloud.com/search/?q=${encodeURIComponent(query)}&type=cloudcast&limit=25`;
    const res = await fetch(url);
    
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
      
      console.error(`Mixcloud API error: ${status} ${statusText}`);
      console.error(`Response: ${errorText.substring(0, 200)}${errorText.length > 200 ? '...' : ''}`);
      
      // Don't throw - return empty array to allow other providers to continue
      return [];
    }
    
    // Process successful response
    const data = await res.json();
    console.log(`Mixcloud raw response: ${JSON.stringify(data).substring(0, 150)}...`);
    
    // Handle empty or malformed response
    if (!data.data || !Array.isArray(data.data)) {
      console.warn('Mixcloud returned invalid data structure (missing "data" array)');
      return [];
    }
    
    // Map API response to our standardized format
    const results = data.data.map((item: any) => {
      const artistName = item.user?.username ?? item.user?.name ?? 'Unknown Artist';
      const title = item.name ?? '';
      const fullDate = item.created_time?.split('T')[0] ?? ''; // raw YYYY-MM-DD
      const mixUrl = item.url ?? '';

      // Try to parse "eventName @ venue" pattern
      let eventName = '';
      let venueName = 'Mixcloud';

      const atSplit = title.split('@');
      if (atSplit.length === 2) {
        eventName = atSplit[0].trim();
        venueName = atSplit[1].trim();
      } else {
        eventName = title;
      }

      const city = item.user?.city ?? '';
      const country = item.user?.country ?? '';

      return {
        artistName,
        eventName,
        venueName,
        city,
        country,
        date: fullDate,
        url: mixUrl
      };
    });
    
    console.log(`Mapped ${results.length} results from Mixcloud`);
    return results;
  } catch (error) {
    // Log error but don't rethrow to prevent cascading failures
    console.error('Mixcloud API request failed:', error);
    return [];
  }
} 