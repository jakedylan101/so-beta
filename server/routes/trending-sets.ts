import { Router } from 'express';
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';

// Initialize supabase clients
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';

// API Keys for external services
const SOUNDCLOUD_CLIENT_ID = process.env.SOUNDCLOUD_CLIENT_ID;
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const MIXCLOUD_CLIENT_ID = process.env.MIXCLOUD_CLIENT_ID || '';

const router = Router();

// Mock external sets data for fallback (as last resort if API calls fail)
const MOCK_EXTERNAL_SETS = [
  {
    id: 'ext-1',
    title: 'Summer Festival Mix 2024',
    artist_name: 'Carl Cox',
    venue_name: 'Ultra Music Festival',
    duration: 5400, // 90 minutes
    genre: 'Techno',
    elo_rating: 2000,
    like_count: 150,
    cover_image: 'https://example.com/covers/carl-cox.jpg',
    inserted_at: new Date().toISOString(),
    source: 'soundcloud'
  },
  {
    id: 'ext-2',
    title: 'Ultra Music Festival 2024',
    artist_name: 'David Guetta',
    venue_name: 'Ultra Miami',
    duration: 3600, // 60 minutes
    genre: 'House',
    elo_rating: 1950,
    like_count: 120,
    cover_image: 'https://example.com/covers/david-guetta.jpg',
    inserted_at: new Date().toISOString(),
    source: 'youtube'
  },
  {
    id: 'ext-3',
    title: 'Tomorrowland 2024 Mainstage',
    artist_name: 'Martin Garrix',
    venue_name: 'Tomorrowland',
    duration: 4500, // 75 minutes
    genre: 'Electronic',
    elo_rating: 1900,
    like_count: 100,
    cover_image: 'https://example.com/covers/martin-garrix.jpg',
    inserted_at: new Date().toISOString(),
    source: 'mixcloud'
  },
  {
    id: 'ext-4',
    title: 'EDC Las Vegas 2024',
    artist_name: 'Armin van Buuren',
    venue_name: 'EDC Las Vegas',
    duration: 7200, // 120 minutes
    genre: 'Trance',
    elo_rating: 1850,
    like_count: 90,
    cover_image: 'https://example.com/covers/armin.jpg',
    inserted_at: new Date().toISOString(),
    source: 'soundcloud'
  },
  {
    id: 'ext-5',
    title: 'Ibiza Closing Party 2024',
    artist_name: 'Solomun',
    venue_name: 'Pacha Ibiza',
    duration: 5400, // 90 minutes
    genre: 'House',
    elo_rating: 1800,
    like_count: 80,
    cover_image: 'https://example.com/covers/solomun.jpg',
    inserted_at: new Date().toISOString(),
    source: 'mixcloud'
  },
  {
    id: 'ext-6',
    title: 'Berghain Extended Set',
    artist_name: 'Ben Klock',
    venue_name: 'Berghain',
    duration: 10800, // 180 minutes
    genre: 'Techno',
    elo_rating: 1920,
    like_count: 110,
    cover_image: 'https://example.com/covers/ben-klock.jpg',
    inserted_at: new Date().toISOString(),
    source: 'soundcloud'
  },
  {
    id: 'ext-7',
    title: 'Boiler Room NYC',
    artist_name: 'Peggy Gou',
    venue_name: 'Boiler Room',
    duration: 3600, // 60 minutes
    genre: 'House',
    elo_rating: 1880,
    like_count: 95,
    cover_image: 'https://example.com/covers/peggy-gou.jpg',
    inserted_at: new Date().toISOString(),
    source: 'youtube'
  },
  {
    id: 'ext-8',
    title: 'Printworks London Final Set',
    artist_name: 'Amelie Lens',
    venue_name: 'Printworks',
    duration: 5400, // 90 minutes
    genre: 'Techno',
    elo_rating: 1890,
    like_count: 98,
    cover_image: 'https://example.com/covers/amelie-lens.jpg',
    inserted_at: new Date().toISOString(),
    source: 'mixcloud'
  },
  {
    id: 'ext-9',
    title: 'CRSSD Festival 2024',
    artist_name: 'Charlotte de Witte',
    venue_name: 'CRSSD Festival',
    duration: 4500, // 75 minutes
    genre: 'Techno',
    elo_rating: 1930,
    like_count: 115,
    cover_image: 'https://example.com/covers/charlotte-de-witte.jpg',
    inserted_at: new Date().toISOString(),
    source: 'soundcloud'
  },
  {
    id: 'ext-10',
    title: 'Coachella 2024 Main Stage',
    artist_name: 'Diplo',
    venue_name: 'Coachella',
    duration: 3600, // 60 minutes
    genre: 'Electronic',
    elo_rating: 1870,
    like_count: 88,
    cover_image: 'https://example.com/covers/diplo.jpg',
    inserted_at: new Date().toISOString(),
    source: 'youtube'
  }
];

