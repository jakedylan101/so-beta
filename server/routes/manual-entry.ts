import { Router, Request, Response } from 'express';
import fetch from 'node-fetch';
import { spotifyService } from '../services';

const router = Router();

// SoundCloud OAuth token management (reuse from artist-search)
let cachedToken: string | null = null;
let tokenExpiry: number = 0;

async function getSoundCloudToken(): Promise<string | null> {
  try {
    const now = Date.now() / 1000;
    
    if (cachedToken && tokenExpiry > now) {
      return cachedToken;
    }
    
    const SOUNDCLOUD_CLIENT_ID = process.env.SOUNDCLOUD_CLIENT_ID || '';
    const SOUNDCLOUD_CLIENT_SECRET = process.env.SOUNDCLOUD_CLIENT_SECRET || '';
    
    if (!SOUNDCLOUD_CLIENT_ID || !SOUNDCLOUD_CLIENT_SECRET) {
      return null;
    }
    
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
      return null;
    }
    
    const data = await tokenRes.json();
    cachedToken = data.access_token;
    tokenExpiry = now + data.expires_in - 30;
    
    return cachedToken;
  } catch (error) {
    console.error('Error fetching SoundCloud token:', error);
    return null;
  }
}

/**
 * Validate artist name via Spotify and SoundCloud
 * GET /api/manual-entry/validate-artist?name=Avalon Emerson
 */
router.get('/api/manual-entry/validate-artist', async (req: Request, res: Response) => {
  try {
    const artistName = req.query.name as string;
    
    if (!artistName || typeof artistName !== 'string') {
      return res.status(400).json({ 
        success: false, 
        error: 'Artist name is required',
        validated: false
      });
    }

    console.log(`Validating artist: "${artistName}"`);

    let validated = false;
    let matchedName: string | null = null;
    let source: string | null = null;
    let spotifyId: string | null = null;
    let soundcloudUrl: string | null = null;

    // Try Spotify first
    try {
      const spotify = spotifyService();
      if (spotify) {
        const result = await spotify.search(artistName, ['artist'], 1);
        
        if (result.success && result.data?.artists?.items?.length > 0) {
          const artist = result.data.artists.items[0];
          // Check if the name matches closely (case-insensitive, allow partial)
          const artistLower = artist.name.toLowerCase();
          const searchLower = artistName.toLowerCase();
          
          if (artistLower.includes(searchLower) || searchLower.includes(artistLower)) {
            validated = true;
            matchedName = artist.name;
            source = 'spotify';
            spotifyId = artist.id;
            console.log(`✓ Validated via Spotify: ${matchedName}`);
          }
        }
      }
    } catch (error) {
      console.error('Spotify validation error:', error);
    }

    // If Spotify didn't validate, try SoundCloud
    if (!validated) {
      try {
        const token = await getSoundCloudToken();
        if (token) {
          const response = await fetch(
            `https://api.soundcloud.com/users?q=${encodeURIComponent(artistName)}&limit=5`,
            {
              headers: {
                'Authorization': `OAuth ${token}`
              }
            }
          );

          if (response.ok) {
            const data = await response.json();
            
            if (Array.isArray(data) && data.length > 0) {
              // Check if any user matches the artist name
              const match = data.find((user: any) => {
                const userLower = (user.username || '').toLowerCase();
                const searchLower = artistName.toLowerCase();
                return userLower.includes(searchLower) || searchLower.includes(userLower);
              });

              if (match) {
                validated = true;
                matchedName = match.username || match.full_name || artistName;
                source = 'soundcloud';
                soundcloudUrl = match.permalink_url || null;
                console.log(`✓ Validated via SoundCloud: ${matchedName}`);
              }
            }
          }
        }
      } catch (error) {
        console.error('SoundCloud validation error:', error);
      }
    }

    return res.json({
      success: true,
      validated,
      artistName: matchedName || artistName,
      source,
      spotifyId,
      soundcloudUrl
    });

  } catch (error) {
    console.error('Error validating artist:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to validate artist',
      validated: false
    });
  }
});

/**
 * Validate venue name via Google Maps Places API
 * GET /api/manual-entry/validate-venue?name=nowadays&city=Brooklyn
 */
router.get('/api/manual-entry/validate-venue', async (req: Request, res: Response) => {
  try {
    const venueName = req.query.name as string;
    const city = req.query.city as string | undefined;

    if (!venueName || typeof venueName !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Venue name is required',
        validated: false
      });
    }

    console.log(`Validating venue: "${venueName}"${city ? ` in ${city}` : ''}`);

    const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

    if (!GOOGLE_MAPS_API_KEY) {
      console.warn('⚠️ GOOGLE_MAPS_API_KEY not set - venue validation will fail');
      return res.json({
        success: true,
        validated: false,
        error: 'Google Maps API key not configured',
        venueName
      });
    }

    // Build search query
    let query = venueName;
    if (city) {
      query = `${venueName} ${city}`;
    }

    // Search for place using Places API Text Search
    const searchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&type=establishment&key=${GOOGLE_MAPS_API_KEY}`;
    
    try {
      const response = await fetch(searchUrl);
      
      if (!response.ok) {
        throw new Error(`Google Maps API error: ${response.status}`);
      }

      const data = await response.json();

      if (data.status === 'OK' && data.results && data.results.length > 0) {
        // Find the best match
        const venueLower = venueName.toLowerCase();
        const bestMatch = data.results.find((place: any) => {
          const nameLower = (place.name || '').toLowerCase();
          return nameLower.includes(venueLower) || venueLower.includes(nameLower);
        }) || data.results[0];

        if (bestMatch) {
          console.log(`✓ Validated venue: ${bestMatch.name}`);
          
          return res.json({
            success: true,
            validated: true,
            venueName: bestMatch.name,
            placeId: bestMatch.place_id,
            address: bestMatch.formatted_address,
            city: bestMatch.formatted_address?.split(',')[bestMatch.formatted_address.split(',').length - 3]?.trim() || city || '',
            country: bestMatch.formatted_address?.split(',').pop()?.trim() || '',
            latitude: bestMatch.geometry?.location?.lat,
            longitude: bestMatch.geometry?.location?.lng
          });
        }
      }

      // No match found
      return res.json({
        success: true,
        validated: false,
        venueName
      });

    } catch (error) {
      console.error('Google Maps API error:', error);
      return res.json({
        success: true,
        validated: false,
        error: 'Failed to query Google Maps',
        venueName
      });
    }

  } catch (error) {
    console.error('Error validating venue:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to validate venue',
      validated: false
    });
  }
});

export default router;
