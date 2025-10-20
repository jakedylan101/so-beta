"use client";

import { useEffect, useState, useDeferredValue } from "react";
import { DiscoverSearchBar } from "../components/discover/discover-search-bar";
import { DiscoverRecommendedSection } from "../components/discover/discover-recommended-section";
import { DiscoverTrendingSection } from "../components/discover/discover-trending-section";
import { fetchRecommendedSets, fetchTrendingSets, searchExternalSets } from "../lib/api/external-sets";
import { fetchWithAuth } from "@/lib/api/fetchWithAuth";
import { Button } from "../components/ui/button";
import type { Set } from "../types/set";
import { v5 as uuidv5 } from 'uuid';
// uuid not needed for client-side save anymore


export default function DiscoverPage() {
  const [searchResults, setSearchResults] = useState<Set[] | null>(null);
  const [recommended, setRecommended] = useState<Set[]>([]);
  const [trending, setTrending] = useState<Set[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const deferredQuery = useDeferredValue(searchQuery);
  const [searching, setSearching] = useState(false);

  function generateSetId(setId: string): string {
    const NAMESPACE_UUID = '123e4567-e89b-12d3-a456-426614174000';
    return uuidv5(setId, NAMESPACE_UUID);
  }

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

  // Now the search bar sets `searchQuery`. We use a deferred value so the
  // UI keeps showing previous results while the new query is being deferred.
  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  async function saveSet(set: Set) {
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

  useEffect(() => {
    let mounted = true;

    const doSearch = async () => {
      const q = (deferredQuery || "").trim();
      if (!q) {
        if (mounted) setSearchResults(null);
        return;
      }

      try {
        setSearching(true);
        const results = await searchExternalSets(q);
        if (!mounted) return;
        setSearchResults(results);
      } catch (error) {
        console.error("Search error:", error);
      } finally {
        if (mounted) setSearching(false);
      }
    };

    // Trigger search when deferred value changes
    doSearch();

    return () => {
      mounted = false;
    };
  }, [deferredQuery]);

  return (
    <div className="bg-black min-h-screen text-white px-4 py-6 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-4">Discover</h1>
      <DiscoverSearchBar onSearch={handleSearch} />

      {searchQuery.trim() ? (
        <>
          <h2 className="text-xl font-semibold mt-6 mb-2">
            Search Results ({searchResults?.length ?? 0})
            {searching && (
              <span className="ml-3 text-sm text-gray-300">Searching...</span>
            )}
            {!searching && searchQuery !== deferredQuery && (
              <span className="ml-3 text-sm text-gray-500">(updating...)</span>
            )}
          </h2>
          {searchResults && searchResults.length > 0 ? (
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
                  <Button onClick={() => saveSet(set)}>Save</Button>
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