const MIN_DURATION = 1800; // 30 minutes in seconds

// Helper function to fetch from SoundCloud API
async function fetchSoundCloudSets() {
  if (!SOUNDCLOUD_CLIENT_ID) {
    console.log('[External API] SoundCloud client ID not found');
    return [];
  }

  try {
    console.log('[External API] Fetching sets from SoundCloud');
    console.log('[External API] Using SoundCloud client ID:', SOUNDCLOUD_CLIENT_ID.substring(0, 4) + '...');
    
    // UPDATED: SoundCloud API has changed and no longer requires getting an OAuth token with the client ID
    // Instead, just use the client_id directly in the API requests
    
    // First try to validate the client ID with a simple API call
    try {
      console.log('[External API] Validating SoundCloud client ID');
      const testResponse = await axios.get(
        `https://api-v2.soundcloud.com/search/tracks?q=techno&client_id=${SOUNDCLOUD_CLIENT_ID}&limit=1`
      );
      
      if (testResponse.status !== 200) {
        throw new Error(`Invalid response: ${testResponse.status}`);
      }
      
      console.log('[External API] SoundCloud client ID is valid');
    } catch (error: any) {
      console.error('[External API] SoundCloud client ID validation failed:', error.message);
      console.error('[External API] Will attempt direct API call anyway');
    }
    
    // Get techno and house DJ sets from SoundCloud
    const genres = ['techno', 'house', 'electronic', 'trance', 'drum-and-bass'];
    const randomGenre = genres[Math.floor(Math.random() * genres.length)];
    
    console.log(`[External API] Fetching SoundCloud sets for genre: ${randomGenre}`);
    
    const response = await axios.get(
      `https://api-v2.soundcloud.com/search/tracks?q=${randomGenre}%20DJ%20set&client_id=${SOUNDCLOUD_CLIENT_ID}&limit=20`
    );
    
    if (!response.data || !response.data.collection) {
      console.error('[External API] SoundCloud API returned invalid data structure');
      return [];
    }
    
    console.log(`[External API] SoundCloud returned ${response.data.collection.length} results`);
    
    // Transform SoundCloud data to our format
    return response.data.collection
      .filter((track: any) => 
        track.title && 
        track.user && 
        track.user.username && 
        track.duration && 
        track.duration > 15 * 60 * 1000 // Only tracks longer than 15 minutes (DJ sets)
      )
      .map((track: any) => ({
        id: `sc-${track.id}`,
        title: track.title,
        artist_name: track.user.username,
        venue_name: null,
        duration: Math.floor(track.duration / 1000), // Convert from ms to seconds
        genre: track.genre || 'electronic',
        elo_rating: 1500,
        like_count: track.likes_count || 0,
        cover_image: track.artwork_url ? track.artwork_url.replace('-large', '-t500x500') : null,
        inserted_at: new Date().toISOString(),
        source: 'soundcloud',
        external_url: track.permalink_url
      }));
  } catch (error: any) {
    console.error('[External API] Error fetching SoundCloud sets:', error.message);
    if (error.response) {
      console.error('[External API] Response status:', error.response.status);
      console.error('[External API] Response data:', JSON.stringify(error.response.data));
    }
    return [];
  }
}

