import { db } from './index';
import * as schema from '../shared/schema';

async function createTables() {
  try {
    console.log('Creating tables...');
    
    // Create profiles table matching Supabase schema
    console.log('Creating profiles table...');
    await db.execute(`
      CREATE TABLE IF NOT EXISTS profiles (
        id UUID PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        full_name TEXT,
        avatar_url TEXT,
        website TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    
    // Create music_artists table
    console.log('Creating music_artists table...');
    await db.execute(`
      CREATE TABLE IF NOT EXISTS music_artists (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name TEXT NOT NULL,
        genres TEXT[],
        image_url TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    
    // Create artist_mappings table
    console.log('Creating artist_mappings table...');
    await db.execute(`
      CREATE TABLE IF NOT EXISTS artist_mappings (
        id SERIAL PRIMARY KEY,
        setlist_fm_id TEXT UNIQUE,
        spotify_artist_id UUID REFERENCES music_artists(id),
        name TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    
    // Create sets table
    console.log('Creating sets table...');
    await db.execute(`
      CREATE TABLE IF NOT EXISTS sets (
        id SERIAL PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        artist TEXT NOT NULL,
        venue TEXT NOT NULL,
        event_name TEXT,
        event_date TEXT NOT NULL,
        experience_date TEXT NOT NULL,
        rating TEXT NOT NULL,
        friends_tags TEXT,
        notes TEXT,
        media_urls TEXT,
        elo_score INTEGER DEFAULT 1500,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    
    // Create comparisons table
    console.log('Creating comparisons table...');
    await db.execute(`
      CREATE TABLE IF NOT EXISTS comparisons (
        id SERIAL PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        set_a_id INTEGER NOT NULL REFERENCES sets(id) ON DELETE CASCADE,
        set_b_id INTEGER NOT NULL REFERENCES sets(id) ON DELETE CASCADE,
        winner_set_id INTEGER NOT NULL REFERENCES sets(id) ON DELETE CASCADE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    
    // Create set_rankings table
    console.log('Creating set_rankings table...');
    await db.execute(`
      CREATE TABLE IF NOT EXISTS set_rankings (
        id SERIAL PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        set_logged_id INTEGER NOT NULL REFERENCES sets(id) ON DELETE CASCADE,
        set_compared_id INTEGER NOT NULL REFERENCES sets(id) ON DELETE CASCADE,
        winner_set_id INTEGER NOT NULL REFERENCES sets(id) ON DELETE CASCADE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(user_id, set_logged_id, set_compared_id)
      );
    `);
    
    // Create set_likes table
    console.log('Creating set_likes table...');
    await db.execute(`
      CREATE TABLE IF NOT EXISTS set_likes (
        id SERIAL PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        set_id INTEGER NOT NULL REFERENCES sets(id) ON DELETE CASCADE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(user_id, set_id)
      );
    `);
    
    // Create friends table
    console.log('Creating friends table...');
    await db.execute(`
      CREATE TABLE IF NOT EXISTS friends (
        id SERIAL PRIMARY KEY,
        requester_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        receiver_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(requester_id, receiver_id)
      );
    `);
    
    console.log('All tables created successfully!');
  } catch (error) {
    console.error('Error creating tables:', error);
  } finally {
    process.exit(0);
  }
}

// Create the UUID extension first
db.execute(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`)
  .then(() => {
    console.log('UUID extension created');
    createTables();
  })
  .catch(error => {
    console.error('Error creating UUID extension:', error);
    process.exit(1);
  });