import React, { useState, useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';
import { format, isValid, parse, parseISO } from 'date-fns';
import type { ArtistSearchResult } from '@/types/artist';

// Define API response type to match our server response
interface ApiArtistResult {
  id: string;
  artistName: string;
  venueName?: string;
  eventName?: string;
  city?: string;
  country?: string;
  date: string;
  imageUrl?: string;
  source: string;
}

// Interfaces
interface ArtistResult {
  id: string;
  artistName: string;
  venueName: string;
  eventDate: string;
  eventName?: string;
  city?: string;
  country?: string;
  source?: string;
}

interface ArtistSearchDropdownProps {
  searchTerm: string;
  onSelect: (artist: ArtistSearchResult) => void;
}

// Mock data for testing and fallback
const MOCK_ARTISTS: ArtistResult[] = [
  { 
    id: '1', 
    artistName: 'Charli XCX', 
    venueName: 'Empire Polo Fields', 
    eventDate: '2025-04-11', 
    eventName: 'Coachella Festival 2025', 
    city: 'Indio', 
    country: 'USA' 
  },
  { 
    id: '2', 
    artistName: 'Charli XCX', 
    venueName: 'Barclays Center', 
    eventDate: '2025-05-03', 
    city: 'New York', 
    country: 'USA' 
  },
  { 
    id: '3', 
    artistName: 'Charli XCX', 
    venueName: 'Barclays Center', 
    eventDate: '2025-05-02', 
    city: 'New York', 
    country: 'USA' 
  },
  { 
    id: '4', 
    artistName: 'Charli XCX', 
    venueName: 'Barclays Center', 
    eventDate: '2025-05-01', 
    city: 'New York', 
    country: 'USA' 
  },
  { 
    id: '5', 
    artistName: 'Charli XCX', 
    venueName: 'Empire Polo Fields', 
    eventDate: '2025-04-19', 
    eventName: 'Coachella Festival 2025', 
    city: 'Indio', 
    country: 'USA' 
  },
  { 
    id: '6', 
    artistName: 'Fred Again..', 
    venueName: 'Brooklyn Mirage', 
    eventDate: '2024-09-15', 
    city: 'New York', 
    country: 'USA' 
  },
  { 
    id: '7', 
    artistName: 'The Chemical Brothers', 
    venueName: 'Printworks', 
    eventDate: '2024-10-22', 
    city: 'London', 
    country: 'UK' 
  },
  { 
    id: '8', 
    artistName: 'Peggy Gou', 
    venueName: 'Berghain', 
    eventDate: '2024-11-05', 
    city: 'Berlin', 
    country: 'Germany' 
  },
];

// Component
export function ArtistSearchDropdown({ searchTerm, onSelect }: ArtistSearchDropdownProps) {
  const [results, setResults] = useState<ArtistSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // Reset state when component unmounts
  useEffect(() => {
    return () => {
      setResults([]);
      setShowDropdown(false);
    };
  }, []);
  
  // Artist search logic
  useEffect(() => {
    // Don't search if term is too short
    if (!searchTerm || searchTerm.length < 2) {
      setResults([]);
      setShowDropdown(false);
      setErrorMessage(null);
      return;
    }
    
    setLoading(true);
    setShowDropdown(true);
    setErrorMessage(null);
    
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        // Use the real API endpoint with abort controller for cancellation
        const response = await fetch(`/api/artist/search?q=${encodeURIComponent(searchTerm)}`, {
          signal: controller.signal
        });
        
        if (!response.ok) {
          throw new Error(`API error: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        
        // Check if results is an array (should be in data.results from our updated API)
        const searchResults = Array.isArray(data.results) ? data.results as ApiArtistResult[] : [];
        
        // Check specifically for SoundCloud results
        const soundcloudResults = searchResults.filter(r => r.source === 'soundcloud');
        
        // Map API results to ArtistSearchResult type
        const mappedResults: ArtistSearchResult[] = searchResults.map((r) => {
          /* ---- ALWAYS OUTPUT ISO YYYY-MM-DD ---- */
          let iso = '';
          try {
            const p1 = parseISO(r.date);
            if (isValid(p1)) {
              iso = format(p1, 'yyyy-MM-dd');
            } else {
              const p2 = parse(r.date, 'dd-MM-yyyy', new Date());
              if (isValid(p2)) {
                iso = format(p2, 'yyyy-MM-dd');
              }
            }
          } catch {
            iso = r.date;   // last resort – keep original so UI shows something
          }

          return {
            artistName: r.artistName,
            venueName: r.venueName ?? '',
            city: r.city ?? '',
            country: r.country ?? '',
            date: iso,                // <-- canonical ISO string
            eventName: r.eventName ?? '',
            url: r.id ? `https://www.setlist.fm/setlist/${r.id}` : '',
            imageUrl: r.imageUrl,
            source: r.source
          };
        });
        
        if (mappedResults.length > 0) {
          // Sort results by date (newest first)
          const sortedResults = [...mappedResults].sort((a, b) => {
            // Handle cases where date might be missing
            if (!a.date) return 1;
            if (!b.date) return -1;
            
            // Convert dates to comparable format
            try {
              // Helper function to convert various date formats to YYYY-MM-DD
              const normalizeDate = (date: string): string => {
                if (!date) return ''; // Handle empty strings
                
                try {
                  // For MM-DD-YY format (like 04-19-25)
                  if (/^\d{2}-\d{2}-\d{2}$/.test(date)) {
                    const parts = date.split('-');
                    return `20${parts[2]}-${parts[0]}-${parts[1]}`;
                  }
                  
                  // For YYYY-MM-DD format (already normalized)
                  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
                    return date;
                  }
                  
                  // For DD-MM-YYYY format
                  if (/^\d{2}-\d{2}-\d{4}$/.test(date)) {
                    const parts = date.split('-');
                    return `${parts[2]}-${parts[1]}-${parts[0]}`;
                  }
                  
                  // For ISO format with 'T'
                  if (date && date.includes('T')) {
                    return date.split('T')[0] || '';
                  }
                } catch (e) {
                  // If any parsing fails, return the original
                  return date;
                }
                
                // Default case: just return the date string
                return date;
              };
              
              // Make sure we have valid strings for date comparison
              const dateA = normalizeDate(a.date || '');
              const dateB = normalizeDate(b.date || '');
              
              // Sort descending (newest first)
              return dateB.localeCompare(dateA);
            } catch (err) {
              return 0; // If error, consider them equal
            }
          });
          
          setResults(sortedResults);
          setShowDropdown(true);
          setErrorMessage(null);
        } else {
          setResults([]);
          setErrorMessage("No artists found. Try a different search or enter artist manually.");
          setShowDropdown(true);
        }
      } catch (err) {
        setResults([]);
        setErrorMessage("Error searching for artists. Please try again.");
        setShowDropdown(true);
      } finally {
        setLoading(false);
      }
    }, 300);
    
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [searchTerm]);
  
  // Handle artist selection - guaranteed dropdown closing with multiple approaches
  const handleSelect = (artist: ArtistSearchResult) => {
    // 1. Forcefully clear state to prevent reopening
    setResults([]);
    setShowDropdown(false);
    setErrorMessage(null);
    
    // 2. Force blur on any active element
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    
    // 3. Set a document-level click handler that will force close any dropdowns
    const closeAnyDropdowns = () => {
      setShowDropdown(false);
      setResults([]);
      document.removeEventListener('click', closeAnyDropdowns);
    };
    document.addEventListener('click', closeAnyDropdowns);
    
    // 4. Use multiple timeouts with increasing delays to ensure dropdown stays closed
    setTimeout(() => {
      setShowDropdown(false);
      setResults([]);
    }, 0);
    
    setTimeout(() => {
      setShowDropdown(false);
      setResults([]);
    }, 100);
    
    setTimeout(() => {
      setShowDropdown(false);
      setResults([]);
    }, 300);
    
    // 5. Call onSelect synchronously - do this before changing focus
    onSelect(artist);
    
    // 6. Focus on the venue input after a small delay
    setTimeout(() => {
      const venueInput = document.querySelector('input[name="venue"]');
      if (venueInput instanceof HTMLElement) {
        venueInput.focus();
      }
    }, 10);
  };
  
  // Handle manual entry button - with enhanced closing
  const handleManualEntry = () => {
    // Forcefully clear state to prevent reopening
    setShowDropdown(false);
    setResults([]);
    setErrorMessage(null);
    
    // Force blur on any active element
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    
    // Use multiple timeouts with increasing delays to ensure dropdown stays closed
    setTimeout(() => {
      setShowDropdown(false);
      setResults([]);
    }, 0);
    
    setTimeout(() => {
      setShowDropdown(false);
      setResults([]);
    }, 100);
    
    // Create a minimal artist object for manual entry
    const manualArtist: ArtistSearchResult = {
      artistName: searchTerm,
      venueName: '',
      date: '',
      city: '',
      country: '',
      url: '',
      source: ''
    };
    
    // Call onSelect with the manual artist object
    onSelect(manualArtist);
  };
  
  // Click outside to close - multiple events for better reliability
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
        setResults([]);
        setErrorMessage(null);
      }
    }
    
    // Using both mousedown (capture) and click events for better reliability
    document.addEventListener('mousedown', handleClickOutside, true);
    document.addEventListener('click', handleClickOutside, true);
    
    // Also add a global click handler that will force close after a short delay
    const globalClickHandler = () => {
      setTimeout(() => {
        if (showDropdown) {
          setShowDropdown(false);
          setResults([]);
          setErrorMessage(null);
        }
      }, 300);
    };
    
    document.addEventListener('click', globalClickHandler);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside, true);
      document.removeEventListener('click', handleClickOutside, true);
      document.removeEventListener('click', globalClickHandler);
    };
  }, [showDropdown]);
  
  // Don't render anything if dropdown shouldn't be shown
  if (!showDropdown) {
    return null;
  }
  
  // Format event date to display properly in the dropdown
  const formatEventDate = (dateStr: string | undefined): string => {
    if (!dateStr) return '';
    
    try {
      // For YYYY-MM-DD format (ISO)
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        const parts = dateStr.split('-');
        if (parts.length === 3) {
          const [year, month, day] = parts;
          // Return MM-DD-YY format for display
          return `${month}-${day}-${year.substring(2)}`;
        }
      }
      
      // For DD-MM-YYYY format
      if (/^\d{2}-\d{2}-\d{4}$/.test(dateStr)) {
        const parts = dateStr.split('-');
        if (parts.length === 3) {
          const [day, month, year] = parts;
          // Return MM-DD-YY format for display
          return `${month}-${day}-${year.substring(2)}`;
        }
      }
      
      // For MM-DD-YYYY format - just convert to MM-DD-YY
      if (/^\d{2}-\d{2}-\d{4}$/.test(dateStr)) {
        const parts = dateStr.split('-');
        if (parts.length === 3) {
          const [month, day, year] = parts;
          return `${month}-${day}-${year.substring(2)}`;
        }
      }
      
      // Already in MM-DD-YY format
      if (/^\d{2}-\d{2}-\d{2}$/.test(dateStr)) {
        return dateStr;
      }
      
      return dateStr;
    } catch (error) {
      return dateStr;
    }
  };
  
  return (
    <div 
      ref={dropdownRef} 
      className="absolute top-full left-0 w-full mt-1 bg-black border border-zinc-800 rounded-md shadow-lg z-50"
    >
      {loading && (
        <div className="py-4 text-center">
          <Loader2 className="h-5 w-5 animate-spin mx-auto text-green-500" />
          <p className="text-sm text-gray-400 mt-2">Searching for "{searchTerm}"...</p>
        </div>
      )}
      
      {!loading && results.length > 0 && (
        <ul className="max-h-72 overflow-auto">
          <li 
            className="px-4 py-3 hover:bg-zinc-900 cursor-pointer border-b border-zinc-800 text-green-500 font-medium"
            onClick={handleManualEntry}
          >
            ➕ Enter "{searchTerm}" manually
          </li>
          
          {results.map((artist, index) => {
            const formattedDate = formatEventDate(artist.date);
            
            return (
              <li 
                key={`${artist.artistName}-${artist.date}-${index}`}
                className="px-4 py-3 hover:bg-zinc-900 cursor-pointer border-b border-zinc-800 last:border-b-0"
                onClick={() => handleSelect(artist)}
              >
                <div className="font-medium text-white">{artist.artistName}</div>
                <div className="text-gray-400 text-sm">
                  {artist.venueName}
                  {formattedDate ? ` — ${formattedDate}` : ''}
                </div>
                {artist.eventName && (
                  <div className="text-xs text-gray-500">{artist.eventName}</div>
                )}
                {artist.city && artist.country && (
                  <div className="text-xs text-gray-500">{artist.city}, {artist.country}</div>
                )}
              </li>
            );
          })}
        </ul>
      )}
      
      {!loading && results.length === 0 && errorMessage && (
        <div className="py-4 text-center text-gray-400">
          <div>{errorMessage}</div>
          <button 
            className="mt-2 px-4 py-1 bg-green-500 text-black rounded-md text-sm hover:bg-green-600"
            onClick={handleManualEntry}
          >
            Enter "{searchTerm}" manually
          </button>
        </div>
      )}
    </div>
  );
}
