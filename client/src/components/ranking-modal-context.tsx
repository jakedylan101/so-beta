import React, { useEffect, useState } from 'react';
import { useQuery } from 'react-query';
import { apiRequest } from '../services/apiRequest';

const RankingModalContext = React.createContext(null);

const RankingModalProvider = ({ children }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentSetId, setCurrentSetId] = useState(null);
  const [currentSetRating, setCurrentSetRating] = useState(null);
  const [comparisonQueue, setComparisonQueue] = useState([]);
  const [comparisonCount, setComparisonCount] = useState(0);
  const [location, setLocation] = useState('/lists');

  // Query for comparison sets
  const { data: comparisonSets = [], isLoading: isLoadingComparisonQueue, error: comparisonError } = useQuery<ComparisonSet[]>({
    queryKey: [`/api/elo/comparison-sets?setId=${currentSetId}`, currentSetRating],
    enabled: isModalOpen && !!currentSetId && !!currentSetRating,
    staleTime: 0, // Don't cache these - we need fresh data each time
    retry: 2, // Only retry twice before showing error
    onError: (error) => {
      console.error("Error loading comparison sets:", error);
      closeRankingModal();
      setLocation('/lists');
    }
  });

  // When comparison sets are loaded, update our queue
  useEffect(() => {
    if (comparisonError) {
      console.error("Error in comparison queue:", comparisonError);
      closeRankingModal();
      setLocation('/lists');
      return;
    }

    if (comparisonSets.length > 0) {
      console.log(`Loaded ${comparisonSets.length} sets with rating '${currentSetRating}' for comparison queue`);
      
      // Limit to MAX_COMPARISONS
      const limitedQueue = comparisonSets.slice(0, MAX_COMPARISONS);
      setComparisonQueue(limitedQueue);
    } else if (comparisonSets.length === 0 && !isLoadingComparisonQueue && currentSetId) {
      // If we have no comparisons and we're not loading, close the modal and redirect
      console.log("No sets to compare, skipping ranking modal");
      setTimeout(() => {
        closeRankingModal();
        setLocation('/lists');
      }, 300);
    }
  }, [comparisonSets, isLoadingComparisonQueue, currentSetId, currentSetRating, setLocation, comparisonError]);
  
  const openRankingModal = async (setId: string | number) => {
    try {
      // IMPORTANT: Check if this is the first set logged by user IMMEDIATELY
      const countResponse = await apiRequest('GET', '/api/sets/count');
      const { count } = await countResponse.json();
      
      console.log(`Set count check: user has logged ${count} sets`);
      
      if (count <= 1) {
        console.log("First set logged, skipping ranking modal and redirecting to lists");
        setLocation('/lists');
        return;
      }
      
      // Get the set details to check rating/sentiment
      const response = await apiRequest('GET', `/api/sets/${setId}`);
      const setDetails = await response.json();
      const setRating = setDetails.rating;
      
      console.log(`Set ${setId} has rating: ${setRating}`);
      
      // Count sets with the same rating
      const ratingCountResponse = await apiRequest('GET', `/api/sets/count?rating=${setRating}`);
      const { count: ratingCount } = await ratingCountResponse.json();
      
      if (ratingCount <= 1) {
        // This is the first set with this rating, so no comparisons needed
        console.log(`First set with rating '${setRating}', skipping ranking modal`);
        setLocation('/lists');
        return;
      }
      
      // Set all state together before opening modal
      setComparisonQueue([]);
      setComparisonCount(0);
      setCurrentSetId(setId);
      setCurrentSetRating(setRating);
      setIsModalOpen(true);
      
    } catch (error) {
      console.error("Error checking set details:", error);
      // Just redirect to lists page on error
      setLocation('/lists');
    }
  };

  const closeRankingModal = () => {
    setIsModalOpen(false);
    setCurrentSetId(null);
    setCurrentSetRating(null);
    setComparisonQueue([]);
    setComparisonCount(0);
  };

  return (
    <RankingModalContext.Provider value={{
      isModalOpen,
      currentSetId,
      currentSetRating,
      comparisonQueue,
      comparisonCount,
      location,
      openRankingModal,
      closeRankingModal
    }}>
      {children}
    </RankingModalContext.Provider>
  );
};

export default RankingModalProvider; 