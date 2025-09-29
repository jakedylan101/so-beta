import { pgTable, text, serial, integer, timestamp, date, boolean, uuid, jsonb, primaryKey } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Supabase Auth Users table reference (managed by Supabase Auth)
// We'll use a simplified reference since we access this through Supabase Auth API
export const auth_users = pgTable("users", {
  id: uuid("id").primaryKey(),
  email: text("email").unique(),
  created_at: timestamp("created_at", { withTimezone: true })
});

// Profiles table (this maps to public.profiles from Supabase)
export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey().references(() => auth_users.id), // References auth.users
  username: text("username").unique(),
  full_name: text("full_name"),
  // Add genre preferences as JSONB
  genre_preferences: jsonb("genre_preferences"), // Array of genre IDs the user likes
  onboarded: boolean("onboarded").default(false), // Flag to track if user has completed onboarding
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow()
});

// Music artists table
export const music_artists = pgTable("music_artists", {
  id: uuid("id").primaryKey().defaultRandom(), // UUID for Spotify artist ID
  name: text("name").notNull(),
  image_url: text("image_url"),
  genres: jsonb("genres"), // Array of genres
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow()
});

// Artist Mappings table - mapping Spotify artists to external IDs
export const artist_mappings = pgTable("artist_mappings", {
  id: serial("id").primaryKey(),
  spotify_artist_id: uuid("spotify_artist_id").references(() => music_artists.id),
  setlist_fm_id: text("setlist_fm_id"),
  name: text("name").notNull(),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow()
});

// Sets table - records of live music sets
export const sets = pgTable("sets", {
  id: serial("id").primaryKey(), // Using serial type to match database
  // Both fields exist in the database for compatibility 
  user_id: uuid("user_id").notNull().references(() => auth_users.id),  // References users table
  created_by: uuid("created_by").notNull().references(() => profiles.id), // References profiles table
  artist_name: text("artist_name").notNull(),
  location_name: text("location_name").notNull(),
  event_name: text("event_name"),
  event_date: date("event_date").notNull(),
  listened_date: date("listened_date").notNull(),
  rating: text("rating").notNull(), // 'liked', 'neutral', 'disliked'
  tagged_friends: jsonb("tagged_friends"),
  notes: text("notes"),
  media_urls: jsonb("media_urls"), // Array of media URLs
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
  elo_rating: integer("elo_rating").default(1500),
  setlist_fm_id: text("setlist_fm_id"),
  spotify_artist_id: uuid("spotify_artist_id"),
  city: text("city"),
  country: text("country")
});

// Comparisons table - records of Elo matchups
export const comparisons = pgTable("comparisons", {
  comparison_id: uuid("comparison_id").primaryKey().defaultRandom(),
  set_a_id: integer("set_a_id").notNull().references(() => sets.id),
  set_b_id: integer("set_b_id").notNull().references(() => sets.id),
  winner_set_id: integer("winner_set_id").notNull().references(() => sets.id),
  user_id: uuid("user_id").notNull().references(() => profiles.id),
  compared_at: timestamp("compared_at", { withTimezone: true }).defaultNow(),
  comparison_key: text("comparison_key"),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow()
});

// Set Rankings table - calculated or static rankings
export const set_rankings = pgTable("set_rankings", {
  id: serial("id").primaryKey(),
  user_id: uuid("user_id").notNull().references(() => profiles.id), // Leave as is - table uses user_id
  created_by: uuid("created_by").notNull().references(() => profiles.id), // Add created_by as it's in the database
  set_logged_id: integer("set_logged_id").notNull().references(() => sets.id),
  set_compared_id: integer("set_compared_id").notNull().references(() => sets.id),
  winner_set_id: integer("winner_set_id").notNull().references(() => sets.id),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow()
});

// Set Likes table - users can like/favorite sets
export const set_likes = pgTable("set_likes", {
  id: serial("id").primaryKey(),
  user_id: uuid("user_id").notNull().references(() => profiles.id),
  set_id: integer("set_id").notNull().references(() => sets.id),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow()
});

