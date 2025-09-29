import { pool } from './index';

async function createEloTables() {
  try {
    console.log('Creating Elo ranking tables...');
    
    // Create set_rankings table to track pairwise comparisons
    console.log('Creating set_rankings table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS set_rankings (
        id SERIAL PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
        winner_set_id INTEGER NOT NULL REFERENCES sets(id) ON DELETE CASCADE,
        loser_set_id INTEGER NOT NULL REFERENCES sets(id) ON DELETE CASCADE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    
    // Create set_elo_scores table to track per-user, per-set Elo scores
    console.log('Creating set_elo_scores table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS set_elo_scores (
        user_id UUID NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
        set_id INTEGER NOT NULL REFERENCES sets(id) ON DELETE CASCADE,
        elo_score INTEGER DEFAULT 1500,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        PRIMARY KEY (user_id, set_id)
      );
    `);
    
    // Create global_set_rankings table for global aggregated rankings
    console.log('Creating global_set_rankings table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS global_set_rankings (
        set_id INTEGER PRIMARY KEY REFERENCES sets(id) ON DELETE CASCADE,
        global_elo_score FLOAT NOT NULL DEFAULT 1500,
        num_rankings INTEGER DEFAULT 0,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    
    // Create indexes for better query performance
    console.log('Creating indexes...');
    
    // Index for set_rankings queries
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_set_rankings_user_id ON set_rankings(user_id);
      CREATE INDEX IF NOT EXISTS idx_set_rankings_winner_set_id ON set_rankings(winner_set_id);
      CREATE INDEX IF NOT EXISTS idx_set_rankings_loser_set_id ON set_rankings(loser_set_id);
    `);
    
    // Index for set_elo_scores queries
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_set_elo_scores_user_id ON set_elo_scores(user_id);
      CREATE INDEX IF NOT EXISTS idx_set_elo_scores_set_id ON set_elo_scores(set_id);
      CREATE INDEX IF NOT EXISTS idx_set_elo_scores_score ON set_elo_scores(elo_score);
    `);
    
    console.log('Elo tables created successfully!');
  } catch (error) {
    console.error('Error creating Elo tables:', error);
  } finally {
    await pool.end();
  }
}

// Run the function if executed directly
if (require.main === module) {
  createEloTables()
    .then(() => console.log('Done!'))
    .catch(err => console.error('Error:', err));
}

export default createEloTables; 