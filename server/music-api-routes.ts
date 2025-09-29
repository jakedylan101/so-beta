/**
 * Music API integration routes
 * 
 * This file contains routes for the unified music metadata service
 * that aggregates data from multiple music APIs (Spotify, SoundCloud, 
 * Setlist.fm, Resident Advisor, and 1001Tracklists).
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { 
  musicMetadataService,
  spotifyService,
  soundcloudService,
  setlistFmService,
  tracklistsService,
  residentAdvisorService
} from './services';

// Initialize router
const router = Router();

// Validate and parse search query parameters
const searchQuerySchema = z.object({
  query: z.string().min(1, "Search query is required"),
  type: z.enum(['artists', 'tracks', 'sets', 'events', 'venues', 'all']).optional().default('all'),
  limit: z.coerce.number().min(1).max(50).optional().default(10)
});

/**
 * Unified search across all music APIs
 * GET /api/music/search?query=<search term>&type=<artists|tracks|sets|events|venues|all>&limit=10
 */
router.get('/search', async (req: Request, res: Response) => {
  try {
    // Validate query parameters
    const validationResult = searchQuerySchema.safeParse(req.query);
    
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: validationResult.error.message
      });
    }
    
    const { query, type, limit } = validationResult.data;
    
    // Determine which types to search for
    let typesToSearch: ('artists' | 'tracks' | 'sets' | 'events' | 'venues')[] = [];
    
    if (type === 'all') {
      typesToSearch = ['artists', 'tracks', 'sets', 'events', 'venues'];
    } else {
      typesToSearch = [type as 'artists' | 'tracks' | 'sets' | 'events' | 'venues'];
    }
    
    // Perform search
    const result = await musicMetadataService.search(query, typesToSearch);
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error || 'Search failed'
      });
    }
    
    // Limit results for each category
    const limitedResults = {
      artists: result.data?.artists?.slice(0, limit) || [],
      tracks: result.data?.tracks?.slice(0, limit) || [],
      sets: result.data?.sets?.slice(0, limit) || [],
      events: result.data?.events?.slice(0, limit) || [],
      venues: result.data?.venues?.slice(0, limit) || []
    };
    
    // Return only the requested types
    const filteredResults: any = {};
    
    if (type === 'all') {
      return res.json({
        success: true,
        data: limitedResults
      });
    } else {
      filteredResults[type] = limitedResults[type];
      return res.json({
        success: true,
        data: filteredResults
      });
    }
  } catch (error) {
    console.error('Error in unified search:', error);
    return res.status(500).json({
      success: false,
      error: `An unexpected error occurred: ${error instanceof Error ? error.message : String(error)}`
    });
  }
});

/**
 * Get detailed artist information from multiple sources
 * GET /api/music/artists/:id?source=<spotify|soundcloud|setlistfm|residentadvisor>
 */
router.get('/artists/:identifier', async (req: Request, res: Response) => {
  try {
    const { identifier } = req.params;
    const source = req.query.source as string | undefined;
    
    // Check if we have a specific source
    let params: any = { name: identifier };
    
    if (source === 'spotify') {
      params = { spotifyId: identifier };
    } else if (source === 'soundcloud') {
      params = { soundcloudId: identifier };
    } else if (source === 'setlistfm') {
      params = { setlistfmId: identifier };
    } else if (source === 'residentadvisor') {
      params = { residentadvisorId: identifier };
    }
    
    // Get artist details
    const result = await musicMetadataService.getArtistDetails(params);
    
    if (!result.success) {
      return res.status(404).json({
        success: false,
        error: result.error || 'Artist not found'
      });
    }
    
    return res.json({
      success: true,
      data: result.data
    });
  } catch (error) {
    console.error('Error getting artist details:', error);
    return res.status(500).json({
      success: false,
      error: `An unexpected error occurred: ${error instanceof Error ? error.message : String(error)}`
    });
  }
});

/**
 * Get set/tracklist details from multiple sources
 * GET /api/music/sets/:id?source=<setlistfm|tracklists>
 */
router.get('/sets/:identifier', async (req: Request, res: Response) => {
  try {
    const { identifier } = req.params;
    const source = req.query.source as string | undefined;
    
    // Check if we have a specific source
    let params: any = {};
    
    if (source === 'setlistfm') {
      params = { setlistfmId: identifier };
    } else if (source === 'tracklists') {
      params = { tracklistsId: identifier };
    } else {
      // Try to detect the source from the format of the ID
      if (identifier.includes('/')) {
        // Likely a 1001Tracklists ID (e.g., "4dr1b/carl_cox_timewarp_2019")
        params = { tracklistsId: identifier };
      } else {
        // Likely a Setlist.fm ID
        params = { setlistfmId: identifier };
      }
    }
    
    // Get set details
    const result = await musicMetadataService.getSetDetails(params);
    
    if (!result.success) {
      return res.status(404).json({
        success: false,
        error: result.error || 'Set not found'
      });
    }
    
    return res.json({
      success: true,
      data: result.data
    });
  } catch (error) {
    console.error('Error getting set details:', error);
    return res.status(500).json({
      success: false,
      error: `An unexpected error occurred: ${error instanceof Error ? error.message : String(error)}`
    });
  }
});

/**
 * Get track details from Spotify or SoundCloud
 * GET /api/music/tracks/:id?source=<spotify|soundcloud>
 */
