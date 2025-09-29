import React from 'react';
import { Search, Filter, SortDesc, SortAsc } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from '@/components/ui/popover';
import { 
  Accordion, 
  AccordionContent, 
  AccordionItem, 
  AccordionTrigger
} from '@/components/ui/accordion';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { format } from 'date-fns';

export interface FilterValue {
  searchTerm: string;
  timeFrame: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  artists: string[];
  genres: string[];
  venues: string[];
  ratings: string[];
  lengthRange: [number, number]; // in minutes [min, max]
  vibes: string[];
  dateRange: [Date | null, Date | null];
  eloRange: [number, number]; // [min, max]
}

interface FilterBarProps {
  filters: FilterValue;
  onFilterChange: (filters: FilterValue) => void;
  availableGenres?: string[];
  availableArtists?: string[];
  availableVenues?: string[];
  availableVibes?: string[];
  showEloFilter?: boolean;
  minimal?: boolean;
}

const DEFAULT_ELO_RANGE: [number, number] = [1000, 2000];

export function FilterBar({ 
  filters, 
  onFilterChange,
  availableGenres = [],
  availableArtists = [],
  availableVenues = [],
  availableVibes = [],
  showEloFilter = true,
  minimal = false
}: FilterBarProps) {
  // Handler functions
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFilterChange({
      ...filters,
      searchTerm: e.target.value
    });
  };

  const handleTimeFrameChange = (value: string) => {
    onFilterChange({
      ...filters,
      timeFrame: value
    });
  };

  const handleSortByChange = (value: string) => {
    onFilterChange({
      ...filters,
      sortBy: value
    });
  };

  const handleSortOrderToggle = () => {
    onFilterChange({
      ...filters,
      sortOrder: filters.sortOrder === 'desc' ? 'asc' : 'desc'
    });
  };

  const handleGenreToggle = (genre: string, checked: boolean) => {
    const updatedGenres = checked
      ? [...filters.genres, genre]
      : filters.genres.filter(g => g !== genre);
    
    onFilterChange({
      ...filters,
      genres: updatedGenres
    });
  };

  const handleRatingToggle = (rating: string, checked: boolean) => {
    const updatedRatings = checked
      ? [...filters.ratings, rating]
      : filters.ratings.filter(r => r !== rating);
    
    onFilterChange({
      ...filters,
      ratings: updatedRatings
    });
  };

  const handleEloRangeChange = (values: number[]) => {
    onFilterChange({
      ...filters,
      eloRange: [values[0], values[1]] as [number, number]
    });
  };

  const handleArtistToggle = (artist: string, checked: boolean) => {
    const updatedArtists = checked
      ? [...filters.artists, artist]
      : filters.artists.filter(a => a !== artist);
    
    onFilterChange({
      ...filters,
      artists: updatedArtists
    });
  };

  const handleVenueToggle = (venue: string, checked: boolean) => {
    const updatedVenues = checked
      ? [...filters.venues, venue]
      : filters.venues.filter(v => v !== venue);
    
    onFilterChange({
      ...filters,
      venues: updatedVenues
    });
  };

  const handleVibeToggle = (vibe: string, checked: boolean) => {
    const updatedVibes = checked
      ? [...filters.vibes, vibe]
      : filters.vibes.filter(v => v !== vibe);
    
    onFilterChange({
      ...filters,
      vibes: updatedVibes
    });
  };

  const handleLengthRangeChange = (values: number[]) => {
    onFilterChange({
      ...filters,
      lengthRange: [values[0], values[1]] as [number, number]
    });
  };

  const DEFAULT_LENGTH_RANGE: [number, number] = [15, 240]; // 15 min to 4 hours

  const handleResetFilters = () => {
    onFilterChange({
      searchTerm: '',
      timeFrame: 'all_time',
      sortBy: 'date',
      sortOrder: 'desc',
      artists: [],
      genres: [],
      venues: [],
      ratings: [],
      lengthRange: DEFAULT_LENGTH_RANGE,
      vibes: [],
      dateRange: [null, null],
      eloRange: DEFAULT_ELO_RANGE
    });
  };

  // Render the minimal version with just search and sort
  if (minimal) {
    return (
      <div className="flex items-center space-x-2 mb-4">
        <div className="relative flex-1">
          <Input
            type="text"
            placeholder="Search artist, venue..."
            value={filters.searchTerm}
            onChange={handleSearchChange}
            className="bg-spotify-gray border-none rounded-full focus-visible:ring-spotify-green text-white pl-10"
          />
          <Search className="absolute left-3 top-2.5 h-5 w-5 text-spotify-light-gray" />
        </div>
        <Select value={filters.sortBy} onValueChange={handleSortByChange}>
          <SelectTrigger className="w-[120px] bg-spotify-light-black border-none text-white">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent className="bg-spotify-light-black border-spotify-gray text-white">
            <SelectItem value="date">Date</SelectItem>
            <SelectItem value="artist">Artist</SelectItem>
            <SelectItem value="venue">Venue</SelectItem>
            <SelectItem value="rating">Rating</SelectItem>
            {showEloFilter && <SelectItem value="elo">Elo Score</SelectItem>}
          </SelectContent>
        </Select>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleSortOrderToggle}
          className="text-spotify-light-gray hover:text-white hover:bg-spotify-gray"
        >
          {filters.sortOrder === 'desc' ? <SortDesc /> : <SortAsc />}
        </Button>
      </div>
    );
  }

  // Render the full filter bar with all options
  return (
    <div className="space-y-4 mb-6">
      {/* Search and Sort Row */}
      <div className="flex items-center space-x-2">
        <div className="relative flex-1">
          <Input
            type="text"
            placeholder="Search artist, venue..."
            value={filters.searchTerm}
            onChange={handleSearchChange}
            className="bg-spotify-gray border-none rounded-full focus-visible:ring-spotify-green text-white pl-10"
          />
          <Search className="absolute left-3 top-2.5 h-5 w-5 text-spotify-light-gray" />
        </div>
        <Select value={filters.timeFrame} onValueChange={handleTimeFrameChange}>
          <SelectTrigger className="w-[140px] bg-spotify-light-black border-none text-white">
            <SelectValue placeholder="Time frame" />
          </SelectTrigger>
          <SelectContent className="bg-spotify-light-black border-spotify-gray text-white">
            <SelectItem value="all_time">All Time</SelectItem>
            <SelectItem value="this_year">This Year</SelectItem>
            <SelectItem value="last_90_days">Last 90 Days</SelectItem>
            <SelectItem value="last_30_days">Last 30 Days</SelectItem>
            <SelectItem value="custom">Custom Range</SelectItem>
          </SelectContent>
        </Select>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="border-spotify-light-gray text-spotify-light-gray hover:bg-spotify-gray gap-2">
              <Filter className="h-4 w-4" /> Filters
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 bg-spotify-light-black border-spotify-gray text-white p-4">
            <div className="space-y-4">
              <h4 className="font-medium text-white mb-2">Filter Options</h4>
              
              <Accordion type="single" collapsible className="w-full">
                {/* Sort Options */}
                <AccordionItem value="sort" className="border-spotify-gray">
                  <AccordionTrigger className="text-white hover:text-spotify-green">Sort By</AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-2 pt-2">
                      <Select value={filters.sortBy} onValueChange={handleSortByChange}>
                        <SelectTrigger className="w-full bg-spotify-gray border-none text-white">
                          <SelectValue placeholder="Sort by" />
                        </SelectTrigger>
                        <SelectContent className="bg-spotify-light-black border-spotify-gray text-white">
                          <SelectItem value="date">Date</SelectItem>
                          <SelectItem value="artist">Artist</SelectItem>
                          <SelectItem value="venue">Venue</SelectItem>
                          <SelectItem value="rating">Rating</SelectItem>
                          {showEloFilter && <SelectItem value="elo">Elo Score</SelectItem>}
                        </SelectContent>
                      </Select>
                      <div className="flex items-center gap-2">
                        <Button
                          variant={filters.sortOrder === 'desc' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => onFilterChange({...filters, sortOrder: 'desc'})}
                          className={filters.sortOrder === 'desc' 
                            ? 'bg-spotify-green text-black' 
                            : 'border-spotify-light-gray text-spotify-light-gray'}
                        >
                          Descending
                        </Button>
                        <Button
                          variant={filters.sortOrder === 'asc' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => onFilterChange({...filters, sortOrder: 'asc'})}
                          className={filters.sortOrder === 'asc' 
                            ? 'bg-spotify-green text-black' 
                            : 'border-spotify-light-gray text-spotify-light-gray'}
                        >
                          Ascending
                        </Button>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Rating Filter */}
                <AccordionItem value="ratings" className="border-spotify-gray">
                  <AccordionTrigger className="text-white hover:text-spotify-green">Ratings</AccordionTrigger>
                  <AccordionContent>
                    <div className="flex flex-col space-y-2 pt-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="rating-liked" 
                          checked={filters.ratings.includes('liked')}
                          onCheckedChange={(checked) => 
                            handleRatingToggle('liked', checked === true)
                          }
                          className="data-[state=checked]:bg-spotify-green data-[state=checked]:border-spotify-green"
                        />
                        <Label htmlFor="rating-liked" className="flex items-center text-sm cursor-pointer">
                          <span className="text-lg mr-2">👍</span> Liked
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="rating-neutral" 
                          checked={filters.ratings.includes('neutral')}
                          onCheckedChange={(checked) => 
                            handleRatingToggle('neutral', checked === true)
                          }
                          className="data-[state=checked]:bg-spotify-green data-[state=checked]:border-spotify-green"
                        />
                        <Label htmlFor="rating-neutral" className="flex items-center text-sm cursor-pointer">
                          <span className="text-lg mr-2">😐</span> Neutral
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="rating-disliked" 
                          checked={filters.ratings.includes('disliked')}
                          onCheckedChange={(checked) => 
                            handleRatingToggle('disliked', checked === true)
                          }
                          className="data-[state=checked]:bg-spotify-green data-[state=checked]:border-spotify-green"
                        />
                        <Label htmlFor="rating-disliked" className="flex items-center text-sm cursor-pointer">
                          <span className="text-lg mr-2">👎</span> Disliked
                        </Label>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Genres Filter */}
                {availableGenres.length > 0 && (
                  <AccordionItem value="genres" className="border-spotify-gray">
                    <AccordionTrigger className="text-white hover:text-spotify-green">Genres</AccordionTrigger>
                    <AccordionContent>
                      <div className="flex flex-wrap gap-2 pt-2">
                        {availableGenres.map((genre) => (
                          <div key={genre} className="flex items-center space-x-2">
                            <Checkbox 
                              id={`genre-${genre}`} 
                              checked={filters.genres.includes(genre)}
                              onCheckedChange={(checked) => 
                                handleGenreToggle(genre, checked === true)
                              }
                              className="data-[state=checked]:bg-spotify-green data-[state=checked]:border-spotify-green"
                            />
                            <Label htmlFor={`genre-${genre}`} className="text-sm cursor-pointer">
                              {genre}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                )}

                {/* Artists Filter */}
                {availableArtists.length > 0 && (
                  <AccordionItem value="artists" className="border-spotify-gray">
                    <AccordionTrigger className="text-white hover:text-spotify-green">Artists</AccordionTrigger>
                    <AccordionContent>
                      <div className="flex flex-wrap gap-2 pt-2">
                        {availableArtists.map((artist) => (
                          <div key={artist} className="flex items-center space-x-2">
                            <Checkbox 
                              id={`artist-${artist}`} 
                              checked={filters.artists.includes(artist)}
                              onCheckedChange={(checked) => 
                                handleArtistToggle(artist, checked === true)
                              }
                              className="data-[state=checked]:bg-spotify-green data-[state=checked]:border-spotify-green"
                            />
                            <Label htmlFor={`artist-${artist}`} className="text-sm cursor-pointer">
                              {artist}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                )}

                {/* Venues Filter */}
                {availableVenues.length > 0 && (
                  <AccordionItem value="venues" className="border-spotify-gray">
                    <AccordionTrigger className="text-white hover:text-spotify-green">Venues</AccordionTrigger>
                    <AccordionContent>
                      <div className="flex flex-wrap gap-2 pt-2">
                        {availableVenues.map((venue) => (
                          <div key={venue} className="flex items-center space-x-2">
                            <Checkbox 
                              id={`venue-${venue}`} 
                              checked={filters.venues.includes(venue)}
                              onCheckedChange={(checked) => 
                                handleVenueToggle(venue, checked === true)
                              }
                              className="data-[state=checked]:bg-spotify-green data-[state=checked]:border-spotify-green"
                            />
                            <Label htmlFor={`venue-${venue}`} className="text-sm cursor-pointer">
                              {venue}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                )}

                {/* Vibes Filter */}
                {availableVibes.length > 0 && (
                  <AccordionItem value="vibes" className="border-spotify-gray">
                    <AccordionTrigger className="text-white hover:text-spotify-green">Vibes</AccordionTrigger>
                    <AccordionContent>
                      <div className="flex flex-wrap gap-2 pt-2">
                        {availableVibes.map((vibe) => (
                          <div key={vibe} className="flex items-center space-x-2">
                            <Checkbox 
                              id={`vibe-${vibe}`} 
                              checked={filters.vibes.includes(vibe)}
                              onCheckedChange={(checked) => 
                                handleVibeToggle(vibe, checked === true)
                              }
                              className="data-[state=checked]:bg-spotify-green data-[state=checked]:border-spotify-green"
                            />
                            <Label htmlFor={`vibe-${vibe}`} className="text-sm cursor-pointer">
                              {vibe}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                )}

                {/* Set Length Range */}
                <AccordionItem value="length" className="border-spotify-gray">
                  <AccordionTrigger className="text-white hover:text-spotify-green">Set Length</AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4 pt-2">
                      <div className="flex justify-between text-xs text-spotify-light-gray">
                        <span>{filters.lengthRange[0]} min</span>
                        <span>{filters.lengthRange[1]} min</span>
                      </div>
                      <Slider
                        defaultValue={[filters.lengthRange[0], filters.lengthRange[1]]}
                        min={15}
                        max={240}
                        step={15}
                        onValueChange={handleLengthRangeChange}
                        className="bg-spotify-gray"
                      />
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Elo Score Range */}
                {showEloFilter && (
                  <AccordionItem value="elo" className="border-spotify-gray">
                    <AccordionTrigger className="text-white hover:text-spotify-green">Elo Score Range</AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-4 pt-2">
                        <div className="flex justify-between text-xs text-spotify-light-gray">
                          <span>{filters.eloRange[0]}</span>
                          <span>{filters.eloRange[1]}</span>
                        </div>
                        <Slider
                          defaultValue={[filters.eloRange[0], filters.eloRange[1]]}
                          min={1000}
                          max={2000}
                          step={50}
                          onValueChange={handleEloRangeChange}
                          className="bg-spotify-gray"
                        />
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                )}
              </Accordion>

              <Button 
                variant="outline" 
                onClick={handleResetFilters}
                className="w-full border-spotify-light-gray text-spotify-light-gray hover:bg-spotify-gray mt-4"
              >
                Reset Filters
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Active Filters Display */}
      {(filters.artists.length > 0 || 
        filters.genres.length > 0 || 
        filters.venues.length > 0 || 
        filters.vibes.length > 0 || 
        filters.ratings.length > 0 || 
        filters.lengthRange[0] !== DEFAULT_LENGTH_RANGE[0] || 
        filters.lengthRange[1] !== DEFAULT_LENGTH_RANGE[1] || 
        filters.eloRange[0] !== DEFAULT_ELO_RANGE[0] || 
        filters.eloRange[1] !== DEFAULT_ELO_RANGE[1]) && (
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs text-spotify-light-gray">Active Filters:</span>
          
          {filters.artists.map(artist => (
            <Badge key={`artist-${artist}`} onRemove={() => handleArtistToggle(artist, false)}>
              <span className="font-medium">Artist:</span> {artist}
            </Badge>
          ))}
          
          {filters.genres.map(genre => (
            <Badge key={`genre-${genre}`} onRemove={() => handleGenreToggle(genre, false)}>
              <span className="font-medium">Genre:</span> {genre}
            </Badge>
          ))}
          
          {filters.venues.map(venue => (
            <Badge key={`venue-${venue}`} onRemove={() => handleVenueToggle(venue, false)}>
              <span className="font-medium">Venue:</span> {venue}
            </Badge>
          ))}
          
          {filters.vibes.map(vibe => (
            <Badge key={`vibe-${vibe}`} onRemove={() => handleVibeToggle(vibe, false)}>
              <span className="font-medium">Vibe:</span> {vibe}
            </Badge>
          ))}
          
          {filters.ratings.map(rating => (
            <Badge key={`rating-${rating}`} onRemove={() => handleRatingToggle(rating, false)}>
              <span className="font-medium">Rating:</span> {rating === 'liked' ? '👍' : rating === 'neutral' ? '😐' : '👎'}
            </Badge>
          ))}
          
          {(filters.lengthRange[0] !== DEFAULT_LENGTH_RANGE[0] || filters.lengthRange[1] !== DEFAULT_LENGTH_RANGE[1]) && (
            <Badge 
              onRemove={() => onFilterChange({...filters, lengthRange: DEFAULT_LENGTH_RANGE})}
            >
              <span className="font-medium">Length:</span> {filters.lengthRange[0]}-{filters.lengthRange[1]} min
            </Badge>
          )}
          
          {(filters.eloRange[0] !== DEFAULT_ELO_RANGE[0] || filters.eloRange[1] !== DEFAULT_ELO_RANGE[1]) && (
            <Badge 
              onRemove={() => onFilterChange({...filters, eloRange: DEFAULT_ELO_RANGE})}
            >
              <span className="font-medium">Elo:</span> {filters.eloRange[0]}-{filters.eloRange[1]}
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}

// Badge component for displaying active filters
interface BadgeProps {
  children: React.ReactNode;
  onRemove: () => void;
}

function Badge({ children, onRemove }: BadgeProps) {
  return (
    <div className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-spotify-gray text-white">
      <span className="mr-1">{children}</span>
      <button 
        onClick={onRemove}
        className="h-4 w-4 ml-1 rounded-full hover:bg-spotify-light-gray flex items-center justify-center text-spotify-light-gray hover:text-white transition-colors"
      >
        ×
      </button>
    </div>
  );
}