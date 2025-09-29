import { subDays } from 'date-fns';
import fetch from 'node-fetch';

// Define the ArtistSearchResult type to match what's used in artist-search.ts
type ArtistSearchResult = {
  id: string;
  artistName: string;
  venueName: string;
  eventDate: string;
  eventName?: string;
  city?: string;
  country?: string;
  source: string;
  imageUrl?: string;
  url?: string;
};

// Get the base URL for API calls
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

// SoundCloud OAuth credentials
const SOUNDCLOUD_CLIENT_ID = process.env.SOUNDCLOUD_CLIENT_ID || 
                           process.env.VITE_SOUNDCLOUD_CLIENT_ID;
const SOUNDCLOUD_CLIENT_SECRET = process.env.SOUNDCLOUD_CLIENT_SECRET || 
                               process.env.VITE_SOUNDCLOUD_CLIENT_SECRET;

// In-memory token cache
let cachedToken: string | null = null;
let tokenExpiry: number = 0;

/**
 * Get SoundCloud OAuth token
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
    
    console.log('Fetching new SoundCloud OAuth token');
    
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
    
    console.log('Successfully obtained SoundCloud OAuth token');
    return cachedToken;
  } catch (error) {
    console.error('Error fetching SoundCloud token:', error);
    return null;
  }
}

/**
 * Search SoundCloud for artists and their tracks using OAuth
 */
export async function soundcloudSearch(query: string): Promise<ArtistSearchResult[]> {
  // SUPER PROMINENT EARLY LOG: Confirm function is being called
  console.log('\n\n');
  console.log('🟢🟢🟢 [soundcloudSearch] FUNCTION CALLED for query:', query);
  console.log('🟢🟢🟢 TIMESTAMP:', new Date().toISOString());
  console.log('\n\n');

  try {
    // Get token from API
    console.log(`🔑 [SoundCloud] Requesting OAuth token from: ${BASE_URL}/api/soundcloud/token`);
    const tokenRes = await fetch(`${BASE_URL}/api/soundcloud/token`);
    
    if (!tokenRes.ok) {
      console.error(`❌ [SoundCloud] Failed to fetch token: ${tokenRes.status} ${tokenRes.statusText}`);
      return [];
    }

    // Log the token response
    const tokenData = await tokenRes.json();
    console.log(`✅ [SoundCloud] Token response:`, JSON.stringify(tokenData, null, 2).substring(0, 100) + '...');
    const access_token = tokenData.access_token;
    console.log(`✅ [SoundCloud] Token obtained (length: ${access_token?.length || 0})`);
    
    const results: ArtistSearchResult[] = [];

    // Search for tracks directly
    const searchUrl = `https://api.soundcloud.com/search/tracks?q=${encodeURIComponent(query)}&limit=20`;
    console.log(`🔍 [SoundCloud] Searching tracks: ${searchUrl}`);

    const res = await fetch(searchUrl, {
      headers: { Authorization: `OAuth ${access_token}` }
    });

    console.log(`📡 [SoundCloud] API response status:`, res.status, res.statusText);
    
    if (!res.ok) {
      console.error(`❌ [SoundCloud] Track search failed with status: ${res.status} ${res.statusText}`);
      let errorText = '';
      try {
        errorText = await res.text();
        console.error(`❌ [SoundCloud] Error response:`, errorText);
      } catch (e) {
        console.error(`❌ [SoundCloud] Could not read error response`);
      }
      return [];
    }

    // Log raw response for debugging
    const data = await res.json();
    console.log(`🔁 [SoundCloud API Response]`, JSON.stringify(data, null, 2));
    console.log(`📊 [SoundCloud] Collection type: ${typeof data.collection}, isArray: ${Array.isArray(data.collection)}, length: ${data.collection?.length || 0}`);
    
    if (!Array.isArray(data.collection)) {
      console.warn(`⚠️ [SoundCloud] Unexpected response format - collection is not an array`);
      return [];
    }

    if (data.collection.length === 0) {
      console.warn(`⚠️ [SoundCloud] No tracks found for query: "${query}"`);
      return [];
    }

    console.log(`\n🔍 [SoundCloud] Found ${data.collection.length} tracks for "${query}"\n`);

    // Process ALL tracks without any filtering
    for (const track of data.collection) {
      console.log(`🎵 [SoundCloud] Processing track:`, {
        id: track.id,
        title: track.title,
        user: track.user?.username,
        created_at: track.created_at,
        permalink: track.permalink_url
      });

      // Skip minimal validation - just ensure we have a track
      if (!track) {
        console.warn(`⚠️ [SoundCloud] Skipping undefined track`);
        continue;
      }

      // Always use current date if parsing fails
      let eventDate = new Date().toISOString().split('T')[0];
      
      // Try to parse created_at but don't fail if it's missing
      if (track.created_at) {
        try {
          const date = new Date(track.created_at);
          if (!isNaN(date.getTime())) {
            eventDate = date.toISOString().split('T')[0];
          } else {
            console.warn(`⚠️ [SoundCloud] Invalid date format: ${track.created_at}`);
          }
        } catch (e) {
          console.warn(`⚠️ [SoundCloud] Date parsing error for: ${track.title}, error:`, e);
        }
      } else {
        console.warn(`⚠️ [SoundCloud] Missing created_at for track: ${track.title}`);
      }

      // Create result with minimal required fields
      const formatted: ArtistSearchResult = {
        id: track.permalink_url || `soundcloud-${track.id || Math.random().toString()}`,
        artistName: (track.user?.username || track.title?.split(' - ')[0] || 'Unknown Artist'),
        eventDate,
        venueName: 'SoundCloud',
        eventName: track.title || 'Unknown Track',
        city: track.user?.city || '',
        country: track.user?.country_code || '',
        url: track.permalink_url || '',
        source: 'soundcloud', // Note: lowercase to match existing code
        imageUrl: track.artwork_url || (track.user ? track.user.avatar_url : '') || ''
      };

      // Log every parsed result
      console.log(`🧪 [SoundCloud] Parsed Result:`, {
        title: formatted.eventName,
        artist: formatted.artistName,
        date: formatted.eventDate,
        url: formatted.url
      });

      results.push(formatted);
    }

    // Skip deduplication - return everything
    console.log(`\n\n🟠 [soundcloudSearch] Returning ${results.length} results\n\n`);
    
    // Return ALL results without filtering
    return results;
  } catch (err) {
    console.error(`\n\n❌ [SoundCloud] Unexpected error:`, err, '\n\n');
    return [];
  }
} 