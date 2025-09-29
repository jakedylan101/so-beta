import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { useRankingModalContext } from '@/context/ranking-modal-context';
import type { ComparisonSet } from '@/context/ranking-modal-context';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { useLocation } from 'wouter';
import analytics from '@/services/analytics';

const VOTE_TIMEOUT_MS = 10000;

interface SetCardProps {
  imageUrl?: string;
  artistName: string;
  setDescription: string;
  onClick: () => void;
  isLoading?: boolean;
}

const SetCard: React.FC<SetCardProps> = ({
  imageUrl,
  artistName,
  setDescription,
  onClick,
  isLoading = false
}) => (
  <button
    className={`flex flex-col items-center w-full bg-spotify-black rounded-2xl shadow-lg p-4 transition-all border-2 
      border-transparent hover:border-spotify-green hover:scale-105 
      focus:outline-none focus:ring-4 focus:ring-spotify-green/50`}
    onClick={onClick}
    disabled={isLoading}
    tabIndex={0}
    aria-label={`Choose set by ${artistName}`}
  >
    <div className="w-28 h-28 md:w-40 md:h-40 bg-gray-800 rounded-xl overflow-hidden mb-3 flex items-center justify-center">
      {isLoading ? (
        <Loader2 className="h-8 w-8 animate-spin text-spotify-green" />
      ) : imageUrl ? (
        <img
          src={imageUrl}
          alt={artistName}
          className="w-full h-full object-cover"
        />
      ) : (
        <span className="text-gray-500 text-3xl">🎵</span>
      )}
    </div>
    <div className="text-white font-semibold text-lg text-center truncate max-w-full">
      {artistName}
    </div>
    <div className="text-spotify-light-gray text-sm text-center mt-1 line-clamp-2">
      {setDescription}
    </div>
  </button>
);

interface RankingModalProps {
  isOpen: boolean;
  onClose: () => void;
  setId: number | string;
  comparisonQueue: ComparisonSet[];
  isLoadingQueue: boolean;
}

