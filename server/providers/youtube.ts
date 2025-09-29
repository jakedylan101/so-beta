import type { ArtistSearchResult } from '../../shared/types/artist';

// Get the API key - try all possible environment variable names
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY || 
                      process.env.VITE_YOUTUBE_API_KEY;

/**
 * Search YouTube for artist channels
 */
export async function youtubeSearch(query: string): Promise<ArtistSearchResult[]> {
  // Detailed logging to help debug environment variable issues
  console.log(`YouTube API key check: ${Boolean(YOUTUBE_API_KEY)}`);
  
  if (!YOUTUBE_API_KEY) {
    console.warn('⚠️ YouTube API key missing');
    return [];
  }
  
  console.log(`Searching YouTube for: ${query}`);
  const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${encodeURIComponent(query)}&key=${YOUTUBE_API_KEY}&maxResults=15`;

  try {
    const res = await fetch(url);
    
    if (!res.ok) {
      console.error(`YouTube API error: ${res.status} ${res.statusText}`);
      if (res.status === 401 || res.status === 403) {
        console.error('Authentication error - API key may be invalid or expired');
      }
      return [];
    }
    
    const data = await res.json();
    if (!Array.isArray(data.items)) {
      console.log('No results from YouTube');
      return [];
    }
    
    console.log(`Found ${data.items.length} channels from YouTube`);
    
    // Map to our standard format
    return data.items.map((item: any): ArtistSearchResult => ({
      artistName: item.snippet.channelTitle || '',
      eventDate: '',
      venueName: '',
      city: '',
      country: '',
      url: `https://www.youtube.com/channel/${item.snippet.channelId}`,
      source: 'youtube',
      imageUrl: item.snippet.thumbnails?.high?.url || '',
    })).filter((a: ArtistSearchResult) => a.artistName);
  } catch (e) {
    console.error('YouTube search error:', e);
    return [];
  }
} 