// Helper function to fetch from YouTube API
async function fetchYouTubeSets() {
  if (!YOUTUBE_API_KEY) {
    console.log('[External API] YouTube API key not found');
    return [];
  }

  try {
    console.log('[External API] Fetching sets from YouTube');
    console.log('[External API] Using YouTube API key:', YOUTUBE_API_KEY.substring(0, 4) + '...');
    
    // Select a random genre for variety
    const genres = ['techno', 'house', 'electronic', 'dj set', 'trance', 'drum and bass'];
    const randomGenre = genres[Math.floor(Math.random() * genres.length)];
    
    console.log(`[External API] Searching YouTube for: ${randomGenre} dj set`);
    
    // Make request to YouTube API
    const response = await axios.get(
      'https://www.googleapis.com/youtube/v3/search',
      {
        params: {
          part: 'snippet',
          q: `${randomGenre} dj set`,
          maxResults: 20,
          type: 'video',
          videoDuration: 'long', // Only long videos (DJ sets)
          key: YOUTUBE_API_KEY
        }
      }
    );
    
    if (!response.data || !response.data.items || !Array.isArray(response.data.items)) {
      console.error('[External API] YouTube API returned invalid data structure');
      return [];
    }
    
    console.log(`[External API] YouTube returned ${response.data.items.length} results`);
    
    // Get detailed info for each video to get duration
    const videoIds = response.data.items.map((item: any) => item.id.videoId).join(',');
    
    const detailsResponse = await axios.get(
      'https://www.googleapis.com/youtube/v3/videos',
      {
        params: {
          part: 'contentDetails,statistics,snippet',
          id: videoIds,
          key: YOUTUBE_API_KEY
        }
      }
    );
    
    if (!detailsResponse.data || !detailsResponse.data.items) {
      console.error('[External API] YouTube details API returned invalid data');
      return [];
    }
    
    // Transform YouTube data to our format
    return detailsResponse.data.items
      .filter((video: any) => {
        // Parse duration string (PT1H30M15S format)
        const duration = video.contentDetails.duration;
        const hourMatch = duration.match(/(\d+)H/);
        const minuteMatch = duration.match(/(\d+)M/);
        const hours = hourMatch ? parseInt(hourMatch[1]) : 0;
        const minutes = minuteMatch ? parseInt(minuteMatch[1]) : 0;
        
        // Only include videos longer than 20 minutes
        return hours > 0 || minutes >= 20;
      })
      .map((video: any) => {
        // Parse title to extract artist and set info
        const title = video.snippet.title;
        let artistName = 'Unknown Artist';
        
        // Try to extract artist name from title patterns
        const artistMatches = [
          // Common patterns in DJ set videos
          /(.+?)\s*[-|]\s*.+?(?:mix|set|dj)/i,
          /(.+?)\s*[@|at]\s*.+/i,
          /(.+?)\s*[:|presents]/i
        ];
        
        for (const pattern of artistMatches) {
          const match = title.match(pattern);
          if (match && match[1] && match[1].length < 40) {
            artistName = match[1].trim();
            break;
          }
        }
        
        // Create a YouTube link
        const externalUrl = `https://www.youtube.com/watch?v=${video.id}`;
        
        // Parse duration
        const duration = video.contentDetails.duration;
        const hourMatch = duration.match(/(\d+)H/);
        const minuteMatch = duration.match(/(\d+)M/);
        const secondMatch = duration.match(/(\d+)S/);
        const hours = hourMatch ? parseInt(hourMatch[1]) : 0;
        const minutes = minuteMatch ? parseInt(minuteMatch[1]) : 0;
        const seconds = secondMatch ? parseInt(secondMatch[1]) : 0;
        const totalSeconds = hours * 3600 + minutes * 60 + seconds;
        
        return {
          id: `yt-${video.id}`,
          title: video.snippet.title,
          artist_name: artistName,
          venue_name: null,
          duration: totalSeconds,
          genre: randomGenre,
          elo_rating: 1500,
          like_count: parseInt(video.statistics.likeCount) || 0,
          cover_image: video.snippet.thumbnails.high.url,
          inserted_at: new Date().toISOString(),
          source: 'youtube',
          external_url: externalUrl
        };
      });
  } catch (error: any) {
    console.error('[External API] Error fetching YouTube sets:', error.message);
    if (error.response) {
      console.error('[External API] Response status:', error.response.status);
      console.error('[External API] Response data:', JSON.stringify(error.response.data));
    }
    return [];
  }
}