// User Liked Sets table - for external sets that aren't in our database
export const user_liked_sets = pgTable("user_liked_sets", {
  id: serial("id").primaryKey(),
  user_id: uuid("user_id").notNull().references(() => profiles.id),
  external_set_id: text("external_set_id").notNull(),
  source: text("source").notNull(), // 'soundcloud', 'mixcloud', 'youtube', etc.
  title: text("title").notNull(),
  artist_name: text("artist_name"),
  cover_image: text("cover_image"),
  external_url: text("external_url"),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow()
});

// User Saved Sets table - for external sets that aren't in our database
export const user_saved_sets = pgTable("user_saved_sets", {
  id: serial("id").primaryKey(),
  user_id: uuid("user_id").notNull().references(() => profiles.id),
  external_set_id: text("external_set_id").notNull(),
  source: text("source").notNull(), // 'soundcloud', 'mixcloud', 'youtube', etc.
  title: text("title").notNull(),
  artist_name: text("artist_name"),
  cover_image: text("cover_image"),
  external_url: text("external_url"),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow()
});

// Friends table - social connections between users
export const friends = pgTable("friends", {
  id: serial("id").primaryKey(),
  requester_id: uuid("requester_id").notNull().references(() => profiles.id),
  receiver_id: uuid("receiver_id").notNull().references(() => profiles.id),
  status: text("status").notNull().default("pending"), // "pending", "accepted", "rejected"
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow()
});

// Set Elo Scores table - track user-specific Elo ratings for sets
export const set_elo_scores = pgTable("set_elo_scores", {
  id: serial("id").primaryKey(),
  user_id: uuid("user_id").notNull().references(() => profiles.id),
  set_id: integer("set_id").notNull().references(() => sets.id),
  elo_score: integer("elo_score").default(1200),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow(),
}, (table) => {
  return {
    user_set_idx: primaryKey(table.user_id, table.set_id)
  }
});

// Global Set Rankings table - aggregate Elo scores across all users
export const global_set_rankings = pgTable("global_set_rankings", {
  set_id: integer("set_id").primaryKey().references(() => sets.id),
  global_elo_score: integer("global_elo_score").default(1200),
  rank: integer("rank"),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow()
});

// Relation definitions
export const profilesRelations = relations(profiles, ({ many }) => ({
  sets: many(sets),
  sentFriendRequests: many(friends, { relationName: "sentRequests" }),
  receivedFriendRequests: many(friends, { relationName: "receivedRequests" }),
  likes: many(set_likes),
  eloScores: many(set_elo_scores),
  likedSets: many(user_liked_sets),
  savedSets: many(user_saved_sets)
}));

export const setsRelations = relations(sets, ({ one, many }) => ({
  // Relation to profiles table through created_by
  profile: one(profiles, { fields: [sets.created_by], references: [profiles.id] }),
  // Relation to auth_users table through user_id
  authUser: one(auth_users, { fields: [sets.user_id], references: [auth_users.id] }),
  likes: many(set_likes),
  eloScores: many(set_elo_scores),
  globalRanking: one(global_set_rankings, { fields: [sets.id], references: [global_set_rankings.set_id] })
}));

export const comparisonsRelations = relations(comparisons, ({ one }) => ({
  setA: one(sets, { fields: [comparisons.set_a_id], references: [sets.id] }),
  setB: one(sets, { fields: [comparisons.set_b_id], references: [sets.id] }),
  winner: one(sets, { fields: [comparisons.winner_set_id], references: [sets.id] }),
  user: one(profiles, { fields: [comparisons.user_id], references: [profiles.id] })
}));

export const friendsRelations = relations(friends, ({ one }) => ({
  requester: one(profiles, { fields: [friends.requester_id], references: [profiles.id], relationName: "sentRequests" }),
  receiver: one(profiles, { fields: [friends.receiver_id], references: [profiles.id], relationName: "receivedRequests" })
}));

export const setLikesRelations = relations(set_likes, ({ one }) => ({
  user: one(profiles, { fields: [set_likes.user_id], references: [profiles.id] }),
  set: one(sets, { fields: [set_likes.set_id], references: [sets.id] })
}));

export const userLikedSetsRelations = relations(user_liked_sets, ({ one }) => ({
  user: one(profiles, { fields: [user_liked_sets.user_id], references: [profiles.id] })
}));

export const userSavedSetsRelations = relations(user_saved_sets, ({ one }) => ({
  user: one(profiles, { fields: [user_saved_sets.user_id], references: [profiles.id] })
}));

