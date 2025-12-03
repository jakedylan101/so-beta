import { Router, Request, Response } from 'express';
import fetch from 'node-fetch';
import { spotifyService } from '../services';
import { AuthenticatedRequest, requireAuth } from '../middleware';
import { supabaseAdmin, getUserClient } from '../supabase';

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

    // Use NEW Google Places API (not legacy)
    // Search without city first to get all matching venues, then user can choose
    const searchUrl = `https://places.googleapis.com/v1/places:searchText`;
    
    try {
      // Search for venue name only (without city) to get all matches
      // This allows user to see all "nowadays" venues, not just one in a specific city
      const response = await fetch(searchUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY,
          'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.addressComponents,places.location'
        },
        body: JSON.stringify({
          textQuery: venueName, // Search venue name only, not with city
          maxResultCount: 10 // Increased to get more options
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
        // Always return all results to give user options, even if only 1-2 match
        const placesToReturn = matchingPlaces.length > 0 ? matchingPlaces : data.places;
        
        // If we have 2+ results, always show dropdown (even if some don't match perfectly)
        // This gives user choice when multiple venues exist
        const shouldShowOptions = placesToReturn.length >= 2;

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

        // Always return options array so dropdown appears, even with 1 result
        // This allows user to see the address and confirm it's correct
        // Also ensures dropdown appears when Google finds multiple venues
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

/**
 * Save manual event to database so it can be searched
 * POST /api/manual-entry/create
 */
router.post('/api/manual-entry/create', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const { artistName, venueName, eventName, eventDate, city, country } = req.body;

    if (!artistName || !venueName || !eventDate) {
      return res.status(400).json({
        success: false,
        error: 'Artist name, venue name, and event date are required'
      });
    }

    console.log(`Creating manual event: ${artistName} at ${venueName} on ${eventDate}`);

    // Create canonical set in database (this makes it searchable)
    // Use the same logic as findOrCreateSet but adapted for manual entry
    const admin = supabaseAdmin;
    if (!admin) {
      return res.status(500).json({ success: false, error: 'Database not available' });
    }

    // Check if set already exists
    const { data: existing, error: findError } = await admin
      .from('sets')
      .select('id')
      .eq('artist_name', artistName)
      .eq('location_name', venueName)
      .eq('event_date', eventDate)
      .maybeSingle();

    if (findError) {
      console.error('Error finding existing set:', findError);
      return res.status(500).json({ success: false, error: 'Database error' });
    }

    if (existing) {
      console.log(`Event already exists with ID: ${existing.id}`);
      return res.json({
        success: true,
        setId: existing.id,
        message: 'Event already exists'
      });
    }

    // Get user's profile ID for created_by
    const userClient = getUserClient(req.headers.authorization!.split(' ')[1]);
    const { data: profile } = await userClient
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single();

    if (!profile) {
      return res.status(400).json({ success: false, error: 'User profile not found' });
    }

    // Create new canonical set
    const { data: newSet, error: createError } = await admin
      .from('sets')
      .insert({
        artist_name: artistName,
        location_name: venueName,
        event_name: eventName || null,
        event_date: eventDate,
        city: city || null,
        country: country || null,
        user_id: userId,
        created_by: profile.id,
        source: 'manual_entry',
        // Set default values for required fields
        listened_date: eventDate, // Use event date as default
        rating: 'neutral' // Default rating
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating set:', createError);
      return res.status(500).json({ success: false, error: 'Failed to create event' });
    }

    console.log(`✅ Created manual event with ID: ${newSet.id}`);
    console.log(`   Artist: ${artistName}`);
    console.log(`   Venue: ${venueName}`);
    console.log(`   Date: ${eventDate}`);
    console.log(`   Source: manual_entry`);

    return res.json({
      success: true,
      setId: newSet.id,
      message: 'Event created successfully',
      event: {
        artistName,
        venueName,
        eventName,
        eventDate,
        city,
        country
      }
    });

  } catch (error) {
    console.error('Error creating manual event:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create event'
    });
  }
});

export default router;
