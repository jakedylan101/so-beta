/**
 * Calculates new Elo ratings for two players based on a match result
 * 
 * @param ratingA Current Elo rating of player A (the winner)
 * @param ratingB Current Elo rating of player B (the loser)
 * @param kFactor K-factor determines the impact of the match on the ratings (default: 32)
 * @returns Object containing the new ratings for both players
 */
export function calculateEloScores(ratingA: number, ratingB: number, kFactor: number = 32) {
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
    newRatingA,
    newRatingB
  };
}
