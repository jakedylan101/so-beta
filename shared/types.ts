export type RatingEnum = 'liked' | 'neutral' | 'disliked';

export const isValidRating = (rating: any): rating is RatingEnum =>
  ['liked', 'neutral', 'disliked'].includes(rating);

// Shared emoji mappings
export const emojiToRating: Record<string, RatingEnum> = {
  "👍": "liked",
  "😐": "neutral",
  "👎": "disliked"
};

export const ratingToEmoji: Record<RatingEnum, string> = {
  "liked": "👍",
  "neutral": "😐",
  "disliked": "👎"
}; 