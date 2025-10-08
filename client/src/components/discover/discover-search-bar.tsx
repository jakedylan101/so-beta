"use client";

import React, { useState, useEffect, useRef } from "react";
import { Search } from "lucide-react";
import { cn } from "../../lib/utils";

interface DiscoverSearchBarProps {
  onSearch: (query: string) => void;
  className?: string;
}

export function DiscoverSearchBar({ onSearch, className }: DiscoverSearchBarProps) {
  const [query, setQuery] = useState("");
  const onSearchRef = useRef(onSearch);

  // Keep a ref to the latest onSearch so the debounce effect doesn't need to
  // include the callback as a dependency (prevents re-triggering when parent re-renders)
  useEffect(() => {
    onSearchRef.current = onSearch;
  }, [onSearch]);

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      const q = query.trim();
      if (q) {
        onSearchRef.current(q);
      }
    }, 500);

    return () => clearTimeout(delayDebounce);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      const q = query.trim();
      if (q) onSearchRef.current(q);
    }
  };

  return (
    <div
      className={cn(
        "flex items-center px-4 py-2 bg-white rounded-full shadow-md w-full max-w-xl mx-auto mb-6",
        className
      )}
    >
      <Search className="text-gray-500 mr-2" />
      <input
        type="text"
        value={query}
        onChange={(e) => {
          const v = e.target.value;
          setQuery(v);
          // If the input was cleared, notify parent immediately so it can
          // reset to the recommended/trending view without waiting for debounce.
          if (v.trim() === "") {
            onSearchRef.current("");
          }
        }}
        onKeyDown={handleKeyDown}
        placeholder="Search SoundCloud, MixCloud, YouTube..."
        className="flex-grow bg-transparent focus:outline-none text-black placeholder-gray-400"
      />
    </div>
  );
} 