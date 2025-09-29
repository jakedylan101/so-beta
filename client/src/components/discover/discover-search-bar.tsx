"use client";

import React, { useState, useEffect } from "react";
import { Search } from "lucide-react";
import { cn } from "../../lib/utils";

interface DiscoverSearchBarProps {
  onSearch: (query: string) => void;
  className?: string;
}

export function DiscoverSearchBar({ onSearch, className }: DiscoverSearchBarProps) {
  const [query, setQuery] = useState("");

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      if (query.trim()) {
        onSearch(query.trim());
      }
    }, 500);

    return () => clearTimeout(delayDebounce);
  }, [query, onSearch]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && query.trim()) {
      onSearch(query.trim());
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
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Search SoundCloud, MixCloud, YouTube..."
        className="flex-grow bg-transparent focus:outline-none text-black placeholder-gray-400"
      />
    </div>
  );
} 