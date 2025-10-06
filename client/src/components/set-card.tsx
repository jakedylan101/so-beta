import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { Dialog } from '@/components/ui/dialog';
import { SetDetailModal } from './set-detail-modal';
import type { Set } from '@shared/schema';
import type { RatingEnum } from '@shared/types';
import { isValidRating, ratingToEmoji } from '@shared/types';
import { Loader2, Music, Calendar, Clock } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

// Helper to check if an image source is valid
const isValidImage = (src?: string) => 
  src && !src.includes('example.com') && !src.includes('undefined');

// Fallback image path
const DEFAULT_IMAGE = '/default-set-image.png';

type SetCardProps = {
  setId: string | number;
  inModal?: boolean;
  ranking?: number;
  showDateBadge?: boolean;
  displayMode?: 'ranking' | 'timeline';
  event_date?: string;
  listened_date?: string;
};

// Define the extended Set type for better type safety
type ExtendedSet = Set & { 
  eloScore?: number;
  user_elo_rating?: number;
  user_ranking_id?: number;
  user_rating?: RatingEnum;
  artist_name: string;
  location_name: string;
  event_name?: string;
  artist: string;
  venue: string;
  notes?: string;
  tagged_friends?: string[];
  media_urls?: string[];
  external_url?: string;
  source_url?: string;
};

