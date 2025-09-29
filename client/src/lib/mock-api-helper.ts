import type { ArtistSearchResult } from '@/types/artist';

// Mock data for testing
const MOCK_ARTISTS: ArtistSearchResult[] = [
  { 
    id: '1', 
    artistName: 'Charli XCX', 
    venueName: 'Empire Polo Fields', 
    eventDate: '2025-04-11', 
    eventName: 'Coachella Festival 2025', 
    city: 'Indio', 
    country: 'USA',
    source: 'mock' 
  },
  { 
    id: '2', 
    artistName: 'Charli XCX', 
    venueName: 'Barclays Center', 
    eventDate: '2025-05-03', 
    city: 'New York', 
    country: 'USA',
    source: 'mock' 
  },
  { 
    id: '3', 
    artistName: 'Charli XCX', 
    venueName: 'Barclays Center', 
    eventDate: '2025-05-02', 
    city: 'New York', 
    country: 'USA',
    source: 'mock' 
  },
  { 
    id: '4', 
    artistName: 'Charli XCX', 
    venueName: 'Barclays Center', 
    eventDate: '2025-05-01', 
    city: 'New York', 
    country: 'USA',
    source: 'mock' 
  },
  { 
    id: '5', 
    artistName: 'Charli XCX', 
    venueName: 'Empire Polo Fields', 
    eventDate: '2025-04-19', 
    eventName: 'Coachella Festival 2025', 
    city: 'Indio', 
    country: 'USA',
    source: 'mock' 
  },
  { 
    id: '6', 
    artistName: 'Fred Again..', 
    venueName: 'Brooklyn Mirage', 
    eventDate: '2024-09-15', 
    city: 'New York', 
    country: 'USA',
    source: 'mock' 
  },
  { 
    id: '7', 
    artistName: 'The Chemical Brothers', 
    venueName: 'Printworks', 
    eventDate: '2024-10-22', 
    city: 'London', 
    country: 'UK',
    source: 'mock' 
  },
  { 
    id: '8', 
    artistName: 'Peggy Gou', 
    venueName: 'Berghain', 
    eventDate: '2024-11-05', 
    city: 'Berlin', 
    country: 'Germany',
    source: 'mock' 
  },
];

/**
 * Search for artists matching the query
 */
export function searchArtists(query: string): ArtistSearchResult[] {
  // Check if we have a query
  if (!query || query.length < 2) {
    return [];
  }
  
  console.log(`Searching for artists matching "${query}"`);
  
  // Filter based on search query (case insensitive)
  const lowercaseQuery = query.toLowerCase();
  const filteredResults = MOCK_ARTISTS.filter(artist => 
    artist.artistName.toLowerCase().includes(lowercaseQuery) ||
    artist.venueName.toLowerCase().includes(lowercaseQuery) ||
    (artist.eventName && artist.eventName.toLowerCase().includes(lowercaseQuery))
  );
  
  console.log(`Found ${filteredResults.length} results for "${query}"`);
  
  return filteredResults;
}

/**
 * Simulates a fetch request to the artist search API
 */
export function fetchArtistSearch(query: string): Promise<ArtistSearchResult[]> {
  return new Promise((resolve) => {
    // Add a small delay to simulate network request
    setTimeout(() => {
      resolve(searchArtists(query));
    }, 300);
  });
} 