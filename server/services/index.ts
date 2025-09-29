/**
 * Central export point for all music API services
 */

// Base API service
export * from './api-service';

// Individual music API services
export * from './spotify-service';
export * from './soundcloud-service';
export * from './setlistfm-service';
export * from './residentadvisor-service';
export * from './tracklists-service';

// Unified music metadata service
export * from './music-metadata-service';

// Import service classes from their respective files
import { SpotifyService } from './spotify-service';
import { SoundCloudService } from './soundcloud-service';
import { SetlistFmService } from './setlistfm-service';
import { ResidentAdvisorService } from './residentadvisor-service';
import { TracklistsService } from './tracklists-service';
import { MusicMetadataService } from './music-metadata-service';

// Lazy initialization of services
let spotifyServiceInstance: SpotifyService | undefined;
let soundcloudServiceInstance: SoundCloudService | undefined;
let setlistFmServiceInstance: SetlistFmService | undefined;
let residentAdvisorServiceInstance: ResidentAdvisorService | undefined;
let tracklistsServiceInstance: TracklistsService | undefined;
let musicMetadataServiceInstance: MusicMetadataService | undefined;

// Getter functions that initialize services on first use
export function spotifyService(): SpotifyService | undefined {
  if (!spotifyServiceInstance) {
    const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
    const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
    
    if (SPOTIFY_CLIENT_ID && SPOTIFY_CLIENT_SECRET) {
      spotifyServiceInstance = new SpotifyService(SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET);
    }
  }
  return spotifyServiceInstance;
}

export function soundcloudService(): SoundCloudService | undefined {
  if (!soundcloudServiceInstance) {
    const SOUNDCLOUD_CLIENT_ID = process.env.SOUNDCLOUD_CLIENT_ID;
    if (SOUNDCLOUD_CLIENT_ID) {
      soundcloudServiceInstance = new SoundCloudService(SOUNDCLOUD_CLIENT_ID);
    }
  }
  return soundcloudServiceInstance;
}

export function setlistFmService(): SetlistFmService | undefined {
  if (!setlistFmServiceInstance) {
    const SETLIST_FM_API_KEY = process.env.SETLIST_FM_API_KEY || process.env.SETLISTFM_API_KEY;
    if (SETLIST_FM_API_KEY) {
      setlistFmServiceInstance = new SetlistFmService(SETLIST_FM_API_KEY);
    }
  }
  return setlistFmServiceInstance;
}

export function residentAdvisorService(): ResidentAdvisorService {
  if (!residentAdvisorServiceInstance) {
    residentAdvisorServiceInstance = new ResidentAdvisorService();
  }
  return residentAdvisorServiceInstance;
}

export function tracklistsService(): TracklistsService {
  if (!tracklistsServiceInstance) {
    tracklistsServiceInstance = new TracklistsService();
  }
  return tracklistsServiceInstance;
}

export function musicMetadataService(): MusicMetadataService {
  if (!musicMetadataServiceInstance) {
    const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
    const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
    const SOUNDCLOUD_CLIENT_ID = process.env.SOUNDCLOUD_CLIENT_ID;
    const SETLIST_FM_API_KEY = process.env.SETLIST_FM_API_KEY || process.env.SETLISTFM_API_KEY;
    
    musicMetadataServiceInstance = new MusicMetadataService({
      spotifyClientId: SPOTIFY_CLIENT_ID || '',
      spotifyClientSecret: SPOTIFY_CLIENT_SECRET || '',
      soundcloudClientId: SOUNDCLOUD_CLIENT_ID || '',
      setlistfmApiKey: SETLIST_FM_API_KEY || '',
  useResidentAdvisor: true,
  useTracklists: true
});
  }
  return musicMetadataServiceInstance;
}