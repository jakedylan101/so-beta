-- Migration: Search Performance Indexes
-- This script creates indexes to optimize search performance
-- Run this in Supabase SQL Editor

-- Enable pg_trgm extension for fuzzy text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ===========================================
-- SETS TABLE INDEXES
-- ===========================================

-- Basic B-tree indexes for exact matches and sorting
CREATE INDEX IF NOT EXISTS idx_sets_artist_name ON sets(artist_name);
CREATE INDEX IF NOT EXISTS idx_sets_location_name ON sets(location_name);
CREATE INDEX IF NOT EXISTS idx_sets_event_date ON sets(event_date DESC);
CREATE INDEX IF NOT EXISTS idx_sets_city ON sets(city);
CREATE INDEX IF NOT EXISTS idx_sets_country ON sets(country);
CREATE INDEX IF NOT EXISTS idx_sets_source ON sets(source);

-- Composite index for deduplication check (artist + date + city)
CREATE INDEX IF NOT EXISTS idx_sets_dedup ON sets(artist_name, event_date, city);

-- Composite index for common search patterns
CREATE INDEX IF NOT EXISTS idx_sets_artist_date ON sets(artist_name, event_date DESC);
CREATE INDEX IF NOT EXISTS idx_sets_location_date ON sets(location_name, event_date DESC);

-- GIN indexes for trigram (fuzzy) text search
-- These enable fast LIKE '%term%' and similarity searches
CREATE INDEX IF NOT EXISTS idx_sets_artist_name_trgm ON sets USING gin (artist_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_sets_location_name_trgm ON sets USING gin (location_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_sets_event_name_trgm ON sets USING gin (event_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_sets_city_trgm ON sets USING gin (city gin_trgm_ops);

-- ===========================================
-- MUSIC_ARTISTS TABLE INDEXES (if exists)
-- ===========================================

-- Index for artist name searches
CREATE INDEX IF NOT EXISTS idx_music_artists_name ON music_artists(name);
CREATE INDEX IF NOT EXISTS idx_music_artists_name_trgm ON music_artists USING gin (name gin_trgm_ops);

-- ===========================================
-- ARTIST_MAPPINGS TABLE INDEXES
-- ===========================================

-- Index for mapping lookups
CREATE INDEX IF NOT EXISTS idx_artist_mappings_name ON artist_mappings(name);
CREATE INDEX IF NOT EXISTS idx_artist_mappings_setlist_fm_id ON artist_mappings(setlist_fm_id);

-- ===========================================
-- PROFILES TABLE INDEXES
-- ===========================================

-- Index for username searches (already has UNIQUE, but add trgm for fuzzy)
CREATE INDEX IF NOT EXISTS idx_profiles_username_trgm ON profiles USING gin (username gin_trgm_ops);

-- ===========================================
-- ANALYZE TABLES
-- ===========================================

-- Update statistics for query planner
ANALYZE sets;
ANALYZE music_artists;
ANALYZE artist_mappings;
ANALYZE profiles;

-- ===========================================
-- VERIFY INDEXES WERE CREATED
-- ===========================================

-- List all indexes on the sets table
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'sets' 
ORDER BY indexname;