export function SetCard({ 
  setId, 
  inModal = false, 
  ranking,
  showDateBadge = false,
  displayMode = 'ranking',
  event_date,
  listened_date
}: SetCardProps) {
  const [open, setOpen] = useState(false);
  const [imageError, setImageError] = useState(false);

  
  
  // Fetch set details
  const { data: set, isLoading } = useQuery<ExtendedSet>({
    queryKey: [`/api/sets/${setId}`],
    queryFn: async () => {
      return apiRequest<ExtendedSet>(`/api/sets/${setId}`);
    },
    enabled: !!setId
  });
  
  // Use useEffect for debugging instead of callbacks
  useEffect(() => {
    if (set) {
      console.log(`Set data for ID ${setId}:`, set);
      console.log(`Tagged friends:`, set.tagged_friends);
      console.log(`Notes:`, set.notes);
      console.log(`Media URLs:`, set.media_urls);
    }
  }, [set, setId]);
  
  // Fetch artist image from Spotify
  const { data: artistImage, isLoading: isLoadingArtistImage } = useQuery<{
    id: string;
    name: string;
    imageUrl: string;
    popularity: number;
    genres: string[];
  }>({
    queryKey: [`/api/spotify/artist-image?name=${set?.artist_name}`],
    queryFn: async () => {
      return apiRequest<any>(`/api/spotify/artist-image?name=${set?.artist_name}`);
    },
    enabled: !!set?.artist_name,
  });
  
  // Log data without causing TypeScript errors
  useEffect(() => {
    if (set) {
      console.log(`Set loaded for ID ${setId}:`, set);
    }
    if (artistImage) {
      console.log(`Artist image loaded for ${set?.artist_name}:`, artistImage);
    }
  }, [set, setId, artistImage]);
  
  const handleCardClick = () => {
    if (!inModal) {
      setOpen(true);
    }
  };
  
  // Get artist image URL or use placeholder
  const imageUrl = isValidImage(artistImage?.imageUrl) && !imageError ? artistImage?.imageUrl : DEFAULT_IMAGE;
  
  const handleImageError = () => {
    console.log('Image failed to load, using fallback');
    setImageError(true);
  };

  // Remove these handlers as they're moving to the modal
  // Handle external link click
  // const handleExternalLinkClick = (e: React.MouseEvent) => {
  //   e.stopPropagation();
  //   if (set?.external_url || set?.source_url) {
  //     window.open(set.external_url || set.source_url, '_blank');
  //   }
  // };

  // // Handle share click
  // const handleShareClick = (e: React.MouseEvent) => {
  //   e.stopPropagation();
  //   if (set?.id) {
  //     navigator.clipboard.writeText(`${window.location.origin}/discover?setId=${set.id}`);
  //     // You could add a toast notification here
  //     console.log('Set link copied to clipboard');
  //   }
  // };
  
  if (isLoading) {
    return (
      <Card className={cn(
        "bg-spotify-light-black border-none", 
        inModal ? "h-full" : "p-4 flex items-center"
      )}>
        <CardContent className={cn("p-4 flex", inModal ? "flex-col h-full" : "flex-1")}>
          <div className={cn(
            "flex-shrink-0 bg-spotify-gray rounded-md overflow-hidden",
            inModal ? "w-full h-32 mb-3" : "w-16 h-16 mr-3"
          )}>
            <Skeleton className="h-full w-full bg-spotify-gray" />
          </div>
          <div className="flex-1">
            <Skeleton className="h-5 w-32 mb-2 bg-spotify-gray" />
            <Skeleton className="h-4 w-40 mb-1 bg-spotify-gray" />
            <Skeleton className="h-4 w-24 mb-2 bg-spotify-gray" />
            <div className="flex items-center mt-1">
              <Skeleton className="h-6 w-6 rounded-full mr-2 bg-spotify-gray" />
              <Skeleton className="h-4 w-20 rounded-full bg-spotify-gray" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (!set) {
    return (
      <Card className="bg-spotify-light-black border-none p-4">
        <CardContent className="p-4 text-center text-spotify-light-gray">
          Set not found
        </CardContent>
      </Card>
    );
  }
  
  // Format date
  const formattedDate = set.event_date 
    ? format(typeof set.event_date === 'string' ? parseISO(set.event_date) : new Date(set.event_date), "MM/dd/yyyy")
    : '';
  
  // Determine emoji based on rating using shared mapping
  const ratingEmoji = isValidRating(set.user_rating) ? ratingToEmoji[set.user_rating] : '😐';
  
  if (inModal) {
    return (
      <Card className="bg-spotify-light-black border-none hover:bg-spotify-gray/40 transition rounded-lg overflow-hidden h-full">
        <CardContent className="p-0 h-full flex flex-col">
          <div className="relative w-full h-40 bg-spotify-gray overflow-hidden">
            {isLoadingArtistImage ? (
              <div className="w-full h-full flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-white/50" />
              </div>
            ) : imageUrl ? (
              <img 
                src={imageUrl} 
                alt={set.artist_name} 
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = DEFAULT_IMAGE;
                  setImageError(true);
                }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-spotify-gray/50">
                <Music className="h-12 w-12 text-white/30" />
              </div>
            )}
          </div>
          
          <div className="p-4 flex-1 flex flex-col">
            <h3 className="text-xl font-montserrat font-bold text-white mb-1">{set.artist_name}</h3>
            <div className="text-spotify-light-gray text-sm mb-1">{set.location_name}</div>
            {set.event_name && (
              <div className="text-spotify-light-gray text-sm mb-2">{set.event_name}</div>
            )}
            <div className="text-sm text-white mb-2">{formattedDate}</div>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <>
      <Card 
        className="bg-spotify-light-black border-none rounded-lg overflow-hidden cursor-pointer hover:bg-spotify-gray/30 transition-colors"
        onClick={handleCardClick}
      >
        <CardContent className="p-0 flex">
          <div className="w-24 h-24 bg-spotify-gray flex-shrink-0 overflow-hidden">
            {isLoadingArtistImage ? (
              <div className="w-full h-full flex items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-white/50" />
              </div>
            ) : imageUrl ? (
              <img 
                src={imageUrl} 
                alt={set.artist_name} 
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = DEFAULT_IMAGE;
                  setImageError(true);
                }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-spotify-gray/50">
                <Music className="h-8 w-8 text-white/30" />
              </div>
            )}
          </div>
          
          <div className="p-3 flex-1 flex flex-col relative">
            {/* Show ranking if in rankings mode */}
            {displayMode === 'ranking' && ranking && (
              <div className="absolute top-2 right-2">
                <div className="text-md font-bold text-spotify-green">#{ranking}</div>
              </div>
            )}
            
            <h3 className="text-md font-montserrat font-semibold text-white leading-tight">{set.artist_name}</h3>
            
            <div className="text-xs text-spotify-light-gray mt-0.5">
              {set.location_name}
            </div>
            
            {/* Show date based on display mode */}
            {displayMode === 'timeline' && (
              <div className="text-xs text-spotify-light-gray mt-0.5 flex items-center">
                <Clock className="h-3 w-3 mr-1" />
                {listened_date
                  ? format(parseISO(listened_date), "MM/dd/yy")
                  : event_date
                    ? format(parseISO(event_date), "MM/dd/yy")
                    : 'No date'}
              </div>
            )}
            
            {/* Show event date in ranking mode */}
            {displayMode === 'ranking' && event_date && (
              <div className="text-xs text-spotify-light-gray mt-0.5 flex items-center">
                <Calendar className="h-3 w-3 mr-1" />
                {format(parseISO(event_date), "MM/dd/yy")}
              </div>
            )}
            
            {set.event_name && (
              <div className="text-xs text-spotify-light-gray mt-0.5">{set.event_name}</div>
            )}
            
            {/* Remove action buttons section */}
            
            {/* Show notes if available - improved visibility */}
            {set.notes ? (
              <div className="text-xs text-white mt-2 p-1 bg-spotify-gray/30 rounded line-clamp-2 border-l-2 border-spotify-green">
                <span className="font-semibold">Notes:</span> {set.notes}
              </div>
            ) : open ? (
              <div className="text-xs text-spotify-light-gray mt-2 p-1 bg-spotify-gray/20 rounded italic">
                Update your review to add notes
              </div>
            ) : null}
            
            {/* Show tagged friends if available - improved visibility */}
            {Array.isArray(set.tagged_friends) && set.tagged_friends.length > 0 ? (
              <div className="text-xs text-white mt-2 flex flex-wrap items-center">
                <span className="font-semibold mr-1">With:</span>
                <div className="flex flex-wrap">
                  {set.tagged_friends.map((friend, index) => (
                    <span key={index} className="mr-1 px-1 bg-spotify-gray/30 rounded-sm">
                      {friend}{index < set.tagged_friends!.length - 1 ? ',' : ''}
                    </span>
                  ))}
                </div>
              </div>
            ) : open ? (
              <div className="text-xs text-spotify-light-gray mt-2 p-1 bg-spotify-gray/20 rounded italic">
                Update your review to add friends
              </div>
            ) : null}
            
            {/* Show media thumbnail if available - improved visibility */}
            {Array.isArray(set.media_urls) && set.media_urls.length > 0 ? (
              <div className="flex mt-2 space-x-1 overflow-hidden">
                {set.media_urls.slice(0, 3).map((url, index) => {
                  // Determine media type
                  const isImage = url.match(/\.(jpg|jpeg|png|gif|webp)$/i);
                  const isVideo = url.match(/\.(mp4|webm|mov)$/i);
                  const isAudio = url.match(/\.(mp3|wav|ogg)$/i);
                  
                  return (
                    <div key={index} className="w-10 h-10 rounded-sm overflow-hidden flex-shrink-0 border border-spotify-green">
                      {isImage ? (
                        <img src={url} alt="Media" className="w-full h-full object-cover" />
                      ) : isVideo ? (
                        <div className="w-full h-full flex items-center justify-center bg-spotify-gray/50">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-spotify-green" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                      ) : isAudio ? (
                        <div className="w-full h-full flex items-center justify-center bg-spotify-gray/50">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-spotify-green" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                          </svg>
                        </div>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-spotify-gray/50">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-spotify-light-gray" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                      )}
                    </div>
                  );
                })}
                {set.media_urls.length > 3 && (
                  <div className="w-10 h-10 rounded-sm bg-spotify-gray/30 flex items-center justify-center text-xs text-white border border-spotify-green">
                    +{set.media_urls.length - 3}
                  </div>
                )}
              </div>
            ) : open ? (
              <div className="text-xs text-spotify-light-gray mt-2 p-1 bg-spotify-gray/20 rounded italic">
                Update your review to add media
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>
      
      <SetDetailModal 
        isOpen={open}
        onClose={() => setOpen(false)}
        setId={setId}
      />
    </>
  );
}
