import { db } from "./index";
import * as schema from "@shared/schema";
import { eq } from "drizzle-orm";

// Function to check if a table is empty
async function isTableEmpty(table: any) {
  try {
    const result = await db.select({ count: { count: "count" } }).from(table);
    // If there are no rows at all, consider it empty
    if (!result || result.length === 0) return true;
    
    const count = parseInt(String(result[0].count));
    return count === 0;
  } catch (error) {
    console.error('Error checking if table is empty:', error);
    return true; // Assume empty if there's an error
  }
}

// ELO algorithm implementation for calculating scores
function calculateEloScores(ratingA: number, ratingB: number, kFactor: number = 32) {
  // Calculate expected scores (probabilities)
  const expectedScoreA = 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
  const expectedScoreB = 1 / (1 + Math.pow(10, (ratingA - ratingB) / 400));
  
  // Actual scores: 1 for winner (A), 0 for loser (B)
  const actualScoreA = 1;
  const actualScoreB = 0;
  
  // Calculate new ratings
  const newRatingA = ratingA + kFactor * (actualScoreA - expectedScoreA);
  const newRatingB = ratingB + kFactor * (actualScoreB - expectedScoreB);
  
  return { 
    newRatingA: Math.round(newRatingA),
    newRatingB: Math.round(newRatingB)
  };
}

async function seedUsers() {
  // Check if users table is empty before seeding
  const isEmpty = await isTableEmpty(schema.users);
  
  if (isEmpty) {
    console.log("Seeding users...");
    
    // Create sample users - in a real app, these would be created through auth signup
    const demoUser = {
      id: "demo-user-id",
      email: "demo@soundoff.app",
      username: "DemoUser",
      avatar_url: null,
      created_at: new Date()
    };
    
    try {
      await db.insert(schema.users).values(demoUser);
      console.log("Demo user created successfully");
      return demoUser;
    } catch (error) {
      console.error("Error seeding users:", error);
      throw error;
    }
  } else {
    console.log("Users table already has data, skipping seed");
    // Return the first user for reference in other seed functions
    const existingUsers = await db.select().from(schema.users).limit(1);
    return existingUsers[0];
  }
}

async function seedSets(userId: string) {
  // Check if sets table is empty before seeding
  const isEmpty = await isTableEmpty(schema.sets);
  
  if (isEmpty) {
    console.log("Seeding sets...");
    
    const sampleSets = [
      {
        user_id: userId,
        artist: "Radiohead",
        venue: "Madison Square Garden",
        event_name: "A Moon Shaped Pool Tour",
        event_date: new Date("2016-07-27"),
        experience_date: new Date("2016-07-27"),
        rating: "liked",
        friends_tags: "Alex, Sarah",
        notes: "One of the best shows I've ever seen. They played the entire new album plus classics.",
        media_urls: JSON.stringify([]),
        created_at: new Date()
      },
      {
        user_id: userId,
        artist: "The Strokes",
        venue: "Barclays Center",
        event_name: "New Year's Eve Show",
        event_date: new Date("2019-12-31"),
        experience_date: new Date("2019-12-31"),
        rating: "neutral",
        friends_tags: "Mike, Jessica",
        notes: "Sound was a bit off, but they played all the hits.",
        media_urls: JSON.stringify([]),
        created_at: new Date()
      },
      {
        user_id: userId,
        artist: "LCD Soundsystem",
        venue: "Brooklyn Steel",
        event_name: "Residence Tour",
        event_date: new Date("2021-11-23"),
        experience_date: new Date("2021-11-23"),
        rating: "liked",
        friends_tags: "David, Emma",
        notes: "Incredible energy! James Murphy was on point all night.",
        media_urls: JSON.stringify([]),
        created_at: new Date()
      }
    ];
    
    try {
      const insertedSets = await db.insert(schema.sets).values(sampleSets).returning();
      console.log(`${insertedSets.length} sets created successfully`);
      return insertedSets;
    } catch (error) {
      console.error("Error seeding sets:", error);
      throw error;
    }
  } else {
    console.log("Sets table already has data, skipping seed");
    // Return existing sets for the user for reference in other seed functions
    const existingSets = await db.select().from(schema.sets).where(eq(schema.sets.user_id, userId));
    return existingSets;
  }
}

