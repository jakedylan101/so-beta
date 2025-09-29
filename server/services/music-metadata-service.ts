/**
 * Unified Music Metadata Service
 * 
 * This service aggregates data from multiple music APIs to provide comprehensive
 * metadata for artists, tracks, venues, and events.
 */

import { ApiResponse } from './api-service';
import { SpotifyService, SpotifyArtist, SpotifyTrack } from './spotify-service';
import { SoundCloudService, SoundCloudTrack, SoundCloudUser } from './soundcloud-service';
import { SetlistFmService, SetlistFm } from './setlistfm-service';
import { ResidentAdvisorService, ResidentAdvisorArtist, ResidentAdvisorEvent } from './residentadvisor-service';
import { TracklistsService, TracklistsSet } from './tracklists-service';

// Unified interfaces for aggregated data

export interface ArtistMetadata {
  name: string;
  image?: string;
  genres?: string[];
  source: 'spotify' | 'soundcloud' | 'setlistfm' | 'residentadvisor' | 'multiple';
  sourceIds: {
    spotifyId?: string;
    soundcloudId?: string;
    setlistfmId?: string;
    residentadvisorId?: string;
  };
  links?: {
    spotify?: string;
    soundcloud?: string;
    setlistfm?: string;
    residentadvisor?: string;
  };
  bio?: string;
  rawData?: {
    spotify?: SpotifyArtist;
    soundcloud?: SoundCloudUser;
    setlistfm?: any;
    residentadvisor?: ResidentAdvisorArtist;
  };
}

export interface TrackMetadata {
  title: string;
  artist: string;
  album?: string;
  albumArt?: string;
  duration?: number; // in milliseconds
  releaseDate?: string;
  previewUrl?: string;
  source: 'spotify' | 'soundcloud' | 'multiple';
  sourceIds: {
    spotifyId?: string;
    soundcloudId?: string;
  };
  links?: {
    spotify?: string;
    soundcloud?: string;
  };
  rawData?: {
    spotify?: SpotifyTrack;
    soundcloud?: SoundCloudTrack;
  };
}

export interface SetMetadata {
  id: string;
  title: string;
  artist: string;
  venue?: string;
  eventName?: string;
  eventDate?: string;
  tracks?: {
    title: string;
    artist: string;
    position?: number;
  }[];
  source: 'setlistfm' | 'tracklists' | 'multiple';
  sourceIds: {
    setlistfmId?: string;
    tracklistsId?: string;
  };
  links?: {
    setlistfm?: string;
    tracklists?: string;
  };
  imageUrl?: string;
  rawData?: {
    setlistfm?: SetlistFm;
    tracklists?: TracklistsSet;
  };
}

export interface EventMetadata {
  id: string;
  title: string;
  venue: string;
  date: string;
  artists: string[];
  location?: {
    city: string;
    country: string;
  };
  source: 'setlistfm' | 'residentadvisor' | 'multiple';
  sourceIds: {
    setlistfmId?: string;
    residentadvisorId?: string;
  };
  links?: {
    setlistfm?: string;
    residentadvisor?: string;
  };
  imageUrl?: string;
  rawData?: {
    setlistfm?: any;
    residentadvisor?: ResidentAdvisorEvent;
  };
}

export interface VenueMetadata {
  id: string;
  name: string;
  location: {
    city: string;
    country: string;
    address?: string;
  };
  source: 'setlistfm' | 'residentadvisor' | 'multiple';
  sourceIds: {
    setlistfmId?: string;
    residentadvisorId?: string;
  };
  links?: {
    setlistfm?: string;
    residentadvisor?: string;
  };
  rawData?: {
    setlistfm?: any;
    residentadvisor?: any;
  };
}

export interface SearchResults {
  artists: ArtistMetadata[];
  tracks: TrackMetadata[];
  sets: SetMetadata[];
  events: EventMetadata[];
  venues: VenueMetadata[];
}

export class MusicMetadataService {
  private spotifyService?: SpotifyService;
  private soundcloudService?: SoundCloudService;
  private setlistfmService?: SetlistFmService;
  private residentadvisorService?: ResidentAdvisorService;
  private tracklistsService?: TracklistsService;

