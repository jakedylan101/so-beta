/**
 * Resident Advisor API service for retrieving event and DJ information
 * 
 * Note: Resident Advisor does not have an official public API.
 * This service uses publicly available endpoints that might change.
 */

import { BaseApiService, ApiConfig, ApiResponse } from './api-service';

export interface ResidentAdvisorArtist {
  id: number;
  name: string;
  url: string;
  imageUrl?: string;
  biography?: string;
  country?: string;
}

export interface ResidentAdvisorEvent {
  id: number;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  venueName: string;
  venueAddress: string;
  venueLocation: {
    city: string;
    country: string;
    lat?: number;
    lng?: number;
  };
  artists: {
    id: number;
    name: string;
  }[];
  lineup: string; // Full lineup text
  description: string;
  attending?: number;
  cost?: string;
  imageUrl?: string;
  url: string;
}

export interface ResidentAdvisorVenue {
  id: number;
  name: string;
  address: string;
  location: {
    city: string;
    country: string;
    lat?: number;
    lng?: number;
  };
  capacity?: number;
  description?: string;
  url: string;
}

export class ResidentAdvisorService extends BaseApiService {
  constructor() {
    const config: ApiConfig = {
      baseUrl: 'https://ra.co/graphql',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    };
    super(config);
  }

  // Since RA uses GraphQL, override the makeRequest method
  private async makeGraphQLRequest<T>(
    query: string,
    variables: Record<string, any> = {}
  ): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(this.config.baseUrl, {
        method: 'POST',
        headers: this.config.headers || {},
        body: JSON.stringify({
          query,
          variables
        })
      });

      if (!response.ok) {
        console.error(`RA API error: ${response.status} ${response.statusText}`);
        return {
          success: false,
          error: `API request failed with status ${response.status}: ${response.statusText}`
        };
      }

      const data = await response.json();
      
      // Check for GraphQL errors
      if (data.errors) {
        console.error('GraphQL errors:', data.errors);
        return {
          success: false,
          error: `GraphQL errors: ${data.errors.map((e: any) => e.message).join(', ')}`
        };
      }