export const artistMappingsRelations = relations(artist_mappings, ({ one }) => ({
  artist: one(music_artists, { fields: [artist_mappings.spotify_artist_id], references: [music_artists.id] })
}));

export const setEloScoresRelations = relations(set_elo_scores, ({ one }) => ({
  user: one(profiles, { fields: [set_elo_scores.user_id], references: [profiles.id] }),
  set: one(sets, { fields: [set_elo_scores.set_id], references: [sets.id] })
}));

export const globalSetRankingsRelations = relations(global_set_rankings, ({ one }) => ({
  set: one(sets, { fields: [global_set_rankings.set_id], references: [sets.id] })
}));

// Zod schemas for validation
export const setsInsertSchema = createInsertSchema(sets, {
  artist_name: (schema) => schema.min(1, "Artist name is required"),
  location_name: (schema) => schema.min(1, "Venue is required"),
  rating: (schema) => schema.refine(val => ['liked', 'neutral', 'disliked'].includes(val), "Rating must be liked, neutral, or disliked")
});

export const comparisonsInsertSchema = createInsertSchema(comparisons, {
  set_a_id: (schema) => schema.refine(val => typeof val === 'number' || Number.isInteger(Number(val)), "Set A ID must be a valid integer"),
  set_b_id: (schema) => schema.refine(val => typeof val === 'number' || Number.isInteger(Number(val)), "Set B ID must be a valid integer"),
  winner_set_id: (schema) => schema.refine(val => typeof val === 'number' || Number.isInteger(Number(val)), "Winner Set ID must be a valid integer"),
  user_id: (schema) => schema.refine(val => typeof val === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val), "User ID must be a valid UUID")
});

export const friendsInsertSchema = createInsertSchema(friends, {
  requester_id: (schema) => schema.uuid("Requester ID must be a valid UUID"),
  receiver_id: (schema) => schema.uuid("Receiver ID must be a valid UUID"),
  status: (schema) => schema.refine(val => ['pending', 'accepted', 'rejected'].includes(val), "Status must be pending, accepted, or rejected")
});

export const setLikesInsertSchema = createInsertSchema(set_likes, {
  user_id: (schema) => schema.refine(val => typeof val === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val), "User ID must be a valid UUID"),
  set_id: (schema) => schema.refine(val => typeof val === 'number' || Number.isInteger(Number(val)), "Set ID must be a valid integer")
});

export const setEloScoresInsertSchema = createInsertSchema(set_elo_scores, {
  user_id: (schema) => schema.uuid("User ID must be a valid UUID"),
  set_id: (schema) => schema.refine(val => typeof val === 'number' || Number.isInteger(Number(val)), "Set ID must be a valid integer"),
  elo_score: (schema) => schema.int("Elo score must be an integer")
});

export const globalSetRankingsInsertSchema = createInsertSchema(global_set_rankings, {
  set_id: (schema) => schema.refine(val => typeof val === 'number' || Number.isInteger(Number(val)), "Set ID must be a valid integer"),
  global_elo_score: (schema) => schema.int("Global Elo score must be an integer")
});

// Export types
export type Profile = typeof profiles.$inferSelect;
export type Set = typeof sets.$inferSelect & {
  image_url?: string;
  duration_minutes?: number;
  likes_count?: number;
};
export type SetInsert = z.infer<typeof setsInsertSchema>;
export type Comparison = typeof comparisons.$inferSelect;
export type ComparisonInsert = z.infer<typeof comparisonsInsertSchema>;
export type Friend = typeof friends.$inferSelect;
export type FriendInsert = z.infer<typeof friendsInsertSchema>;
export type SetLike = typeof set_likes.$inferSelect;
export type SetLikeInsert = z.infer<typeof setLikesInsertSchema>;
export type UserLikedSet = typeof user_liked_sets.$inferSelect;
export type UserSavedSet = typeof user_saved_sets.$inferSelect;
export type MusicArtist = typeof music_artists.$inferSelect;
export type ArtistMapping = typeof artist_mappings.$inferSelect;
export type SetEloScore = typeof set_elo_scores.$inferSelect;
export type SetEloScoreInsert = z.infer<typeof setEloScoresInsertSchema>;
export type GlobalSetRanking = typeof global_set_rankings.$inferSelect;
export type GlobalSetRankingInsert = z.infer<typeof globalSetRankingsInsertSchema>;