  constructor(
    config: {
      spotifyClientId?: string,
      spotifyClientSecret?: string,
      soundcloudClientId?: string,
      setlistfmApiKey?: string,
      useResidentAdvisor?: boolean,
      useTracklists?: boolean
    } = {}
  ) {
    // Initialize available services
    if (config.spotifyClientId && config.spotifyClientSecret) {
      this.spotifyService = new SpotifyService(config.spotifyClientId, config.spotifyClientSecret);
    }
    
    if (config.soundcloudClientId) {
      this.soundcloudService = new SoundCloudService(config.soundcloudClientId);
    }
    
    if (config.setlistfmApiKey) {
      this.setlistfmService = new SetlistFmService(config.setlistfmApiKey);
    }
    
    if (config.useResidentAdvisor) {
      this.residentadvisorService = new ResidentAdvisorService();
    }
    
    if (config.useTracklists) {
      this.tracklistsService = new TracklistsService();
    }
  }

  /**
   * Search across all available services
   */
  async search(query: string, types: ('artists' | 'tracks' | 'sets' | 'events' | 'venues')[] = ['artists', 'tracks', 'sets']): Promise<ApiResponse<SearchResults>> {
    const results: SearchResults = {
      artists: [],
      tracks: [],
      sets: [],
      events: [],
      venues: []
    };
    
    const promises: Promise<void>[] = [];
    let hasErrors = false;
    let errorMessage = '';
    
    // Search for artists
    if (types.includes('artists')) {
      if (this.spotifyService) {
        promises.push(
          this.spotifyService.search(query, ['artist'])
            .then(response => {
              if (response.success && response.data?.artists?.items) {
                const spotifyArtists = response.data.artists.items.map(artist => ({
                  name: artist.name,
                  image: artist.images?.[0]?.url,
                  genres: artist.genres,
                  source: 'spotify' as const,
                  sourceIds: {
                    spotifyId: artist.id
                  },
                  links: {
                    spotify: artist.external_urls?.spotify
                  },
                  rawData: {
                    spotify: artist
                  }
                }));
                results.artists.push(...spotifyArtists);
              }
            })
            .catch(err => {
              console.error('Spotify search error:', err);
              hasErrors = true;
              errorMessage += `Spotify search error: ${err.message}. `;
            })
        );
      }
      
      if (this.soundcloudService) {
        promises.push(
          this.soundcloudService.searchUsers(query)
            .then(response => {
              if (response.success && response.data?.collection) {
                const scUsers = response.data.collection
                  .filter((item): item is SoundCloudUser => 'username' in item)
                  .map(user => ({
                    name: user.username,
                    image: user.avatar_url,
                    source: 'soundcloud' as const,
                    sourceIds: {
                      soundcloudId: user.id.toString()
                    },
                    links: {
                      soundcloud: user.permalink_url
                    },
                    rawData: {
                      soundcloud: user
                    }
                  }));
                results.artists.push(...scUsers);
              }
            })
            .catch(err => {
              console.error('SoundCloud search error:', err);
              hasErrors = true;
              errorMessage += `SoundCloud search error: ${err.message}. `;
            })
        );
      }
      
      if (this.setlistfmService) {
        promises.push(
          this.setlistfmService.searchArtists(query)
            .then(response => {
              if (response.success && response.data?.artist) {
                const artists = Array.isArray(response.data.artist) 
                  ? response.data.artist 
                  : [response.data.artist];
                
                const setlistArtists = artists.map(artist => ({
                  name: artist.name,
                  source: 'setlistfm' as const,
                  sourceIds: {
                    setlistfmId: artist.mbid
                  },
                  links: {
                    setlistfm: artist.url
                  },
                  rawData: {
                    setlistfm: artist
                  }
                }));
                results.artists.push(...setlistArtists);
              }
            })
            .catch(err => {
              console.error('Setlist.fm search error:', err);
              hasErrors = true;
              errorMessage += `Setlist.fm search error: ${err.message}. `;
            })
        );
      }
    }
    
    // Search for tracks
    if (types.includes('tracks')) {
      if (this.spotifyService) {
        promises.push(
          this.spotifyService.search(query, ['track'])
            .then(response => {
              if (response.success && response.data?.tracks?.items) {
                const spotifyTracks = response.data.tracks.items.map(track => ({
                  title: track.name,
                  artist: track.artists.map(a => a.name).join(', '),
                  album: track.album.name,
                  albumArt: track.album.images[0]?.url,
                  duration: track.duration_ms,
                  releaseDate: track.album.release_date,
                  previewUrl: track.preview_url,
                  source: 'spotify' as const,
                  sourceIds: {
                    spotifyId: track.id
                  },
                  links: {
                    spotify: track.external_urls.spotify
                  },
                  rawData: {
                    spotify: track
                  }
                }));
                results.tracks.push(...spotifyTracks);
              }
            })
            .catch(err => {
              console.error('Spotify track search error:', err);
              hasErrors = true;
              errorMessage += `Spotify track search error: ${err.message}. `;
            })
        );
      }
      
      if (this.soundcloudService) {
        promises.push(
          this.soundcloudService.searchTracks(query)
            .then(response => {
              if (response.success && response.data?.collection) {
                const scTracks = response.data.collection
                  .filter((item): item is SoundCloudTrack => 'title' in item && 'user' in item)
                  .map(track => ({
                    title: track.title,
                    artist: track.user.username,
                    albumArt: track.artwork_url,
                    duration: track.duration,
                    source: 'soundcloud' as const,
                    sourceIds: {
                      soundcloudId: track.id.toString()
                    },
                    links: {
                      soundcloud: track.permalink_url
                    },
                    rawData: {
                      soundcloud: track
                    }
                  }));
                results.tracks.push(...scTracks);
              }
            })
            .catch(err => {
              console.error('SoundCloud track search error:', err);
              hasErrors = true;
              errorMessage += `SoundCloud track search error: ${err.message}. `;
            })
        );
      }
    }
    
    // Search for sets/setlists
    if (types.includes('sets')) {
      if (this.setlistfmService) {
        promises.push(
          this.setlistfmService.searchSetlistsByArtist(query)
            .then(response => {
              if (response.success && response.data?.setlist) {
                const setlistSets = response.data.setlist.map(setlist => ({
                  id: setlist.id,
                  title: `${setlist.artist.name} at ${setlist.venue.name}`,
                  artist: setlist.artist.name,
                  venue: setlist.venue.name,
                  eventDate: setlist.eventDate,
                  tracks: setlist.sets.set.flatMap(set => 
                    set.song.map((song, index) => ({
                      title: song.name,
                      artist: song.cover?.name || setlist.artist.name,
                      position: index + 1
                    }))
                  ),
                  source: 'setlistfm' as const,
                  sourceIds: {
                    setlistfmId: setlist.id
                  },
                  links: {
                    setlistfm: setlist.url
                  },
                  rawData: {
                    setlistfm: setlist
                  }
                }));
                results.sets.push(...setlistSets);
              }
            })
            .catch(err => {
              console.error('Setlist.fm sets search error:', err);
              hasErrors = true;
              errorMessage += `Setlist.fm sets search error: ${err.message}. `;
            })
        );
      }
      
      if (this.tracklistsService) {
        promises.push(
          this.tracklistsService.searchSets(query)
            .then(response => {
              if (response.success && response.data?.sets) {
                const tracklistSets = response.data.sets.map(set => ({
                  id: set.id,
                  title: set.title,
                  artist: set.artist,
                  source: 'tracklists' as const,
                  sourceIds: {
                    tracklistsId: set.id
                  },
                  links: {
                    tracklists: set.url
                  },
                  imageUrl: set.imageUrl
                }));
                results.sets.push(...tracklistSets);
              }
            })
            .catch(err => {
              console.error('1001Tracklists search error:', err);
              hasErrors = true;
              errorMessage += `1001Tracklists search error: ${err.message}. `;
            })
        );
      }
    }
    
    // Search for events
    if (types.includes('events') && this.residentadvisorService) {
      promises.push(
        this.residentadvisorService.searchEvents(query)
          .then(response => {
            if (response.success && response.data?.searchEvents?.data) {
              const raEvents = response.data.searchEvents.data.map(event => ({
                id: event.id.toString(),
                title: event.title,
                venue: event.venueName,
                date: event.date,
                artists: event.artists.map(a => a.name),
                location: event.venueLocation,
                source: 'residentadvisor' as const,
                sourceIds: {
                  residentadvisorId: event.id.toString()
                },
                links: {
                  residentadvisor: event.url
                },
                imageUrl: event.imageUrl,
                rawData: {
                  residentadvisor: event
                }
              }));
              results.events.push(...raEvents);
            }
          })
          .catch(err => {
            console.error('Resident Advisor events search error:', err);
            hasErrors = true;
            errorMessage += `Resident Advisor events search error: ${err.message}. `;
          })
      );
    }
    
    // Search for venues
    if (types.includes('venues')) {
      if (this.setlistfmService) {
        promises.push(
          this.setlistfmService.searchVenues(query)
            .then(response => {
              if (response.success && response.data?.venue) {
                const venues = Array.isArray(response.data.venue) 
                  ? response.data.venue 
                  : [response.data.venue];
                
                const setlistVenues = venues.map(venue => ({
                  id: venue.id,
                  name: venue.name,
                  location: {
                    city: venue.city.name,
                    country: venue.city.country.name
                  },
                  source: 'setlistfm' as const,
                  sourceIds: {
                    setlistfmId: venue.id
                  },
                  links: {
                    setlistfm: venue.url
                  },
                  rawData: {
                    setlistfm: venue
                  }
                }));
                results.venues.push(...setlistVenues);
              }
            })
            .catch(err => {
              console.error('Setlist.fm venues search error:', err);
              hasErrors = true;
              errorMessage += `Setlist.fm venues search error: ${err.message}. `;
            })
        );
      }
      
      if (this.residentadvisorService) {
        promises.push(
          this.residentadvisorService.searchVenues(query)
            .then(response => {
              if (response.success && response.data?.searchVenues?.data) {
                const raVenues = response.data.searchVenues.data.map(venue => ({
                  id: venue.id.toString(),
                  name: venue.name,
                  location: {
                    city: venue.location.city,
                    country: venue.location.country,
                    address: venue.address
                  },
                  source: 'residentadvisor' as const,
                  sourceIds: {
                    residentadvisorId: venue.id.toString()
                  },
                  links: {
                    residentadvisor: venue.url
                  },
                  rawData: {
                    residentadvisor: venue
                  }
                }));
                results.venues.push(...raVenues);
              }
            })
            .catch(err => {
              console.error('Resident Advisor venues search error:', err);
              hasErrors = true;
              errorMessage += `Resident Advisor venues search error: ${err.message}. `;
            })
        );
      }
    }
    
    await Promise.all(promises);
    
    return {
      success: !hasErrors,
      data: results,
      error: hasErrors ? errorMessage : undefined
    };
  }