      return {
        success: true,
        data: data.data
      };
    } catch (error) {
      console.error('RA API request error:', error);
      return {
        success: false,
        error: `API request failed: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  // Search for events
  async searchEvents(
    query: string,
    filters: {
      date?: { start: string, end: string },
      countries?: string[],
      cities?: string[]
    } = {},
    page: number = 1,
    pageSize: number = 20
  ): Promise<ApiResponse<{ searchEvents: { totalResults: number, data: ResidentAdvisorEvent[] } }>> {
    const gqlQuery = `
      query SearchEvents($query: String!, $filters: EventSearchFilters, $page: Int!, $pageSize: Int!) {
        searchEvents(
          query: $query,
          filters: $filters,
          page: $page,
          pageSize: $pageSize
        ) {
          totalResults
          data {
            id
            title
            date
            startTime
            endTime
            venueName
            venueAddress
            venueLocation {
              city
              country
            }
            artists {
              id
              name
            }
            lineup
            description
            attending
            cost
            imageUrl
            url
          }
        }
      }
    `;

    return this.makeGraphQLRequest({
      query: gqlQuery,
      variables: {
        query,
        filters,
        page,
        pageSize
      }
    });
  }

  // Search for artists/DJs
  async searchArtists(
    query: string,
    page: number = 1,
    pageSize: number = 20
  ): Promise<ApiResponse<{ searchArtists: { totalResults: number, data: ResidentAdvisorArtist[] } }>> {
    const gqlQuery = `
      query SearchArtists($query: String!, $page: Int!, $pageSize: Int!) {
        searchArtists(
          query: $query,
          page: $page,
          pageSize: $pageSize
        ) {
          totalResults
          data {
            id
            name
            url
            imageUrl
            country
          }
        }
      }
    `;

    return this.makeGraphQLRequest({
      query: gqlQuery,
      variables: {
        query,
        page,
        pageSize
      }
    });
  }

  // Get artist/DJ profile
  async getArtist(id: number): Promise<ApiResponse<{ artist: ResidentAdvisorArtist }>> {
    const gqlQuery = `
      query GetArtist($id: ID!) {
        artist(id: $id) {
          id
          name
          url
          imageUrl
          biography
          country
        }
      }
    `;

    return this.makeGraphQLRequest({
      query: gqlQuery,
      variables: { id }
    });
  }

  // Get upcoming events for an artist
  async getArtistEvents(
    artistId: number,
    page: number = 1,
    pageSize: number = 20
  ): Promise<ApiResponse<{ artistEvents: { totalResults: number, data: ResidentAdvisorEvent[] } }>> {
    const gqlQuery = `
      query GetArtistEvents($artistId: ID!, $page: Int!, $pageSize: Int!) {
        artistEvents(
          artistId: $artistId,
          page: $page,
          pageSize: $pageSize
        ) {
          totalResults
          data {
            id
            title
            date
            startTime
            endTime
            venueName
            venueAddress
            venueLocation {
              city
              country
            }
            lineup
            url
          }
        }
      }
    `;

    return this.makeGraphQLRequest({
      query: gqlQuery,
      variables: {
        artistId,
        page,
        pageSize
      }
    });
  }

  // Get event details
  async getEvent(id: number): Promise<ApiResponse<{ event: ResidentAdvisorEvent }>> {
    const gqlQuery = `
      query GetEvent($id: ID!) {
        event(id: $id) {
          id
          title
          date
          startTime
          endTime
          venueName
          venueAddress
          venueLocation {
            city
            country
            lat
            lng
          }
          artists {
            id
            name
          }
          lineup
          description
          attending
          cost
          imageUrl
          url
        }
      }
    `;

    return this.makeGraphQLRequest({
      query: gqlQuery,
      variables: { id }
    });
  }

  // Search for venues
  async searchVenues(
    query: string,
    filters: {
      countries?: string[],
      cities?: string[]
    } = {},
    page: number = 1,
    pageSize: number = 20
  ): Promise<ApiResponse<{ searchVenues: { totalResults: number, data: ResidentAdvisorVenue[] } }>> {
    const gqlQuery = `
      query SearchVenues($query: String!, $filters: VenueSearchFilters, $page: Int!, $pageSize: Int!) {
        searchVenues(
          query: $query,
          filters: $filters,
          page: $page,
          pageSize: $pageSize
        ) {
          totalResults
          data {
            id
            name
            address
            location {
              city
              country
            }
            capacity
            url
          }
        }
      }
    `;

    return this.makeGraphQLRequest({
      query: gqlQuery,
      variables: {
        query,
        filters,
        page,
        pageSize
      }
    });
  }

  // Get venue details
  async getVenue(id: number): Promise<ApiResponse<{ venue: ResidentAdvisorVenue }>> {
    const gqlQuery = `
      query GetVenue($id: ID!) {
        venue(id: $id) {
          id
          name
          address
          location {
            city
            country
            lat
            lng
          }
          capacity
          description
          url
        }
      }
    `;

    return this.makeGraphQLRequest({
      query: gqlQuery,
      variables: { id }
    });
  }

  // Get upcoming events at a venue
  async getVenueEvents(
    venueId: number,
    page: number = 1,
    pageSize: number = 20
  ): Promise<ApiResponse<{ venueEvents: { totalResults: number, data: ResidentAdvisorEvent[] } }>> {
    const gqlQuery = `
      query GetVenueEvents($venueId: ID!, $page: Int!, $pageSize: Int!) {
        venueEvents(
          venueId: $venueId,
          page: $page,
          pageSize: $pageSize
        ) {
          totalResults
          data {
            id
            title
            date
            startTime
            endTime
            artists {
              id
              name
            }
            lineup
            url
          }
        }
      }
    `;

    return this.makeGraphQLRequest({
      query: gqlQuery,
      variables: {
        venueId,
        page,
        pageSize
      }
    });
  }
}