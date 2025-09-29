import { supabase } from '@/lib/supabase';

export const fetchWithAuth = async (input: RequestInfo, init: RequestInit = {}) => {
  const session = await supabase.auth.getSession();
  const accessToken = session?.data?.session?.access_token;

  console.log("fetchWithAuth →", input, "token =", accessToken ? `${accessToken.substring(0, 10)}...` : 'undefined');

  if (!accessToken) {
    throw new Error('User is not authenticated.');
  }

  const headers = new Headers(init.headers || {});
  headers.set('Authorization', `Bearer ${accessToken}`);
  headers.set('Content-Type', 'application/json');

  return fetch(input, {
    ...init,
    headers,
  });
}; 