  /**
   * Get detailed artist information from all available sources and merge them
   */
  async getArtistDetails(params: {
    name?: string;
    spotifyId?: string;
    soundcloudId?: string;
    setlistfmId?: string;
    residentadvisorId?: string;
  }): Promise<ApiResponse<ArtistMetadata>> {
    if (!params.name && !params.spotifyId && !params.soundcloudId && !params.setlistfmId && !params.residentadvisorId) {
      return {
        success: false,
        error: 'At least one identifier must be provided'
      };
    }
    
    const result: ArtistMetadata = {
      name: params.name || '',
      source: 'multiple',
      sourceIds: {
        spotifyId: params.spotifyId,
        soundcloudId: params.soundcloudId,
        setlistfmId: params.setlistfmId,
        residentadvisorId: params.residentadvisorId
      },
      links: {},
      rawData: {}
    };
    
    const promises: Promise<void>[] = [];
    let hasErrors = false;
    let errorMessage = '';
    
    // Get Spotify artist details
    if (this.spotifyService && (params.spotifyId || params.name)) {
      const spotifyPromise = params.spotifyId
        ? this.spotifyService.getArtist(params.spotifyId)
        : this.spotifyService.search(params.name!, ['artist']).then(res => {
            if (res.success && res.data?.artists?.items?.length) {
              return this.spotifyService!.getArtist(res.data.artists.items[0].id);
            }
            return { success: false, error: 'Artist not found on Spotify' };
          });
      
      promises.push(
        spotifyPromise
          .then(response => {
            if (response.success && response.data) {
              result.name = result.name || response.data.name;
              result.image = result.image || response.data.images?.[0]?.url;
              result.genres = result.genres || response.data.genres;
              result.sourceIds.spotifyId = response.data.id;
              result.links!.spotify = response.data.external_urls?.spotify;
              result.rawData!.spotify = response.data;
            }
          })
          .catch(err => {
            console.error('Spotify artist details error:', err);
            hasErrors = true;
            errorMessage += `Spotify artist details error: ${err.message}. `;
          })
      );
    }
    
    // Get SoundCloud artist details
    if (this.soundcloudService && (params.soundcloudId || params.name)) {
      const soundcloudPromise = params.soundcloudId
        ? this.soundcloudService.getUser(parseInt(params.soundcloudId))
        : this.soundcloudService.searchUsers(params.name!).then(res => {
            if (res.success && res.data?.collection?.length) {
              const user = res.data.collection.find((item): item is SoundCloudUser => 'username' in item);
              if (user) {
                return this.soundcloudService!.getUser(user.id);
              }
            }
            return { success: false, error: 'Artist not found on SoundCloud' };
          });
      
      promises.push(
        soundcloudPromise
          .then(response => {
            if (response.success && response.data) {
              result.name = result.name || response.data.username;
              result.image = result.image || response.data.avatar_url;
              result.sourceIds.soundcloudId = response.data.id.toString();
              result.links!.soundcloud = response.data.permalink_url;
              result.rawData!.soundcloud = response.data;
            }
          })
          .catch(err => {
            console.error('SoundCloud artist details error:', err);
            hasErrors = true;
            errorMessage += `SoundCloud artist details error: ${err.message}. `;
          })
      );
    }
    
    // Get Setlist.fm artist details
    if (this.setlistfmService && (params.setlistfmId || params.name)) {
      const setlistPromise = params.setlistfmId
        ? this.setlistfmService.getArtistById(params.setlistfmId)
        : this.setlistfmService.searchArtists(params.name!).then(res => {
            if (res.success && res.data?.artist) {
              const artists = Array.isArray(res.data.artist) ? res.data.artist : [res.data.artist];
              if (artists.length) {
                return this.setlistfmService!.getArtistById(artists[0].mbid);
              }
            }
            return { success: false, error: 'Artist not found on Setlist.fm' };
          });
      
      promises.push(
        setlistPromise
          .then(response => {
            if (response.success && response.data) {
              result.name = result.name || response.data.name;
              result.sourceIds.setlistfmId = response.data.mbid;
              result.links!.setlistfm = response.data.url;
              result.rawData!.setlistfm = response.data;
            }
          })
          .catch(err => {
            console.error('Setlist.fm artist details error:', err);
            hasErrors = true;
            errorMessage += `Setlist.fm artist details error: ${err.message}. `;
          })
      );
    }
    
    // Get Resident Advisor artist details
    if (this.residentadvisorService && (params.residentadvisorId || params.name)) {
      const raPromise = params.residentadvisorId
        ? this.residentadvisorService.getArtist(parseInt(params.residentadvisorId))
        : this.residentadvisorService.searchArtists(params.name!).then(res => {
            if (res.success && res.data?.searchArtists?.data?.length) {
              return this.residentadvisorService!.getArtist(res.data.searchArtists.data[0].id);
            }
            return { success: false, error: 'Artist not found on Resident Advisor' };
          });
      
      promises.push(
        raPromise
          .then(response => {
            if (response.success && response.data?.artist) {
              result.name = result.name || response.data.artist.name;
              result.image = result.image || response.data.artist.imageUrl;
              result.bio = result.bio || response.data.artist.biography;
              result.sourceIds.residentadvisorId = response.data.artist.id.toString();
              result.links!.residentadvisor = response.data.artist.url;
              result.rawData!.residentadvisor = response.data.artist;
            }
          })
          .catch(err => {
            console.error('Resident Advisor artist details error:', err);
            hasErrors = true;
            errorMessage += `Resident Advisor artist details error: ${err.message}. `;
          })
      );
    }
    
    await Promise.all(promises);
    
    // Determine the primary source
    if (result.rawData?.spotify) result.source = 'spotify';
    else if (result.rawData?.soundcloud) result.source = 'soundcloud';
    else if (result.rawData?.setlistfm) result.source = 'setlistfm';
    else if (result.rawData?.residentadvisor) result.source = 'residentadvisor';
    else if (Object.keys(result.rawData || {}).length > 1) result.source = 'multiple';
    
    return {
      success: !hasErrors || Object.keys(result.rawData || {}).length > 0,
      data: result,
      error: hasErrors ? errorMessage : undefined
    };
  }
  
