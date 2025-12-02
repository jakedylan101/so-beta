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

    // Use NEW Google Places API (not legacy)
    const searchUrl = `https://places.googleapis.com/v1/places:searchText`;
    
    try {
      const response = await fetch(searchUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY,
          'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.addressComponents,places.location'
        },
        body: JSON.stringify({
          textQuery: query,
          maxResultCount: 5
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Google Places API error: ${response.status} - ${errorText}`);
        throw new Error(`Google Places API error: ${response.status}`);
      }

      const data = await response.json();

      console.log(`Google Places API (New) response - places count: ${data.places?.length || 0}`);

      if (data.places && data.places.length > 0) {
        // Find all matching venues - use more lenient matching
        const venueLower = venueName.toLowerCase().trim();
        const venueWords = venueLower.split(/\s+/);
        
        // Find all matches (not just the first one)
        const matchingPlaces = data.places.filter((place: any) => {
          const nameLower = (place.displayName?.text || '').toLowerCase();
          // Exact match
          if (nameLower === venueLower) return true;
          // Contains match (either direction)
          if (nameLower.includes(venueLower) || venueLower.includes(nameLower)) return true;
          // Word-based match (all words in venue name appear in place name)
          if (venueWords.every(word => nameLower.includes(word))) return true;
          return false;
        });

        // If no matches found, use all results (Google's best guesses)
        const placesToReturn = matchingPlaces.length > 0 ? matchingPlaces : data.places;

        // Helper function to extract city and country from a place
        const extractLocationData = (place: any) => {
          let parsedCity = city || '';
          let parsedCountry = '';
          const address = place.formattedAddress || '';
          
          if (place.addressComponents && Array.isArray(place.addressComponents)) {
            // Find city (locality) and country
            for (const component of place.addressComponents) {
              if (component.types?.includes('locality')) {
                parsedCity = component.longText || component.shortText || parsedCity;
              }
              if (component.types?.includes('country')) {
                parsedCountry = component.longText || component.shortText || '';
              }
            }
          }
          
          // Fallback: parse from formatted address if components not available
          if (!parsedCity || !parsedCountry) {
            const addressParts = address.split(',');
            if (addressParts.length >= 2) {
              // Usually format is: "Street, City, State, Country"
              if (!parsedCity) {
                parsedCity = addressParts[addressParts.length - 3]?.trim() || addressParts[addressParts.length - 2]?.trim() || city || '';
              }
              if (!parsedCountry) {
                parsedCountry = addressParts[addressParts.length - 1]?.trim() || '';
              }
            }
          }
          
          return { parsedCity, parsedCountry, address };
        };

        // If only one result, return it directly (backward compatible)
        if (placesToReturn.length === 1) {
          const place = placesToReturn[0];
          const placeName = place.displayName?.text || venueName;
          const { parsedCity, parsedCountry, address } = extractLocationData(place);
          
          console.log(`✓ Validated venue: ${placeName} (searched for: ${venueName})`);
          
          return res.json({
            success: true,
            validated: true,
            venueName: placeName,
            placeId: place.id,
            address: address,
            city: parsedCity,
            country: parsedCountry,
            latitude: place.location?.latitude,
            longitude: place.location?.longitude
          });
        }

        // Multiple results - return array for user to choose
        const options = placesToReturn.map((place: any) => {
          const placeName = place.displayName?.text || venueName;
          const { parsedCity, parsedCountry, address } = extractLocationData(place);
          
          return {
            venueName: placeName,
            placeId: place.id,
            address: address,
            city: parsedCity,
            country: parsedCountry,
            latitude: place.location?.latitude,
            longitude: place.location?.longitude
          };
        });

        console.log(`✓ Found ${options.length} matching venues for "${venueName}"`);
        
        return res.json({
          success: true,
          validated: true,
          multipleOptions: true,
          options: options
        });
      } else {
        console.log(`No results found for venue: ${venueName}`);
      }

      // No match found
      return res.json({
        success: true,
        validated: false,
        venueName,
        error: 'Venue not found'
      });

    } catch (error) {
      console.error('Google Places API error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to query Google Places API';
      return res.json({
        success: true,
        validated: false,
        error: errorMessage,
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
