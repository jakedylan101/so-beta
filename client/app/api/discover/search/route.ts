import { NextResponse } from "next/server";
import { soundcloudSearch } from "../../../../../server/providers/soundcloud";
import { youtubeSearch } from "../../../../../server/providers/youtube";
import { setlistFmSearch } from "../../../../../server/providers/setlistFm";
import type { Set } from "../../../types/set";

// Wrapper functions to convert provider-specific results to our Set type
async function searchSoundCloud(query: string): Promise<Set[]> {
  try {
    const results = await soundcloudSearch(query);
    return results.map(item => ({
      id: item.id || `sc-${Math.random().toString(36).substring(2, 9)}`,
      title: item.eventName || "",
      artist_name: item.artistName || "Unknown Artist",
      venue_name: item.venueName || "SoundCloud",
      genre: "electronic",
      cover_image: item.imageUrl || "",
      external_url: item.url || "",
      elo_rating: 1500,
      like_count: Math.floor(Math.random() * 100),
      duration: Math.floor(Math.random() * 3600) + 1800,
      source: "soundcloud",
      event_date: item.eventDate || new Date().toISOString().split("T")[0],
      inserted_at: new Date().toISOString()
    }));
  } catch (error) {
    console.error("Error searching SoundCloud:", error);
    return [];
  }
}

async function searchYouTube(query: string): Promise<Set[]> {
  try {
    const results = await youtubeSearch(query);
    return results.map(item => ({
      id: `yt-${Math.random().toString(36).substring(2, 9)}`,
      title: `${item.artistName} DJ Set`,
      artist_name: item.artistName || "Unknown Artist",
      venue_name: item.venueName || "YouTube",
      genre: "electronic",
      cover_image: item.imageUrl || "",
      external_url: item.url || "",
      elo_rating: 1500,
      like_count: Math.floor(Math.random() * 100),
      duration: Math.floor(Math.random() * 3600) + 1800,
      source: "youtube",
      event_date: item.eventDate || new Date().toISOString().split("T")[0],
      inserted_at: new Date().toISOString()
    }));
  } catch (error) {
    console.error("Error searching YouTube:", error);
    return [];
  }
}

async function searchMixcloud(query: string): Promise<Set[]> {
  try {
    const results = await setlistFmSearch(query);
    return results.map(item => ({
      id: item.id || `fm-${Math.random().toString(36).substring(2, 9)}`,
      title: `${item.artistName} at ${item.venueName}`,
      artist_name: item.artistName || "Unknown Artist",
      venue_name: item.venueName || "Unknown Venue",
      genre: "electronic",
      cover_image: item.imageUrl || "",
      external_url: item.url || "",
      elo_rating: 1500,
      like_count: Math.floor(Math.random() * 100),
      duration: Math.floor(Math.random() * 3600) + 1800,
      source: "mixcloud",
      event_date: item.eventDate || new Date().toISOString().split("T")[0],
      inserted_at: new Date().toISOString()
    }));
  } catch (error) {
    console.error("Error searching Mixcloud:", error);
    return [];
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q");

  if (!q || q.trim().length < 2) {
    return NextResponse.json({ sets: [] }, { status: 400 });
  }

  try {
    const [soundcloud, youtube, mixcloud] = await Promise.all([
      searchSoundCloud(q),
      searchYouTube(q),
      searchMixcloud(q),
    ]);

    const sets = [...soundcloud, ...youtube, ...mixcloud].filter(Boolean);
    return NextResponse.json({ sets });
  } catch (error) {
    console.error("[GET /search] error:", error);
    return NextResponse.json({ sets: [] }, { status: 500 });
  }
} 