async function seedEloScores(userId: string, sets: any[]) {
  // Check if elo scores table is empty before seeding
  const isEmpty = await isTableEmpty(schema.set_elo_scores);
  
  if (isEmpty) {
    console.log("Seeding Elo scores...");
    
    const eloScores = sets.map(set => ({
      set_id: set.id,
      user_id: userId,
      score: 1500, // Default starting Elo score
      created_at: new Date(),
      updated_at: new Date()
    }));
    
    try {
      const insertedScores = await db.insert(schema.set_elo_scores).values(eloScores).returning();
      console.log(`${insertedScores.length} Elo scores created successfully`);
      return insertedScores;
    } catch (error) {
      console.error("Error seeding Elo scores:", error);
      throw error;
    }
  } else {
    console.log("Elo scores table already has data, skipping seed");
    return [];
  }
}

async function seedComparisons(userId: string, sets: any[]) {
  // Check if comparisons table is empty before seeding
  const isEmpty = await isTableEmpty(schema.comparisons);
  
  if (isEmpty && sets.length >= 2) {
    console.log("Seeding comparisons...");
    
    // Create sample comparisons between the sets
    const comparisons = [
      {
        winner_id: sets[0].id, // Radiohead wins
        loser_id: sets[1].id,  // against The Strokes
        user_id: userId,
        created_at: new Date()
      },
      {
        winner_id: sets[0].id, // Radiohead wins
        loser_id: sets[2].id,  // against LCD Soundsystem
        user_id: userId,
        created_at: new Date()
      },
      {
        winner_id: sets[2].id, // LCD Soundsystem wins
        loser_id: sets[1].id,  // against The Strokes
        user_id: userId,
        created_at: new Date()
      }
    ];
    
    try {
      const insertedComparisons = await db.insert(schema.comparisons).values(comparisons).returning();
      console.log(`${insertedComparisons.length} comparisons created successfully`);
      
      // Update Elo scores based on comparisons
      for (const comparison of comparisons) {
        // Get current scores
        const winnerScore = await db.query.set_elo_scores.findFirst({
          where: eq(schema.set_elo_scores.set_id, comparison.winner_id)
        });
        
        const loserScore = await db.query.set_elo_scores.findFirst({
          where: eq(schema.set_elo_scores.set_id, comparison.loser_id)
        });
        
        if (winnerScore && loserScore) {
          // Calculate new scores
          const { newRatingA, newRatingB } = calculateEloScores(
            winnerScore.score,
            loserScore.score,
            32 // K-factor
          );
          
          // Update winner score
          await db.update(schema.set_elo_scores)
            .set({ 
              score: newRatingA,
              updated_at: new Date()
            })
            .where(eq(schema.set_elo_scores.id, winnerScore.id));
            
          // Update loser score
          await db.update(schema.set_elo_scores)
            .set({ 
              score: newRatingB,
              updated_at: new Date()
            })
            .where(eq(schema.set_elo_scores.id, loserScore.id));
        }
      }
      
      console.log("Elo scores updated based on comparisons");
      return insertedComparisons;
    } catch (error) {
      console.error("Error seeding comparisons:", error);
      throw error;
    }
  } else {
    console.log("Comparisons table already has data or not enough sets, skipping seed");
    return [];
  }
}

async function seed() {
  try {
    console.log("Starting seed process...");
    
    // Seed users first
    const user = await seedUsers();
    
    if (user) {
      // Then seed sets for the user
      const sets = await seedSets(user.id);
      
      if (sets.length > 0) {
        // Then seed Elo scores for the sets
        await seedEloScores(user.id, sets);
        
        // Finally seed comparisons
        await seedComparisons(user.id, sets);
      }
    }
    
    console.log("Seed completed successfully");
  } catch (error) {
    console.error("Seed failed:", error);
  } finally {
    process.exit(0);
  }
}

seed();