  /**
   * Get detailed set information by combining Setlist.fm and 1001Tracklists data
   */
  async getSetDetails(params: {
    setlistfmId?: string;
    tracklistsId?: string;
    artistName?: string;
    eventName?: string;
  }): Promise<ApiResponse<SetMetadata>> {
    if (!params.setlistfmId && !params.tracklistsId && (!params.artistName || !params.eventName)) {
      return {
        success: false,
        error: 'At least one identifier or artist+event name must be provided'
      };
    }
    
    const result: SetMetadata = {
      id: params.setlistfmId || params.tracklistsId || '',
      title: '',
      artist: params.artistName || '',
      eventName: params.eventName,
      source: 'multiple',
      sourceIds: {
        setlistfmId: params.setlistfmId,
        tracklistsId: params.tracklistsId
      },
      links: {},
      tracks: [],
      rawData: {}
    };
    
    const promises: Promise<void>[] = [];
    let hasErrors = false;
    let errorMessage = '';
    
    // Get Setlist.fm set details
    if (this.setlistfmService && params.setlistfmId) {
      promises.push(
        this.setlistfmService.getSetlistById(params.setlistfmId)
          .then(response => {
            if (response.success && response.data) {
              const setlist = response.data;
              result.title = `${setlist.artist.name} at ${setlist.venue.name}`;
              result.artist = setlist.artist.name;
              result.venue = setlist.venue.name;
              result.eventDate = setlist.eventDate;
              result.tracks = setlist.sets.set.flatMap(set => 
                set.song.map((song, index) => ({
                  title: song.name,
                  artist: song.cover?.name || setlist.artist.name,
                  position: index + 1
                }))
              );
              result.links!.setlistfm = setlist.url;
              result.rawData!.setlistfm = setlist;
            }
          })
          .catch(err => {
            console.error('Setlist.fm set details error:', err);
            hasErrors = true;
            errorMessage += `Setlist.fm set details error: ${err.message}. `;
          })
      );
    }
    
    // Get 1001Tracklists set details
    if (this.tracklistsService && params.tracklistsId) {
      promises.push(
        this.tracklistsService.getTracklist(params.tracklistsId)
          .then(response => {
            if (response.success && response.data) {
              const tracklist = response.data;
              result.title = result.title || tracklist.title;
              result.artist = result.artist || tracklist.artist;
              result.venue = result.venue || tracklist.venue;
              result.eventName = result.eventName || tracklist.eventName;
              result.eventDate = result.eventDate || tracklist.date;
              result.imageUrl = result.imageUrl || tracklist.imageUrl;
              
              // Merge tracks or use 1001Tracklists tracks if none from Setlist.fm
              if (!result.tracks || result.tracks.length === 0) {
                result.tracks = tracklist.tracks.map(track => ({
                  title: track.title,
                  artist: track.artist,
                  position: track.position
                }));
              }
              
              result.links!.tracklists = tracklist.url;
              result.rawData!.tracklists = tracklist;
            }
          })
          .catch(err => {
            console.error('1001Tracklists set details error:', err);
            hasErrors = true;
            errorMessage += `1001Tracklists set details error: ${err.message}. `;
          })
      );
    }
    
    // Search for set by artist and event if IDs not provided
    if ((!params.setlistfmId && !params.tracklistsId) && params.artistName && params.eventName) {
      // Try to find on Setlist.fm
      if (this.setlistfmService) {
        promises.push(
          this.setlistfmService.searchSetlistsByArtist(params.artistName)
            .then(response => {
              if (response.success && response.data?.setlist) {
                // Find a matching setlist by event name or venue
                const matchingSetlist = response.data.setlist.find(setlist => 
                  setlist.venue.name.toLowerCase().includes(params.eventName!.toLowerCase()) ||
                  (setlist.tour && setlist.tour.name.toLowerCase().includes(params.eventName!.toLowerCase()))
                );
                
                if (matchingSetlist) {
                  result.sourceIds.setlistfmId = matchingSetlist.id;
                  result.title = `${matchingSetlist.artist.name} at ${matchingSetlist.venue.name}`;
                  result.artist = matchingSetlist.artist.name;
                  result.venue = matchingSetlist.venue.name;
                  result.eventDate = matchingSetlist.eventDate;
                  result.tracks = matchingSetlist.sets.set.flatMap(set => 
                    set.song.map((song, index) => ({
                      title: song.name,
                      artist: song.cover?.name || matchingSetlist.artist.name,
                      position: index + 1
                    }))
                  );
                  result.links = result.links || {};
                  result.links.setlistfm = matchingSetlist.url;
                  result.rawData = result.rawData || {};
                  result.rawData.setlistfm = matchingSetlist;
                }
              }
            })
            .catch(err => {
              console.error('Setlist.fm search by artist and event error:', err);
              hasErrors = true;
              errorMessage += `Setlist.fm search error: ${err.message}. `;
            })
        );
      }
      
      // Try to find on 1001Tracklists
      if (this.tracklistsService) {
        promises.push(
          this.tracklistsService.searchSets(`${params.artistName} ${params.eventName}`)
            .then(response => {
              if (response.success && response.data?.sets?.length) {
                const tracklistId = response.data.sets[0].id;
                return this.tracklistsService!.getTracklist(tracklistId);
              }
              return { success: false };
            })
            .then(response => {
              if (response.success && response.data) {
                const tracklist = response.data;
                
                // Only use if we didn't find a Setlist.fm match or to enhance existing data
                if (!result.rawData?.setlistfm || !result.tracks || result.tracks.length === 0) {
                  result.sourceIds.tracklistsId = tracklist.id;
                  result.title = result.title || tracklist.title;
                  result.artist = result.artist || tracklist.artist;
                  result.venue = result.venue || tracklist.venue;
                  result.eventName = result.eventName || tracklist.eventName;
                  result.eventDate = result.eventDate || tracklist.date;
                  result.imageUrl = result.imageUrl || tracklist.imageUrl;
                  
                  if (!result.tracks || result.tracks.length === 0) {
                    result.tracks = tracklist.tracks.map(track => ({
                      title: track.title,
                      artist: track.artist,
                      position: track.position
                    }));
                  }
                  
                  result.links = result.links || {};
                  result.links.tracklists = tracklist.url;
                  result.rawData = result.rawData || {};
                  result.rawData.tracklists = tracklist;
                }
              }
            })
            .catch(err => {
              console.error('1001Tracklists search by artist and event error:', err);
              hasErrors = true;
              errorMessage += `1001Tracklists search error: ${err.message}. `;
            })
        );
      }
    }
    
    await Promise.all(promises);
    
    // Determine the primary source
    if (result.rawData?.setlistfm && result.rawData?.tracklists) result.source = 'multiple';
    else if (result.rawData?.setlistfm) result.source = 'setlistfm';
    else if (result.rawData?.tracklists) result.source = 'tracklists';
    
    return {
      success: !hasErrors || Object.keys(result.rawData || {}).length > 0,
      data: result,
      error: hasErrors ? errorMessage : undefined
    };
  }

