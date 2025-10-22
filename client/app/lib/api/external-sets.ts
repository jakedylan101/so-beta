import { getSession } from "../../../src/lib/auth";

export async function fetchRecommendedSets() {
  const { data: { session } } = await getSession();
  const headers: HeadersInit = session?.access_token
    ? { Authorization: `Bearer ${session.access_token}` }
    : {};

  const res = await fetch("/api/discover/recommendations", { headers });

  if (!res.ok) {
    console.error("Failed to fetch recommended sets:", res.statusText);
    throw new Error(`API error: ${res.status}`);
  }

  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('text/html')) {
    const text = await res.text().catch(() => '<could not read html>');
    console.error('[App API] Expected JSON but got HTML. Response preview:', text.substring(0, 300));
    return [];
  }

  const data = await res.json();
  return Array.isArray(data) ? data : data?.sets ?? [];
}

export async function fetchTrendingSets() {
  const { data: { session } } = await getSession();
  const headers: HeadersInit = session?.access_token
    ? { Authorization: `Bearer ${session.access_token}` }
    : {};

  const res = await fetch("/api/discover/trending", { headers });

  if (!res.ok) {
    console.error("Failed to fetch trending sets:", res.statusText);
    throw new Error(`API error: ${res.status}`);
  }

  const data = await res.json();
  return data ?? [];
} 