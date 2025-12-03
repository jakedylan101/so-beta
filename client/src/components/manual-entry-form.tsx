import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { fetchWithAuth } from '@/lib/api/fetchWithAuth';

interface ManualEntryFormProps {
  initialArtistName?: string;
  onComplete: (data: {
    artistName: string;
    venueName: string;
    eventName?: string;
    eventDate: string;
    city: string;
    country?: string;
  }) => void;
  onCancel: () => void;
}

export function ManualEntryForm({ 
  initialArtistName = '', 
  onComplete, 
  onCancel 
}: ManualEntryFormProps) {
  const { toast } = useToast();
  const [artistName, setArtistName] = useState(initialArtistName);
  const [venueName, setVenueName] = useState('');
  const [eventName, setEventName] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');

  // Validation states
  const [validatingArtist, setValidatingArtist] = useState(false);
  const [artistValidated, setArtistValidated] = useState<boolean | null>(null);
  const [validatedArtistName, setValidatedArtistName] = useState<string | null>(null);

  const [validatingVenue, setValidatingVenue] = useState(false);
  const [venueValidated, setVenueValidated] = useState<boolean | null>(null);
  const [venueValidationError, setVenueValidationError] = useState<string | null>(null);
  const [validatedVenueData, setValidatedVenueData] = useState<{
    name: string;
    city: string;
    country: string;
  } | null>(null);
  const [venueOptions, setVenueOptions] = useState<Array<{
    venueName: string;
    address: string;
    city: string;
    country: string;
    placeId: string;
  }>>([]);
  const [showVenueDropdown, setShowVenueDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowVenueDropdown(false);
      }
    }
    
    if (showVenueDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showVenueDropdown]);

  // Validate artist when name changes
  useEffect(() => {
    if (!artistName || artistName.length < 2) {
      setArtistValidated(null);
      return;
    }

    const timer = setTimeout(async () => {
      setValidatingArtist(true);
      try {
        const response = await fetch(
          `/api/manual-entry/validate-artist?name=${encodeURIComponent(artistName)}`
        );
        const data = await response.json();
        
        if (data.success && data.validated) {
          setArtistValidated(true);
          setValidatedArtistName(data.artistName);
        } else {
          setArtistValidated(false);
          setValidatedArtistName(null);
        }
      } catch (error) {
        console.error('Artist validation error:', error);
        setArtistValidated(false);
      } finally {
        setValidatingArtist(false);
      }
    }, 500); // Debounce 500ms

    return () => clearTimeout(timer);
  }, [artistName]);

  // Validate venue when name changes
  useEffect(() => {
    if (!venueName || venueName.length < 2) {
      setVenueValidated(null);
      setVenueValidationError(null);
      setShowVenueDropdown(false);
      setVenueOptions([]);
      return;
    }
    
    // If user is typing, close dropdown until validation completes
    // This prevents dropdown from staying open while typing

    const timer = setTimeout(async () => {
      setValidatingVenue(true);
      try {
        // Don't send city parameter - we want ALL venues with this name, not filtered by city
        // User will choose the correct one from dropdown
        const query = `name=${encodeURIComponent(venueName)}`;
        
        console.log(`Validating venue: ${venueName} (searching all locations)`);
        
        const response = await fetch(
          `/api/manual-entry/validate-venue?${query}`
        );
        
        if (!response.ok) {
          console.error(`Venue validation HTTP error: ${response.status} ${response.statusText}`);
          setVenueValidated(false);
          setValidatedVenueData(null);
          return;
        }
        
        const data = await response.json();
        console.log('Venue validation response:', data);
        
        if (data.success && data.validated) {
          // Check if options array is available (always show dropdown, even with 1 option)
          if (data.multipleOptions && data.options && data.options.length > 0) {
            setVenueOptions(data.options);
            setShowVenueDropdown(true);
            setVenueValidated(null); // Pending selection
            setVenueValidationError(null);
            console.log(`Found ${data.options.length} venue option(s), showing dropdown`);
          } else if (data.venueName) {
            // Fallback: single result without options array (backward compatibility)
            setShowVenueDropdown(false);
            setVenueValidated(true);
            setVenueValidationError(null);
            setValidatedVenueData({
              name: data.venueName,
              city: data.city || city,
              country: data.country || ''
            });
            // Auto-fill city and country if not set
            if (!city && data.city) setCity(data.city);
            if (!country && data.country) setCountry(data.country);
          }
        } else {
          setShowVenueDropdown(false);
          setVenueValidated(false);
          setValidatedVenueData(null);
          // Store error message for display
          if (data.error) {
            setVenueValidationError(data.error);
            console.warn(`Venue validation failed: ${data.error}`);
          } else {
            setVenueValidationError(null);
          }
        }
        } catch (error) {
        console.error('Venue validation error:', error);
        setVenueValidated(false);
        setValidatedVenueData(null);
        setVenueValidationError(error instanceof Error ? error.message : 'Network error');
      } finally {
        setValidatingVenue(false);
      }
    }, 500); // Debounce 500ms

    return () => clearTimeout(timer);
  }, [venueName, city]);

  // Handle venue selection from dropdown
  const handleVenueSelect = (option: {
    venueName: string;
    address: string;
    city: string;
    country: string;
    placeId: string;
  }) => {
    // Close dropdown IMMEDIATELY - use functional update to ensure it happens
    setShowVenueDropdown(() => false);
    setVenueOptions(() => []); // Clear options immediately
    
    // Update validation state and form fields
    setVenueValidated(true);
    setValidatedVenueData({
      name: option.venueName,
      city: option.city,
      country: option.country
    });
    
    // Update form fields
    setVenueName(option.venueName);
    if (option.city) setCity(option.city);
    if (option.country) setCountry(option.country);
    
    // Force a re-render to ensure dropdown is hidden
    setTimeout(() => {
      setShowVenueDropdown(false);
    }, 0);
  };

  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!artistName || !venueName || !eventDate || !city) {
      toast({
        title: 'Missing required fields',
        description: 'Please fill in all required fields',
        variant: 'destructive'
      });
      return;
    }

    setIsSaving(true);

    try {
      // Save event to database first
      const response = await fetchWithAuth('/api/manual-entry/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          artistName: validatedArtistName || artistName,
          venueName: validatedVenueData?.name || venueName,
          eventName: eventName || undefined,
          eventDate: eventDate,
          city: validatedVenueData?.city || city,
          country: validatedVenueData?.country || country || undefined
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to save event');
      }

      // Event saved successfully, now complete the form
      // Use setTimeout to ensure state updates complete before calling onComplete
      setTimeout(() => {
        onComplete({
          artistName: validatedArtistName || artistName,
          venueName: validatedVenueData?.name || venueName,
          eventName: eventName || undefined,
          eventDate: eventDate,
          city: validatedVenueData?.city || city,
          country: validatedVenueData?.country || country || undefined
        });
      }, 100);
    } catch (error) {
      console.error('Error saving event:', error);
      toast({
        title: 'Error Saving Event',
        description: error instanceof Error ? error.message : 'Failed to save event. You can still log the set.',
        variant: 'destructive'
      });
      // Still complete the form even if save fails
      onComplete({
        artistName: validatedArtistName || artistName,
        venueName: validatedVenueData?.name || venueName,
        eventName: eventName || undefined,
        eventDate: eventDate,
        city: validatedVenueData?.city || city,
        country: validatedVenueData?.country || country || undefined
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 mt-4">
      <h3 className="text-lg font-semibold text-white mb-4">Add Event Manually</h3>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Artist Name */}
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">
            Artist Name *
          </label>
          <div className="relative">
            <Input
              value={artistName}
              onChange={(e) => setArtistName(e.target.value)}
              placeholder="e.g., Avalon Emerson"
              className="w-full bg-zinc-800 border-zinc-700 text-white"
              required
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {validatingArtist && (
                <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
              )}
              {!validatingArtist && artistValidated === true && (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              )}
              {!validatingArtist && artistValidated === false && (
                <XCircle className="h-4 w-4 text-red-500" />
              )}
            </div>
          </div>
          {artistValidated === false && (
            <p className="text-xs text-red-400 mt-1">
              Error validating artist. Will be added as manual entry.
            </p>
          )}
          {artistValidated === true && validatedArtistName && (
            <p className="text-xs text-green-400 mt-1">
              ✓ Validated: {validatedArtistName}
            </p>
          )}
        </div>

        {/* Venue Name */}
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">
            Venue Name *
          </label>
          <div className="relative">
            <Input
              value={venueName}
              onChange={(e) => setVenueName(e.target.value)}
              placeholder="e.g., Nowadays"
              className="w-full bg-zinc-800 border-zinc-700 text-white"
              required
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {validatingVenue && (
                <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
              )}
              {!validatingVenue && venueValidated === true && (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              )}
              {!validatingVenue && venueValidated === false && (
                <XCircle className="h-4 w-4 text-red-500" />
              )}
            </div>
          </div>
          {venueValidated === false && (
            <p className="text-xs text-red-400 mt-1">
              {venueValidationError 
                ? `Error: ${venueValidationError}. Will be added as manual entry.`
                : 'Error validating venue. Will be added as manual entry.'}
            </p>
          )}
          {venueValidated === true && validatedVenueData && (
            <p className="text-xs text-green-400 mt-1">
              ✓ Validated: {validatedVenueData.name}
            </p>
          )}
          {showVenueDropdown && venueOptions.length > 0 && (
            <div ref={dropdownRef} className="mt-2 border border-zinc-700 rounded-lg bg-zinc-800 max-h-48 overflow-auto z-50">
              <p className="text-xs text-gray-400 px-3 py-2 border-b border-zinc-700">
                Multiple venues found. Please select one:
              </p>
              {venueOptions.map((option, index) => (
                <button
                  key={option.placeId || index}
                  type="button"
                  onMouseDown={(e) => {
                    // CRITICAL: Prevent input blur FIRST
                    e.preventDefault();
                    e.stopPropagation();
                    // Also handle selection here to ensure it happens before blur
                    handleVenueSelect(option);
                  }}
                  onClick={(e) => {
                    // Prevent any additional click handling
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-zinc-700 border-b border-zinc-700 last:border-b-0 transition-colors cursor-pointer"
                >
                  <div className="font-medium text-white">{option.venueName}</div>
                  <div className="text-xs text-gray-400">
                    {option.address || `${option.city}${option.country ? `, ${option.country}` : ''}`}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Event/Tour Name */}
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">
            Event/Tour Name (optional)
          </label>
          <Input
            value={eventName}
            onChange={(e) => setEventName(e.target.value)}
            placeholder="e.g., Coachella, World Tour"
            className="w-full bg-zinc-800 border-zinc-700 text-white"
          />
        </div>

        {/* Event Date */}
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">
            Event Date *
          </label>
          <Input
            type="date"
            value={eventDate}
            onChange={(e) => setEventDate(e.target.value)}
            className="w-full bg-zinc-800 border-zinc-700 text-white"
            required
          />
        </div>

        {/* City */}
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">
            City *
          </label>
          <Input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="e.g., Los Angeles"
            className="w-full bg-zinc-800 border-zinc-700 text-white"
            required
          />
        </div>

        {/* Country */}
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">
            Country (optional)
          </label>
          <Input
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            placeholder="e.g., USA"
            className="w-full bg-zinc-800 border-zinc-700 text-white"
          />
        </div>

        {/* Buttons */}
        <div className="flex gap-3 pt-2">
          <Button
            type="submit"
            disabled={isSaving}
            className="flex-1 bg-green-500 text-black hover:bg-green-600 disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Add Event'}
          </Button>
          <Button
            type="button"
            onClick={onCancel}
            variant="outline"
            className="flex-1 bg-zinc-800 border-zinc-700 text-white hover:bg-zinc-700"
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