export function RankingModal({ 
  isOpen, 
  onClose, 
  setId,
  comparisonQueue,
  isLoadingQueue
}: RankingModalProps) {
  const [comparing, setComparing] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [completedComparisonIds, setCompletedComparisonIds] = useState<(string | number)[]>([]);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [shouldRedirect, setShouldRedirect] = useState(false);
  const { comparisonCount, incrementComparisonCount, resetComparisonCount, currentSetRating } = useRankingModalContext();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  
  // Handle redirect effect
  useEffect(() => {
    if (shouldRedirect) {
      console.log('[RankingModal] Redirect triggered, navigating to /lists');
      setLocation('/lists');
      onClose();
    }
  }, [shouldRedirect, setLocation, onClose]);
  
  // Reset state when the modal opens or when the queue changes
  useEffect(() => {
    if (isOpen) {
      console.log('[RankingModal] Initializing modal state:', {
        queueLength: comparisonQueue.length,
        currentIndex: 0,
        comparisonCount,
        completedIds: []
      });
      setCurrentIndex(0);
      setComparing(false);
      setCompletedComparisonIds([]);
      setShouldRedirect(false);
    }
  }, [isOpen, comparisonQueue, comparisonCount]);

  // Synchronize current index with comparison count
  useEffect(() => {
    if (isOpen && comparisonCount > 0 && comparisonCount !== currentIndex) {
      console.log('[RankingModal] Synchronizing current index with comparison count:', {
        currentIndex,
        comparisonCount
      });
      setCurrentIndex(comparisonCount);
    }
  }, [isOpen, comparisonCount, currentIndex]);
  
  const getNewSetDetailsWithRetry = async (retries = 1, delay = 1000) => {
    setIsLoadingDetails(true);
    
    try {
      for (let attempt = 0; attempt <= retries; attempt++) {
        try {
          const response = await apiRequest<any>(`/api/sets/${setId}`);
          setNewSetDetails({
            artist: response.artist_name || 'Unknown Artist',
            description: [
              response.event_name,
              response.location_name || response.venue_name,
              response.event_date ? new Date(response.event_date).toLocaleDateString() : ''
            ].filter(Boolean).join(' • ')
          });
          return;
        } catch (error) {
          console.error(`[RankingModal] Set details fetch attempt ${attempt + 1} failed for ${setId}`, error);
          analytics.trackEvent({
            eventName: 'ranking_modal_fetch_set_error',
            properties: { 
              setId: String(setId), 
              error: String(error),
              attempt: attempt + 1
            }
          });
          
          if (attempt < retries) {
            await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, attempt)));
            continue;
          }
          throw error;
        }
      }
    } finally {
      setIsLoadingDetails(false);
    }
  };
  
  // Load new set details when modal opens
  useEffect(() => {
    if (isOpen && setId) {
      getNewSetDetailsWithRetry();
    }
  }, [isOpen, setId]);
  
  // Submit vote mutation
  const submitVoteMutation = useMutation({
    mutationFn: async ({ winnerId, loserId }: { winnerId: number | string; loserId: number | string }) => {
      console.log(`[RankingModal] Submitting vote: winner=${winnerId}, loser=${loserId}`);
      return apiRequest('/api/elo/submit-vote', {
        method: 'POST',
        body: JSON.stringify({ winner_id: winnerId, loser_id: loserId })
      });
    },
    onSuccess: (_, { winnerId, loserId }) => {
      queryClient.invalidateQueries({ queryKey: ['/api/elo/rankings'] });
      queryClient.invalidateQueries({ queryKey: [`/api/sets/${setId}`] });
      queryClient.refetchQueries({ queryKey: ['/api/elo/rankings'] });

      const currentComparisonSet = comparisonQueue[currentIndex];
      
      if (currentComparisonSet) {
        queryClient.invalidateQueries({ queryKey: [`/api/sets/${currentComparisonSet.id}`] });
        queryClient.refetchQueries({ queryKey: [`/api/sets/${currentComparisonSet.id}`] });
        
        setCompletedComparisonIds(prev => [...prev, currentComparisonSet.id]);
        
        analytics.trackEvent({
          eventName: 'ranking_vote_submitted',
          properties: {
            winnerId: String(winnerId),
            loserId: String(loserId),
            setId: String(setId),
            comparisonSetId: String(currentComparisonSet.id)
          }
        });
      }

      queryClient.invalidateQueries({ queryKey: ['/api/sets'] });
      queryClient.invalidateQueries({ queryKey: ['/api/elo'] });
      queryClient.invalidateQueries({ queryKey: ['/api/rankings'] });

      queryClient.refetchQueries({ queryKey: ['/api/sets'] });
      queryClient.refetchQueries({ queryKey: ['/api/elo/rankings'] });

      const MAX_COMPARISONS = 5;
      console.log('[RankingModal] Vote submitted successfully:', {
        currentIndex,
        queueLength: comparisonQueue.length,
        comparisonCount: comparisonCount + 1,
        maxComparisons: MAX_COMPARISONS
      });

      // Increment comparison count - this will auto-close the modal if we hit MAX_COMPARISONS
      incrementComparisonCount();

      // Reset comparing state
      setComparing(false);
    },
    onError: (error) => {
      console.error('[RankingModal] Vote submission error:', error);
      analytics.trackEvent({
        eventName: 'ranking_vote_error',
        properties: { 
          setId: String(setId),
          error: String(error)
        }
      });
      toast({
        title: 'Error',
        description: 'Failed to submit your vote. Please try again.',
        variant: 'destructive',
      });
      setComparing(false);
    }
  });
  
  // Handle selection
  const handleSetSelect = async (isSetWinner: boolean) => {
    const currentComparisonSet = comparisonQueue[currentIndex];
    if (!currentComparisonSet) return;
    
    if (currentComparisonSet.id === setId) {
      console.error('[RankingModal] Attempted to compare a set with itself');
      analytics.trackEvent({
        eventName: 'ranking_modal_error',
        properties: { 
          type: 'self_comparison',
          setId: String(setId)
        }
      });
      toast({
        title: 'Error',
        description: 'Cannot compare a set with itself.',
        variant: 'destructive',
      });
      if (currentIndex + 1 < comparisonQueue.length) {
        setCurrentIndex(prev => prev + 1);
      } else {
        onClose();
      }
      return;
    }
    
    setComparing(true);
    
    const winnerId = isSetWinner ? setId : currentComparisonSet.id;
    const loserId = isSetWinner ? currentComparisonSet.id : setId;
    
    console.log(`[RankingModal] Comparing sets: ${winnerId} vs ${loserId}`);
    
    try {
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Vote submission timed out')), VOTE_TIMEOUT_MS);
      });

      await Promise.race([
        submitVoteMutation.mutateAsync({ winnerId, loserId }),
        timeoutPromise
      ]);
      
      // The index will be managed by the comparison count in the context
      // No need to increment here as it could cause double increments
      
    } catch (error: unknown) {
      if (error instanceof Error && error.message === 'Vote submission timed out') {
        analytics.trackEvent({
          eventName: 'ranking_vote_timeout',
          properties: { 
            setId: String(setId),
            comparisonSetId: String(currentComparisonSet.id),
            timeoutMs: VOTE_TIMEOUT_MS
          }
        });
        toast({
          title: 'Timeout Error',
          description: 'Vote submission is taking too long. Please try again.',
          variant: 'destructive',
        });
      }
      setComparing(false);
    }
  };
  
  // Get current comparison set, but skip any that match the current set ID
  const getCurrentComparisonSet = () => {
    const comparisonSet = comparisonQueue[currentIndex];
    console.log('[RankingModal] Current comparison set:', {
      index: currentIndex,
      setId: comparisonSet?.id,
      rating: comparisonSet?.rating,
      completed: completedComparisonIds.includes(comparisonSet?.id || '')
    });

    // Safety check - don't compare a set with itself
    if (comparisonSet && comparisonSet.id === setId) {
      console.warn('[RankingModal] Skipping comparison with self');
      // Skip to next set if available
      if (currentIndex + 1 < comparisonQueue.length) {
        setCurrentIndex(currentIndex + 1);
        return comparisonQueue[currentIndex + 1];
      } else {
        return null;
      }
    }
    return comparisonSet;
  };
  
  const currentComparisonSet = getCurrentComparisonSet();
  
  // Format set description text
  const formatSetDescription = (set: ComparisonSet | null) => {
    if (!set) return "";
    
    const parts = [];
    if (set.event_name) parts.push(set.event_name);
    if (set.venue) parts.push(set.venue);
    
    let dateStr = "";
    try {
      if (set.event_date) {
        const date = new Date(set.event_date);
        dateStr = date.toLocaleDateString(undefined, { 
          year: 'numeric',
          month: 'short', 
          day: 'numeric' 
        });
      }
    } catch (e) {
      dateStr = set.event_date || "";
    }
    
    if (dateStr) parts.push(dateStr);
    
    return parts.join(" • ");
  };

  // Get newSet data for the left card (the new set being compared)
  const [newSetDetails, setNewSetDetails] = useState<{
    artist: string;
    description: string;
  } | null>(null);
  
  // Get total number of comparisons
  const totalComparisons = Math.min(comparisonQueue.length, 5);
  
  // Get remaining comparisons
  const remainingComparisons = totalComparisons - comparisonCount;
  
  // Add Spotify artist image queries
  const { data: newSetArtistImage } = useQuery<{
    id: string;
    name: string;
    imageUrl: string;
    popularity: number;
    genres: string[];
  }>({
    queryKey: [`/api/spotify/artist-image?name=${newSetDetails?.artist}`],
    enabled: !!newSetDetails?.artist,
  });

  const { data: comparisonSetArtistImage } = useQuery<{
    id: string;
    name: string;
    imageUrl: string;
    popularity: number;
    genres: string[];
  }>({
    queryKey: [`/api/spotify/artist-image?name=${currentComparisonSet?.artist}`],
    enabled: !!currentComparisonSet?.artist,
  });
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl bg-[#201c1c] border-spotify-light-gray sm:rounded-3xl">
        <DialogHeader>
          <DialogTitle className="text-center text-xl md:text-2xl font-bold text-white">
            Which set was better?
          </DialogTitle>
        </DialogHeader>
        
        {isLoadingQueue ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="h-12 w-12 animate-spin text-spotify-green" />
            <span className="ml-3 text-spotify-light-gray">Loading sets...</span>
          </div>
        ) : !currentComparisonSet || !newSetDetails ? (
          <div className="text-center py-8 text-spotify-light-gray">
            No more sets to compare. You're all set!
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 w-full py-4">
              {/* Left card - the newly logged set */}
              <SetCard
                imageUrl={newSetArtistImage?.imageUrl}
                artistName={newSetDetails.artist}
                setDescription={newSetDetails.description}
                onClick={() => handleSetSelect(true)}
                isLoading={comparing || isLoadingDetails}
              />
              
              {/* Right card - the set being compared */}
              <SetCard
                imageUrl={comparisonSetArtistImage?.imageUrl}
                artistName={currentComparisonSet.artist}
                setDescription={formatSetDescription(currentComparisonSet)}
                onClick={() => handleSetSelect(false)}
                isLoading={comparing}
              />
            </div>
            
            <div className="text-center text-spotify-light-gray text-sm mt-4">
              Comparison {comparisonCount + 1} of {totalComparisons} • {remainingComparisons} comparison{remainingComparisons !== 1 ? 's' : ''} left
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}