import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { format } from 'date-fns';
import { CalendarIcon, SearchIcon, FilterIcon, Music, MapPin, Calendar as CalendarIcon2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAppContext } from '@/context/app-context';
import type { RatingEnum } from '@shared/types';

interface SearchFilters {
  artistName?: string;
  location?: string;
  genre?: string;
  startDate?: string;
  endDate?: string;
  rating?: RatingEnum;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

interface SearchResults {
  sets: Array<{
    id: string | number;
    artist_name: string;
    location_name: string;
    event_name?: string;
    event_date: string;
    image_url?: string;
    rating?: string;
    elo_rating?: number;
  }>;
  totalCount: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

export default function SearchPage() {
  const [location, setLocation] = useLocation();
  const { user } = useAppContext();
  const { toast } = useToast();
  
  // Search filters state
  const [filters, setFilters] = useState<SearchFilters>({
    limit: 10,
    offset: 0,
    sortBy: 'created_at',
    sortDirection: 'desc'
  });
  
  // Date range state
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  
  // UI states
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);
  
  // Handle pagination
  const handlePageChange = (newOffset: number) => {
    setFilters(prev => ({
      ...prev,
      offset: newOffset
    }));
  };
  
  // Handle filter change
  const handleFilterChange = (name: keyof SearchFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [name]: value,
      // Reset pagination when filters change
      offset: name !== 'offset' ? 0 : prev.offset
    }));
  };
  
  // Handle date changes
  useEffect(() => {
    if (startDate) {
      handleFilterChange('startDate', format(startDate, 'yyyy-MM-dd'));
    } else {
      // Remove the filter if date is cleared
      const { startDate: _, ...restFilters } = filters;
      setFilters(restFilters);
    }
  }, [startDate]);
  
  useEffect(() => {
    if (endDate) {
      handleFilterChange('endDate', format(endDate, 'yyyy-MM-dd'));
    } else {
      // Remove the filter if date is cleared
      const { endDate: _, ...restFilters } = filters;
      setFilters(restFilters);
    }
  }, [endDate]);
  
  // Fetch genres for filter
  const { data: genresData } = useQuery<{
    genres: Array<{ id: string; label: string }>;
    subgenres?: { [key: string]: Array<{ id: string; label: string }> };
  }>({
    queryKey: ['/api/genres'],
  });
  
  // Fetch search results
  const {
    data: searchResults,
    isLoading,
    isError,
    error
  } = useQuery<SearchResults>({
    queryKey: ['/api/sets/search', filters],
    queryFn: async () => {
      // Build query string from filters
      const queryParams = new URLSearchParams();
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, String(value));
        }
      });
      
      const response = await fetch(`/api/sets/search?${queryParams.toString()}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch search results');
      }
      
      return response.json();
    },
    enabled: true // Always run the query when filters change
  });
  
  // Calculate pagination
  const totalPages = searchResults?.totalCount 
    ? Math.ceil(searchResults.totalCount / (filters.limit || 10)) 
    : 0;
  
  const currentPage = Math.floor((filters.offset || 0) / (filters.limit || 10)) + 1;
  
  // Show error toast on error
  useEffect(() => {
    if (isError && error) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to fetch search results',
        variant: 'destructive'
      });
    }
  }, [isError, error, toast]);
  
  // Render set card
  const renderSetCard = (set: SearchResults['sets'][0]) => (
    <Card key={set.id} className="bg-gray-800 border-none rounded-lg overflow-hidden mb-3 hover:bg-gray-700 transition-colors">
      <div className="flex">
        <div className="w-24 h-24 bg-gradient-to-br from-purple-600 to-blue-400 flex-shrink-0">
          {set.image_url ? (
            <img src={set.image_url} alt={set.artist_name} className="w-full h-full object-cover" />
          ) : (
            <div className="flex items-center justify-center h-full w-full">
              <Music className="h-10 w-10 text-white/70" />
            </div>
          )}
        </div>
        <div className="p-4 flex-grow">
          <h3 className="font-bold text-lg line-clamp-1">{set.artist_name}</h3>
          <div className="flex items-center mt-1">
            <MapPin className="h-3 w-3 text-gray-400 mr-1 flex-shrink-0" />
            <span className="text-sm text-gray-400 line-clamp-1">{set.location_name}</span>
          </div>
          {set.event_name && (
            <div className="text-sm text-gray-400 line-clamp-1 mt-1">{set.event_name}</div>
          )}
          <div className="flex items-center mt-2">
            <CalendarIcon2 className="h-3 w-3 text-gray-500 mr-1 flex-shrink-0" />
            <span className="text-xs text-gray-500">
              {new Date(set.event_date).toLocaleDateString()}
            </span>
            
            {set.elo_rating && (
              <div className="ml-auto">
                <Badge variant="outline" className="bg-amber-900/30 text-amber-400 hover:bg-amber-900/50 border-amber-900">
                  {Math.round(set.elo_rating)} ELO
                </Badge>
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
  
  return (
    <div className="container mx-auto px-4 py-4">
      <div className="flex flex-col md:flex-row gap-6">
        {/* Filter sidebar */}
        <div className={`w-full md:w-1/4 md:block ${isFilterExpanded ? 'block' : 'hidden'}`}>
          <Card className="bg-gray-800 border-none">
            <CardHeader>
              <CardTitle className="flex items-center">
                <FilterIcon className="mr-2 h-5 w-5" />
                Filter Sets
              </CardTitle>
              <CardDescription>
                Refine your search results
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Artist Filter */}
              <div className="space-y-2">
                <Label htmlFor="artistName">Artist Name</Label>
                <Input
                  id="artistName"
                  placeholder="Search by artist"
                  value={filters.artistName || ''}
                  onChange={(e) => handleFilterChange('artistName', e.target.value)}
                  className="bg-gray-700 border-gray-600"
                />
              </div>
              
              {/* Location Filter */}
              <div className="space-y-2">
                <Label htmlFor="location">Venue / Location</Label>
                <Input
                  id="location"
                  placeholder="Search by venue"
                  value={filters.location || ''}
                  onChange={(e) => handleFilterChange('location', e.target.value)}
                  className="bg-gray-700 border-gray-600"
                />
              </div>
              
              {/* Genre Filter */}
              <div className="space-y-2">
                <Label htmlFor="genre">Genre</Label>
                <Select
                  value={filters.genre || ''}
                  onValueChange={(value) => handleFilterChange('genre', value)}
                >
                  <SelectTrigger className="bg-gray-700 border-gray-600">
                    <SelectValue placeholder="Select genre" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    <SelectItem value="all_genres">All Genres</SelectItem>
                    {genresData?.genres?.map((genre) => (
                      <SelectItem key={genre.id} value={genre.id}>
                        {genre.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Date Range Filter */}
              <div className="space-y-2">
                <Label>Event Date Range</Label>
                <div className="flex flex-col gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="bg-gray-700 border-gray-600 w-full justify-start text-left font-normal"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {startDate ? format(startDate, 'PPP') : <span>Start date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-gray-800 border-gray-700">
                      <Calendar
                        mode="single"
                        selected={startDate}
                        onSelect={setStartDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="bg-gray-700 border-gray-600 w-full justify-start text-left font-normal"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {endDate ? format(endDate, 'PPP') : <span>End date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-gray-800 border-gray-700">
                      <Calendar
                        mode="single"
                        selected={endDate}
                        onSelect={setEndDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              
              {/* Rating Filter */}
              <div className="space-y-2">
                <Label htmlFor="rating">Rating</Label>
                <Select
                  value={filters.rating || ''}
                  onValueChange={(value) => handleFilterChange('rating', value as RatingEnum)}
                >
                  <SelectTrigger className="bg-gray-700 border-gray-600">
                    <SelectValue placeholder="Select Rating" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    <SelectItem value="">All Ratings</SelectItem>
                    <SelectItem value="liked">Liked</SelectItem>
                    <SelectItem value="neutral">Neutral</SelectItem>
                    <SelectItem value="disliked">Disliked</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Sort Options */}
              <div className="space-y-2">
                <Label htmlFor="sortBy">Sort By</Label>
                <div className="flex gap-2">
                  <Select
                    value={filters.sortBy || 'created_at'}
                    onValueChange={(value) => handleFilterChange('sortBy', value)}
                  >
                    <SelectTrigger className="bg-gray-700 border-gray-600 flex-grow">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-700">
                      <SelectItem value="created_at">Date Added</SelectItem>
                      <SelectItem value="event_date">Event Date</SelectItem>
                      <SelectItem value="elo_rating">Rating</SelectItem>
                      <SelectItem value="artist_name">Artist Name</SelectItem>
                      <SelectItem value="location_name">Venue Name</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Select
                    value={filters.sortDirection || 'desc'}
                    onValueChange={(value) => handleFilterChange('sortDirection', value as 'asc' | 'desc')}
                  >
                    <SelectTrigger className="bg-gray-700 border-gray-600 w-[100px]">
                      <SelectValue placeholder="Direction" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-700">
                      <SelectItem value="desc">Descending</SelectItem>
                      <SelectItem value="asc">Ascending</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {/* Reset Filters Button */}
              <Button 
                variant="secondary" 
                className="w-full bg-gray-700 hover:bg-gray-600"
                onClick={() => setFilters({
                  limit: 10,
                  offset: 0,
                  sortBy: 'created_at',
                  sortDirection: 'desc'
                })}
              >
                Reset Filters
              </Button>
            </CardContent>
          </Card>
        </div>
        
        {/* Results Section */}
        <div className="flex-1">
          {/* Mobile filter toggle */}
          <div className="md:hidden mb-4">
            <Button 
              onClick={() => setIsFilterExpanded(!isFilterExpanded)}
              variant="outline"
              className="w-full bg-gray-800 border-gray-700"
            >
              <FilterIcon className="mr-2 h-4 w-4" />
              {isFilterExpanded ? 'Hide Filters' : 'Show Filters'}
            </Button>
          </div>
          
          {/* Search header */}
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold">
              <SearchIcon className="inline-block mr-2 h-6 w-6" />
              Search Sets
            </h1>
            <div className="text-sm text-gray-400">
              {searchResults?.totalCount ? `${searchResults.totalCount} results found` : ''}
            </div>
          </div>
          
          {/* Active filters display */}
          {Object.entries(filters).some(([key, value]) => 
            value && !['limit', 'offset', 'sortBy', 'sortDirection'].includes(key)
          ) && (
            <div className="mb-4 flex flex-wrap gap-2 items-center">
              <span className="text-sm text-gray-400">Active filters:</span>
              
              {filters.artistName && (
                <Badge variant="secondary" className="bg-gray-700 text-gray-300">
                  Artist: {filters.artistName}
                  <button 
                    className="ml-1 hover:text-white" 
                    onClick={() => handleFilterChange('artistName', '')}
                  >
                    ×
                  </button>
                </Badge>
              )}
              
              {filters.location && (
                <Badge variant="secondary" className="bg-gray-700 text-gray-300">
                  Venue: {filters.location}
                  <button 
                    className="ml-1 hover:text-white" 
                    onClick={() => handleFilterChange('location', '')}
                  >
                    ×
                  </button>
                </Badge>
              )}
              
              {filters.genre && genresData?.genres && (
                <Badge variant="secondary" className="bg-gray-700 text-gray-300">
                  Genre: {genresData.genres.find(g => g.id === filters.genre)?.label || filters.genre}
                  <button 
                    className="ml-1 hover:text-white" 
                    onClick={() => handleFilterChange('genre', '')}
                  >
                    ×
                  </button>
                </Badge>
              )}
              
              {filters.startDate && (
                <Badge variant="secondary" className="bg-gray-700 text-gray-300">
                  After: {filters.startDate}
                  <button 
                    className="ml-1 hover:text-white" 
                    onClick={() => {
                      setStartDate(undefined);
                      const { startDate, ...rest } = filters;
                      setFilters(rest);
                    }}
                  >
                    ×
                  </button>
                </Badge>
              )}
              
              {filters.endDate && (
                <Badge variant="secondary" className="bg-gray-700 text-gray-300">
                  Before: {filters.endDate}
                  <button 
                    className="ml-1 hover:text-white" 
                    onClick={() => {
                      setEndDate(undefined);
                      const { endDate, ...rest } = filters;
                      setFilters(rest);
                    }}
                  >
                    ×
                  </button>
                </Badge>
              )}
              
              {filters.rating && (
                <Badge variant="secondary" className="bg-gray-700 text-gray-300">
                  Rating: {filters.rating}
                  <button 
                    className="ml-1 hover:text-white" 
                    onClick={() => handleFilterChange('rating', '')}
                  >
                    ×
                  </button>
                </Badge>
              )}
            </div>
          )}
          
          {/* Results list */}
          <Card className="bg-gray-800 border-none mb-4">
            <CardHeader className="pb-0">
              <CardTitle>Results</CardTitle>
              <CardDescription>
                Sets matching your search criteria
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4">
              {isLoading ? (
                <div className="space-y-3">
                  {Array(3).fill(0).map((_, i) => (
                    <Skeleton key={i} className="h-24 w-full bg-gray-700" />
                  ))}
                </div>
              ) : searchResults?.sets && searchResults.sets.length > 0 ? (
                <ScrollArea className="h-[600px] pr-4">
                  <div className="space-y-3">
                    {searchResults.sets.map(set => renderSetCard(set))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="text-center py-10">
                  <SearchIcon className="mx-auto h-12 w-12 text-gray-600 mb-3" />
                  <h3 className="text-xl font-semibold text-gray-400 mb-2">No results found</h3>
                  <p className="text-gray-500 mb-4 max-w-md mx-auto">
                    Try adjusting your search filters or try a different search term.
                  </p>
                </div>
              )}
            </CardContent>
            
            {/* Pagination */}
            {searchResults && totalPages > 1 && (
              <CardFooter className="flex justify-center pt-2 pb-4">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious 
                        href="#" 
                        onClick={(e) => {
                          e.preventDefault();
                          if (currentPage > 1) {
                            handlePageChange((currentPage - 2) * (filters.limit || 10));
                          }
                        }}
                        className={currentPage === 1 ? 'pointer-events-none opacity-50' : ''}
                      />
                    </PaginationItem>
                    
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      // Simple pagination logic - show 5 pages around current
                      let pageToShow;
                      if (totalPages <= 5) {
                        pageToShow = i + 1;
                      } else if (currentPage <= 3) {
                        pageToShow = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageToShow = totalPages - 4 + i;
                      } else {
                        pageToShow = currentPage - 2 + i;
                      }
                      
                      return (
                        <PaginationItem key={i}>
                          <PaginationLink
                            href="#"
                            onClick={(e) => {
                              e.preventDefault();
                              handlePageChange((pageToShow - 1) * (filters.limit || 10));
                            }}
                            isActive={currentPage === pageToShow}
                          >
                            {pageToShow}
                          </PaginationLink>
                        </PaginationItem>
                      );
                    })}
                    
                    <PaginationItem>
                      <PaginationNext 
                        href="#" 
                        onClick={(e) => {
                          e.preventDefault();
                          if (currentPage < totalPages) {
                            handlePageChange(currentPage * (filters.limit || 10));
                          }
                        }}
                        className={currentPage === totalPages ? 'pointer-events-none opacity-50' : ''}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </CardFooter>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}