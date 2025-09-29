import type { ArtistSearchResult } from '@/types/artist';

// SoundCloud OAuth credentials
const SOUNDCLOUD_CLIENT_ID = import.meta.env.VITE_SOUNDCLOUD_CLIENT_ID || '';
const SOUNDCLOUD_CLIENT_SECRET = import.meta.env.VITE_SOUNDCLOUD_CLIENT_SECRET || '';

// In-memory token cache
let cachedToken: string | null = null;
let tokenExpiry: number = 0;

/**
 * Get SoundCloud OAuth token directly
 */
async function getSoundCloudToken(): Promise<string | null> {
  try {
    const now = Date.now() / 1000;
    
    // Return cached token if still valid
    if (cachedToken && tokenExpiry > now) {
      return cachedToken;
    }
    
    if (!SOUNDCLOUD_CLIENT_ID || !SOUNDCLOUD_CLIENT_SECRET) {
      console.error('SoundCloud client credentials missing');
      return null;
    }
    
    // Fetch new token directly from SoundCloud
    const tokenRes = await fetch('https://api.soundcloud.com/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: SOUNDCLOUD_CLIENT_ID,
        client_secret: SOUNDCLOUD_CLIENT_SECRET
      }).toString()
    });
    
    if (!tokenRes.ok) {
      console.error('Failed to fetch SoundCloud token:', tokenRes.status, tokenRes.statusText);
      return null;
    }
    
    const data = await tokenRes.json();
    cachedToken = data.access_token;
    tokenExpiry = now + data.expires_in - 30; // buffer to avoid edge expiry
    
    return cachedToken;
  } catch (error) {
    console.error('Error fetching SoundCloud token:', error);
    return null;
  }
}

export async function fetchSoundCloudResults(query: string): Promise<ArtistSearchResult[]> {
  console.log('Attempting SoundCloud API call for:', query);
  
  try {
    // Get OAuth token directly from SoundCloud
    const token = await getSoundCloudToken();
    
    if (!token) {
      console.warn('⚠️ SoundCloud OAuth token could not be obtained. SoundCloud search will not work.');
      return [];
    }
    
    console.log('SoundCloud OAuth token obtained');
    
    try {
      // Make the API request with OAuth token
      const res = await fetch(`https://api.soundcloud.com/tracks?q=${encodeURIComponent(query)}&limit=10`, {
        headers: {
          'Authorization': `OAuth ${token}`
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
        
        console.error(`SoundCloud API error: ${status} ${statusText}`);
        console.error(`Response: ${errorText.substring(0, 200)}${errorText.length > 200 ? '...' : ''}`);
        
        // Don't throw - return empty array to allow other providers to continue
        return [];
      }
      
      // Process successful response
      const data = await res.json();
      console.log(`SoundCloud raw response: ${JSON.stringify(data).substring(0, 150)}...`);
      
      // Handle empty or malformed response
      if (!Array.isArray(data)) {
        console.warn('SoundCloud returned invalid data structure (not an array)');
        return [];
      }
      
      // Map API response to our standardized format
      const results: ArtistSearchResult[] = data.map((track: any) => {
        // Extract date in a timezone-safe way - prioritize release_date over created_at
        // Note: This is an approximation of an event date, not necessarily a performance date
        let formattedDate = '';
        try {
          // Try to use release_date first, fall back to created_at
          const dateSource = track.release_date || track.created_at;
          if (dateSource) {
            const dateStr = new Date(dateSource).toISOString().split('T')[0];
            formattedDate = dateStr || '';
          }
        } catch (e) {
          console.warn('Failed to parse SoundCloud date:', track.release_date || track.created_at);
        }
        
        // Create result with guaranteed string values for all required fields
        return {
          artistName: String(track.user?.username || track.title?.split(' - ')[0] || 'Unknown Artist'),
          eventName: String(track.title || ''),
          date: String(formattedDate || '2023-01-01'), // Fallback date if parsing fails
          city: String(track.user?.city || ''), // Extract city from user profile if available
          country: String(track.user?.country_code || ''),
          venueName: 'SoundCloud',
          url: String(track.permalink_url || 'https://soundcloud.com')
        };
      });
      
      console.log(`Mapped ${results.length} results from SoundCloud`);
      return results;
    } catch (error) {
      // Log error but don't rethrow to prevent cascading failures
      console.error('SoundCloud API request failed:', error);
      return [];
    }
  } catch (error) {
    // Log error but don't rethrow to prevent cascading failures
    console.error('SoundCloud API request failed:', error);
    return [];
  }
} 