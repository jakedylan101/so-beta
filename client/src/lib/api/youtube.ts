import type { ArtistSearchResult } from '@/types/artist';

export async function fetchYouTubeResults(query: string): Promise<ArtistSearchResult[]> {
  console.log('Attempting YouTube API call for:', query);
  
  // Safely extract API key and validate it exists
  const apiKey = process.env.YOUTUBE_API_KEY;
  
  if (!apiKey) {
    console.warn('⚠️ YOUTUBE_API_KEY environment variable is missing. YouTube search will not work.');
    return [];
  }
  
  console.log(`YouTube API key found (length: ${apiKey.length})`);
  
  try {
    // Make the API request - search for music videos with 'live set' keyword
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(
      query + ' live set music'
    )}&type=video&videoCategoryId=10&maxResults=20&key=${apiKey}`;
    
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
      
      console.error(`YouTube API error: ${status} ${statusText}`);
      console.error(`Response: ${errorText.substring(0, 200)}${errorText.length > 200 ? '...' : ''}`);
      
      // Don't throw - return empty array to allow other providers to continue
      return [];
    }
    
    // Process successful response
    const data = await res.json();
    console.log(`YouTube raw response: ${JSON.stringify(data).substring(0, 150)}...`);
    
    // Handle empty or malformed response
    if (!data.items || !Array.isArray(data.items)) {
      console.warn('YouTube returned invalid data structure (missing "items" array)');
      return [];
    }
    
    // Map API response to our standardized format
    const results = data.items.map((item: any) => {
      const title = item.snippet?.title ?? '';
      const artistName = item.snippet?.channelTitle ?? 'Unknown Artist';
      const fullDate = item.snippet?.publishedAt?.split('T')[0] ?? '';
      const videoUrl = `https://www.youtube.com/watch?v=${item.id?.videoId ?? ''}`;

      // Try to parse "eventName @ venue" pattern from title
      let eventName = '';
      let venueName = 'YouTube';

      const atSplit = title.split('@');
      if (atSplit.length === 2) {
        eventName = atSplit[0].trim();
        venueName = atSplit[1].trim();
      } else if (title.includes('live at') || title.includes('Live at')) {
        const parts = title.split(/live at|Live at/i);
        if (parts.length >= 2) {
          eventName = parts[0].trim();
          venueName = parts[1].trim();
        } else {
          eventName = title;
        }
      } else {
        eventName = title;
      }

      return {
        artistName,
        eventName,
        venueName,
        city: '',
        country: '',
        date: fullDate,
        url: videoUrl
      };
    });
    
    console.log(`Mapped ${results.length} results from YouTube`);
    return results;
  } catch (error) {
    // Log error but don't rethrow to prevent cascading failures
    console.error('YouTube API request failed:', error);
    return [];
  }
} 