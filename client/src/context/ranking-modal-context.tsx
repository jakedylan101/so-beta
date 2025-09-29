import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { RankingModal } from '@/components/ranking-modal';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useLocation } from 'wouter';
import analytics from '@/services/analytics';

// Add type definitions at the top
const MAX_COMPARISONS = 5;

interface SetDetails {
  id: string | number;
  user_rating: string | null;
}

interface SetDetailsResponse {
  id: string;
  rating: string | null;
  // Add other fields that might be needed but aren't used in our current logic
}

// Update ComparisonSet interface to reflect API response
export interface ComparisonSet {
  id: string | number;
  artist: string;
  venue: string;
  event_name?: string;
  event_date: string;
  rating: string;  // This will be mapped from user_rating
  elo_score: number;
  imageUrl?: string;
}

interface RankingModalContextType {
  isModalOpen: boolean;
  comparisonCount: number;
  currentSetId: string | number | null;
  currentSetRating: string | null;
  comparisonQueue: ComparisonSet[];
  isLoadingComparisonQueue: boolean;
  openRankingModal: (setId: string | number) => void;
  closeRankingModal: () => void;
  incrementComparisonCount: () => void;
  resetComparisonCount: () => void;
}

const RankingModalContext = createContext<RankingModalContextType>({
  isModalOpen: false,
  comparisonCount: 0,
  currentSetId: null,
  currentSetRating: null,
  comparisonQueue: [],
  isLoadingComparisonQueue: false,
  openRankingModal: () => {},
  closeRankingModal: () => {},
  incrementComparisonCount: () => {},
  resetComparisonCount: () => {},
});

export const useRankingModalContext = () => useContext(RankingModalContext);

interface RankingModalProviderProps {
  children: ReactNode;
}

// Helper function to normalize ratings
const normalizeRating = (rating: string | undefined | null): string | null => {
  if (!rating) return null;
  return rating.toLowerCase().trim();
};

