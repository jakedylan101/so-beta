/**
 * 1001Tracklists API service for retrieving DJ set tracklists
 * 
 * Note: 1001Tracklists doesn't have an official public API.
 * This service uses web scraping techniques on publicly available data.
 */

import { BaseApiService, ApiConfig, ApiResponse } from './api-service';

export interface TracklistsTrack {
  position: number;
  title: string;
  artist: string;
  remixer?: string;
  label?: string;
  cueTime?: string; // Format: "00:00:00"
  duration?: string; // Format: "00:00"
  sources?: {
    type: string; // "youtube", "spotify", "beatport", etc.
    url: string;
  }[];
}

export interface TracklistsSet {
  id: string; // e.g., "4dr1b/carl_cox_timewarp_2019"
  title: string;
  url: string;
  artist: string;
  venue?: string;
  eventName?: string;
  date?: string;
  duration?: string;
  genre?: string;
  labels?: string[];
  imageUrl?: string;
  tracks: TracklistsTrack[];
  description?: string;
  likes?: number;
  plays?: number;
  tracksIdentified?: number;
  tracksTotal?: number;
}

export interface TracklistsSearchResult {
  sets: {
    id: string;
    title: string;
    url: string;
    artist: string;
    date?: string;
    imageUrl?: string;
    tracksIdentified?: number;
    tracksTotal?: number;
  }[];
  totalResults: number;
}

export interface TracklistsArtist {
  name: string;
  url: string;
  imageUrl?: string;
  genres?: string[];
  aliases?: string[];
  sets?: {
    id: string;
    title: string;
    url: string;
    date?: string;
  }[];
}

export class TracklistsService extends BaseApiService {
  constructor() {
    const config: ApiConfig = {
      baseUrl: 'https://www.1001tracklists.com/ajax',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'SoundOff/1.0 (Music Set Rating App)'
      }
    };
    super(config);
  }

  // Search for DJ sets/tracklists
  async searchSets(query: string, page: number = 1): Promise<ApiResponse<TracklistsSearchResult>> {
    const endpoint = `/search.php?main_search=${encodeURIComponent(query)}&search_type=all&page=${page}`;
    return this.makeRequest<TracklistsSearchResult>(endpoint);
  }

  // Get detailed tracklist by ID
  async getTracklist(id: string): Promise<ApiResponse<TracklistsSet>> {
    const endpoint = `/tldata.php?tlid=${encodeURIComponent(id)}`;
    return this.makeRequest<TracklistsSet>(endpoint);
  }

  // Get artist profile and sets
  async getArtist(artistName: string): Promise<ApiResponse<TracklistsArtist>> {
    // Format artist name for URL (lowercase, spaces to hyphens)
    const formattedName = artistName.toLowerCase().replace(/\s+/g, '-');
    const endpoint = `/artistdata.php?artist=${encodeURIComponent(formattedName)}`;
    return this.makeRequest<TracklistsArtist>(endpoint);
  }

  // Get recent/popular sets
  async getRecentSets(page: number = 1): Promise<ApiResponse<TracklistsSearchResult>> {
    const endpoint = `/recentsets.php?page=${page}`;
    return this.makeRequest<TracklistsSearchResult>(endpoint);
  }

  // Get sets by genre
  async getSetsByGenre(genre: string, page: number = 1): Promise<ApiResponse<TracklistsSearchResult>> {
    // Format genre for URL (lowercase, spaces to hyphens)
    const formattedGenre = genre.toLowerCase().replace(/\s+/g, '-');
    const endpoint = `/genredata.php?genre=${encodeURIComponent(formattedGenre)}&page=${page}`;
    return this.makeRequest<TracklistsSearchResult>(endpoint);
  }

  // Search for tracks (returns sets containing the track)
  async searchTrack(artist: string, title: string, page: number = 1): Promise<ApiResponse<TracklistsSearchResult>> {
    const endpoint = `/searchtrack.php?artist=${encodeURIComponent(artist)}&title=${encodeURIComponent(title)}&page=${page}`;
    return this.makeRequest<TracklistsSearchResult>(endpoint);
  }

  // Get sets from a specific venue
  async getSetsByVenue(venueName: string, page: number = 1): Promise<ApiResponse<TracklistsSearchResult>> {
    // Format venue for URL (lowercase, spaces to hyphens)
    const formattedVenue = venueName.toLowerCase().replace(/\s+/g, '-');
    const endpoint = `/venuedata.php?venue=${encodeURIComponent(formattedVenue)}&page=${page}`;
    return this.makeRequest<TracklistsSearchResult>(endpoint);
  }

  // Get sets from a specific event
  async getSetsByEvent(eventName: string, page: number = 1): Promise<ApiResponse<TracklistsSearchResult>> {
    // Format event for URL (lowercase, spaces to hyphens)
    const formattedEvent = eventName.toLowerCase().replace(/\s+/g, '-');
    const endpoint = `/eventdata.php?event=${encodeURIComponent(formattedEvent)}&page=${page}`;
    return this.makeRequest<TracklistsSearchResult>(endpoint);
  }
}