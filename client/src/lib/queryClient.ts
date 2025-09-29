import { QueryClient } from '@tanstack/react-query';
import type { QueryFunction } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { fetchWithAuth } from '@/lib/api/fetchWithAuth';

const defaultQueryFn: QueryFunction = async ({ queryKey }) => {
  const url = queryKey[0] as string;
  return apiRequest(url);
};

export async function apiRequest<T>(
  url: string,
  options: RequestInit = {},
): Promise<T> {
  try {
    // Try to use fetchWithAuth first (for authenticated users)
    const res = await fetchWithAuth(url, options);
    
    if (!res.ok) throw new Error(await res.text());
    
    return res.json() as Promise<T>;
  } catch (error) {
    // If authentication fails, fall back to regular fetch
    if (error instanceof Error && error.message === 'User is not authenticated.') {
      console.log('Falling back to unauthenticated request for:', url);
      
      const res = await fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          'Content-Type': 'application/json',
        },
      });
      
      if (!res.ok) throw new Error(await res.text());
      
      return res.json() as Promise<T>;
    }
    
    // Re-throw other errors
    throw error;
  }
}

// Helper for POST JSON requests
export function postJSON<T>(url: string, data: unknown) {
  return apiRequest<T>(url, {
    method: 'POST',
    body: JSON.stringify(data),
    headers: { 'Content-Type': 'application/json' },
  });
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { queryFn: defaultQueryFn, retry: false, staleTime: 30_000 },
  },
});
