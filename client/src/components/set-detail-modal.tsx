import React, { useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from '@/components/ui/dialog';
import { Loader2, Image as ImageIcon, Music } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import type { Set } from '@shared/schema';
import type { RatingEnum } from '@shared/types';
import { ratingToEmoji, isValidRating } from '@shared/types';
import { apiRequest } from '@/lib/queryClient';
import { useAppContext } from '@/context/app-context';

/* -------------------------------------------------------------------------- */
/*                                Main Modal                                  */
/* -------------------------------------------------------------------------- */

interface SetDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  setId: string | number;
}

export function SetDetailModal({ isOpen, onClose, setId }: SetDetailModalProps) {
  const [selectedMedia, setSelectedMedia] = useState<string | null>(null);
  const { user } = useAppContext();

  const { data: set, isLoading } = useQuery<
    Set & {
    artist_name: string;
      artist_spotify_id?: string | null;
      location_name?: string | null;
      event_name?: string | null;
      user_listened_date?: string | null;
      event_date?: string | null;
      user_rating?: RatingEnum;
      /*  ✅  correct Supabase columns */
      user_notes?: string | null;
      user_media_urls?: string[] | null;
      user_tagged_friends?: string[] | null;
      source_url?: string | null;
    }
  >({
    queryKey: ['set-detail', setId],
    queryFn: () => apiRequest(`/api/sets/${setId}`),
    enabled: isOpen && !!setId
  });

  /* ───────── Loading / error guards ───────── */
  if (isLoading)
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-spotify-light-black text-white" aria-describedby="set-detail-description">
          <DialogTitle className="sr-only">Loading Set Details</DialogTitle>
          <DialogDescription id="set-detail-description" className="sr-only">
            Loading set details, please wait.
          </DialogDescription>
          <div className="p-10 flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        </DialogContent>
      </Dialog>
    );

  if (!set)
    return (
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="bg-spotify-light-black text-white" aria-describedby="set-not-found-description">
          <DialogTitle className="sr-only">Set Not Found</DialogTitle>
          <DialogDescription id="set-not-found-description" className="sr-only">
            The requested set could not be found.
          </DialogDescription>
          <div className="p-10 text-center">Set not found.</div>
        </DialogContent>
      </Dialog>
    );

  /* ───────── Derived data ───────── */
  const eventDate = set.event_date ? format(parseISO(set.event_date), 'MM/dd/yy') : null;
  const experienceDate = set.user_listened_date ? format(parseISO(set.user_listened_date), 'MM/dd/yy') : null;
  const ratingEmoji =
    isValidRating(set.user_rating) && ratingToEmoji[set.user_rating];

  const notes = set.user_notes;
  const mediaUrls = set.user_media_urls ?? [];
  const friends = set.user_tagged_friends ?? [];

  /* ───────── Media type helpers ───────── */
  const isImage = (url: string) => /\.(jpe?g|png|gif|webp)$/i.test(url);
  const isVideo = (url: string) => /\.(mp4|mov|webm)$/i.test(url);
  const isAudio = (url: string) => /\.(mp3|wav|ogg)$/i.test(url);

  const pictures = mediaUrls.filter(isImage);
  const videos = mediaUrls.filter(isVideo);
  const audios = mediaUrls.filter(isAudio);

  /* ───────── Render ───────── */
  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent
          className="bg-spotify-light-black text-white sm:max-w-2xl rounded-xl overflow-y-auto max-h-[80vh] px-6 py-4 space-y-4"
          aria-describedby="set-detail-description"
        >
          <DialogHeader className="border-b border-spotify-gray/40 pb-3">
            <DialogTitle className="text-2xl font-bold">
              {set.artist_name}
            </DialogTitle>
            {set.event_name && (
              <DialogDescription id="set-detail-description" className="text-spotify-light-gray">
                {set.event_name}
              </DialogDescription>
            )}
            {!set.event_name && (
              <DialogDescription id="set-detail-description" className="sr-only">
                Set details for {set.artist_name}
              </DialogDescription>
            )}
          </DialogHeader>

          {/* Event Details */}
          <div className="space-y-2">
            {set.location_name && (
              <p className="text-spotify-light-gray">
                <strong>Venue:</strong> {set.location_name}
              </p>
            )}
            {eventDate && (
              <p className="text-spotify-light-gray">
                <strong>Event Date:</strong> {eventDate}
              </p>
            )}
            {experienceDate && (
              <p className="text-spotify-light-gray">
                <strong>Experience Date:</strong> {experienceDate}
              </p>
            )}
            {ratingEmoji && (
              <p className="text-spotify-light-gray">
                <strong>Rating:</strong> {ratingEmoji}
              </p>
            )}
            {notes && (
              <div>
                <strong>Notes:</strong>
                <p className="text-spotify-light-gray whitespace-pre-line mt-1">{notes}</p>
              </div>
            )}
          </div>

          {/* Media - Split into three sections */}
          {mediaUrls.length > 0 ? (
            <div className="space-y-4">
              {/* Pictures Section */}
              {pictures.length > 0 && (
                <Section title="Pictures">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {pictures.map((url, i) => (
                      <button
                        key={`image-${i}`}
                        onClick={() => setSelectedMedia(url)}
                        className="w-full h-32 rounded-lg overflow-hidden bg-spotify-gray/30 hover:opacity-90 transition-opacity"
                      >
                        <img
                          src={url}
                          alt="media"
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                </Section>
              )}
              
              {/* Videos Section */}
              {videos.length > 0 && (
                <Section title="Videos">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {videos.map((url, i) => (
                      <VideoPlayer key={`video-${i}`} url={url} />
                    ))}
                  </div>
                </Section>
              )}
              
              {/* Audio Section */}
              {audios.length > 0 && (
                <Section title="Audio">
                  <div className="grid grid-cols-1 gap-3">
                    {audios.map((url, i) => (
                      <div 
                        key={`audio-${i}`}
                        className="w-full bg-spotify-gray/30 rounded-lg p-3"
                      >
                        <audio 
                          controls 
                          src={url} 
                          className="w-full" 
                          preload="metadata"
                        />
                      </div>
                    ))}
                  </div>
                </Section>
              )}
            </div>
          ) : (
            <Section title="Media">
              <Placeholder>No media available</Placeholder>
            </Section>
          )}

          <DialogClose />
        </DialogContent>
      </Dialog>

      {/* Media viewer modal */}
      {selectedMedia && (
        <Dialog open={!!selectedMedia} onOpenChange={() => setSelectedMedia(null)}>
          <DialogContent 
            className="bg-spotify-light-black text-white sm:max-w-4xl"
            aria-describedby="media-viewer-description"
          >
            <DialogTitle className="sr-only">Media Viewer</DialogTitle>
            <DialogDescription id="media-viewer-description" className="sr-only">
              Viewing selected media content
            </DialogDescription>
            <div className="p-4 flex justify-center">
              {isImage(selectedMedia) && (
                <img
                  src={selectedMedia}
                  alt="media"
                  className="max-h-[80vh] w-auto object-contain"
                />
              )}
              {isVideo(selectedMedia) && (
                <video
                  src={selectedMedia}
                  controls
                  className="max-h-[80vh] w-auto"
                  autoPlay
                />
              )}
              {isAudio(selectedMedia) && (
                <div className="w-full flex items-center justify-center p-8">
                  <audio controls src={selectedMedia} autoPlay className="w-full" />
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

/* Video Player Component */
const VideoPlayer = ({ url }: { url: string }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const handlePlay = () => {
    if (videoRef.current) {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  return (
    <div className="relative w-full rounded-md overflow-hidden shadow-md">
      <video
        ref={videoRef}
        src={url}
        controls
        className="w-full h-32 rounded-md object-cover"
        onClick={handlePlay}
        playsInline
        preload="metadata"
      />
      {!isPlaying && (
        <button
          onClick={handlePlay}
          className="absolute inset-0 flex items-center justify-center bg-black/40 hover:bg-black/60 transition"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="white"
            viewBox="0 0 24 24"
            className="w-12 h-12"
          >
            <path d="M8 5v14l11-7z" />
          </svg>
        </button>
      )}
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*                             Helper Components                              */
/* -------------------------------------------------------------------------- */

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <h3 className="font-semibold">{title}</h3>
      {children}
    </section>
  );
}

function Placeholder({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-center py-8 text-spotify-light-gray bg-spotify-gray/20 rounded-lg">
      {children}
    </div>
  );
}