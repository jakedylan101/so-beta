import { getSession } from "../../lib/auth";
import type { Set } from "../../types/set";

// Search across all external providers
export async function searchExternalSets(query: string): Promise<Set[]> {
  let token = "";
  try {
    const { data: { session } } = await getSession();
    token = session?.access_token ?? "";
  } catch (error) {
    console.warn("No auth session found, proceeding unauthenticated.");
  }

  const headers = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    "Content-Type": "application/json",
  };

  try {
    console.log(`Fetching search results for query: ${query}`);
    // const apiUrl = import.meta.env.PROD 
    //   ? `/api/discover/search?q=${encodeURIComponent(query)}`
    //   : `http://localhost:3001/api/search?q=${encodeURIComponent(query)}`;

    const apiUrl = "/api/search?q=" + encodeURIComponent(query);

    const res = await fetch(apiUrl, { headers });

    if (!res.ok) {
      console.error(`Search API error: ${res.status} ${res.statusText}`);
      // Try to get response text for better debugging
      try {
        const errorText = await res.text();
        console.error('Error response:', errorText.substring(0, 200) + '...');
      } catch (e) {
        console.error('Could not get error text');
      }
      return [];
    }

    const data = await res.json();
    console.log('🔴 [DEBUG] - Found Externel Setes : ', res)
    console.log(`Search returned ${data.sets?.length || 0} results`);
    return data.sets ?? [];
  } catch (err) {
    console.error("Search failed:", err);
    return [];
  }
}

// Fetch recommended sets
export async function fetchRecommendedSets(): Promise<Set[]> {
  let token = "";
  try {
    const { data: { session } } = await getSession();
    token = session?.access_token ?? "";
  } catch (error) {
    console.warn("No auth session found, proceeding unauthenticated for recommendations.");
  }

  const headers = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    "Content-Type": "application/json",
  };

  try {
    console.log("[EC5173] Fetching recommended sets...");
    console.log('NODE ENV : ', import.meta.env.PROD);
    // const apiUrl = import.meta.env.PROD
    //   ? "/api/discover/recommendations"
    //   : "http://localhost:3001/api/recommendations";

    const apiUrl = "/api/recommendations";

    const res = await fetch(apiUrl, { headers });

    if (!res.ok) {
      console.error(`Recommendations API error: ${res.status} ${res.statusText}`);
      // Try to get response text for better debugging
      try {
        const errorText = await res.text();
        console.error('Error response:', errorText.substring(0, 200) + '...');
      } catch (e) {
        console.error('Could not get error text');
      }
      return [];
    }

    console.log(" EC-109 [RECOMMENDED API RESPONSE]", res);
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('text/html')) {
      // We likely hit a static index.html fallback — log helpful debug info
      const text = await res.text().catch(() => '<could not read html>');
      console.error('[EC109] Expected JSON but got HTML. Response preview:', text.substring(0, 300));
      return [];
    }

    const data = await res.json();
    // Normalize response: accept either { sets: Set[] } or Set[]
    const sets: Set[] = Array.isArray(data) ? data : data?.sets ?? [];
    console.log('🔴 [DEBUG] - Recommended Sets : ', sets);
    console.log(`Recommendations returned ${sets.length || 0} sets`);
    return sets;

  } catch (error) {
    console.error("[EC107] Error fetching recommended sets:", error);
    return [];
  }
}

// Fetch trending sets
export async function fetchTrendingSets(): Promise<Set[]> {
  let token = "";

  try {
    const { data: { session } } = await getSession();
    token = session?.access_token ?? "";
  } catch (error) {
    console.warn("No auth session found, proceeding unauthenticated for trending.");
  }

  const headers = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    "Content-Type": "application/json",
  };

  try {
    console.log("[C5174] Fetching trending sets...");
    // const apiUrl = import.meta.env.PROD 
    //   ? "/api/discover/trending"
    //   : "http://localhost:3001/api/trending-sets";

    const apiUrl = "/api/trending-sets";

    const res = await fetch(apiUrl, { headers });

    if (!res.ok) {
      console.error(`Trending API error: ${res.status} ${res.statusText}`);
      // Try to get response text for better debugging
      try {
        const errorText = await res.text();
        console.error('Error response:', errorText.substring(0, 200) + '...');
      } catch (e) {
        console.error('Could not get error text');
      }
      return [];
    }

    console.log("[API RESPONSE]", res);
    const data = await res.json();
    console.log(`Trending returned ${data.length || 0} sets`);
    return data ?? [];
  } catch (error) {
    console.error("Error fetching trending sets:", error);
    return [];
  }
} 