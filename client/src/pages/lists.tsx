import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SetCard } from '@/components/set-card';
import { useLocation } from 'wouter';
import { useAppContext } from '@/context/app-context';
import { Calendar as CalendarIcon, Trophy, Clock, Search as SearchIcon, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useDebounce } from '@/hooks/use-debounce';

interface ListsProps {
  openAuthModal: () => void;
}

interface RankedSet {
  set_id: string;
  artist_name: string;
  elo_score: number;
  user_rating: 'liked' | 'neutral' | 'disliked';
  event_date: string;
  listened_date: string;
  venue_name?: string;
  event_name?: string;
  notes?: string;
  media_urls?: string[];
  tagged_friends?: string[];
  created_at?: string;
}

type SortOrder = 'desc' | 'asc';

export function Lists({ openAuthModal }: ListsProps) {
  const [, setLocation] = useLocation();
  const { user } = useAppContext();
  const [activeTab, setActiveTab] = useState("rankings");
  const [rankingSort, setRankingSort] = useState<SortOrder>('desc');
  const [timelineSort, setTimelineSort] = useState<SortOrder>('desc');
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  
  // Fetch ranked sets
  const { data: rankedSets = [], isLoading: rankingsLoading } = useQuery<RankedSet[]>({
    queryKey: [`/api/elo/test/rankings?sort=${rankingSort}`],
    enabled: !!user && activeTab === "rankings",
  });
  
  // Fetch chronological sets
  const { data: chronologicalSets = [], isLoading: timelineLoading } = useQuery<RankedSet[]>({
    queryKey: [`/api/sets/timeline?sort=${timelineSort}`],
    enabled: !!user && activeTab === "timeline",
  });
  
  // Log data for debugging
  useEffect(() => {
    if (rankedSets) {
      console.log("Rankings data received:", rankedSets);
    }
    if (chronologicalSets) {
      console.log("Timeline data received:", chronologicalSets);
    }
  }, [rankedSets, chronologicalSets]);
  
  // Log data for debugging
  useEffect(() => {
    if (chronologicalSets.length > 0 && activeTab === "timeline") {
      console.log("Full chronological sets data:", chronologicalSets);
      console.table(chronologicalSets.map(set => ({
        id: set.set_id,
        listened_date: set.listened_date,
        event_date: set.event_date,
        artist_name: set.artist_name,
        all_fields: Object.keys(set).join(', ')
      })));
    }
  }, [chronologicalSets, activeTab]);
  
  // Scroll to highlighted set if there's a hash in the URL
  useEffect(() => {
    const hash = window.location.hash;
    if (hash) {
      const setId = hash.substring(1);
      const element = document.getElementById(`set-${setId}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
        // Add a highlight class that we can style
        element.classList.add('highlight-set');
        // Remove the highlight after 2 seconds
        setTimeout(() => {
          element.classList.remove('highlight-set');
        }, 2000);
      }
    }
  }, [rankedSets, chronologicalSets]);
  
  const handleLogSetClick = () => {
    if (user) {
      setLocation('/log-set');
    } else {
      openAuthModal();
    }
  };
  
  const handleSortChange = (value: string) => {
    if (value !== 'asc' && value !== 'desc') return;
    if (activeTab === "rankings") {
      setRankingSort(value);
    } else {
      setTimelineSort(value);
    }
  };
  
  // Filter sets based on search query
  const filteredRankedSets = useMemo(() => {
    if (!debouncedSearchQuery.trim()) return rankedSets;
    
    const query = debouncedSearchQuery.toLowerCase().trim();
    
    return rankedSets.filter(set => {
      // Search in multiple fields
      return (
        set.artist_name?.toLowerCase().includes(query) ||
        set.venue_name?.toLowerCase().includes(query) ||
        set.event_name?.toLowerCase().includes(query) ||
        set.notes?.toLowerCase().includes(query) ||
        (set.event_date && set.event_date.includes(query)) ||
        (set.listened_date && set.listened_date.includes(query))
      );
    });
  }, [rankedSets, debouncedSearchQuery]);
  
  // Filter chronological sets based on search query
  const filteredChronologicalSets = useMemo(() => {
    if (!debouncedSearchQuery.trim()) return chronologicalSets;
    
    const query = debouncedSearchQuery.toLowerCase().trim();
    
    return chronologicalSets.filter(set => {
      // Search in multiple fields
      return (
        set.artist_name?.toLowerCase().includes(query) ||
        set.venue_name?.toLowerCase().includes(query) ||
        set.event_name?.toLowerCase().includes(query) ||
        set.notes?.toLowerCase().includes(query) ||
        (set.event_date && set.event_date.includes(query)) ||
        (set.listened_date && set.listened_date.includes(query))
      );
    });
  }, [chronologicalSets, debouncedSearchQuery]);
  
  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh]">
        <Card className="bg-spotify-light-black border-none rounded-lg max-w-md mx-auto w-full">
          <CardContent className="p-8 text-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-spotify-light-gray mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="text-xl font-montserrat font-bold mb-2">No Rankings Yet</h3>
            <p className="text-spotify-light-gray mb-6">
              Sign in to view your personalized rankings
            </p>
            <Button
              onClick={openAuthModal}
              className="bg-spotify-green text-black font-montserrat font-semibold hover:bg-spotify-green/80"
            >
              Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <>
      <h2 className="text-2xl font-montserrat font-bold mb-4">
        {user?.username ? `${user.username}'s Rankings` : 'Your Rankings'}
      </h2>
      
      {/* Add Search Bar */}
      <div className="flex items-center gap-2 mb-4">
        <div className="relative flex-1">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-spotify-light-gray h-4 w-4" />
          <Input
            className="pl-9 bg-spotify-gray border-none text-white placeholder:text-spotify-light-gray"
            placeholder="Search artists, venues, events, dates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <Button
              variant="ghost"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
              onClick={() => setSearchQuery('')}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
      
      <Tabs defaultValue="rankings" className="mb-6" onValueChange={setActiveTab}>
        <TabsList className="bg-spotify-light-black border-spotify-gray grid grid-cols-2 mb-4">
          <TabsTrigger 
            value="rankings" 
            className="data-[state=active]:bg-spotify-green data-[state=active]:text-black"
          >
            <Trophy className="mr-2 h-4 w-4" />
            Ranked
          </TabsTrigger>
          <TabsTrigger 
            value="timeline" 
            className="data-[state=active]:bg-spotify-green data-[state=active]:text-black"
          >
            <Clock className="mr-2 h-4 w-4" />
            Timeline
          </TabsTrigger>
        </TabsList>
        
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-montserrat font-semibold">
            {activeTab === "rankings" ? "Sets by Rank" : "Sets by Experience Date"}
          </h3>
          
          <div className="flex items-center gap-4">
            {activeTab === "rankings" && (
              <div className="text-sm text-spotify-light-gray">
                {debouncedSearchQuery.trim() ? (
                  `Showing ${filteredRankedSets.length} of ${rankedSets.length} sets`
                ) : (
                  `Total Sets Ranked: ${rankedSets.length}`
                )}
              </div>
            )}
            
            <Select 
              value={activeTab === "rankings" ? rankingSort : timelineSort} 
              onValueChange={handleSortChange}
            >
              <SelectTrigger className="bg-spotify-light-black border-none rounded w-48 focus:ring-1 focus:ring-spotify-green text-white">
                <SelectValue placeholder={activeTab === "rankings" ? "Sort by Rank" : "Sort by Experience"} />
              </SelectTrigger>
              <SelectContent className="bg-spotify-light-black border-spotify-gray text-white">
                <SelectItem value="desc">
                  {activeTab === "rankings" ? "Best to Worst" : "Most Recent to Oldest"}
                </SelectItem>
                <SelectItem value="asc">
                  {activeTab === "rankings" ? "Worst to Best" : "Oldest to Most Recent"}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <TabsContent value="rankings" className="mt-0">
          <div className="space-y-3">
            {rankingsLoading ? (
              <>
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-24 w-full rounded-lg bg-spotify-light-black" />
                ))}
              </>
            ) : filteredRankedSets.length > 0 ? (
              <>
                {[...filteredRankedSets]
                  .sort((a, b) => rankingSort === 'asc' 
                    ? a.elo_score - b.elo_score  // worst → best
                    : b.elo_score - a.elo_score  // best → worst
                  )
                  .map((set: RankedSet, index: number) => (
                  <div key={set.set_id} id={`set-${set.set_id}`}>
                    <SetCard 
                      setId={set.set_id} 
                      ranking={index + 1} 
                      displayMode="ranking"
                        event_date={set.event_date}
                        listened_date={set.listened_date}
                    />
                  </div>
                ))}
              </>
            ) : rankedSets.length > 0 ? (
              <Card className="bg-spotify-light-black border-none rounded-lg">
                <CardContent className="p-8 text-center">
                  <SearchIcon className="h-12 w-12 mx-auto text-spotify-light-gray mb-4" />
                  <h3 className="text-xl font-montserrat font-bold mb-2">No sets match your search</h3>
                  <p className="text-spotify-light-gray mb-6">
                    Try different keywords or clear the search
                  </p>
                  <Button
                    onClick={() => setSearchQuery('')}
                    className="bg-spotify-green text-black font-montserrat font-semibold hover:bg-spotify-green/80"
                  >
                    Clear Search
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-spotify-light-black border-none rounded-lg">
                <CardContent className="p-8 text-center">
                  <Trophy className="h-12 w-12 mx-auto text-spotify-light-gray mb-4" />
                  <h3 className="text-xl font-montserrat font-bold mb-2">No Ranked Sets Yet</h3>
                  <p className="text-spotify-light-gray mb-6">
                    Log your first set and rank it to build your rankings
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="timeline" className="mt-0">
          <div className="space-y-3">
            {timelineLoading ? (
              <>
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-24 w-full rounded-lg bg-spotify-light-black" />
                ))}
              </>
            ) : filteredChronologicalSets.length > 0 ? (
              <>
                {[...filteredChronologicalSets]
                  .sort((a, b) => {
                    const dateA = a.listened_date ?? a.event_date;
                    const dateB = b.listened_date ?? b.event_date;

                    if (!dateA || !dateB) {
                      console.warn("Missing date(s) in sorting logic", { dateA, dateB });
                      return 0;
                    }

                    return timelineSort === 'desc'
                      ? new Date(dateB).getTime() - new Date(dateA).getTime()
                      : new Date(dateA).getTime() - new Date(dateB).getTime();
                  })
                  .map((set: RankedSet) => (

                  <div key={set.set_id} id={`set-${set.set_id}`}>
                    <SetCard 
                      setId={set.set_id}
                      displayMode="timeline"
                        event_date={set.event_date}
                        listened_date={set.listened_date}
                    />
                  </div>
                ))}
              </>
            ) : chronologicalSets.length > 0 ? (
              <Card className="bg-spotify-light-black border-none rounded-lg">
                <CardContent className="p-8 text-center">
                  <SearchIcon className="h-12 w-12 mx-auto text-spotify-light-gray mb-4" />
                  <h3 className="text-xl font-montserrat font-bold mb-2">No sets match your search</h3>
                  <p className="text-spotify-light-gray mb-6">
                    Try different keywords or clear the search
                  </p>
                  <Button
                    onClick={() => setSearchQuery('')}
                    className="bg-spotify-green text-black font-montserrat font-semibold hover:bg-spotify-green/80"
                  >
                    Clear Search
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-spotify-light-black border-none rounded-lg">
                <CardContent className="p-8 text-center">
                  <CalendarIcon className="h-12 w-12 mx-auto text-spotify-light-gray mb-4" />
                  <h3 className="text-xl font-montserrat font-bold mb-2">No Sets Yet</h3>
                  <p className="text-spotify-light-gray mb-6">
                    Log your first set to start building your timeline
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
      
      <div className="mt-6">
        <Button 
          onClick={handleLogSetClick}
          className="w-full bg-spotify-green text-black font-montserrat font-semibold py-3 rounded-lg hover:bg-spotify-green/80 transition-all"
        >
          Log a New Set
        </Button>
      </div>
    </>
  );
}
