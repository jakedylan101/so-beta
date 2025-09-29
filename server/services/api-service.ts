/**
 * Base API service for external music data providers
 */

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface ApiConfig {
  baseUrl: string;
  apiKey?: string;
  clientId?: string;
  clientSecret?: string;
  headers?: Record<string, string>;
}

export abstract class BaseApiService {
  protected config: ApiConfig;

  constructor(config: ApiConfig) {
    this.config = config;
  }

  protected async makeRequest<T>(
    endpoint: string,
    method: 'GET' | 'POST' = 'GET',
    body?: any
  ): Promise<ApiResponse<T>> {
    try {
      const url = `${this.config.baseUrl}${endpoint}`;
      const headers: HeadersInit = {
        ...this.config.headers,
      };

      const requestOptions: RequestInit = {
        method,
        headers,
      };

      if (body) {
        requestOptions.body = JSON.stringify(body);
        headers['Content-Type'] = 'application/json';
      }

      const response = await fetch(url, requestOptions);

      if (!response.ok) {
        console.error(`API error: ${response.status} ${response.statusText}`);
        return {
          success: false,
          error: `API request failed with status ${response.status}: ${response.statusText}`
        };
      }

      const data = await response.json();
      return {
        success: true,
        data
      };
    } catch (error) {
      console.error('API request error:', error);
      return {
        success: false,
        error: `API request failed: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  // Method to build URL with query parameters
  protected buildUrl(endpoint: string, params: Record<string, string | number | boolean | undefined>): string {
    const url = new URL(`${this.config.baseUrl}${endpoint}`);
    
    // Add query parameters
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.append(key, String(value));
      }
    });
    
    return url.toString();
  }
}