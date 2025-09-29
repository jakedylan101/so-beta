import React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type DurationFilter = "< 30 min" | "30-60 min" | "1-2 hrs" | "> 2 hrs";

interface DiscoverFilterPanelProps {
  selectedDuration?: DurationFilter;
  onDurationSelect: (duration: DurationFilter) => void;
  onClearFilters: () => void;
  className?: string;
}

export function DiscoverFilterPanel({
  selectedDuration,
  onDurationSelect,
  onClearFilters,
  className,
}: DiscoverFilterPanelProps) {
  const durations: DurationFilter[] = [
    "< 30 min",
    "30-60 min",
    "1-2 hrs",
    "> 2 hrs",
  ];

  return (
    <div
      className={cn(
        "p-4 space-y-4 bg-spotify-light-black rounded-lg transition-all duration-300",
        className
      )}
      role="region"
      aria-label="Discover filters"
    >
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-white">Filters</h2>
        {selectedDuration && (
          <button
            onClick={onClearFilters}
            className="text-sm text-spotify-light-gray hover:underline"
            aria-label="Clear filters"
          >
            Clear Filters
          </button>
        )}
      </div>

      <div className="space-y-2">
        <h3 className="text-lg text-white">Duration</h3>
        <div className="grid grid-cols-2 gap-2">
          {durations.map((duration) => (
            <Button
              key={duration}
              variant="outline"
              size="sm"
              className={cn(
                "bg-spotify-gray/30 border-none hover:bg-spotify-gray/50 text-white",
                selectedDuration === duration && "bg-spotify-gray/50 ring-2 ring-white"
              )}
              onClick={() => onDurationSelect(duration)}
              aria-pressed={selectedDuration === duration}
              aria-label={`Filter by ${duration}`}
            >
              {duration}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
} 