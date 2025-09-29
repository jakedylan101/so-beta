import React from "react";
import { Heart, Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Set } from "@/types/set";
import { cn } from "@/lib/utils";

interface DiscoverSetCardProps {
  set: Set;
  onCardClick: () => void;
  className?: string;
}

export function DiscoverSetCard({ set, onCardClick, className }: DiscoverSetCardProps) {
  const handleButtonClick = (e: React.MouseEvent, action: "like" | "save") => {
    e.stopPropagation();
    // TODO: Hook up actual like/save logic
  };

  return (
    <div
      onClick={onCardClick}
      className={cn(
        "group relative aspect-square rounded-lg overflow-hidden bg-spotify-gray/30 cursor-pointer hover:bg-spotify-gray/50 transition-colors",
        className
      )}
    >
      {/* Cover Image */}
      {set.cover_image ? (
        <img
          src={set.cover_image}
          alt={`${set.artist_name} set`}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-spotify-gray/30">
          <span className="text-spotify-light-gray">No image</span>
        </div>
      )}

      {/* Overlay Buttons */}
      <div className="absolute top-2 right-2 flex flex-col gap-2">
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8 bg-black/50 text-white"
          onClick={(e) => handleButtonClick(e, "like")}
        >
          <Heart size={16} />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8 bg-black/50 text-white"
          onClick={(e) => handleButtonClick(e, "save")}
        >
          <Bookmark size={16} />
        </Button>
      </div>

      {/* Text Overlay */}
      <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white p-2">
        <div className="text-sm font-semibold truncate">{set.title}</div>
        <div className="text-xs truncate">by {set.artist_name}</div>
        <div className="text-[10px] text-gray-300">{set.genre}</div>
      </div>
    </div>
  );
} 