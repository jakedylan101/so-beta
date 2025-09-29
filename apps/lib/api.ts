
export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`/api${endpoint}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.statusText}`);
  }

  return response.json();
}

export const api = {
  sets: {
    list: (params?: URLSearchParams) => 
      apiRequest(`/sets${params ? `?${params}` : ''}`),
    create: (data: any) => 
      apiRequest('/sets', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    // Add other set operations...
  },
  auth: {
    getUser: () => apiRequest('/auth/user'),
    // Add other auth operations...
  },
  // Add other API endpoints...
};
