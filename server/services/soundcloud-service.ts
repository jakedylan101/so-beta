/**
 * SoundCloud API service for retrieving music metadata and tracks
 */

import { BaseApiService, ApiConfig, ApiResponse } from './api-service';

export interface SoundCloudUser {
  id: number;
  permalink: string;
  username: string;
  avatar_url: string;
  permalink_url: string;
}

export interface SoundCloudTrack {
  id: number;
  created_at: string;
  user_id: number;
  user: SoundCloudUser;
  title: string;
  permalink: string;
  permalink_url: string;
  uri: string;
  artwork_url: string | null;
  stream_url: string;
  duration: number;
  genre: string;
  description: string | null;
  tag_list: string;
  playback_count: number;
  likes_count: number;
  reposts_count: number;
}

export interface SoundCloudPlaylist {
  id: number;
  created_at: string;
  user_id: number;
  user: SoundCloudUser;
  title: string;
  permalink: string;
  permalink_url: string;
  artwork_url: string | null;
  tracks: SoundCloudTrack[];
  track_count: number;
  duration: number;
  genre: string;
  description: string | null;
  tag_list: string;
}

export interface SoundCloudSearchResult {
  collection: (SoundCloudTrack | SoundCloudPlaylist | SoundCloudUser)[];
  next_href: string | null;
}

export class SoundCloudService extends BaseApiService {
  constructor(clientId: string) {
    const config: ApiConfig = {
      baseUrl: 'https://api-v2.soundcloud.com',
      clientId,
      headers: {
        'Accept': 'application/json'
      }
    };
    super(config);
  }

  // Override makeRequest to always include client_id in requests
  protected async makeRequest<T>(
    endpoint: string,
    method: 'GET' | 'POST' = 'GET',
    body?: any
  ): Promise<ApiResponse<T>> {
    // Append client_id to the endpoint if not already present
    const separator = endpoint.includes('?') ? '&' : '?';
    const endpointWithClientId = `${endpoint}${separator}client_id=${this.config.clientId}`;
    
    return super.makeRequest<T>(endpointWithClientId, method, body);
  }

  // Search tracks
  async searchTracks(query: string, limit: number = 10): Promise<ApiResponse<SoundCloudSearchResult>> {
    const endpoint = `/search/tracks?q=${encodeURIComponent(query)}&limit=${limit}`;
    return this.makeRequest<SoundCloudSearchResult>(endpoint);
  }

  // Search playlists
  async searchPlaylists(query: string, limit: number = 10): Promise<ApiResponse<SoundCloudSearchResult>> {
    const endpoint = `/search/playlists_without_albums?q=${encodeURIComponent(query)}&limit=${limit}`;
    return this.makeRequest<SoundCloudSearchResult>(endpoint);
  }

  // Search users
  async searchUsers(query: string, limit: number = 10): Promise<ApiResponse<SoundCloudSearchResult>> {
    const endpoint = `/search/users?q=${encodeURIComponent(query)}&limit=${limit}`;
    return this.makeRequest<SoundCloudSearchResult>(endpoint);
  }

  // Get track by ID
  async getTrack(id: number): Promise<ApiResponse<SoundCloudTrack>> {
    const endpoint = `/tracks/${id}`;
    return this.makeRequest<SoundCloudTrack>(endpoint);
  }

  // Get user by ID
  async getUser(id: number): Promise<ApiResponse<SoundCloudUser>> {
    const endpoint = `/users/${id}`;
    return this.makeRequest<SoundCloudUser>(endpoint);
  }

  // Get user's tracks
  async getUserTracks(userId: number, limit: number = 10): Promise<ApiResponse<SoundCloudTrack[]>> {
    const endpoint = `/users/${userId}/tracks?limit=${limit}`;
    return this.makeRequest<SoundCloudTrack[]>(endpoint);
  }

  // Get user's playlists
  async getUserPlaylists(userId: number, limit: number = 10): Promise<ApiResponse<SoundCloudPlaylist[]>> {
    const endpoint = `/users/${userId}/playlists?limit=${limit}`;
    return this.makeRequest<SoundCloudPlaylist[]>(endpoint);
  }

  // Get playlist
  async getPlaylist(id: number): Promise<ApiResponse<SoundCloudPlaylist>> {
    const endpoint = `/playlists/${id}`;
    return this.makeRequest<SoundCloudPlaylist>(endpoint);
  }

  // Resolve a SoundCloud URL to an object (track, playlist, or user)
  async resolve(url: string): Promise<ApiResponse<any>> {
    const endpoint = `/resolve?url=${encodeURIComponent(url)}`;
    return this.makeRequest<any>(endpoint);
  }

  // Get related tracks
  async getRelatedTracks(trackId: number, limit: number = 10): Promise<ApiResponse<SoundCloudTrack[]>> {
    const endpoint = `/tracks/${trackId}/related?limit=${limit}`;
    return this.makeRequest<SoundCloudTrack[]>(endpoint);
  }
}