/**
 * Setlist.fm API service for retrieving live performance setlists and metadata
 */

import { BaseApiService, ApiConfig, ApiResponse } from './api-service';

export interface SetlistFmArtist {
  mbid: string;
  name: string;
  sortName: string;
  url: string;
}

export interface SetlistFmVenue {
  id: string;
  name: string;
  city: {
    id: string;
    name: string;
    state?: string;
    stateCode?: string;
    country: {
      code: string;
      name: string;
    };
  };
  url: string;
}

export interface SetlistFmSet {
  name?: string;
  encore?: number;
  song: {
    name: string;
    info?: string;
    cover?: {
      mbid: string;
      name: string;
      sortName: string;
      url: string;
    };
    tape?: boolean;
  }[];
}

export interface SetlistFm {
  id: string;
  versionId: string;
  eventDate: string;
  lastUpdated: string;
  artist: SetlistFmArtist;
  venue: SetlistFmVenue;
  tour?: {
    name: string;
  };
  sets: {
    set: SetlistFmSet[];
  };
  url: string;
}

export interface SetlistFmSearchResponse {
  type: string;
  itemsPerPage: number;
  page: number;
  total: number;
  setlist: SetlistFm[];
}

export class SetlistFmService extends BaseApiService {
  constructor(apiKey: string) {
    const config: ApiConfig = {
      baseUrl: 'https://api.setlist.fm/rest/1.0',
      apiKey,
      headers: {
        'Accept': 'application/json',
        'x-api-key': apiKey
      }
    };
    super(config);
  }

  // Search for setlists by artist name
  async searchSetlistsByArtist(
    artistName: string, 
    page: number = 1, 
    limit: number = 20
  ): Promise<ApiResponse<SetlistFmSearchResponse>> {
    const endpoint = `/search/setlists?artistName=${encodeURIComponent(artistName)}&p=${page}&l=${limit}`;
    return this.makeRequest<SetlistFmSearchResponse>(endpoint);
  }

  // Get setlist by ID
  async getSetlistById(setlistId: string): Promise<ApiResponse<SetlistFm>> {
    const endpoint = `/setlist/${setlistId}`;
    return this.makeRequest<SetlistFm>(endpoint);
  }

  // Search for artists
  async searchArtists(
    artistName: string, 
    page: number = 1, 
    limit: number = 20
  ): Promise<ApiResponse<any>> {
    const endpoint = `/search/artists?artistName=${encodeURIComponent(artistName)}&p=${page}&sort=relevance`;
    return this.makeRequest<any>(endpoint);
  }

  // Get artist by Musicbrainz ID
  async getArtistById(mbid: string): Promise<ApiResponse<SetlistFmArtist>> {
    const endpoint = `/artist/${mbid}`;
    return this.makeRequest<SetlistFmArtist>(endpoint);
  }

  // Get setlists by venue ID
  async getSetlistsByVenueId(
    venueId: string, 
    page: number = 1, 
    limit: number = 20
  ): Promise<ApiResponse<SetlistFmSearchResponse>> {
    const endpoint = `/venue/${venueId}/setlists?p=${page}`;
    return this.makeRequest<SetlistFmSearchResponse>(endpoint);
  }

  // Search for venues
  async searchVenues(
    venueName: string, 
    page: number = 1, 
    limit: number = 20
  ): Promise<ApiResponse<any>> {
    const endpoint = `/search/venues?name=${encodeURIComponent(venueName)}&p=${page}`;
    return this.makeRequest<any>(endpoint);
  }

  // Get venue by ID
  async getVenueById(venueId: string): Promise<ApiResponse<SetlistFmVenue>> {
    const endpoint = `/venue/${venueId}`;
    return this.makeRequest<SetlistFmVenue>(endpoint);
  }

  // Get setlists by artist and venue
  async getSetlistsByArtistAndVenue(
    artistMbid: string, 
    venueId: string, 
    page: number = 1, 
    limit: number = 20
  ): Promise<ApiResponse<SetlistFmSearchResponse>> {
    const endpoint = `/search/setlists?artistMbid=${artistMbid}&venueId=${venueId}&p=${page}`;
    return this.makeRequest<SetlistFmSearchResponse>(endpoint);
  }

  // Get setlists by date range
  async getSetlistsByDateRange(
    artistName: string, 
    dateFrom: string, // format: dd-MM-yyyy
    dateTo: string,   // format: dd-MM-yyyy
    page: number = 1,
    limit: number = 20
  ): Promise<ApiResponse<SetlistFmSearchResponse>> {
    const endpoint = `/search/setlists?artistName=${encodeURIComponent(artistName)}&date=${dateFrom},${dateTo}&p=${page}`;
    return this.makeRequest<SetlistFmSearchResponse>(endpoint);
  }
}