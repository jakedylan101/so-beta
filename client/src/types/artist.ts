export type ArtistSearchResult = {
  artistName: string;
  eventName?: string;    // Optional; only shown in LogSetForm
  venueName: string;
  city: string;
  country: string;
  date: string;          // Raw date string in YYYY-MM-DD or API-native format
  url: string;           // Original source URL
  genres?: string[];     // Optional; stored in backend only
  source?: string;       // Source platform (soundcloud, setlist.fm, etc.)
  imageUrl?: string;     // Optional image URL
}; 