export function RankingModalProvider({ children }: RankingModalProviderProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [comparisonCount, setComparisonCount] = useState(0);
  const [currentSetId, setCurrentSetId] = useState<string | number | null>(null);
  const [currentSetRating, setCurrentSetRating] = useState<string | null>(null);
  const [, setLocation] = useLocation();
  const [comparisonQueue, setComparisonQueue] = useState<ComparisonSet[]>([]);
  const [completedSetIds, setCompletedSetIds] = useState<Set<string>>(new Set());
  
  const resetComparisonCount = useCallback(() => {
    console.log('[RankingModal] Resetting comparison count');
    setComparisonCount(0);
    setCompletedSetIds(new Set()); // Reset completed sets when resetting count
  }, []);
  
  const closeRankingModal = useCallback(() => {
    console.log('[RankingModal] Closing modal and cleaning up state');
    setIsModalOpen(false);
    resetComparisonCount();
    setComparisonQueue([]);
    setCurrentSetId(null);
    setCurrentSetRating(null);
    setCompletedSetIds(new Set()); // Reset completed sets on close
  }, [resetComparisonCount]);
  
  // Memoized query function with rating mapping
  const fetchComparisonSets = useCallback(async () => {
    if (!currentSetId) throw new Error('No set ID provided');
    console.log(`[RankingModal] Fetching comparison sets for setId=${currentSetId}, rating=${currentSetRating}`);
    try {
      const result = await apiRequest<Array<{ user_rating: string } & Omit<ComparisonSet, 'rating'>>>(`/api/elo/comparison-sets?setId=${currentSetId}`);
      
      // Map user_rating to rating for each set
      const mappedSets = result?.map(set => ({
        ...set,
        rating: set.user_rating
      }));

      console.log('[RankingModal] Comparison sets:', {
        total: mappedSets?.length || 0,
        ratings: mappedSets?.map(s => s.rating),
        ids: mappedSets?.map(s => s.id)
      });
      
      return mappedSets;
    } catch (error) {
      console.error('[RankingModal] Error fetching comparison sets:', error);
      analytics.trackEvent({
        eventName: 'ranking_modal_error',
        properties: {
          type: 'fetch_error',
          setId: currentSetId,
          error: String(error)
        }
      });
      throw error;
    }
  }, [currentSetId, currentSetRating]);
  
  // Fixed query implementation with proper types and queryFn
  const { data: comparisonSets = [], isLoading: isLoadingComparisonQueue, error: comparisonError } = useQuery<ComparisonSet[]>({
    queryKey: [`/api/elo/comparison-sets?setId=${currentSetId}`, currentSetRating],
    queryFn: fetchComparisonSets,
    enabled: isModalOpen && !!currentSetId && !!currentSetRating,
    staleTime: 0,
    retry: 2,
    refetchOnWindowFocus: false
  });

  // Effect 1: Handle errors and loading state
  useEffect(() => {
    if (!isModalOpen) return;

    console.log('[RankingModal] Queue state changed:', {
      setsCount: comparisonSets?.length || 0,
      isLoading: isLoadingComparisonQueue,
      hasError: !!comparisonError,
      modalOpen: isModalOpen,
      currentSetId,
      currentRating: currentSetRating
    });

    if (comparisonError) {
      console.error('[RankingModal] Error in comparison queue:', comparisonError);
      analytics.trackEvent({
        eventName: 'ranking_modal_error',
        properties: {
          type: 'queue_error',
          error: String(comparisonError)
        }
      });
      closeRankingModal();
    }
  }, [comparisonError, isModalOpen, currentSetId, currentSetRating, isLoadingComparisonQueue, comparisonSets?.length]);

  // Update comparisonQueue when query data changes
  useEffect(() => {
    if (comparisonSets?.length) {
      // Deduplicate sets and filter out any already completed
      const uniqueComparisonSets = comparisonSets.filter(
        (set, index, self) => 
          // Ensure unique IDs
          index === self.findIndex(s => s.id === set.id) &&
          // Filter out completed sets
          !completedSetIds.has(String(set.id))
      );

      console.log('[RankingModal] Setting comparison queue:', {
        originalLength: comparisonSets.length,
        uniqueLength: uniqueComparisonSets.length,
        completedSets: Array.from(completedSetIds)
      });

      setComparisonQueue(uniqueComparisonSets);
    }
  }, [comparisonSets, completedSetIds]);
  
  // Memoized modal open function  
  const openRankingModal = useCallback(async (setId: string | number) => {
    try {
      console.log('[RankingModal] Starting modal open sequence:', { setId });
      const countResponse = await apiRequest<{ count: number }>('/api/sets/count');
      console.log('[RankingModal] Total sets count:', countResponse?.count);

      if (countResponse.count <= 1) {
        console.log('[RankingModal] Not enough sets for comparison, redirecting');
        setLocation('/lists');
        return;
      }

      console.log('[RankingModal] Attempting to fetch set details:', { setId });
      const setDetails = await apiRequest<SetDetails>(`/api/sets/${setId}`);
      console.log('[RankingModal] Raw API response:', setDetails);

      if (!setDetails?.user_rating) {
        console.warn('[RankingModal] No rating found in set details:', setDetails);
        setLocation('/lists');
        return;
      }

      const rating = setDetails.user_rating;
      setCurrentSetRating(normalizeRating(rating));

      console.log('[RankingModal] Set details loaded:', {
        setId,
        rating,
        rawResponse: setDetails
      });

      const ratingCount = await apiRequest<{ count: number }>(`/api/sets/count?rating=${rating}`);
      console.log('[RankingModal] Sets with same rating:', ratingCount?.count);

      if (ratingCount.count <= 1) {
        console.log('[RankingModal] Not enough sets with same rating, redirecting');
        setLocation('/lists');
        return;
      }

      setComparisonQueue([]);
      setCurrentSetId(setId);
      setIsModalOpen(true);

    } catch (error) {
      console.error('[RankingModal] Error opening modal:', error);
      analytics.trackEvent({
        eventName: 'ranking_modal_error',
        properties: {
          type: 'open_error',
          setId,
          error: String(error)
        }
      });
      setLocation('/lists');
    }
  }, [setLocation]);
  
  const incrementComparisonCount = useCallback(() => {
    setComparisonCount(prev => {
      const nextCount = prev + 1;
      console.log('[RankingModal] Incrementing comparison count:', {
        current: prev,
        next: nextCount,
        queueLength: comparisonQueue.length,
        maxComparisons: MAX_COMPARISONS
      });

      // Get the current comparison set based on the current count
      const currentSet = comparisonQueue[prev];
      
      // Add current set to completed sets if it exists
      if (currentSet?.id) {
        setCompletedSetIds(completed => new Set([...completed, String(currentSet.id)]));
        console.log(`[RankingModal] Added set ${currentSet.id} to completed sets`);
      }

      // Only close if we've reached MAX_COMPARISONS (regardless of queue length)
      // This ensures we always do exactly MAX_COMPARISONS comparisons when possible
      if (nextCount >= MAX_COMPARISONS) {
        console.log('[RankingModal] Reached max comparisons, closing and redirecting');
        closeRankingModal();
        setLocation('/lists');
        return 0; // Reset count
      }
      
      // If we've run out of sets in the queue, close the modal
      if (nextCount >= comparisonQueue.length) {
        console.log('[RankingModal] Reached end of queue, closing and redirecting');
        closeRankingModal();
        setLocation('/lists');
        return 0; // Reset count
      }

      return nextCount;
    });
  }, [comparisonQueue, closeRankingModal, setLocation]);
  
  return (
    <RankingModalContext.Provider
      value={{
        isModalOpen,
        comparisonCount,
        currentSetId,
        currentSetRating,
        comparisonQueue,
        isLoadingComparisonQueue,
        openRankingModal,
        closeRankingModal,
        incrementComparisonCount,
        resetComparisonCount,
      }}
    >
      {children}
      {isModalOpen && currentSetId && (
        <RankingModal 
          isOpen={isModalOpen} 
          onClose={closeRankingModal}
          setId={currentSetId}
          comparisonQueue={comparisonQueue}
          isLoadingQueue={isLoadingComparisonQueue}
        />
      )}
    </RankingModalContext.Provider>
  );
}