// Helper function to fetch from Mixcloud API
async function fetchMixcloudSets() {
  try {
    console.log('[External API] Fetching sets from Mixcloud');
    
    // Mixcloud doesn't require API key for public data
    // Use more specific genre tags for better results
    const tags = [
      'electronic', 
      'techno', 
      'house', 
      'trance', 
      'drum-and-bass', 
      'dubstep',
      'deep-house',
      'tech-house',
      'ambient',
      'dj-set',
      'live-set',
      'festival'
    ];
    
    // Use multiple random tags to get more diverse results
    const selectedTags: string[] = [];
    const numTags = Math.min(3, tags.length);
    
    // Select random tags without repetition
    const tagsCopy = [...tags];
    for (let i = 0; i < numTags; i++) {
      const randomIndex = Math.floor(Math.random() * tagsCopy.length);
      selectedTags.push(tagsCopy[randomIndex]);
      tagsCopy.splice(randomIndex, 1);
    }
    
    // Make requests for each tag
    const responses = await Promise.all(
      selectedTags.map(tag => 
        axios.get(`https://api.mixcloud.com/discover/${tag}/popular/`)
      )
    );
    
    // Process all responses and extract sets
    const sets = responses.flatMap((response, index) => {
      if (!response.data || !response.data.data) {
        console.log(`[External API] Mixcloud API returned no results for tag: ${selectedTags[index]}`);
        return [];
      }
      
      return response.data.data
        .filter((cloudcast: any) => 
          // Filter for sets that are at least our minimum duration
          cloudcast.audio_length >= MIN_DURATION
        )
        .map((cloudcast: any) => ({
          id: `mc-${cloudcast.key.replace(/\//g, '-')}`,
          title: cloudcast.name,
          artist_name: cloudcast.user.name,
          venue_name: null,
          duration: cloudcast.audio_length,
          genre: selectedTags[index].charAt(0).toUpperCase() + selectedTags[index].slice(1).replace('-', ' '),
          elo_rating: 1500,
          like_count: cloudcast.favorite_count || 0,
          cover_image: cloudcast.pictures?.large || null,
          inserted_at: new Date(cloudcast.created_time).toISOString(),
          source: 'mixcloud',
          external_url: cloudcast.url
        }));
    });
    
    console.log(`[External API] Found ${sets.length} Mixcloud sets`);
    return sets;
  } catch (error: any) {
    console.error('[External API] Mixcloud API error:', error.message);
    console.error('[External API] Mixcloud API error details:', error.response?.data || 'No response data');
    return [];
  }
}

// Helper function to determine genre from tags
function getGenreFromTags(tags: any[]): string {
  if (!tags || !Array.isArray(tags)) return 'Electronic';
  
  const genreKeywords = {
    'techno': 'Techno',
    'house': 'House',
    'trance': 'Trance',
    'drum': 'Drum & Bass',
    'bass': 'Drum & Bass',
    'dubstep': 'Dubstep',
    'progressive': 'Progressive House',
    'deep': 'Deep House',
    'tech house': 'Tech House',
    'hardstyle': 'Hardstyle',
    'ambient': 'Ambient',
    'electro': 'Electro'
  };
  
  // Check if any tag matches a genre
  for (const tag of tags) {
    const tagName = tag.name.toLowerCase();
    for (const [keyword, genre] of Object.entries(genreKeywords)) {
      if (tagName.includes(keyword)) {
        return genre;
      }
    }
  }
  
  return 'Electronic';
}

