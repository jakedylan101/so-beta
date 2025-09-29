import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import { 
  profiles, sets, comparisons, set_rankings, set_likes, 
  friends, music_artists, artist_mappings,
  profilesRelations, setsRelations, comparisonsRelations,
  friendsRelations, setLikesRelations, artistMappingsRelations
} from "@shared/schema";

// This is the correct way neon config - DO NOT change this
neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Define our schema explicitly instead of importing everything
const schema = {
  profiles,
  sets,
  comparisons,
  set_rankings,
  set_likes,
  friends,
  music_artists,
  artist_mappings,
  profilesRelations,
  setsRelations,
  comparisonsRelations,
  friendsRelations,
  setLikesRelations,
  artistMappingsRelations
};

export const db = drizzle(pool, { schema });