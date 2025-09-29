import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { Music, Loader2, Calendar, Clock } from 'lucide-react';
import type { SetCardProps } from '@/types/SetCard';
import type { Set } from '@shared/schema';
import type { RatingEnum } from '@shared/types';
import { isValidRating, ratingToEmoji } from '@shared/types';

export function SetCard({ 
  setId, 
  inModal = false, 
  ranking,
  showDateBadge = false,
  displayMode = 'ranking',
  event_date,
  listened_date
}: SetCardProps) {
  const [showDetailModal, setShowDetailModal] = useState(false);
  
  // Fetch set details
  const { data: set, isLoading } = useQuery<Set & { 
    eloScore?: number;
    user_elo_rating?: number;
    user_ranking_id?: number;
    user_rating?: RatingEnum;
    artist_name: string;
    location_name: string;
    event_name?: string;
    artist: string;
    venue: string;
  }>({
    queryKey: [`/api/sets/${setId}`]
  });
  
  // Fetch artist image from Spotify
  const { data: artistImage, isLoading: isLoadingArtistImage } = useQuery<{
    id: string;
    name: string;
    imageUrl: string;
    popularity: number;
    genres: string[];
  }>({
    queryKey: [`/api/spotify/artist-image?name=${set?.artist_name}`],
    enabled: !!set?.artist_name,
  });

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

  const imageUrl = artistImage?.imageUrl;
  const ratingEmoji = isValidRating(set.user_rating) ? ratingToEmoji[set.user_rating] : '😐';

  return (
    <Card className="bg-spotify-light-black border-none rounded-lg overflow-hidden">
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
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-spotify-gray/50">
              <Music className="h-8 w-8 text-white/30" />
            </div>
          )}
        </div>
        
        <div className="p-3 flex-1 flex flex-col">
          {/* Show ranking only in ranking mode */}
          {displayMode === 'ranking' && ranking && (
            <div className="absolute top-2 right-2">
              <div className="text-md font-bold text-spotify-green">#{ranking}</div>
            </div>
          )}
          
          <h3 className="text-md font-montserrat font-semibold text-white leading-tight">
            {set.artist_name}
          </h3>
          
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
          
          <div className="flex items-center mt-auto">
            <span className="text-lg">{ratingEmoji}</span>
      </div>
    </div>
      </CardContent>
    </Card>
  );
} 