// Helper function to fetch all external sets
async function fetchAllExternalSets() {
  console.log('[External API] Starting to fetch sets from all services');
  
  // Define a type for our set objects
  type ExternalSet = {
    id: string;
    title: string;
    artist_name: string;
    venue_name: string | null;
    duration: number;
    genre: string;
    elo_rating: number;
    like_count: number;
    cover_image: string | null;
    inserted_at: string;
    source: string;
    external_url?: string;
  };
  
  // Fetch sets from each service in parallel with error handling for each
  const [soundcloudSets, youtubeSets, mixcloudSets] = await Promise.all([
    fetchSoundCloudSets().catch(err => {
      console.error('[External API] Error fetching SoundCloud sets:', err.message);
      return [];
    }),
    fetchYouTubeSets().catch(err => {
      console.error('[External API] Error fetching YouTube sets:', err.message);
      return [];
    }),
    fetchMixcloudSets().catch(err => {
      console.error('[External API] Error fetching Mixcloud sets:', err.message);
      return [];
    })
  ]);
  
  // Log counts for debugging
  console.log(`[External API] Got ${soundcloudSets.length} SoundCloud sets, ${youtubeSets.length} YouTube sets, and ${mixcloudSets.length} Mixcloud sets`);
  
  // Combine all sets into a single array
  let allSets: ExternalSet[] = [
    ...soundcloudSets,
    ...youtubeSets, 
    ...mixcloudSets
  ];
  
  // If we're missing sources, add mock data to ensure diversity
  if (soundcloudSets.length === 0) {
    console.log('[External API] No SoundCloud sets returned, adding mock data');
    const mockSoundcloudSets = MOCK_EXTERNAL_SETS
      .filter(set => set.source === 'soundcloud')
      .slice(0, 3);
    allSets = [...allSets, ...mockSoundcloudSets];
  }
  
  if (youtubeSets.length === 0) {
    console.log('[External API] No YouTube sets returned, adding mock data');
    const mockYoutubeSets = MOCK_EXTERNAL_SETS
      .filter(set => set.source === 'youtube')
      .slice(0, 3);
    allSets = [...allSets, ...mockYoutubeSets];
  }
  
  if (mixcloudSets.length === 0) {
    console.log('[External API] No Mixcloud sets returned, adding mock data');
    const mockMixcloudSets = MOCK_EXTERNAL_SETS
      .filter(set => set.source === 'mixcloud')
      .slice(0, 3);
    allSets = [...allSets, ...mockMixcloudSets];
  }
  
  // Check source distribution after adding mock data
  const sourceCounts = allSets.reduce((acc, set) => {
    acc[set.source] = (acc[set.source] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  console.log('[External API] Source distribution:', JSON.stringify(sourceCounts));
  
  // Sort by random to mix the sources
  allSets = allSets.sort(() => Math.random() - 0.5);
  
  return allSets;
}

// Helper function to shuffle array
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// API route to get trending sets
router.get('/api/trending-sets', async (req, res) => {
  console.log('[Trending-Sets API] Processing request');
  
  try {
    // Always fetch external sets regardless of Supabase configuration
    const externalSets = await fetchAllExternalSets();
    
    // Log the source distribution
    const sources = externalSets.reduce((acc: Record<string, number>, set) => {
      acc[set.source] = (acc[set.source] || 0) + 1;
      return acc;
    }, {});
    console.log('[Trending-Sets API] Source distribution:', JSON.stringify(sources));
    
    // Ensure title and artist_name are present in all sets
    const validSets = externalSets.filter(set => set.title && set.artist_name);
    
    // If no valid sets found, use mock data as fallback
    if (validSets.length === 0) {
      console.log('[Trending-Sets API] No valid sets found, using mock data');
      return res.json(MOCK_EXTERNAL_SETS);
    }
    
    // Ensure all sets have cover images
    const setsWithImages = validSets.map(set => {
      if (!set.cover_image) {
        // Provide a default image URL based on the source
        if (set.source === 'soundcloud') {
          set.cover_image = 'https://i1.sndcdn.com/artworks-000224593831-494h34-t500x500.jpg';
        } else if (set.source === 'youtube') {
          set.cover_image = 'https://i.ytimg.com/vi/default/hqdefault.jpg';
        } else if (set.source === 'mixcloud') {
          set.cover_image = 'https://thumbnailer.mixcloud.com/unsafe/300x300/profile/5/e/7/0/2446-fc71-4f35-b753-5a760c1e43c3';
        }
      }
      return set;
    });
    
    // Return shuffled sets
    console.log(`[Trending-Sets API] Returning ${setsWithImages.length} trending sets`);
    return res.json(shuffleArray(setsWithImages).slice(0, 10));
  } catch (error: any) {
    console.error('[Trending-Sets API] Error:', error.message);
    // Fall back to mock data in case of errors
    console.log('[Trending-Sets API] Error occurred, returning mock data');
    res.json(MOCK_EXTERNAL_SETS);
  }
});

// API route to get genres
router.get('/api/genres', async (req, res) => {
  console.log('[Genres API] Processing request');
  
  // Return a list of common electronic music genres
  const genres = [
    "Techno",
    "House",
    "Trance",
    "Electronic",
    "Drum & Bass",
    "Dubstep",
    "Progressive House",
    "Deep House",
    "Tech House",
    "Hardstyle",
    "Ambient",
    "Electro"
  ];
  
  console.log(`[Genres API] Returning ${genres.length} genres`);
  return res.json(genres);
});

// API route specifically for mixed source sets
router.get('/api/mixed-source-sets', async (req, res) => {
  console.log('[Mixed-Source API] Processing request');
  
  try {
    // Get real-time external sets from all sources
    const allExternalSets = await fetchAllExternalSets();
    
    // Count the distribution of sources
    const sourceCounts = allExternalSets.reduce((acc: Record<string, number>, set) => {
      acc[set.source] = (acc[set.source] || 0) + 1;
      return acc;
    }, {});
    
    console.log('[Mixed-Source API] Source distribution:', JSON.stringify(sourceCounts));
    
    // Ensure we have at least some from each source by adding mock data if needed
    let balancedSets = [...allExternalSets];
    
    if (!sourceCounts['soundcloud'] || sourceCounts['soundcloud'] < 2) {
      console.log('[Mixed-Source API] Adding mock SoundCloud sets to ensure balance');
      const mockSoundcloudSets = MOCK_EXTERNAL_SETS
        .filter(set => set.source === 'soundcloud')
        .slice(0, 3);
      balancedSets = [...balancedSets, ...mockSoundcloudSets];
    }
    
    if (!sourceCounts['youtube'] || sourceCounts['youtube'] < 2) {
      console.log('[Mixed-Source API] Adding mock YouTube sets to ensure balance');
      const mockYoutubeSets = MOCK_EXTERNAL_SETS
        .filter(set => set.source === 'youtube')
        .slice(0, 3);
      balancedSets = [...balancedSets, ...mockYoutubeSets];
    }
    
    if (!sourceCounts['mixcloud'] || sourceCounts['mixcloud'] < 2) {
      console.log('[Mixed-Source API] Adding mock Mixcloud sets to ensure balance');
      const mockMixcloudSets = MOCK_EXTERNAL_SETS
        .filter(set => set.source === 'mixcloud')
        .slice(0, 3);
      balancedSets = [...balancedSets, ...mockMixcloudSets];
    }
    
    // Shuffle the balanced sets
    const shuffledSets = balancedSets.sort(() => Math.random() - 0.5);
    
    // Return the first 10 sets
    console.log('[Mixed-Source API] Returning balanced mix of external sets');
    return res.json(shuffledSets.slice(0, 10));
  } catch (error: any) {
    console.error('[Mixed-Source API] Error:', error.message);
    res.status(500).json({ error: 'An error occurred while fetching mixed source sets' });
  }
});

// API route to get sets by genre
router.get('/api/sets/by-genre/:genre', async (req, res) => {
  const { genre } = req.params;
  console.log(`[Sets-By-Genre API] Processing request for genre: ${genre}`);
  
  try {
    // Fetch all external sets
    const allExternalSets = await fetchAllExternalSets();
    
    // Filter sets by the requested genre (case insensitive)
    let genreSets = allExternalSets.filter(set => 
      set.genre && set.genre.toLowerCase() === genre.toLowerCase()
    );
    
    // If no sets match the exact genre, try partial matching
    if (genreSets.length < 3) {
      console.log(`[Sets-By-Genre API] Found only ${genreSets.length} sets with exact genre match, trying partial match`);
      genreSets = allExternalSets.filter(set => 
        set.genre && set.genre.toLowerCase().includes(genre.toLowerCase())
      );
    }
    
    // If still not enough sets, return some mock sets for this genre
    if (genreSets.length < 3) {
      console.log(`[Sets-By-Genre API] Not enough sets with genre ${genre}, adding mock data`);
      const mockGenreSets = MOCK_EXTERNAL_SETS.map(set => ({
        ...set,
        genre: genre.charAt(0).toUpperCase() + genre.slice(1),
        id: `mock-${set.id}-${Math.random().toString(36).substring(2, 7)}`,
        inserted_at: new Date().toISOString()
      }));
      genreSets = [...genreSets, ...mockGenreSets];
    }
    
    // Ensure all sets have cover images
    const setsWithImages = genreSets.map(set => {
      if (!set.cover_image) {
        // Provide a default image URL based on the source
        if (set.source === 'soundcloud') {
          set.cover_image = 'https://i1.sndcdn.com/artworks-000224593831-494h34-t500x500.jpg';
        } else if (set.source === 'youtube') {
          set.cover_image = 'https://i.ytimg.com/vi/default/hqdefault.jpg';
        } else if (set.source === 'mixcloud') {
          set.cover_image = 'https://thumbnailer.mixcloud.com/unsafe/300x300/profile/5/e/7/0/2446-fc71-4f35-b753-5a760c1e43c3';
        }
      }
      return set;
    });
    
    // Shuffle and return sets
    console.log(`[Sets-By-Genre API] Returning ${setsWithImages.length} sets for genre ${genre}`);
    return res.json(shuffleArray(setsWithImages).slice(0, 10));
  } catch (error: any) {
    console.error(`[Sets-By-Genre API] Error for genre ${genre}:`, error.message);
    // Return mock data for this genre in case of error
    const mockGenreSets = MOCK_EXTERNAL_SETS.map(set => ({
      ...set,
      genre: genre.charAt(0).toUpperCase() + genre.slice(1),
      id: `mock-${set.id}-${Math.random().toString(36).substring(2, 7)}`,
      inserted_at: new Date().toISOString()
    }));
    return res.json(shuffleArray(mockGenreSets).slice(0, 10));
  }
});

// API route to get sets from favorite artists - For logged-in users
// This will return artist-focused information
router.get('/api/sets/by-artist/favorites', async (req, res) => {
  console.log('[Favorite-Artists API] Processing request');
  
  try {
    // In a real app, we would fetch the user's favorite artists from their profile
    // For now, we'll use some of the mock data as "favorites"
    
    // Get some random artists from the mock data
    const favoriteArtists = MOCK_EXTERNAL_SETS
      .map(set => set.artist_name)
      .filter((artist, index, self) => self.indexOf(artist) === index)
      .slice(0, 5);
    
    console.log(`[Favorite-Artists API] Mock favorite artists: ${favoriteArtists.join(', ')}`);
    
    // Fetch all external sets
    const allExternalSets = await fetchAllExternalSets();
    
    // Filter sets by the favorite artists
    let artistSets = allExternalSets.filter(set => 
      favoriteArtists.includes(set.artist_name)
    );
    
    // If not enough sets from favorite artists, add some from mock data
    if (artistSets.length < 5) {
      console.log(`[Favorite-Artists API] Not enough sets from favorite artists, adding mock data`);
      // Take sets from MOCK_EXTERNAL_SETS but give them unique IDs
      const mockArtistSets = MOCK_EXTERNAL_SETS
        .filter(set => favoriteArtists.includes(set.artist_name))
        .map(set => ({
          ...set,
          id: `mock-favorite-${set.id}-${Math.random().toString(36).substring(2, 7)}`,
          inserted_at: new Date().toISOString()
        }));
      artistSets = [...artistSets, ...mockArtistSets];
    }
    
    // Create a map to group sets by artist
    const artistMap = new Map<string, any>();
    
    // Group sets by artist and choose the best one for each artist
    artistSets.forEach(set => {
      const artistName = set.artist_name;
      if (!artistMap.has(artistName)) {
        // Initialize with this artist
        artistMap.set(artistName, {
          artist_name: artistName,
          id: `artist-${artistName.toLowerCase().replace(/\s+/g, '-')}`,
          cover_image: set.cover_image,
          sets: [],
          genre: set.genre,
          popularity: set.like_count,
          source: set.source
        });
      }
      
      // Add to the artist's sets collection
      const artist = artistMap.get(artistName);
      artist.sets.push({
        id: set.id,
        title: set.title,
        venue_name: set.venue_name,
        cover_image: set.cover_image,
        duration: set.duration,
        inserted_at: set.inserted_at,
        source: set.source,
        external_url: set.external_url
      });
      
      // Update artist image if this set has a better one
      if (set.cover_image && (!artist.cover_image || artist.popularity < set.like_count)) {
        artist.cover_image = set.cover_image;
        artist.popularity = set.like_count;
      }
    });
    
    // Convert map to array and ensure all artists have cover images
    const artistsArray = Array.from(artistMap.values()).map(artist => {
      if (!artist.cover_image) {
        artist.cover_image = 'https://via.placeholder.com/300x300?text=' + encodeURIComponent(artist.artist_name);
      }
      return artist;
    });
    
    // Shuffle and return artists with their sets
    console.log(`[Favorite-Artists API] Returning ${artistsArray.length} favorite artists`);
    return res.json(artistsArray.slice(0, 6));
  } catch (error: any) {
    console.error('[Favorite-Artists API] Error:', error.message);
    // Return some mock data for favorite artists in case of error
    const defaultArtists = ['Carl Cox', 'David Guetta', 'Martin Garrix', 'Armin van Buuren', 'Solomun'];
    const mockFavorites = defaultArtists.map((artist: string) => ({
      artist_name: artist,
      id: `artist-${artist.toLowerCase().replace(/\s+/g, '-')}`,
      cover_image: 'https://via.placeholder.com/300x300?text=' + encodeURIComponent(artist),
      sets: [],
      genre: 'Electronic',
      popularity: 100,
      source: 'mock'
    }));
    return res.json(mockFavorites);
  }
});

// API route to get personalized recommendations - For logged-in users
// This will return actual sets (titles of tracks/sets)
router.get('/api/recommendations', async (req, res) => {
  console.log('[Recommendations API] Processing request');
  
  try {
    // In a real app, we'd use the user's preferences and listening history
    // For now, we'll create a mix of trending and mock data
    
    // Fetch trending sets
    const trendingSets = await fetchAllExternalSets();
    
    // Get a random selection from trending sets
    const randomTrendingSets = shuffleArray(trendingSets).slice(0, 6);
    
    // Get some unique mock sets with modified timestamps to make them appear more recent
    const recentMockSets = MOCK_EXTERNAL_SETS.map(set => ({
      ...set,
      id: `recent-${set.id}-${Math.random().toString(36).substring(2, 7)}`,
      inserted_at: new Date().toISOString()
    }));
    
    // Combine and shuffle the sets
    const recommendations = shuffleArray([...randomTrendingSets, ...recentMockSets]);
    
    // Ensure title and artist_name are present in all sets
    const validRecommendations = recommendations.filter(set => set.title && set.artist_name);
    
    // Ensure all sets have cover images
    const setsWithImages = validRecommendations.map(set => {
      if (!set.cover_image) {
        // Provide a default image URL based on the source
        if (set.source === 'soundcloud') {
          set.cover_image = 'https://i1.sndcdn.com/artworks-000224593831-494h34-t500x500.jpg';
        } else if (set.source === 'youtube') {
          set.cover_image = 'https://i.ytimg.com/vi/default/hqdefault.jpg';
        } else if (set.source === 'mixcloud') {
          set.cover_image = 'https://thumbnailer.mixcloud.com/unsafe/300x300/profile/5/e/7/0/2446-fc71-4f35-b753-5a760c1e43c3';
        }
      }
      return {
        ...set,
        // Highlight that these are actual set titles by emphasizing the title over artist
        displayTitle: set.title,
        displaySubtitle: `by ${set.artist_name}`,
        type: 'set'
      };
    });
    
    console.log(`[Recommendations API] Returning ${setsWithImages.length} personalized recommendations`);
    return res.json(setsWithImages.slice(0, 10));
  } catch (error: any) {
    console.error('[Recommendations API] Error:', error.message);
    // Return mock data in case of error
    return res.json(shuffleArray(MOCK_EXTERNAL_SETS));
  }
});

export default router; 