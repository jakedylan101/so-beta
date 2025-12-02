import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';

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
  const [validatedVenueData, setValidatedVenueData] = useState<{
    name: string;
    city: string;
    country: string;
  } | null>(null);

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
      return;
    }

    const timer = setTimeout(async () => {
      setValidatingVenue(true);
      try {
        const query = city 
          ? `name=${encodeURIComponent(venueName)}&city=${encodeURIComponent(city)}`
          : `name=${encodeURIComponent(venueName)}`;
        
        const response = await fetch(
          `/api/manual-entry/validate-venue?${query}`
        );
        const data = await response.json();
        
        if (data.success && data.validated) {
          setVenueValidated(true);
          setValidatedVenueData({
            name: data.venueName,
            city: data.city || city,
            country: data.country || ''
          });
          // Auto-fill city and country if not set
          if (!city && data.city) setCity(data.city);
          if (!country && data.country) setCountry(data.country);
        } else {
          setVenueValidated(false);
          setValidatedVenueData(null);
        }
      } catch (error) {
        console.error('Venue validation error:', error);
        setVenueValidated(false);
      } finally {
        setValidatingVenue(false);
      }
    }, 500); // Debounce 500ms

    return () => clearTimeout(timer);
  }, [venueName, city]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!artistName || !venueName || !eventDate || !city) {
      toast({
        title: 'Missing required fields',
        description: 'Please fill in all required fields',
        variant: 'destructive'
      });
      return;
    }

    onComplete({
      artistName: validatedArtistName || artistName,
      venueName: validatedVenueData?.name || venueName,
      eventName: eventName || undefined,
      eventDate: eventDate,
      city: validatedVenueData?.city || city,
      country: validatedVenueData?.country || country || undefined
    });
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
              Error validating venue. Will be added as manual entry.
            </p>
          )}
          {venueValidated === true && validatedVenueData && (
            <p className="text-xs text-green-400 mt-1">
              ✓ Validated: {validatedVenueData.name}
            </p>
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
            className="flex-1 bg-green-500 text-black hover:bg-green-600"
          >
            Add Event
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
