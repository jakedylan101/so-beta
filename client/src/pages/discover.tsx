"use client";

import React, { useEffect, useState } from "react";
import { DiscoverSearchBar } from "../components/discover/discover-search-bar";
import { DiscoverRecommendedSection } from "../components/discover/discover-recommended-section";
import { DiscoverTrendingSection } from "../components/discover/discover-trending-section";
import { fetchRecommendedSets, fetchTrendingSets, searchExternalSets } from "../lib/api/external-sets";
import type { Set } from "../types/set";

export default function DiscoverPage() {
  const [searchResults, setSearchResults] = useState<Set[] | null>(null);
  const [recommended, setRecommended] = useState<Set[]>([]);
  const [trending, setTrending] = useState<Set[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [recommendedData, trendingData] = await Promise.all([
          fetchRecommendedSets(),
          fetchTrendingSets(),
        ]);
        setRecommended(recommendedData);
        setTrending(trendingData);
      } catch (error) {
        console.error("Failed to fetch initial sets:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, []);

  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults(null);
      return;
    }
    try {
      const results = await searchExternalSets(query);
      setSearchResults(results);
    } catch (error) {
      console.error("Search error:", error);
    }
  };

  return (
    <div className="bg-black min-h-screen text-white px-4 py-6 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-4">Discover</h1>
      <DiscoverSearchBar onSearch={handleSearch} />

      {searchResults ? (
        <>
          <h2 className="text-xl font-semibold mt-6 mb-2">
            Search Results ({searchResults.length})
          </h2>
          {searchResults.length > 0 ? (
            <div className="space-y-4">
              {searchResults.map((set) => (
                <div key={set.id} className="bg-neutral-900 rounded p-4 border border-neutral-800">
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
          ) : (
            <p>No results found.</p>
          )}
        </>
      ) : (
        <>
          <DiscoverRecommendedSection sets={recommended} loading={loading} />
          <DiscoverTrendingSection sets={trending} loading={loading} />
        </>
      )}
    </div>
  );
}
