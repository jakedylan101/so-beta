"use client";

import React from "react";
import type { Set } from "../../types/set";

interface DiscoverRecommendedSectionProps {
  sets: Set[];
  loading: boolean;
}

export function DiscoverRecommendedSection({
  sets,
  loading,
}: DiscoverRecommendedSectionProps) {
  return (
    <div className="mt-6">
      <h2 className="text-xl font-semibold mb-2">Recommended for You</h2>
      {loading ? (
        <p className="text-gray-400">Loading recommended sets...</p>
      ) : sets.length === 0 ? (
        <p className="text-gray-400">No recommended sets available.</p>
      ) : (
        <div className="space-y-4">
          {sets.map((set) => (
            <div
              key={set.id}
              className="bg-neutral-900 rounded p-4 border border-neutral-800"
            >
              <p className="text-white font-medium">{set.title}</p>
              <p className="text-sm text-gray-400">{set.artist_name}</p>
              <a
                href={set.external_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-400 underline"
              >
                Listen Now
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 