router.get('/tracks/:identifier', async (req: Request, res: Response) => {
  try {
    const { identifier } = req.params;
    const source = req.query.source as string | undefined;
    
    // Check if we have a specific source
    let params: any = {};
    
    if (source === 'spotify') {
      params = { spotifyId: identifier };
    } else if (source === 'soundcloud') {
      params = { soundcloudId: identifier };
    } else {
      // Try to detect the source from the format/length of the ID
      if (identifier.length > 10 && !isNaN(Number(identifier))) {
        // Likely a SoundCloud ID (usually a large number)
        params = { soundcloudId: identifier };
      } else {
        // Likely a Spotify ID (shorter, alphanumeric)
        params = { spotifyId: identifier };
      }
    }
    
    // Get track details
    const result = await musicMetadataService.getTrackDetails(params);
    
    if (!result.success) {
      return res.status(404).json({
        success: false,
        error: result.error || 'Track not found'
      });
    }
    
    return res.json({
      success: true,
      data: result.data
    });
  } catch (error) {
    console.error('Error getting track details:', error);
    return res.status(500).json({
      success: false,
      error: `An unexpected error occurred: ${error instanceof Error ? error.message : String(error)}`
    });
  }
});

/**
 * Search for artists by name
 * GET /api/music/artists/search?query=<artist name>
 */
router.get('/artists/search', async (req: Request, res: Response) => {
  try {
    const { query } = req.query;
    
    if (!query || typeof query !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Artist name query is required'
      });
    }
    
    // Search for artists specifically
    const result = await musicMetadataService.search(query, ['artists']);
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error || 'Artist search failed'
      });
    }
    
    return res.json({
      success: true,
      data: result.data?.artists || []
    });
  } catch (error) {
    console.error('Error searching for artists:', error);
    return res.status(500).json({
      success: false,
      error: `An unexpected error occurred: ${error instanceof Error ? error.message : String(error)}`
    });
  }
});

/**
 * Search for tracks by title/artist
 * GET /api/music/tracks/search?query=<track name>
 */
router.get('/tracks/search', async (req: Request, res: Response) => {
  try {
    const { query } = req.query;
    
    if (!query || typeof query !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Track search query is required'
      });
    }
    
    // Search for tracks specifically
    const result = await musicMetadataService.search(query, ['tracks']);
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error || 'Track search failed'
      });
    }
    
    return res.json({
      success: true,
      data: result.data?.tracks || []
    });
  } catch (error) {
    console.error('Error searching for tracks:', error);
    return res.status(500).json({
      success: false,
      error: `An unexpected error occurred: ${error instanceof Error ? error.message : String(error)}`
    });
  }
});

/**
 * Search for sets by artist or venue
 * GET /api/music/sets/search?query=<search term>&artist=<artist name>&venue=<venue name>
 */
router.get('/sets/search', async (req: Request, res: Response) => {
  try {
    const { query, artist, venue } = req.query;
    
    if ((!query && !artist && !venue) || (query && typeof query !== 'string')) {
      return res.status(400).json({
        success: false,
        error: 'At least one search parameter is required (query, artist, or venue)'
      });
    }
    
    let searchQuery = query as string;
    
    // If artist and/or venue are provided, construct a more specific query
    if (artist && typeof artist === 'string') {
      searchQuery = searchQuery ? `${searchQuery} ${artist}` : artist;
    }
    
    if (venue && typeof venue === 'string') {
      searchQuery = searchQuery ? `${searchQuery} ${venue}` : venue;
    }
    
    // Search for sets specifically
    const result = await musicMetadataService.search(searchQuery, ['sets']);
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error || 'Set search failed'
      });
    }
    
    return res.json({
      success: true,
      data: result.data?.sets || []
    });
  } catch (error) {
    console.error('Error searching for sets:', error);
    return res.status(500).json({
      success: false,
      error: `An unexpected error occurred: ${error instanceof Error ? error.message : String(error)}`
    });
  }
});

/**
 * Get artist image URLs (for backward compatibility)
 * GET /api/music/artist-image?artistName=<artist name>
 */
router.get('/artist-image', async (req: Request, res: Response) => {
  try {
    const { artistName } = req.query;
    
    if (!artistName || typeof artistName !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Artist name is required'
      });
    }
    
    // First try to get artist from Spotify for high-quality images
    if (spotifyService) {
      try {
        const spotifyResult = await spotifyService.search(artistName, ['artist'], 1);
        
        if (spotifyResult.success && spotifyResult.data?.artists?.items?.length) {
          const artist = spotifyResult.data.artists.items[0];
          if (artist.images && artist.images.length) {
            // Return the image URL directly for compatibility with existing code
            return res.json({
              success: true,
              imageUrl: artist.images[0].url,
              source: 'spotify'
            });
          }
        }
      } catch (spotifyError) {
        console.error('Spotify artist image error:', spotifyError);
        // Continue to other sources
      }
    }
    
    // If Spotify fails, try SoundCloud
    if (soundcloudService) {
      try {
        const soundcloudResult = await soundcloudService.searchUsers(artistName);
        
        if (soundcloudResult.success && soundcloudResult.data?.collection?.length) {
          for (const item of soundcloudResult.data.collection) {
            if ('username' in item && item.avatar_url) {
              // Return the image URL directly for compatibility with existing code
              return res.json({
                success: true,
                imageUrl: item.avatar_url,
                source: 'soundcloud'
              });
            }
          }
        }
      } catch (soundcloudError) {
        console.error('SoundCloud artist image error:', soundcloudError);
        // Continue to other sources or fail
      }
    }
    
    // If no image was found in any service
    return res.status(404).json({
      success: false,
      error: 'No artist image found'
    });
  } catch (error) {
    console.error('Error getting artist image:', error);
    return res.status(500).json({
      success: false,
      error: `An unexpected error occurred: ${error instanceof Error ? error.message : String(error)}`
    });
  }
});

export default router;