  /**
   * Get track details from Spotify or SoundCloud
   */
  async getTrackDetails(params: {
    spotifyId?: string;
    soundcloudId?: string;
    title?: string;
    artist?: string;
  }): Promise<ApiResponse<TrackMetadata>> {
    if (!params.spotifyId && !params.soundcloudId && (!params.title || !params.artist)) {
      return {
        success: false,
        error: 'At least one identifier or title+artist must be provided'
      };
    }
    
    const result: TrackMetadata = {
      title: params.title || '',
      artist: params.artist || '',
      source: 'multiple',
      sourceIds: {
        spotifyId: params.spotifyId,
        soundcloudId: params.soundcloudId
      },
      links: {},
      rawData: {}
    };
    
    const promises: Promise<void>[] = [];
    let hasErrors = false;
    let errorMessage = '';
    
    // Get Spotify track details
    if (this.spotifyService && (params.spotifyId || (params.title && params.artist))) {
      const spotifyPromise = params.spotifyId
        ? this.spotifyService.getTrack(params.spotifyId)
        : this.spotifyService.search(`${params.artist} ${params.title}`, ['track']).then(res => {
            if (res.success && res.data?.tracks?.items?.length) {
              return this.spotifyService!.getTrack(res.data.tracks.items[0].id);
            }
            return { success: false, error: 'Track not found on Spotify' };
          });
      
      promises.push(
        spotifyPromise
          .then(response => {
            if (response.success && response.data) {
              result.title = response.data.name;
              result.artist = response.data.artists.map(a => a.name).join(', ');
              result.album = response.data.album.name;
              result.albumArt = response.data.album.images[0]?.url;
              result.duration = response.data.duration_ms;
              result.releaseDate = response.data.album.release_date;
              result.previewUrl = response.data.preview_url;
              result.sourceIds.spotifyId = response.data.id;
              result.links!.spotify = response.data.external_urls.spotify;
              result.rawData!.spotify = response.data;
            }
          })
          .catch(err => {
            console.error('Spotify track details error:', err);
            hasErrors = true;
            errorMessage += `Spotify track details error: ${err.message}. `;
          })
      );
    }
    
    // Get SoundCloud track details
    if (this.soundcloudService && (params.soundcloudId || (params.title && params.artist))) {
      const soundcloudPromise = params.soundcloudId
        ? this.soundcloudService.getTrack(parseInt(params.soundcloudId))
        : this.soundcloudService.searchTracks(`${params.artist} ${params.title}`).then(res => {
            if (res.success && res.data?.collection?.length) {
              const track = res.data.collection.find((item): item is SoundCloudTrack => 'title' in item && 'user' in item);
              if (track) {
                return this.soundcloudService!.getTrack(track.id);
              }
            }
            return { success: false, error: 'Track not found on SoundCloud' };
          });
      
      promises.push(
        soundcloudPromise
          .then(response => {
            if (response.success && response.data) {
              // Only use if we don't have Spotify data or to enhance it
              if (!result.rawData?.spotify) {
                result.title = response.data.title;
                result.artist = response.data.user.username;
              }
              
              result.albumArt = result.albumArt || response.data.artwork_url;
              result.duration = result.duration || response.data.duration;
              result.sourceIds.soundcloudId = response.data.id.toString();
              result.links!.soundcloud = response.data.permalink_url;
              result.rawData!.soundcloud = response.data;
            }
          })
          .catch(err => {
            console.error('SoundCloud track details error:', err);
            hasErrors = true;
            errorMessage += `SoundCloud track details error: ${err.message}. `;
          })
      );
    }
    
    await Promise.all(promises);
    
    // Determine the primary source
    if (result.rawData?.spotify) result.source = 'spotify';
    else if (result.rawData?.soundcloud) result.source = 'soundcloud';
    else if (Object.keys(result.rawData || {}).length > 1) result.source = 'multiple';
    
    return {
      success: !hasErrors || Object.keys(result.rawData || {}).length > 0,
      data: result,
      error: hasErrors ? errorMessage : undefined
    };
  }
}