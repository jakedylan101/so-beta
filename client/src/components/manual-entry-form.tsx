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
  const [venueSelectionLocked, setVenueSelectionLocked] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowVenueDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Validate artist when name changes
  useEffect(() => {
    if (!artistName || artistName.length < 2) {
      setArtistValidated(null);
      setValidatedArtistName(null);
      return;
    }

    const timer = setTimeout(async () => {
      setValidatingArtist(true);
      try {
        const response = await fetch(`/api/manual-entry/validate-artist?name=${encodeURIComponent(artistName)}`);
        const data = await response.json();
        
        if (data.validated) {
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
    }, 500);

    return () => clearTimeout(timer);
  }, [artistName]);

  // Validate venue when name changes
  useEffect(() => {
    if (venueSelectionLocked) return;
    if (!showVenueDropdown && venueValidated === true) return;
    
    if (!venueName || venueName.length < 2) {
      setVenueValidated(null);
      setVenueValidationError(null);
      setShowVenueDropdown(false);
      setVenueOptions([]);
      return;
    }

    const timer = setTimeout(async () => {
      setValidatingVenue(true);
      setVenueValidationError(null);
      try {
        const response = await fetch(`/api/manual-entry/validate-venue?name=${encodeURIComponent(venueName)}`);
        const data = await response.json();
        
        if (data.validated && data.options && data.options.length > 0) {
          setVenueOptions(data.options);
          setShowVenueDropdown(true);
          setVenueValidated(null); // Wait for user to select
        } else if (data.error) {
          setVenueValidated(false);
          setVenueValidationError(data.error);
          setShowVenueDropdown(false);
        } else {
          setVenueValidated(false);
          setShowVenueDropdown(false);
        }
      } catch (error) {
        console.error('Venue validation error:', error);
        setVenueValidated(false);
        setVenueValidationError('Failed to validate venue');
      } finally {
        setValidatingVenue(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [venueName, venueSelectionLocked, showVenueDropdown, venueValidated]);

  // Handle venue selection from dropdown
  const handleVenueSelect = (option: {
    venueName: string;
    address: string;
    city: string;
    country: string;
    placeId: string;
  }) => {
    console.log('Venue selected:', option.venueName);
    
    setVenueSelectionLocked(true);
    setShowVenueDropdown(false);
    setVenueOptions([]);
    
    setVenueValidated(true);
    setValidatedVenueData({
      name: option.venueName,
      city: option.city,
      country: option.country
    });
    
    setVenueName(option.venueName);
    if (option.city) setCity(option.city);
    if (option.country) setCountry(option.country);
    
    setTimeout(() => {
      setShowVenueDropdown(false);
    }, 0);
    
    setTimeout(() => {
      setVenueSelectionLocked(false);
    }, 1000);
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
      // Save event to database
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

      console.log('✅ Event saved successfully:', data);

      // Complete the form
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
        description: error instanceof Error ? error.message : 'Failed to save event.',
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
          <label className="text-sm font-medium text-gray-400 block mb-1">
            Artist Name *
          </label>
          <div className="relative">
            <Input
              value={artistName}
              onChange={(e) => setArtistName(e.target.value)}
              placeholder="Enter artist name"
              className={`bg-zinc-800 border-zinc-700 ${
                artistValidated === false ? 'border-yellow-500' : 
                artistValidated === true ? 'border-green-500' : ''
              }`}
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {validatingArtist && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
              {!validatingArtist && artistValidated === true && <CheckCircle2 className="h-4 w-4 text-green-500" />}
              {!validatingArtist && artistValidated === false && <XCircle className="h-4 w-4 text-yellow-500" />}
            </div>
          </div>
          {artistValidated === true && validatedArtistName && (
            <p className="text-xs text-green-400 mt-1">✓ Validated: {validatedArtistName}</p>
          )}
          {artistValidated === false && (
            <p className="text-xs text-yellow-400 mt-1">Artist not found in Spotify/SoundCloud. You can still add the event.</p>
          )}
        </div>

        {/* Venue Name */}
        <div className="relative">
          <label className="text-sm font-medium text-gray-400 block mb-1">
            Venue Name *
          </label>
          <div className="relative">
            <Input
              value={venueName}
              onChange={(e) => {
                setVenueName(e.target.value);
                setVenueValidated(null);
                setVenueSelectionLocked(false);
              }}
              placeholder="Enter venue name"
              className={`bg-zinc-800 border-zinc-700 ${
                venueValidated === false ? 'border-yellow-500' : 
                venueValidated === true ? 'border-green-500' : ''
              }`}
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {validatingVenue && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
              {!validatingVenue && venueValidated === true && <CheckCircle2 className="h-4 w-4 text-green-500" />}
              {!validatingVenue && venueValidated === false && <XCircle className="h-4 w-4 text-yellow-500" />}
            </div>
          </div>
          {venueValidationError && (
            <p className="text-xs text-yellow-400 mt-1">{venueValidationError}</p>
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
                    e.preventDefault();
                    e.stopPropagation();
                    handleVenueSelect(option);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-zinc-700 border-b border-zinc-700 last:border-b-0 transition-colors cursor-pointer"
                >
                  <div className="font-medium text-white">{option.venueName}</div>
                  <div className="text-xs text-gray-400">{option.address}</div>
                  <div className="text-xs text-gray-500">{option.city}, {option.country}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Event Name (optional) */}
        <div>
          <label className="text-sm font-medium text-gray-400 block mb-1">
            Event/Tour Name
          </label>
          <Input
            value={eventName}
            onChange={(e) => setEventName(e.target.value)}
            placeholder="e.g., Coachella 2025"
            className="bg-zinc-800 border-zinc-700"
          />
        </div>

        {/* Event Date */}
        <div>
          <label className="text-sm font-medium text-gray-400 block mb-1">
            Event Date *
          </label>
          <Input
            type="date"
            value={eventDate}
            onChange={(e) => setEventDate(e.target.value)}
            className="bg-zinc-800 border-zinc-700"
          />
        </div>

        {/* City (auto-filled from venue) */}
        <div>
          <label className="text-sm font-medium text-gray-400 block mb-1">
            City *
          </label>
          <Input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="City"
            className="bg-zinc-800 border-zinc-700"
          />
        </div>

        {/* Country (auto-filled from venue) */}
        <div>
          <label className="text-sm font-medium text-gray-400 block mb-1">
            Country
          </label>
          <Input
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            placeholder="Country"
            className="bg-zinc-800 border-zinc-700"
          />
        </div>

        {/* Buttons */}
        <div className="flex gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSaving || !artistName || !venueName || !eventDate || !city}
            className="flex-1 bg-green-500 hover:bg-green-600"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Saving...
              </>
            ) : (
              'Add Event'
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
