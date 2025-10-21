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

    const apiUrl = "http://localhost:3001/api/search?q=" + encodeURIComponent(query);
    
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
    // const apiUrl = import.meta.env.PROD 
    //   ? "/api/discover/recommendations"
    //   : "http://localhost:3001/api/recommendations";

    const apiUrl = "http://localhost:3001/api/recommendations";
      
    const res = await fetch(apiUrl, { headers });

    console.log("[RECOMMENDED API RESPONSE]", res);

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

    const data = await res.json();
    console.log(`Recommendations returned ${data.length || 0} sets`);
    return data ?? [];
  } catch (error) {
    console.error("Error fetching recommended sets:", error);
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

    const apiUrl = "http://localhost:3001/api/trending-sets";
      
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