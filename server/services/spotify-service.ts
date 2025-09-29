/**
 * Spotify API service for retrieving music metadata
 */

import { BaseApiService, ApiConfig, ApiResponse } from './api-service';

// Define Spotify-specific interfaces
export interface SpotifyArtist {
  id: string;
  name: string;
  images?: {
    url: string;
    height: number;
    width: number;
  }[];
  genres?: string[];
  popularity?: number;
}

export interface SpotifyTrack {
  id: string;
  name: string;
  artists: SpotifyArtist[];
  album: {
    id: string;
    name: string;
    images: {
      url: string;
      height: number;
      width: number;
    }[];
    release_date: string;
  };
  duration_ms: number;
  popularity: number;
  preview_url: string | null;
  external_urls: { spotify: string };
}

export interface SpotifyAlbum {
  id: string;
  name: string;
  artists: SpotifyArtist[];
  images: {
    url: string;
    height: number;
    width: number;
  }[];
  release_date: string;
  total_tracks: number;
  tracks?: {
    items: SpotifyTrack[];
  };
}

export interface SpotifySearchResponse {
  artists?: { items: SpotifyArtist[] };
  tracks?: { items: SpotifyTrack[] };
  albums?: { items: SpotifyAlbum[] };
}

export class SpotifyService extends BaseApiService {
  private accessToken: string | null = null;
  private tokenExpiryTime: number = 0;
  private artistImageCache = new Map<string, { imageUrl: string; expiresAt: number }>();

  constructor(clientId: string, clientSecret: string) {
    const config: ApiConfig = {
      baseUrl: 'https://api.spotify.com/v1',
      clientId,
      clientSecret,
      headers: {}
    };
    super(config);
  }

  // Get or refresh the access token
  private async getAccessToken(): Promise<string> {
    // If token exists and is not expired, return it
    if (this.accessToken && Date.now() < this.tokenExpiryTime) {
      return this.accessToken;
    }

    // Otherwise, get a new token
    const tokenEndpoint = 'https://accounts.spotify.com/api/token';
    const clientId = this.config.clientId;
    const clientSecret = this.config.clientSecret;

    if (!clientId || !clientSecret) {
      throw new Error('Spotify client ID and client secret are required');
    }

    const authString = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    
    try {
      const response = await fetch(tokenEndpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${authString}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: 'grant_type=client_credentials'
      });

      if (!response.ok) {
        throw new Error(`Failed to get Spotify access token: ${response.statusText}`);
      }

      const data = await response.json();
      this.accessToken = data.access_token;
      // Set expiry time (subtract 60 seconds to be safe)
      this.tokenExpiryTime = Date.now() + (data.expires_in - 60) * 1000;
      
      if (!this.accessToken) {
        throw new Error('Failed to obtain Spotify access token');
      }
      
      return this.accessToken;
    } catch (error) {
      console.error('Error getting Spotify access token:', error);
      throw error;
    }
  }

  // Override the makeRequest method to include authorization
  protected async makeRequest<T>(
    endpoint: string,
    method: 'GET' | 'POST' = 'GET',
    body?: any
  ): Promise<ApiResponse<T>> {
    try {
      // Get access token
      const accessToken = await this.getAccessToken();
      
      // Update headers with the access token
      this.config.headers = {
        ...this.config.headers,
        'Authorization': `Bearer ${accessToken}`
      };

      // Call the parent makeRequest method
      return super.makeRequest<T>(endpoint, method, body);
    } catch (error) {
      console.error('Spotify API request error:', error);
      return {
        success: false,
        error: `Spotify API request failed: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  // Search for items on Spotify
  async search(
    query: string,
    type: string | string[] = ['artist', 'track'],
    limit: number = 10
  ): Promise<ApiResponse<SpotifySearchResponse>> {
    const types = Array.isArray(type) ? type.join(',') : type;
    const endpoint = `/search?q=${encodeURIComponent(query)}&type=${types}&limit=${limit}`;
    
    return this.makeRequest<SpotifySearchResponse>(endpoint);
  }

  // Get an artist by ID
  async getArtist(id: string): Promise<ApiResponse<SpotifyArtist>> {
    return this.makeRequest<SpotifyArtist>(`/artists/${id}`);
  }

  // Get artist's top tracks
  async getArtistTopTracks(id: string, market: string = 'US'): Promise<ApiResponse<{ tracks: SpotifyTrack[] }>> {
    return this.makeRequest<{ tracks: SpotifyTrack[] }>(`/artists/${id}/top-tracks?market=${market}`);
  }

  // Get artist's albums
  async getArtistAlbums(id: string, limit: number = 10): Promise<ApiResponse<{ items: SpotifyAlbum[] }>> {
    return this.makeRequest<{ items: SpotifyAlbum[] }>(`/artists/${id}/albums?limit=${limit}`);
  }

  // Get track
  async getTrack(id: string): Promise<ApiResponse<SpotifyTrack>> {
    return this.makeRequest<SpotifyTrack>(`/tracks/${id}`);
  }

  // Get album
  async getAlbum(id: string): Promise<ApiResponse<SpotifyAlbum>> {
    return this.makeRequest<SpotifyAlbum>(`/albums/${id}`);
  }

  // Get several tracks by their IDs
  async getTracks(ids: string[]): Promise<ApiResponse<{ tracks: SpotifyTrack[] }>> {
    if (ids.length === 0) {
      return { success: false, error: 'No track IDs provided' };
    }
    
    return this.makeRequest<{ tracks: SpotifyTrack[] }>(`/tracks?ids=${ids.join(',')}`);
  }

  // Get artist image with caching
  public async getArtistImage(artistName: string): Promise<ApiResponse<{ name: string; imageUrl: string }>> {
    const key = artistName.toLowerCase().trim();
    const cached = this.artistImageCache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      return { success: true, data: { name: artistName, imageUrl: cached.imageUrl } };
    }

    try {
      const searchRes = await this.search(artistName, ['artist'], 1);
      if (!searchRes.success || !searchRes.data?.artists?.items.length) {
        return { success: false, error: "Artist not found" };
      }

      const artists = searchRes.data.artists.items;
      const match = artists.find((a) => a.name.toLowerCase() === key) || artists[0];
      const imageUrl = match.images?.[0]?.url;
      
      if (!imageUrl) {
        return { success: false, error: "Artist image not available" };
      }

      this.artistImageCache.set(key, {
        imageUrl,
        expiresAt: Date.now() + 1000 * 60 * 60 * 24, // 24h TTL
      });

      return { success: true, data: { name: match.name, imageUrl } };
    } catch (error) {
      console.error('Error fetching artist image:', error);
      return { success: false, error: `Failed to fetch artist image: ${error instanceof Error ? error.message : String(error)}` };
    }
  }
}