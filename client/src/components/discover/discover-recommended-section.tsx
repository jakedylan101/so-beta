"use client";

import React from "react";
import type { Set } from "../../types/set";
import { fetchWithAuth } from "@/lib/api/fetchWithAuth";
import { v5 as uuidv5 } from 'uuid';

interface DiscoverRecommendedSectionProps {
  sets: Set[];
  loading: boolean;
}

function generateSetId(setId: string): string {
  const NAMESPACE_UUID = '123e4567-e89b-12d3-a456-426614174000';
  return uuidv5(setId, NAMESPACE_UUID);
}

async function saveSet(set) {
  // Use fallback if the set.id is missing (e.g. generate from artist_name or external_url)
  const rawId = set.id || set.external_url || set.title;

  if (!rawId) {
    console.error("Cannot generate set ID — missing unique identifier", set);
    return;
  }

  const setId = generateSetId(rawId);

  const normalizedSet = {
    id: setId,
    title: set.title,
    artist_name: set.artist_name,
    external_url: set.external_url,
  };

  try {
    await fetchWithAuth(`/api/sets/save`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ set: normalizedSet }),
    });

    console.log("Saved set", normalizedSet);
  } catch (error) {
    console.error("Error saving set:", error);
  }
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
              <button className=" py-1 px-2 rounded-lg text-gray-100 hover:text-gray-50 bg-gray-800 ms-2 hover:bg-gray-900" onClick={() => saveSet(set)}>
                Save Now
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 