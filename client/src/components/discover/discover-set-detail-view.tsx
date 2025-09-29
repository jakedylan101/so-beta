import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Heart,
  Bookmark,
  PencilLine,
  ExternalLink,
  Share2,
  Calendar,
  Headphones,
} from "lucide-react";
import type { Set } from "@/types/set";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import copy from "copy-to-clipboard";

interface DiscoverSetDetailViewProps {
  isOpen: boolean;
  onClose: () => void;
  set: Set;
}

export function DiscoverSetDetailView({
  isOpen,
  onClose,
  set,
}: DiscoverSetDetailViewProps) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const handleAction = async (action: "like" | "save" | "log") => {
    switch (action) {
      case "like":
        toast({
          title: "Set liked",
          description: `You liked ${set.artist_name}'s set`,
        });
        break;
      case "save":
        toast({
          title: "Set saved",
          description: `${set.artist_name}'s set has been saved to your collection`,
        });
        break;
      case "log":
        setLocation(
          `/log-set?artistName=${encodeURIComponent(set.artist_name)}&eventDate=${
            set.event_date || ""
          }`
        );
        onClose();
        break;
    }
  };

  const handleShare = () => {
    const shareUrl = `${window.location.origin}/sets/${set.id}`;
    copy(shareUrl);
    toast({
      title: "Link copied",
      description: "Share this set with friends",
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-black text-white max-w-md mx-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">{set.title}</DialogTitle>
          <DialogDescription className="text-sm text-gray-400">
            {set.artist_name} • {set.genre}
          </DialogDescription>
        </DialogHeader>

        {set.cover_image && (
          <img
            src={set.cover_image}
            alt="Set Cover"
            className="w-full h-48 object-cover rounded-md my-4"
          />
        )}

        {/* Venue info */}
        <p className="text-sm text-gray-400 mb-2">
          {set.venue_name || "No venue information available."}
        </p>

        {/* Meta row: date, duration */}
        <div className="flex items-center gap-6 text-sm text-gray-300 mb-4">
          <div className="flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            {set.event_date ? format(new Date(set.event_date), "M/d/yyyy") : "TBD"}
          </div>
          <div className="flex items-center gap-1">
            <Headphones className="w-4 h-4" />
            {set.duration ? `${Math.floor(set.duration / 60)} min` : "Unknown"}
          </div>
        </div>

        {/* Buttons */}
        <div className="flex flex-col gap-3">
          <Button
            variant="secondary"
            className="w-full"
            onClick={() => handleAction("like")}
          >
            <Heart className="w-4 h-4 mr-2" />
            Like
          </Button>
          <Button
            variant="secondary"
            className="w-full"
            onClick={() => handleAction("save")}
          >
            <Bookmark className="w-4 h-4 mr-2" />
            Save
          </Button>
          <Button
            variant="default"
            className="w-full"
            onClick={() => handleAction("log")}
          >
            <PencilLine className="w-4 h-4 mr-2" />
            Log This Set
          </Button>

          {set.external_url && (
            <a
              href={set.external_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center w-full text-sm text-white border border-gray-600 rounded-md py-2 hover:bg-gray-800 transition"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Listen Now
            </a>
          )}

          <Button
            variant="ghost"
            className="w-full"
            onClick={handleShare}
          >
            <Share2 className="w-4 h-4 mr-2" />
            Share
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
} 