import { NextResponse } from "next/server";
import { soundcloudSearch } from "../../../../../server/providers/soundcloud";
import { youtubeSearch } from "../../../../../server/providers/youtube";
import { setlistFmSearch } from "../../../../../server/providers/setlistFm";
import type { Set } from "../../../types/set";

// Wrapper functions to convert provider-specific results to our Set type
async function getSoundCloudSets(): Promise<Set[]> {
  try {
    const results = await soundcloudSearch("electronic music");
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
    console.error("Error fetching SoundCloud sets:", error);
    return [];
  }
}

async function getYouTubeSets(): Promise<Set[]> {
  try {
    const results = await youtubeSearch("dj set");
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
    console.error("Error fetching YouTube sets:", error);
    return [];
  }
}

async function getMixcloudSets(): Promise<Set[]> {
  try {
    const results = await setlistFmSearch("dj");
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
    console.error("Error fetching Setlist.fm sets:", error);
    return [];
  }
}

export async function GET() {
  try {
    const [soundcloud, youtube, mixcloud] = await Promise.all([
      getSoundCloudSets(),
      getYouTubeSets(),
      getMixcloudSets()
    ]);

    const allSets = [...soundcloud, ...youtube, ...mixcloud];

    // Trending logic based on recency + likes
    const sorted = allSets
      .filter((set) => !!set)
      .sort((a, b) => {
        const likeScore = (b.like_count || 0) - (a.like_count || 0);
        const dateScore =
          new Date(b.inserted_at).getTime() - new Date(a.inserted_at).getTime();
        return likeScore + 0.25 * dateScore;
      })
      .slice(0, 10);

    return NextResponse.json({ sets: sorted });
  } catch (error) {
    console.error("[GET /trending] Error loading external sets:", error);
    return NextResponse.json({ sets: [] }, { status: 500 });
  }
} 