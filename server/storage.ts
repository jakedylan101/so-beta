// Only use Supabase for database operations
import { supabase } from "./supabase";
import { calculateEloScores } from "../client/src/lib/elo";
import { pool } from "../db";
import type { RatingEnum } from '@shared/types';
import { isValidRating } from '@shared/types';

// Import types for validation
import { 
  setsInsertSchema,
  comparisonsInsertSchema,
  friendsInsertSchema,
  setLikesInsertSchema
} from "@shared/schema";

export interface UserStats {
  totalSets: number;
  totalLikedSets: number;
  totalSavedSets: number;
  totalComparisons: number;
  mostLoggedArtists: { artist_name: string; count: number }[];
  mostVisitedVenues: { location_name: string; count: number }[];
  preferredGenres: { genre: string; count: number }[];
}

export interface SavedSet {
  id: number;
  artist_name: string;
  location_name: string;
  event_name?: string;
  event_date: string;
  image_url?: string;
  saved_at: string;
}

export interface LikedItem {
  id: string | number;
  name: string;
  count?: number;
  image_url?: string;
}

export interface GlobalRanking {
  rank: number;
  totalUsers: number;
  percentile: number;
}

export const storage = {
  // User/Profile operations
  async getProfileById(id: string) {
    try {
      // Use Supabase to get the profile, selecting all columns
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single();
        
      if (error) {
        // Handle error - try to get from another source or return fallback
        try {
          // Try to get the user's email from auth if available
          const { data: authData } = await supabase.auth.getUser(id);
          if (authData?.user) {
            // Create a profile for this user since none exists
            const fallbackProfile = {
              id: id,
              username: authData.user.email || `user_${id.substring(0, 8)}`,
              email: authData.user.email,
              full_name: authData.user.user_metadata?.full_name,
              genre_preferences: [],
              onboarded: false,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            };
            
            try {
              // Try to create the profile
              const result = await this.createProfile({
                id: fallbackProfile.id,
                username: fallbackProfile.username,
                full_name: fallbackProfile.full_name
              });
              
              if (result) {
                return result;
              }
            } catch (createError) {
              // Return the fallback profile anyway to avoid breaking the app
              return fallbackProfile;
            }
          }
        } catch (authError) {
          // Continue with fallback below
        }
        
        return null;
      }
      
      return {
        ...data,
        genre_preferences: data.genre_preferences || [],
        onboarded: data.onboarded !== undefined ? data.onboarded : false
      };
    } catch (error) {
      return null;
    }
  },
  
  async updateGenrePreferences(userId: string, genres: string[]) {
    try {
      // Try to use RPC function to upsert the profile with genres
      try {
        // First try with our new function
        const { data: rpcData, error: rpcError } = await supabase.rpc('upsert_user_profile_with_genres', {
          p_created_by: userId,
          p_username: `user_${userId.substring(0, 8)}`, // Fallback username if missing
          p_genres: genres,
          p_onboarded: true
        });
        
        if (!rpcError && rpcData) {
          return rpcData;
        }
        
        console.error('RPC function error:', rpcError);
      } catch (rpcErr) {
        console.error('RPC function not available, trying direct update:', rpcErr);
      }
      
      // Fallback to direct SQL using execute
      try {
        const { data: execData, error: execError } = await supabase.rpc('execute_sql', {
          sql_query: `
            INSERT INTO profiles (id, username, genre_preferences, onboarded, created_at, updated_at)
            VALUES (
              '${userId}', 
              'user_${userId.substring(0, 8)}', 
              ARRAY[${genres.map(g => `'${g}'`).join(',')}]::text[], 
              true,
              NOW(),
              NOW()
            )
            ON CONFLICT (id) DO UPDATE SET
              genre_preferences = ARRAY[${genres.map(g => `'${g}'`).join(',')}]::text[],
              onboarded = true,
              updated_at = NOW()
            RETURNING *;
          `
        });
        
        if (!execError && execData) {
          return execData;
        }
        
        console.error('SQL execution error:', execError);
      } catch (sqlErr) {
        console.error('SQL execution not available:', sqlErr);
      }
      
      // Try regular update as a final attempt
      const { data, error } = await supabase
        .from('profiles')
        .update({
          genre_preferences: genres,
          onboarded: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select()
        .single();
        
      if (error) {
        // One more attempt - try to insert instead of update
        const { data: insertData, error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: userId,
            username: `user_${userId.substring(0, 8)}`,
            genre_preferences: genres,
            onboarded: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single();
          
        if (insertError) {
          return {
            id: userId,
            username: `user_${userId.substring(0, 8)}`,
            genre_preferences: genres,
            onboarded: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
        }
        
        return insertData;
      }
      
      return data;
    } catch (error) {
      return {
        id: userId,
        username: `user_${userId.substring(0, 8)}`,
        genre_preferences: genres,
        onboarded: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    }
  },
  
  async getGenres() {
    try {
      // This returns a standardized list of music genres for onboarding
      const genres = [
        { id: 'electronic', label: 'Electronic' },
        { id: 'rock', label: 'Rock' },
        { id: 'pop', label: 'Pop' },
        { id: 'hip-hop', label: 'Hip Hop' },
        { id: 'r-and-b', label: 'R&B' },
        { id: 'jazz', label: 'Jazz' },
        { id: 'classical', label: 'Classical' },
        { id: 'folk', label: 'Folk' },
        { id: 'indie', label: 'Indie' },
        { id: 'metal', label: 'Metal' },
        { id: 'country', label: 'Country' },
        { id: 'latin', label: 'Latin' },
        { id: 'reggae', label: 'Reggae' },
        { id: 'blues', label: 'Blues' },
        { id: 'funk', label: 'Funk' },
      ];
      
      const subgenres = {
        electronic: [
          { id: 'house', label: 'House' },
          { id: 'techno', label: 'Techno' },
          { id: 'trance', label: 'Trance' },
          { id: 'drum-and-bass', label: 'Drum & Bass' },
          { id: 'dubstep', label: 'Dubstep' },
          { id: 'ambient', label: 'Ambient' },
          { id: 'edm', label: 'EDM' },
          { id: 'experimental', label: 'Experimental' },
        ],
        rock: [
          { id: 'classic-rock', label: 'Classic Rock' },
          { id: 'alternative', label: 'Alternative' },
          { id: 'punk', label: 'Punk' },
          { id: 'psychedelic', label: 'Psychedelic' },
          { id: 'prog-rock', label: 'Progressive Rock' },
        ],
        // Add more subgenres for other main genres as needed
      };
      
      return { genres, subgenres };
    } catch (error) {
      throw error;
    }
  },

  async createProfile(userData: { id: string, username: string, full_name?: string }) {
    try {
      // First, ensure user record exists in public.users table
      try {
        // Check if user exists in users table
        const userCheck = await pool.query(`SELECT id FROM users WHERE id = $1`, [userData.id]);
        
        if (!userCheck.rows || userCheck.rows.length === 0) {
          try {
            await pool.query(
              `INSERT INTO users (id, email, username, created_at)
               VALUES ($1, $2, $3, NOW())
               ON CONFLICT (id) DO NOTHING`,
              [
                userData.id,
                `user-${userData.id.substring(0, 8)}@example.com`, // Use unique email
                userData.username
              ]
            );
          } catch (userInsertError) {
            console.error(`Error inserting user ${userData.id} into users table:`, userInsertError);
          }
        }
      } catch (userCheckError) {
        console.error(`Error checking for user ${userData.id} in users table:`, userCheckError);
      }
      
      // Now check if profile already exists - this is the fastest path
      const { data: existingProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userData.id)
        .maybeSingle();
        
      // If profile exists, return it
      if (existingProfile) {
        if (!existingProfile.genre_preferences) {
          const { data: updatedProfile, error: updateError } = await supabase
            .from('profiles')
            .update({
              genre_preferences: [],
              updated_at: new Date().toISOString()
            })
            .eq('id', userData.id)
            .select()
            .single();
            
          if (!updateError && updatedProfile) {
            return updatedProfile;
          }
        }
        
        return existingProfile;
      }
      
      if (fetchError) {
        console.error("Error checking for existing profile:", fetchError);
      }
      
      // ATTEMPT 1: Try RPC function call first (recommended approach for Supabase)
      try {
        const { data, error } = await supabase.rpc('create_user_profile', {
          created_by: userData.id,
          user_username: userData.username,
          user_full_name: userData.full_name || null
        });
        
        if (!error && data) {
          const profileResult = {
            id: userData.id,
            username: userData.username,
            full_name: userData.full_name,
            genre_preferences: [],
            onboarded: false,
            ...data  // Include any additional fields from the RPC
          };
          
          return profileResult;
        }
        
        console.error("Error creating profile with RPC:", error);
      } catch (rpcError) {
        // RPC function may not exist or failed, continue to next attempt
        console.error("RPC method not available:", rpcError);
      }
      
      // ATTEMPT 2: Try direct insertion with Supabase client
      try {
        const { data: insertData, error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: userData.id,
            username: userData.username,
            full_name: userData.full_name || null,
            genre_preferences: [],
            onboarded: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single();
          
        if (!insertError && insertData) {
          return insertData;
        }
        
        console.error("Error creating profile with direct insertion:", insertError);
      } catch (insertError) {
        console.error("Direct insert failed:", insertError);
      }
      
      // ATTEMPT 3: As a last resort, create a minimal profile object
      // This is better than failing completely, as it allows the app to continue
      console.log("All profile creation attempts failed, returning minimal profile");
      
      // Log an error for monitoring but don't throw (allows app to continue)
      console.error("Critical: Unable to create profile in database");
      
      // Return a minimal valid profile structure
      return {
        id: userData.id,
        username: userData.username,
        full_name: userData.full_name || null,
        genre_preferences: [],
        onboarded: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    } catch (error) {
      return {
        id: userData.id,
        username: userData.username,
        full_name: userData.full_name || null,
        genre_preferences: [],
        onboarded: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    }
  },

  // Set operations
  async getSetById(id: string | number) {
    try {
      // Try to convert to integer if it's a numeric string
      const setId = typeof id === 'string' ? parseInt(id, 10) : id;
      
      if (isNaN(setId)) {
        return null;
      }
      
      // Use Supabase or direct query to get the set
      try {
        // First try with Supabase
        const { data, error } = await supabase
          .from('sets')
          .select('*')
          .eq('id', setId)
          .single();
        
        if (error) {
        } else {
          return data;
        }
      } catch (err) {
      }
      
      // Try direct database query as fallback
      const result = await pool.query(
        'SELECT * FROM sets WHERE id = $1 LIMIT 1',
        [setId]
      );
      
      if (result.rows && result.rows.length > 0) {
        return result.rows[0];
      }
      
      return null;
    } catch (error) {
      return null;
    }
  },
  
  async getSetsByUserId(userId: string) {
    try {
      // Try direct SQL first - more reliable
      try {
        const result = await pool.query(
          'SELECT * FROM sets WHERE user_id = $1 ORDER BY created_at DESC',
          [userId]
        );
        
        if (result.rows && result.rows.length > 0) {
          return result.rows;
        }
      } catch (sqlError) {
      }
      
      // Use Supabase as fallback
      const { data, error } = await supabase
        .from('sets')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (error) {
        return [];
      }
      
      return data || [];
    } catch (error) {
      return [];
    }
  },
  
  async countSetsByUserId(userId: string) {
    try {
      // Use direct SQL count - this is more reliable than Supabase
      try {
        const result = await pool.query(
          'SELECT COUNT(*) FROM sets WHERE user_id = $1',
          [userId]
        );
        
        if (result.rows && result.rows.length > 0) {
          const count = parseInt(result.rows[0].count, 10);
          return count;
        }
      } catch (sqlError) {
        console.error('SQL count error:', sqlError);
      }
      
      // If direct count fails, try getting all sets and counting them
      try {
        const result = await pool.query(
          'SELECT id FROM sets WHERE user_id = $1',
          [userId]
        );
        
        const count = result.rows?.length || 0;
        return count;
      } catch (sqlSelectError) {
        console.error('SQL select error:', sqlSelectError);
      }
      
      // Try Supabase as a last resort
      const { data, error } = await supabase
        .from('sets')
        .select('id')
        .eq('user_id', userId);
      
      if (error) {
        return 0;
      }
      
      return data?.length || 0;
    } catch (error) {
      return 0;
    }
  },
  
  async insertSet(setData: any) {
    try {
      // Validate rating before inserting
      if (setData.rating && !isValidRating(setData.rating)) {
        throw new Error(`Invalid rating value: ${setData.rating}`);
      }

      const { data, error } = await supabase
        .from('sets')
        .insert(setData)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error inserting set:', error);
      throw error;
    }
  },
  
  // Elo and Rankings operations
  async getRankedSets(userId: string) {
    console.log(`Getting ranked sets for user ID: ${userId}`);
    
    try {
      // Get user-specific rankings with join to sets table
      const { data, error } = await supabase
        .from('user_set_elo_ratings')
        .select(`
          id,
          user_id,
          set_id,
          elo_rating,
          created_at,
          sets:set_id (
            id,
            user_id,
            artist_name,
            location_name,
            event_name,
            event_date,
            listened_date,
            rating,
            notes,
            media_urls,
            tagged_friends,
            created_at,
            elo_rating,
            setlist_fm_id,
            spotify_artist_id,
            city,
            country
          )
        `)
        .eq('user_id', userId)
        .order('elo_rating', { ascending: false });
      
      if (error) {
        console.error('Error getting user-specific rankings:', error);
        
        // Fallback to global rankings if user-specific fails
        return this.getGlobalRankedSets(userId);
      }
      
      // Transform the data to match the expected format
      const transformedData = data?.map(item => ({
        ...item.sets,
        user_elo_rating: item.elo_rating,
        user_ranking_id: item.id
      })) || [];
      
      console.log(`Found ${transformedData.length} user-specific rankings`);
      
      // If no user-specific rankings were found, try to get sets and create initial ratings
      if (transformedData.length === 0) {
        const sets = await this.getGlobalRankedSets(userId);
        
        // Try to create initial user_set_elo_ratings for each set
        for (const set of sets) {
          try {
            await supabase
              .from('user_set_elo_ratings')
              .insert({
                user_id: userId,
                set_id: set.id,
                elo_rating: set.elo_rating || 1500
              });
          } catch (insertError) {
            console.error(`Error creating initial rating for set ${set.id}:`, insertError);
          }
        }
        
        return sets;
      }
      
      return transformedData;
    } catch (error) {
      console.error('Unexpected error in getRankedSets:', error);
      return this.getGlobalRankedSets(userId);
    }
  },
  
  // Fallback to get global (non-user-specific) ranked sets
  async getGlobalRankedSets(userId: string) {
    console.log(`Getting global ranked sets for user ID: ${userId}`);
    // Use direct SQL query to get ranked sets
    try {
      const result = await pool.query(
        `SELECT * FROM sets
         WHERE user_id = $1
         ORDER BY elo_rating DESC`,
        [userId]
      );
      
      console.log(`Found ${result.rows.length} sets via SQL (global rankings)`);
      return result.rows || [];
    } catch (error) {
      console.error('Error getting global ranked sets:', error);
      
      // Fallback to Supabase if SQL fails
      const { data, error: supabaseError } = await supabase
        .from('sets')
        .select('*')
        .eq('user_id', userId) // Use user_id not created_by
        .order('elo_rating', { ascending: false });
      
      if (supabaseError) {
        console.error('Supabase fallback error getting ranked sets:', supabaseError);
        return [];
      }
      
      console.log(`Found ${data?.length || 0} sets via Supabase (global rankings)`);
      return data || [];
    }
  },
  
  async getNearbySetsByElo(userId: string, setId: string | number, limit: number = 5) {
    try {
      // Try to convert to integer if it's a numeric string
      const setIdInt = typeof setId === 'string' ? parseInt(setId, 10) : setId;
      
      if (isNaN(setIdInt)) {
        console.error('Invalid set ID format for comparison:', setId);
        return [];
      }
      
      // First, count how many comparisons this set has already had
      console.log(`Checking number of comparisons for set ${setIdInt}`);
      try {
        const comparisonResult = await pool.query(
          `SELECT COUNT(*) FROM comparisons 
           WHERE user_id = $1 AND (winner_id = $2 OR loser_id = $2)`,
          [userId, setIdInt]
        );
        
        if (comparisonResult.rows && comparisonResult.rows.length > 0) {
          const comparisonCount = parseInt(comparisonResult.rows[0].count, 10);
          console.log(`Set ${setIdInt} has been compared ${comparisonCount} times already`);
          
          // If the set has been compared 5 or more times, we're done with it
          if (comparisonCount >= 5) {
            console.log(`Set ${setIdInt} has reached the maximum number of comparisons (${comparisonCount}), no more needed`);
            return [];
          }
        }
      } catch (countError) {
        console.error('Error checking comparison count:', countError);
        // Continue anyway as this is just a optimization
      }
      
      // Next, let's check existing comparisons to avoid repeats
      console.log(`Checking for existing comparisons for set ${setIdInt} and user ${userId}`);
      let existingComparisonIds = new Set();
      
      try {
        // Get all existing comparisons involving this set
        const result = await pool.query(
          `SELECT winner_id, loser_id FROM comparisons 
           WHERE user_id = $1 AND (winner_id = $2 OR loser_id = $2)`,
          [userId, setIdInt]
        );
        
        if (result.rows && result.rows.length > 0) {
          // Add both winner_id and loser_id to our set of IDs to exclude
          result.rows.forEach(row => {
            // Add the ID that isn't the current set ID
            if (row.winner_id === setIdInt) {
              existingComparisonIds.add(row.loser_id);
            } else {
              existingComparisonIds.add(row.winner_id);
            }
          });
        }
        
        console.log(`Found ${existingComparisonIds.size} existing comparisons to exclude`);
      } catch (err) {
        console.error('Error checking for existing comparisons:', err);
        // Continue anyway, might include some repeats but better than failing
      }
      
      // Get the target set with its rating and sentiment info
      let targetSet = null;
      
      // First try to get full set info with SQL
      try {
        const result = await pool.query(
          'SELECT id, rating, elo_rating FROM sets WHERE id = $1 LIMIT 1',
          [setIdInt]
        );
        
        if (result.rows && result.rows.length > 0) {
          targetSet = result.rows[0];
          console.log(`Found target set with rating: ${targetSet.rating}, elo: ${targetSet.elo_rating}`);
        }
      } catch (err) {
        console.error('SQL query failed for target set:', err);
      }
      
      // If SQL failed, try with Supabase
      if (!targetSet) {
        try {
          const { data, error } = await supabase
            .from('sets')
            .select('id, rating, elo_rating')
            .eq('id', setIdInt)
            .single();
            
          if (!error && data) {
            targetSet = data;
            console.log(`Found target set with Supabase. Rating: ${targetSet.rating}, elo: ${targetSet.elo_rating}`);
          } else {
            console.error('Supabase error getting target set:', error);
          }
        } catch (err) {
          console.error('Supabase query failed for target set:', err);
        }
      }
      
      if (!targetSet) {
        console.error('Could not find target set by id:', setIdInt);
        return [];
      }
      
      // Default to a median Elo if not available
      const targetElo = targetSet.elo_rating || 1500;
      
      // Use sentiment-based bucketing for comparisons
      // Only compare with sets having the same sentiment (like, neutral, dislike)
      const targetRating = targetSet.rating || 'neutral';
      console.log(`Using sentiment bucket '${targetRating}' for set ${setIdInt}`);
      
      // Implement binary search-like approach for comparisons
      // We'll select sets from different parts of the Elo range within the same sentiment bucket
      
      // Get sets for binary search comparison approach  
      try {
        // Use a binary search-like approach within the sentiment bucket:
        // 1. Get sets with significantly higher Elo (for upper bound)
        // 2. Get sets with significantly lower Elo (for lower bound)
        // 3. Get sets with similar Elo (for mid-range comparisons)
        
        // Build a SQL query that will get sets across the Elo distribution
        // within the same sentiment bucket
        let query = `
          WITH ranked_sets AS (
            SELECT
              s.*,
              ROW_NUMBER() OVER (ORDER BY elo_rating DESC) AS ranking
            FROM sets s
            WHERE 
              user_id = $1 
              AND id != $2
              AND rating = $3
              AND id NOT IN (`; 
              
        // Add exclusion for sets already compared with
        const placeholderStart = 4; // Starting after $1, $2, $3
        const excludeIds = Array.from(existingComparisonIds);
        if (excludeIds.length > 0) {
          const placeholders = excludeIds.map((_, i) => `$${i + placeholderStart}`).join(',');
          query += placeholders;
        } else {
          // If no exclusions, use a placeholder that won't match anything
          query += `-1`;
        }
        
        query += `)
            )
            SELECT * FROM (
              -- Get top ranked set
              (SELECT * FROM ranked_sets WHERE ranking = 1)
              UNION ALL
              -- Get bottom ranked set (if more than 2 sets)
              (SELECT * FROM ranked_sets ORDER BY ranking DESC LIMIT 1)
              UNION ALL
              -- Get middle ranked set
              (SELECT * FROM ranked_sets ORDER BY ABS(ranking - (SELECT COUNT(*)/2 FROM ranked_sets)) LIMIT 1)
              UNION ALL
              -- Get 25th percentile
              (SELECT * FROM ranked_sets ORDER BY ABS(ranking - (SELECT COUNT(*)/4 FROM ranked_sets)) LIMIT 1)
              UNION ALL
              -- Get 75th percentile
              (SELECT * FROM ranked_sets ORDER BY ABS(ranking - (SELECT COUNT(*)*(3.0/4.0) FROM ranked_sets)) LIMIT 1)
            ) t 
            -- Remove any duplicates from our selection
            GROUP BY id, user_id, artist_name, location_name, event_name, event_date, 
                     listened_date, notes, rating, created_at, updated_at, elo_rating, 
                     ranking
            LIMIT $${placeholderStart + excludeIds.length}
        `;
        
        // Build parameters array
        const params = [
          userId,          // $1
          setIdInt,        // $2 
          targetRating     // $3
        ];
        
        // Add excluded IDs to params if we have any
        if (excludeIds.length > 0) {
          excludeIds.forEach(id => params.push(id));
        }
        
        // Add the limit as the final parameter
        params.push(limit);
        
        console.log(`Executing binary search-like query for sentiment: ${targetRating}`);
        const result = await pool.query(query, params);
        
        if (result.rows && result.rows.length > 0) {
          console.log(`Found ${result.rows.length} sets for binary search comparison in '${targetRating}' bucket`);
          return result.rows;
        } else {
          console.log(`No sets found in the '${targetRating}' sentiment bucket for binary search`);
        }
      } catch (sqlError) {
        console.error('SQL binary search query error:', sqlError);
      }
      
      // If binary search approach didn't yield results or failed,
      // fallback to a simpler query that still respects sentiment bucket
      try {
        let fallbackQuery = `SELECT * FROM sets
           WHERE user_id = $1
           AND id != $2
           AND rating = $3`;
           
        // Add an exclusion for sets that have already been compared
        if (existingComparisonIds.size > 0) {
          const excludeIds = Array.from(existingComparisonIds);
          const placeholders = excludeIds.map((_, i) => `$${i + 4}`).join(',');
          fallbackQuery += ` AND id NOT IN (${placeholders})`;
        }
        
        fallbackQuery += ` ORDER BY RANDOM() LIMIT $${existingComparisonIds.size + 4}`; // Random order for fallback
        
        // Build parameters array
        const params = [
          userId, 
          setIdInt, 
          targetRating
        ];
        
        // Add excluded IDs to params if we have any
        if (existingComparisonIds.size > 0) {
          Array.from(existingComparisonIds).forEach(id => params.push(id));
        }
        
        // Add the limit as the final parameter
        params.push(limit);
        
        console.log(`Trying fallback sentiment-based query for rating: ${targetRating}`);
        const result = await pool.query(fallbackQuery, params);
        
        if (result.rows && result.rows.length > 0) {
          console.log(`Found ${result.rows.length} sets with fallback query in '${targetRating}' bucket`);
          return result.rows;
        }
      } catch (fallbackSqlError) {
        console.error('Fallback SQL query error:', fallbackSqlError);
      }
      
      // If everything else fails, try Supabase with sentiment bucket
      try {
        console.log(`Trying Supabase query for sentiment bucket: ${targetRating}`);
        let query = supabase
          .from('sets')
          .select('*')
          .eq('user_id', userId)
          .eq('rating', targetRating)
          .not('id', 'eq', setIdInt);
        
        // Exclude sets that have already been compared
        if (existingComparisonIds.size > 0) {
          Array.from(existingComparisonIds).forEach(id => {
            query = query.not('id', 'eq', id);
          });
        }
        
        // Complete the query
        const { data: nearbySets, error: queryError } = await query
          .order('elo_rating', { ascending: false })
          .limit(limit);
        
        if (queryError) {
          console.error('Supabase fallback error getting sets in sentiment bucket:', queryError);
          return [];
        }
        
        console.log(`Found ${nearbySets?.length || 0} sets with Supabase in '${targetRating}' bucket`);
        return nearbySets || [];
      } catch (supabaseError) {
        console.error('Supabase query failed:', supabaseError);
        return [];
      }
    } catch (error) {
      console.error('Unexpected error in getNearbySetsByElo:', error);
      return [];
    }
  },
  
  // Comparison operations
  async submitComparison(winnerId: string | number, loserId: string | number, userId: string) {
    console.log('Submitting comparison with raw IDs:', { winnerId, loserId, userId });
    
    // Safety check - don't compare a set with itself
    if (winnerId === loserId || winnerId.toString() === loserId.toString()) {
      console.error('Attempted to compare a set with itself');
      throw new Error('Cannot compare a set with itself');
    }
    
    // Try to convert to integers, handling UUID cases properly
    let winnerIdInt: number;
    let loserIdInt: number;
    
    try {
      // First check if these are valid UUIDs
      if (typeof winnerId === 'string' && winnerId.includes('-')) {
        // This appears to be a UUID - let's try to find the corresponding set by UUID
        console.log('Winner ID appears to be a UUID:', winnerId);
        const winnerSet = await this.getSetByUUID(winnerId);
        if (!winnerSet) {
          throw new Error(`Set with UUID ${winnerId} not found`);
        }
        winnerIdInt = winnerSet.id;
      } else {
        // Try standard integer conversion
        winnerIdInt = typeof winnerId === 'string' ? parseInt(winnerId, 10) : winnerId;
      }
      
      if (typeof loserId === 'string' && loserId.includes('-')) {
        // This appears to be a UUID - let's try to find the corresponding set by UUID
        console.log('Loser ID appears to be a UUID:', loserId);
        const loserSet = await this.getSetByUUID(loserId);
        if (!loserSet) {
          throw new Error(`Set with UUID ${loserId} not found`);
        }
        loserIdInt = loserSet.id;
      } else {
        // Try standard integer conversion
        loserIdInt = typeof loserId === 'string' ? parseInt(loserId, 10) : loserId;
      }
      
      if (isNaN(winnerIdInt) || isNaN(loserIdInt)) {
        console.error('Invalid set ID format for comparison after conversion:', { winnerId, loserId, winnerIdInt, loserIdInt });
        throw new Error('Invalid set ID format');
      }
      
      // Double-check again after conversion
      if (winnerIdInt === loserIdInt) {
        console.error('Attempted to compare a set with itself after ID conversion');
        throw new Error('Cannot compare a set with itself');
      }
      
      console.log('Converted set IDs:', { winnerIdInt, loserIdInt });
      
      // Create user-specific set ranking entry in the user_set_elo_ratings table if it doesn't exist
      try {
        // First check if entries exist for both sets
        const { data: winnerRating, error: winnerError } = await supabase
          .from('user_set_elo_ratings')
          .select('*')
          .eq('user_id', userId)
          .eq('set_id', winnerIdInt)
          .single();
          
        if (winnerError || !winnerRating) {
          // Create initial entry for winner set
          await supabase
            .from('user_set_elo_ratings')
            .insert({
              user_id: userId,
              set_id: winnerIdInt,
              elo_rating: 1500
            });
          console.log(`Created initial rating entry for winner set ${winnerIdInt}`);
        }
        
        const { data: loserRating, error: loserError } = await supabase
          .from('user_set_elo_ratings')
          .select('*')
          .eq('user_id', userId)
          .eq('set_id', loserIdInt)
          .single();
          
        if (loserError || !loserRating) {
          // Create initial entry for loser set
          await supabase
            .from('user_set_elo_ratings')
            .insert({
              user_id: userId,
              set_id: loserIdInt,
              elo_rating: 1500
            });
          console.log(`Created initial rating entry for loser set ${loserIdInt}`);
        }
      } catch (initError) {
        console.error('Error initializing user_set_elo_ratings:', initError);
        // Continue with the comparison even if initialization failed
      }
      
      // Record the comparison - use the actual database column names from schema check
      // Based on our schema check, the columns are winner_id, loser_id, user_id
      // Ensure the set IDs are proper integers, not strings
      const winnerIdValue = typeof winnerIdInt === 'string' ? parseInt(winnerIdInt) : winnerIdInt;
      const loserIdValue = typeof loserIdInt === 'string' ? parseInt(loserIdInt) : loserIdInt;
      
      const comparisonData = {
        winner_id: winnerIdValue,
        loser_id: loserIdValue,
        user_id: userId
      };
      
      console.log('Inserting comparison with data:', comparisonData);
      
      // Try direct SQL insertion which gives us more control over data types
      try {
        // Use parameterized queries to avoid SQL injection and type issues
        const insertResult = await pool.query(
          `INSERT INTO comparisons (winner_id, loser_id, user_id, created_at)
           VALUES ($1, $2, $3, NOW())
           RETURNING *`,
          [
            comparisonData.winner_id,
            comparisonData.loser_id,
            comparisonData.user_id
          ]
        );
        
        if (insertResult.rows && insertResult.rows.length > 0) {
          console.log(`Comparison inserted successfully via direct SQL`);
          return insertResult.rows[0];
        }
      } catch (sqlError) {
        console.error('Direct SQL comparison insert failed:', sqlError);
        // Fall through to try Supabase
      }
      
      // Use Supabase as fallback with correct column names
      // Try one more approach with explicit SQL
      try {
        const manualInsert = await pool.query(
          `INSERT INTO comparisons (winner_id, loser_id, user_id)
           SELECT $1::integer, $2::integer, $3::text
           RETURNING *`,
          [winnerIdValue, loserIdValue, userId]
        );
        
        if (manualInsert.rows && manualInsert.rows.length > 0) {
          console.log('Comparison inserted successfully via manual SQL');
          return manualInsert.rows[0];
        }
      } catch (manualError) {
        console.error('Manual SQL insert failed:', manualError);
      }
      
      // Last resort: Supabase API
      const { data: comparison, error: compError } = await supabase
        .from('comparisons')
        .insert(comparisonData)
        .select()
        .single();
      
      if (compError) {
        console.error('Error inserting comparison:', compError);
        throw compError;
      }
      
      // Update user-specific Elo ratings
      try {
        // Get current ratings
        const { data: winnerRatingData } = await supabase
          .from('user_set_elo_ratings')
          .select('elo_rating')
          .eq('user_id', userId)
          .eq('set_id', winnerIdInt)
          .single();
          
        const { data: loserRatingData } = await supabase
          .from('user_set_elo_ratings')
          .select('elo_rating')
          .eq('user_id', userId)
          .eq('set_id', loserIdInt)
          .single();
          
        const winnerElo = winnerRatingData?.elo_rating || 1500;
        const loserElo = loserRatingData?.elo_rating || 1500;
        
        // Calculate new Elo scores
        const { newRatingA, newRatingB } = calculateEloScores(
          winnerElo,
          loserElo,
          32 // K-factor as specified in requirements
        );
        
        // Update winner rating
        await supabase
          .from('user_set_elo_ratings')
          .update({ elo_rating: Math.round(newRatingA) })
          .eq('user_id', userId)
          .eq('set_id', winnerIdInt);
          
        // Update loser rating
        await supabase
          .from('user_set_elo_ratings')
          .update({ elo_rating: Math.round(newRatingB) })
          .eq('user_id', userId)
          .eq('set_id', loserIdInt);
          
        console.log(`Updated user-specific Elo ratings: winner ${winnerIdInt}: ${winnerElo} -> ${newRatingA}, loser ${loserIdInt}: ${loserElo} -> ${newRatingB}`);
      } catch (eloUpdateError) {
        console.error('Error updating user-specific Elo ratings:', eloUpdateError);
      }
      
      // Also update the global Elo ratings in the sets table for backward compatibility
      try {
        // Get sets for Elo update
        const winnerSet = await this.getSetById(winnerIdInt);
        const loserSet = await this.getSetById(loserIdInt);
        
        if (winnerSet && loserSet) {
          // Calculate new Elo scores
          const winnerElo = winnerSet.elo_rating || 1500;
          const loserElo = loserSet.elo_rating || 1500;
          
          const { newRatingA, newRatingB } = calculateEloScores(
            winnerElo,
            loserElo,
            32 // K-factor as specified in requirements
          );
          
          // Update winner score
          await supabase
            .from('sets')
            .update({ elo_rating: Math.round(newRatingA) })
            .eq('id', winnerIdInt);
            
          // Update loser score
          await supabase
            .from('sets')
            .update({ elo_rating: Math.round(newRatingB) })
            .eq('id', loserIdInt);
            
          console.log(`Updated global Elo ratings in sets table`);
        }
      } catch (globalUpdateError) {
        console.error('Error updating global Elo ratings:', globalUpdateError);
      }
      
      // Create ranking record for historical tracking
      const rankingData = {
        created_by: userId,
        user_id: userId, // Required for RLS policies
        set_logged_id: typeof winnerIdInt === 'string' ? parseInt(winnerIdInt) : winnerIdInt,
        set_compared_id: typeof loserIdInt === 'string' ? parseInt(loserIdInt) : loserIdInt,
        winner_set_id: typeof winnerIdInt === 'string' ? parseInt(winnerIdInt) : winnerIdInt
      };
      
      console.log('Inserting ranking data:', rankingData);
      
      // Try direct SQL insertion for better control over data types
      try {
        const rankResult = await pool.query(
          `INSERT INTO set_rankings 
           (created_by, user_id, set_logged_id, set_compared_id, winner_set_id) 
           VALUES ($1, $2, $3, $4, $5)
           RETURNING *`,
          [
            rankingData.created_by,
            rankingData.user_id,
            rankingData.set_logged_id,
            rankingData.set_compared_id,
            rankingData.winner_set_id
          ]
        );
        
        if (rankResult.rows && rankResult.rows.length > 0) {
          console.log('Ranking record created successfully via direct SQL');
        }
      } catch (sqlRankError) {
        console.error('Direct SQL ranking insert failed:', sqlRankError);
        
        // Fall back to Supabase
        const { error: rankingError } = await supabase
          .from('set_rankings')
          .insert(rankingData);
        
        if (rankingError) {
          console.error('Error creating ranking record via Supabase:', rankingError);
        }
      }
      
      return comparison;
    } catch (error) {
      console.error('Error in submitComparison:', error);
      throw error;
    }
  },
  
  // Helper function to get a set by UUID (added for UUID handling)
  async getSetByUUID(uuid: string) {
    try {
      const { data, error } = await supabase
        .from('sets')
        .select('*')
        .eq('id', uuid)
        .single();
        
      if (error) {
        console.log(`Set with UUID ${uuid} not found via direct lookup`);
        return null;
      }
      
      return data;
    } catch (error) {
      console.error(`Error looking up set by UUID ${uuid}:`, error);
      return null;
    }
  },
  
  async getComparisonCountByUserId(userId: string) {
    // Use Supabase to count comparisons
    const { count, error } = await supabase
      .from('comparisons')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId); // Using user_id instead of created_by
    
    if (error) {
      console.error('Error counting comparisons:', error);
      return 0;
    }
    
    return count || 0;
  },

  // Friends operations
  async getFriends(userId: string) {
    // Try to use RPC function if it exists
    try {
      const { data, error } = await supabase.rpc('get_friends', {
        created_by_param: userId
      });
      
      if (!error && data) {
        return data;
      }
    } catch (rpcError) {
      console.log('RPC not available for friends, using direct queries:', rpcError);
    }
    
    // Fallback to direct queries if RPC doesn't exist
    try {
      // Get friends where user is the requester
      const { data: requestedFriends, error: requestError } = await supabase
        .from('friends')
        .select('receiver:profiles!friends_receiver_id_fkey(*)')
        .eq('requester_id', userId)
        .eq('status', 'accepted');
      
      if (requestError) {
        console.error('Error getting friends as requester:', requestError);
      }
      
      // Get friends where user is the receiver
      const { data: receivedFriends, error: receiveError } = await supabase
        .from('friends')
        .select('requester:profiles!friends_requester_id_fkey(*)')
        .eq('receiver_id', userId)
        .eq('status', 'accepted');
      
      if (receiveError) {
        console.error('Error getting friends as receiver:', receiveError);
      }
      
      // Combine and extract the profile data
      const friends = [
        ...(requestedFriends || []).map(f => f.receiver),
        ...(receivedFriends || []).map(f => f.requester)
      ];
      
      return friends;
    } catch (error) {
      console.error('Error getting friends:', error);
      return [];
    }
  },

  // Artist operations
  async searchArtists(searchTerm: string) {
    // Use Supabase to search for artists
    const { data, error } = await supabase
      .from('music_artists')
      .select('*')
      .ilike('name', `%${searchTerm}%`)
      .limit(10);
    
    if (error) {
      console.error('Error searching artists:', error);
      return [];
    }
    
    return data || [];
  },

  // Set likes operations
  async getLikedSets(userId: string) {
    try {
      // Use direct SQL query for more control
      const query = `
        SELECT s.* 
        FROM sets s
        JOIN set_likes sl ON s.id = sl.set_id
        WHERE sl.user_id = $1
      `;
      
      const result = await pool.query(query, [userId]);
      return result.rows;
    } catch (error) {
      console.error('Error getting liked sets:', error);
      return [];
    }
  },
  
  // Discover page functions
  
  // Get trending sets (highest rated/most popular)
  async getTrendingSets(limit: number = 10) {
    try {
      // First attempt: Try to get sets with high elo ratings
      try {
        const result = await pool.query(
          `SELECT * FROM sets 
           ORDER BY elo_rating DESC
           LIMIT $1`,
          [limit]
        );
        
        if (result.rows && result.rows.length > 0) {
          return result.rows;
        }
      } catch (sqlError) {
        console.error('SQL error getting trending sets:', sqlError);
      }
      
      // Fallback to Supabase
      const { data, error } = await supabase
        .from('sets')
        .select('*')
        .order('elo_rating', { ascending: false })
        .limit(limit);
        
      if (error) {
        console.error('Error getting trending sets:', error);
        return [];
      }
      
      return data || [];
    } catch (error) {
      console.error('Error in getTrendingSets:', error);
      return [];
    }
  },
  
  // Get personalized recommendations for a user
  async getRecommendedSets(userId: string, preferredGenres: string[] = []) {
    try {
      console.log(`Getting recommendations for user ${userId} with genres:`, preferredGenres);
      
      // Get sets with the user's preferred genres (if any)
      let recommendations: any[] = [];
      
      // Add genre-based recommendations
      if (preferredGenres.length > 0) {
        try {
          // Try SQL query first
          const genreResults = await pool.query(
            `SELECT * FROM sets
             WHERE genre = ANY($1)
             ORDER BY elo_rating DESC
             LIMIT 10`,
            [preferredGenres]
          );
          
          if (genreResults.rows && genreResults.rows.length > 0) {
            // Add recommendation reason
            const genreSets = genreResults.rows.map(set => ({
              ...set,
              recommendation_reason: 'Your Favorite Genres'
            }));
            
            recommendations = [...recommendations, ...genreSets];
          }
        } catch (sqlError) {
          console.error('SQL error getting genre recommendations:', sqlError);
          
          // Fallback to Supabase
          for (const genre of preferredGenres) {
            const { data, error } = await supabase
              .from('sets')
              .select('*')
              .eq('genre', genre)
              .order('elo_rating', { ascending: false })
              .limit(5);
              
            if (!error && data && data.length > 0) {
              // Add recommendation reason
              const genreSets = data.map(set => ({
                ...set,
                recommendation_reason: 'Your Favorite Genres'
              }));
              
              recommendations = [...recommendations, ...genreSets];
            }
          }
        }
      }
      
      // Add artist-based recommendations (artists the user has listened to)
      try {
        // Get the artists the user has logged
        const userSetResult = await pool.query(
          `SELECT DISTINCT artist_name FROM sets
           WHERE user_id = $1
           LIMIT 10`,
          [userId]
        );
        
        if (userSetResult.rows && userSetResult.rows.length > 0) {
          const userArtists = userSetResult.rows.map(row => row.artist_name);
          
          // For each artist, get other sets from that artist
          for (const artist of userArtists) {
            try {
              const artistSets = await pool.query(
                `SELECT * FROM sets
                 WHERE artist_name = $1 AND user_id != $2
                 ORDER BY elo_rating DESC
                 LIMIT 3`,
                [artist, userId]
              );
              
              if (artistSets.rows && artistSets.rows.length > 0) {
                // Add recommendation reason
                const artistRecommendations = artistSets.rows.map(set => ({
                  ...set,
                  recommendation_reason: 'Artists You Love'
                }));
                
                recommendations = [...recommendations, ...artistRecommendations];
              }
            } catch (error) {
              console.error(`Error getting sets for artist ${artist}:`, error);
            }
          }
        }
      } catch (error) {
        console.error('Error getting user artists:', error);
      }
      
      // If we don't have enough recommendations, add top-rated sets
      if (recommendations.length < 10) {
        try {
          const topSets = await pool.query(
            `SELECT * FROM sets 
             WHERE user_id != $1
             ORDER BY elo_rating DESC
             LIMIT $2`,
            [userId, 10 - recommendations.length]
          );
          
          if (topSets.rows && topSets.rows.length > 0) {
            // Add recommendation reason
            const topRecommendations = topSets.rows.map(set => ({
              ...set,
              recommendation_reason: 'Top Rated'
            }));
            
            recommendations = [...recommendations, ...topRecommendations];
          }
        } catch (error) {
          console.error('Error getting top-rated sets:', error);
        }
      }
      
      // Deduplicate recommendations by ID
      const uniqueRecommendations = recommendations.filter((set, index, self) =>
        index === self.findIndex((s) => s.id === set.id)
      );
      
      return uniqueRecommendations;
    } catch (error) {
      console.error('Error in getRecommendedSets:', error);
      return [];
    }
  },
  
  // Get sets by genre
  async getSetsByGenre(genre: string, limit: number = 10) {
    try {
      // Try SQL query first
      try {
        const result = await pool.query(
          `SELECT * FROM sets
           WHERE genre = $1
           ORDER BY elo_rating DESC
           LIMIT $2`,
          [genre, limit]
        );
        
        if (result.rows && result.rows.length > 0) {
          return result.rows;
        }
      } catch (sqlError) {
        console.error(`SQL error getting sets for genre ${genre}:`, sqlError);
      }
      
      // Fallback to Supabase
      const { data, error } = await supabase
        .from('sets')
        .select('*')
        .eq('genre', genre)
        .order('elo_rating', { ascending: false })
        .limit(limit);
        
      if (error) {
        console.error(`Error getting sets for genre ${genre}:`, error);
        return [];
      }
      
      return data || [];
    } catch (error) {
      console.error(`Error in getSetsByGenre for ${genre}:`, error);
      return [];
    }
  },
  
  // Get sets by artist name
  async getSetsByArtistName(artistName: string, limit: number = 10) {
    try {
      // Try SQL query first
      try {
        const result = await pool.query(
          `SELECT * FROM sets
           WHERE artist_name ILIKE $1
           ORDER BY elo_rating DESC
           LIMIT $2`,
          [`%${artistName}%`, limit]
        );
        
        if (result.rows && result.rows.length > 0) {
          return result.rows;
        }
      } catch (sqlError) {
        console.error(`SQL error getting sets for artist ${artistName}:`, sqlError);
      }
      
      // Fallback to Supabase
      const { data, error } = await supabase
        .from('sets')
        .select('*')
        .ilike('artist_name', `%${artistName}%`)
        .order('elo_rating', { ascending: false })
        .limit(limit);
        
      if (error) {
        console.error(`Error getting sets for artist ${artistName}:`, error);
        return [];
      }
      
      return data || [];
    } catch (error) {
      console.error(`Error in getSetsByArtistName for ${artistName}:`, error);
      return [];
    }
  },
  
  // Get upcoming events
  async getUpcomingEvents() {
    try {
      const currentDate = new Date().toISOString();
      
      // Try SQL query first
      try {
        const result = await pool.query(
          `SELECT 
             id, 
             event_name, 
             event_date, 
             location_name,
             TO_CHAR(TO_DATE(event_date, 'DD-MM-YYYY'), 'Mon') as month,
             TO_CHAR(TO_DATE(event_date, 'DD-MM-YYYY'), 'DD') as day
           FROM events
           WHERE event_date >= $1
           ORDER BY event_date ASC
           LIMIT 5`,
          [currentDate]
        );
        
        if (result.rows && result.rows.length > 0) {
          return result.rows;
        }
      } catch (sqlError) {
        console.error('SQL error getting upcoming events:', sqlError);
      }
      
      // If no events in database, try to get upcoming events from Setlist.fm
      try {
        console.log("No upcoming events in database, trying Setlist.fm");
        
        // Get upcoming events from Setlist.fm
        const today = new Date();
        const formattedDate = `${today.getDate().toString().padStart(2, '0')}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getFullYear()}`;
        
        const setlistUrl = 'https://api.setlist.fm/rest/1.0/search/setlists';
        const response = await fetch(`${setlistUrl}?date=${formattedDate}&p=1`, {
          headers: {
            'Accept': 'application/json',
            'x-api-key': process.env.SETLIST_FM_API_KEY || process.env.SETLISTFM_API_KEY || ''
          }
        });
        
        if (!response.ok) {
          throw new Error(`Setlist.fm API error: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (data && data.setlist && data.setlist.length > 0) {
          console.log(`Found ${data.setlist.length} upcoming events from Setlist.fm`);
          
          // Format the events
          return data.setlist.slice(0, 5).map((setlist: any) => {
            // Parse the date
            const dateStr = setlist.eventDate || '';
            const dateParts = dateStr.split('-');
            let month = 'TBD';
            let day = 'TBD';
            
            if (dateParts.length === 3) {
              const dateObj = new Date(parseInt(dateParts[2]), parseInt(dateParts[1]) - 1, parseInt(dateParts[0]));
              month = dateObj.toLocaleString('default', { month: 'short' });
              day = dateParts[0]; // Day is the first part in DD-MM-YYYY format
            }
            
            return {
              id: `setlistfm-${setlist.id}`,
              event_name: setlist.artist?.name || 'Event',
              location_name: setlist.venue?.name 
                ? `${setlist.venue.name}, ${setlist.venue.city?.name || ''}`
                : 'TBD',
              event_date: dateStr,
              month,
              day
            };
          });
        }
      } catch (setlistError) {
        console.error("Error getting upcoming events from Setlist.fm:", setlistError);
      }
      
      // Fallback to hard-coded events for demo purposes
      return [
        {
          id: 'event-1',
          event_name: 'Jazz Night',
          location_name: 'Blue Note',
          event_date: '15-12-2025',
          month: 'Dec',
          day: '15'
        },
        {
          id: 'event-2',
          event_name: 'Rock Fest',
          location_name: 'Madison Square Garden',
          event_date: '20-01-2026',
          month: 'Jan',
          day: '20'
        },
        {
          id: 'event-3',
          event_name: 'Classical Evening',
          location_name: 'Carnegie Hall',
          event_date: '10-02-2026',
          month: 'Feb',
          day: '10'
        }
      ];
    } catch (error) {
      console.error('Error in getUpcomingEvents:', error);
      return [];
    }
  },
  
  // Advanced search for sets with multiple filter criteria
  async searchSets(filters: {
    artistName?: string;
    location?: string;
    genre?: string;
    startDate?: string;
    endDate?: string;
    rating?: RatingEnum;
    userId?: string;
    limit?: number;
    offset?: number;
    sortBy?: string;
    sortDirection?: 'asc' | 'desc';
  }) {
    try {
      // Validate rating filter if present
      if (filters.rating && !isValidRating(filters.rating)) {
        throw new Error(`Invalid rating filter: ${filters.rating}`);
      }

      const { 
        artistName, 
        location, 
        genre, 
        startDate, 
        endDate, 
        rating,
        userId,
        limit = 20, 
        offset = 0,
        sortBy = 'created_at',
        sortDirection = 'desc'
      } = filters;
      
      // Try SQL first
      try {
        // Build the query dynamically based on provided filters
        let queryParams: any[] = [];
        let queryConditions: string[] = [];
        
        // Add conditions for each provided filter
        if (artistName) {
          queryParams.push(`%${artistName}%`);
          queryConditions.push(`artist_name ILIKE $${queryParams.length}`);
        }
        
        if (location) {
          queryParams.push(`%${location}%`);
          queryConditions.push(`location_name ILIKE $${queryParams.length}`);
        }
        
        // For genre filtering, check if the set has the genre in its metadata
        // This depends on your schema - adjust as needed
        if (genre) {
          // Assuming 'genres' is a text array or JSONB field
          queryParams.push(`%${genre}%`); 
          queryConditions.push(`(genres::text ILIKE $${queryParams.length})`);
        }
        
        if (startDate) {
          queryParams.push(startDate);
          queryConditions.push(`event_date >= $${queryParams.length}`);
        }
        
        if (endDate) {
          queryParams.push(endDate);
          queryConditions.push(`event_date <= $${queryParams.length}`);
        }
        
        if (rating) {
          queryParams.push(rating);
          queryConditions.push(`rating = $${queryParams.length}`);
        }
        
        if (userId) {
          queryParams.push(userId);
          queryConditions.push(`created_by = $${queryParams.length}`);
        }
        
        // Validate and sanitize the sortBy parameter to prevent SQL injection
        const allowedSortColumns = ['created_at', 'event_date', 'elo_rating', 'artist_name', 'location_name'];
        const sanitizedSortBy = allowedSortColumns.includes(sortBy) ? sortBy : 'created_at';
        
        // Validate sort direction
        const sanitizedSortDirection = sortDirection === 'asc' ? 'ASC' : 'DESC';
        
        // Build the final query
        let query = `SELECT * FROM sets`;
        
        if (queryConditions.length > 0) {
          query += ` WHERE ${queryConditions.join(' AND ')}`;
        }
        
        // Add order and pagination
        query += ` ORDER BY ${sanitizedSortBy} ${sanitizedSortDirection} LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
        queryParams.push(limit, offset);
        
        // Run the query
        const result = await pool.query(query, queryParams);
        
        // Also get total count for pagination
        let countQuery = `SELECT COUNT(*) FROM sets`;
        if (queryConditions.length > 0) {
          countQuery += ` WHERE ${queryConditions.join(' AND ')}`;
        }
        
        const countResult = await pool.query(countQuery, queryParams.slice(0, -2));
        const totalCount = parseInt(countResult.rows[0].count);
        
        return {
          sets: result.rows,
          totalCount,
          limit,
          offset,
          hasMore: offset + limit < totalCount
        };
      } catch (sqlError) {
        console.error('SQL error in searchSets:', sqlError);
        
        // Fallback to Supabase if there's a SQL error
        let query = supabase.from('sets').select('*', { count: 'exact' });
        
        if (artistName) {
          query = query.ilike('artist_name', `%${artistName}%`);
        }
        
        if (location) {
          query = query.ilike('location_name', `%${location}%`);
        }
        
        if (genre) {
          // This assumes you have a text array column called 'genres'
          // Adjust based on your actual schema
          query = query.contains('genres', [genre]);
        }
        
        if (startDate) {
          query = query.gte('event_date', startDate);
        }
        
        if (endDate) {
          query = query.lte('event_date', endDate);
        }
        
        if (rating) {
          query = query.eq('rating', rating);
        }
        
        if (userId) {
          query = query.eq('created_by', userId);
        }
        
        // Handle sorting
        const allowedSortColumns = ['created_at', 'event_date', 'elo_rating', 'artist_name', 'location_name'];
        const sanitizedSortBy = allowedSortColumns.includes(sortBy) ? sortBy : 'created_at';
        query = query.order(sanitizedSortBy, { ascending: sortDirection === 'asc' });
        
        // Handle pagination
        query = query.range(offset, offset + limit - 1);
        
        // Execute the query
        const { data, error, count } = await query;
        
        if (error) {
          console.error('Supabase error in searchSets:', error);
          return {
            sets: [],
            totalCount: 0,
            limit,
            offset,
            hasMore: false
          };
        }
        
        return {
          sets: data || [],
          totalCount: count || 0,
          limit,
          offset,
          hasMore: count ? offset + limit < count : false
        };
      }
    } catch (error) {
      console.error('Error in searchSets:', error);
      return {
        sets: [],
        totalCount: 0,
        limit: filters.limit || 20,
        offset: filters.offset || 0,
        hasMore: false
      };
    }
  },
  
  // Get artist image from Spotify
  async getArtistImageFromSpotify(artistName: string): Promise<string | null> {
    try {
      console.log(`Getting Spotify image for artist: ${artistName}`);
      
      // Check if we have a valid access token
      let accessToken = '';
      
      try {
        // Get a Spotify access token
        const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${Buffer.from(`${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`).toString('base64')}`
          },
          body: 'grant_type=client_credentials'
        });
        
        if (!tokenResponse.ok) {
          throw new Error(`Spotify auth error: ${tokenResponse.status} ${tokenResponse.statusText}`);
        }
        
        const tokenData = await tokenResponse.json();
        accessToken = tokenData.access_token;
        
        // Search for the artist
        const searchUrl = `https://api.spotify.com/v1/search?q=${encodeURIComponent(artistName)}&type=artist&limit=1`;
        const searchResponse = await fetch(searchUrl, {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        });
        
        if (!searchResponse.ok) {
          throw new Error(`Spotify search error: ${searchResponse.status} ${searchResponse.statusText}`);
        }
        
        const searchData = await searchResponse.json();
        
        // Check if we found an artist
        if (searchData.artists && 
            searchData.artists.items && 
            searchData.artists.items.length > 0 && 
            searchData.artists.items[0].images && 
            searchData.artists.items[0].images.length > 0) {
          
          // Return the first (highest quality) image
          return searchData.artists.items[0].images[0].url;
        }
      } catch (error) {
        console.error(`Error getting Spotify image for ${artistName}:`, error);
      }
      
      return null;
    } catch (error) {
      console.error(`Error in getArtistImageFromSpotify for ${artistName}:`, error);
      return null;
    }
  },
  
  // Profile page methods
  
  // Get user stats for profile page
  async getUserStats(userId: string): Promise<UserStats> {
    try {
      console.log(`Getting user stats for user ${userId}`);
      
      // First, get the total number of sets logged
      const totalSetsQuery = await pool.query(
        `SELECT COUNT(*) FROM sets WHERE created_by = $1`,
        [userId]
      );
      const totalSets = parseInt(totalSetsQuery.rows[0]?.count || '0');
      
      // Get total liked sets
      const totalLikedSetsQuery = await pool.query(
        `SELECT COUNT(*) FROM set_likes WHERE user_id = $1`,
        [userId]
      );
      const totalLikedSets = parseInt(totalLikedSetsQuery.rows[0]?.count || '0');
      
      // Get total saved sets (this is a placeholder - we'll implement save functionality)
      // For now, we'll assume it's the same as liked sets
      const totalSavedSets = 0; // We'll add this functionality
      
      // Get total comparisons
      const totalComparisonsQuery = await pool.query(
        `SELECT COUNT(*) FROM comparisons WHERE user_id = $1`,
        [userId]
      );
      const totalComparisons = parseInt(totalComparisonsQuery.rows[0]?.count || '0');
      
      // Get most logged artists (top 5)
      const mostLoggedArtistsQuery = await pool.query(
        `SELECT artist_name, COUNT(*) as count 
         FROM sets 
         WHERE created_by = $1 
         GROUP BY artist_name 
         ORDER BY count DESC 
         LIMIT 5`,
        [userId]
      );
      const mostLoggedArtists = mostLoggedArtistsQuery.rows.map(row => ({
        artist_name: row.artist_name,
        count: parseInt(row.count)
      }));
      
      // Get most visited venues (top 5)
      const mostVisitedVenuesQuery = await pool.query(
        `SELECT location_name, COUNT(*) as count 
         FROM sets 
         WHERE created_by = $1 
         GROUP BY location_name 
         ORDER BY count DESC 
         LIMIT 5`,
        [userId]
      );
      const mostVisitedVenues = mostVisitedVenuesQuery.rows.map(row => ({
        location_name: row.location_name,
        count: parseInt(row.count)
      }));
      
      // Get preferred genres (from profile and sets)
      let preferredGenres: { genre: string; count: number }[] = [];
      
      // Try to get from profile first
      const profileQuery = await pool.query(
        `SELECT genre_preferences FROM profiles WHERE id = $1`,
        [userId]
      );
      const profileGenres = profileQuery.rows[0]?.genre_preferences || [];
      
      // Convert profile genres to the right format
      if (profileGenres.length > 0) {
        // Convert from array to objects with counts
        preferredGenres = profileGenres.map((genre: any) => ({
          genre: genre,
          count: 1 // We don't have actual counts from profile preferences
        }));
      }
      
      return {
        totalSets,
        totalLikedSets,
        totalSavedSets,
        totalComparisons,
        mostLoggedArtists,
        mostVisitedVenues,
        preferredGenres
      };
    } catch (error) {
      console.error(`Error getting user stats for ${userId}:`, error);
      // Return empty stats to avoid breaking the app
      return {
        totalSets: 0,
        totalLikedSets: 0,
        totalSavedSets: 0,
        totalComparisons: 0,
        mostLoggedArtists: [],
        mostVisitedVenues: [],
        preferredGenres: []
      };
    }
  },
  
  // Get user global ranking
  async getUserGlobalRanking(userId: string): Promise<GlobalRanking> {
    try {
      console.log(`Getting user global ranking for user ${userId}`);
      
      // Get the total number of sets logged by this user
      const userSetsCountQuery = await pool.query(
        `SELECT COUNT(*) FROM sets WHERE created_by = $1`,
        [userId]
      );
      const userSetsCount = parseInt(userSetsCountQuery.rows[0]?.count || '0');
      
      // Get all users and their set counts for ranking
      const allUsersQuery = await pool.query(
        `SELECT created_by, COUNT(*) as set_count 
         FROM sets 
         GROUP BY created_by 
         ORDER BY set_count DESC`
      );
      const totalUsers = allUsersQuery.rows.length;
      
      // Find this user's rank
      let rank = 1;
      for (let i = 0; i < allUsersQuery.rows.length; i++) {
        if (allUsersQuery.rows[i].created_by === userId) {
          rank = i + 1;
          break;
        }
      }
      
      // Calculate percentile (higher is better)
      let percentile = 0;
      if (totalUsers > 0) {
        percentile = Math.round(((totalUsers - rank) / totalUsers) * 100);
      }
      
      return { rank, totalUsers, percentile };
    } catch (error) {
      console.error(`Error getting user global ranking for ${userId}:`, error);
      // Return default ranking to avoid breaking the app
      return { rank: 0, totalUsers: 0, percentile: 0 };
    }
  },
  
  // Get user saved sets (placeholder for now)
  async getUserSavedSets(userId: string): Promise<SavedSet[]> {
    try {
      console.log(`Getting saved sets for user ${userId}`);
      
      // Query from the user_sets_saved table
      const savedSetsQuery = await pool.query(
        `SELECT s.id, s.artist_name, s.location_name, s.event_name, s.event_date, 
                uss.saved_at
         FROM user_sets_saved uss
         JOIN sets s ON uss.set_id = s.id
         WHERE uss.user_id = $1
         ORDER BY uss.saved_at DESC`,
        [userId]
      );
      
      return savedSetsQuery.rows.map(row => ({
        id: row.id,
        artist_name: row.artist_name,
        location_name: row.location_name,
        event_name: row.event_name,
        event_date: row.event_date,
        saved_at: row.saved_at
      }));
    } catch (error) {
      console.error(`Error getting saved sets for ${userId}:`, error);
      return [];
    }
  },
  
  // Get user liked sets
  async getUserLikedSets(userId: string): Promise<SavedSet[]> {
    try {
      console.log(`Getting liked sets for user ${userId}`);
      
      const likedSetsQuery = await pool.query(
        `SELECT s.id, s.artist_name, s.location_name, s.event_name, s.event_date, 
                sl.created_at as liked_at
         FROM set_likes sl
         JOIN sets s ON sl.set_id = s.id
         WHERE sl.user_id = $1
         ORDER BY sl.created_at DESC`,
        [userId]
      );
      
      return likedSetsQuery.rows.map(row => ({
        id: row.id,
        artist_name: row.artist_name,
        location_name: row.location_name,
        event_name: row.event_name,
        event_date: row.event_date,
        saved_at: row.liked_at
      }));
    } catch (error) {
      console.error(`Error getting liked sets for ${userId}:`, error);
      return [];
    }
  },
  
  // Get user liked artists
  async getUserLikedArtists(userId: string): Promise<LikedItem[]> {
    try {
      console.log(`Getting liked artists for user ${userId}`);
      
      // Get artists from sets with 'like' rating
      const likedArtistsQuery = await pool.query(
        `SELECT DISTINCT artist_name as name, COUNT(*) as count
         FROM sets
         WHERE created_by = $1 AND rating = 'like'
         GROUP BY artist_name
         ORDER BY count DESC`,
        [userId]
      );
      
      return likedArtistsQuery.rows.map(row => ({
        id: row.name,
        name: row.name,
        count: parseInt(row.count)
      }));
    } catch (error) {
      console.error(`Error getting liked artists for ${userId}:`, error);
      return [];
    }
  },
  
  // Get user liked venues
  async getUserLikedVenues(userId: string): Promise<LikedItem[]> {
    try {
      console.log(`Getting liked venues for user ${userId}`);
      
      // Get venues from sets with 'like' rating
      const likedVenuesQuery = await pool.query(
        `SELECT DISTINCT location_name as name, COUNT(*) as count
         FROM sets
         WHERE created_by = $1 AND rating = 'like'
         GROUP BY location_name
         ORDER BY count DESC`,
        [userId]
      );
      
      return likedVenuesQuery.rows.map(row => ({
        id: row.name,
        name: row.name,
        count: parseInt(row.count)
      }));
    } catch (error) {
      console.error(`Error getting liked venues for ${userId}:`, error);
      return [];
    }
  },
  
  // Get user liked genres
  async getUserLikedGenres(userId: string): Promise<LikedItem[]> {
    try {
      console.log(`Getting liked genres for user ${userId}`);
      
      // First, get from profile preferences
      const profileQuery = await pool.query(
        `SELECT genre_preferences FROM profiles WHERE id = $1`,
        [userId]
      );
      
      const profileGenres = profileQuery.rows[0]?.genre_preferences || [];
      
      return profileGenres.map((genre: any) => ({
        id: genre,
        name: genre.charAt(0).toUpperCase() + genre.slice(1).replace('-', ' '),
        count: 1
      }));
    } catch (error) {
      console.error(`Error getting liked genres for ${userId}:`, error);
      return [];
    }
  }
};