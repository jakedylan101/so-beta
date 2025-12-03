import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { apiRequest, postJSON } from '@/lib/queryClient';
import { useLocation } from 'wouter';
import { useAppContext } from '@/context/app-context';
import { useRankingModalContext } from '@/context/ranking-modal-context';
import { ArtistSearchDropdown } from './artist-search-dropdown';
import { ManualEntryForm } from './manual-entry-form';
import { format, parseISO, isValid } from 'date-fns';
import analytics from '@/services/analytics';
import { parse, format as formatDate } from 'date-fns';
import type { RatingEnum } from '@shared/types';
import { isValidRating, emojiToRating } from '@shared/types';
import { supabase } from '@/lib/supabase';

const formSchema = z.object({
  artist: z.string().min(1, "Artist name is required"),
  venue_name: z.string().min(1, "Venue is required"),
  event_name: z.string().optional(),
  event_date: z.string().min(1, "Event date is required"),
  experience_date: z.string().min(1, "Experience date is required"),
  rating: z.enum(["liked", "neutral", "disliked"] as const, {
    required_error: "Rating is required",
  }),
  friends_tags: z.string().optional(),
  notes: z.string().optional(),
  media_urls: z.array(z.string()).optional(),
});

type FormValues = z.infer<typeof formSchema>;

export function LogSetForm() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { user } = useAppContext();
  const { openRankingModal } = useRankingModalContext();
  const [selectedArtist, setSelectedArtist] = useState("");
  const [setCount, setSetCount] = useState(0);
  const [uploadedMediaUrls, setUploadedMediaUrls] = useState<string[]>([]);
  const [isDropdownActive, setIsDropdownActive] = useState(false);
  const [artistSelected, setArtistSelected] = useState(false);
  const [showManualEntry, setShowManualEntry] = useState(false);
  
  // Using the singleton Supabase client from @/lib/supabase

  // Form setup
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      artist: "",
      venue_name: "",
      event_name: "",
      event_date: "", // Don't default to today's date
      experience_date: "", // Start empty, let user set this explicitly
      rating: undefined,
      friends_tags: "",
      notes: "",
      media_urls: [],
    },
  });

  // Check for set data in localStorage and pre-fill form
  useEffect(() => {
    const logSetDataStr = localStorage.getItem('logSetData');
    if (logSetDataStr) {
      try {
        const setData = JSON.parse(logSetDataStr);
        console.log('Pre-filling form with set data:', setData);
        
        // Apply the requested mappings
        form.setValue('artist', setData.artist_name || '');
        form.setValue('venue_name', setData.venue_name || setData.title || '');
        form.setValue('event_name', setData.event_name || '');
        
        // Format the date from ISO to MM/DD/YY if available
        if (setData.event_date) {
          try {
            const parsedDate = parseISO(setData.event_date);
            if (isValid(parsedDate)) {
              const formattedDate = format(parsedDate, 'MM/dd/yy');
              form.setValue('event_date', formattedDate);
            } else {
              form.setValue('event_date', setData.event_date);
            }
          } catch (dateError) {
            console.error('Error formatting date:', dateError);
            form.setValue('event_date', setData.event_date);
          }
        }
        
        // Set the selected artist state to match the form value
        setSelectedArtist(setData.artist_name || '');
        
        // Clear the localStorage data after using it
        localStorage.removeItem('logSetData');
      } catch (error) {
        console.error('Error parsing logSetData from localStorage:', error);
      }
    }
  }, [form]);

  // Get set count using React Query
  const { data: countData } = useQuery<{ count: number }>({
    queryKey: ['/api/sets/count'],
    enabled: !!user
  });
  
  // Update set count when countData changes
  useEffect(() => {
    if (countData?.count !== undefined) {
      console.log('Set count loaded:', countData.count);
      setSetCount(countData.count);
    } else {
      // Default to 0 if no data
      setSetCount(0);
    }
  }, [countData]);
  
  // Log set mutation
  const { mutate: logSet, isPending } = useMutation({
    mutationFn: async (formData: FormValues) => {
      console.log("formData.rating raw:", formData.rating);
      if (!isValidRating(formData.rating)) {
        throw new Error("Invalid rating value");
      }
      
      const payload = {
        // Map formData to match the database column names exactly
        artist_name: formData.artist,
        location_name: formData.venue_name,
        event_name: formData.event_name,
        event_date: formData.event_date,
        listened_date: formData.experience_date,
        rating: formData.rating, // No need to map - using correct enum now
        tagged_friends: formData.friends_tags ? formData.friends_tags.split(',').map(tag => tag.trim()) : [],
        notes: formData.notes || "",
        media_urls: formData.media_urls || [],
      };
      console.log("Submitting set data:", payload);
      const response = await apiRequest<any>('/api/sets', {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: { 'Content-Type': 'application/json' }
      });
      
      return response;
    },
    onSuccess: async (responseData: any) => {
      toast({
        title: "Set logged successfully!",
        description: "Your new set has been saved.",
      });
      
      // Store the last submitted set data in localStorage for fallback purposes
      try {
        window.localStorage.setItem('lastSubmittedSet', JSON.stringify(responseData));
      } catch (err) {
        console.warn('Failed to save set data to localStorage:', err);
      }
      
      // Track the set log event in analytics
      if (responseData?.set_id) {
        analytics.trackSetLogged(
          responseData.set_id, 
          responseData.artist_name || form.getValues().artist
        );
      }
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/sets'] });
      queryClient.invalidateQueries({ queryKey: ['/api/elo/rankings'] });
      queryClient.invalidateQueries({ queryKey: [`/api/users/${user?.id}/stats`] });
      
      form.reset();
      
      // Instead of relying on potentially stale state or countData, 
      // explicitly fetch the count directly from the server
      try {
        // Wait for Supabase to become consistent
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Try up to 3 times to get an accurate count
        let retries = 0;
        let actualCount = 0;
        
        while (retries < 3) {
          const countResponse = await apiRequest<{count: number}>('/api/sets/count');
          actualCount = countResponse.count;
          console.log(`[RankingModal] Attempt ${retries + 1}: Count = ${actualCount}`);
          
          if (actualCount > 0) break;
          
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, retries) * 100));
          retries++;
        }
        
        // Get the set ID from the response
        const setId = responseData?.set_id;
        
        // Make the decision based on the count
        if (actualCount <= 1) {
          // First set - redirect to lists
          console.log("[RankingModal] First set detected - redirecting to lists");
          setLocation('/lists');
        } else {
          // Not the first set - show the ranking modal
          console.log("[RankingModal] Subsequent set detected - opening ranking modal for set ID:", setId);
          
          // Make sure we have a valid set ID before opening the modal
          if (setId) {
            // Slight delay to ensure the modal opens properly
            setTimeout(() => {
              console.log("[RankingModal] Opening ranking modal with set ID:", setId);
              openRankingModal(setId);
            }, 300);
          } else {
            console.error("[RankingModal] Cannot open ranking modal - missing set ID", responseData);
            // As a fallback, redirect to lists
            setLocation('/lists');
          }
        }
      } catch (error) {
        console.error("[RankingModal] Error fetching set count:", error);
        // Default to opening ranking modal if we couldn't determine count
        console.log("[RankingModal] Error determining set count, defaulting to ranking modal");
        const setId = responseData?.set_id;
        if (setId) {
          setTimeout(() => {
            console.log("[RankingModal] Opening ranking modal after error with set ID:", setId);
            openRankingModal(setId);
          }, 300);
        } else {
          console.error("[RankingModal] Cannot open ranking modal after error - missing set ID", responseData);
          // Fallback to redirecting to lists
          setLocation('/lists');
        }
      }
      
      // Also refresh the count data for other components
      queryClient.invalidateQueries({ queryKey: ['/api/sets/count'] });
    },
    onError: (error: any) => {
      console.error("Set logging error:", error);
      toast({
        title: "Error logging set",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Handle artist selection from dropdown - completely revamped for dropdown issues
  const handleArtistSelect = (artist: {artistName: string; venueName?: string; eventName?: string; date?: string}) => {
    // Check if this is a manual entry (no venue name means user clicked "Enter Manually")
    if (!artist.venueName && !artist.date) {
      // This is a manual entry trigger
      setShowManualEntry(true);
      setArtistSelected(false);
      setIsDropdownActive(false);
      setSelectedArtist(artist.artistName);
      return;
    }

    // Normal selection from search results
    setArtistSelected(true);
    setShowManualEntry(false);
    setSelectedArtist(artist.artistName);
    
    form.setValue('artist', artist.artistName);
    if (artist.venueName) form.setValue('venue_name', artist.venueName);
    if (artist.eventName) form.setValue('event_name', artist.eventName);
    if (artist.date) form.setValue('event_date', artist.date); // ISO YYYY-MM-DD
    /* leave experience_date untouched - let user set it */
  };

  // Handle manual entry completion
  const handleManualEntryComplete = (data: {
    artistName: string;
    venueName: string;
    eventName?: string;
    eventDate: string;
    city: string;
    country?: string;
  }) => {
    // DON'T close the manual entry form - keep it open so user can complete the rest
    // Just populate the main form fields
    setArtistSelected(true);
    setSelectedArtist(data.artistName);
    setIsDropdownActive(false); // Close any search dropdowns
    
    // Populate all form fields
    form.setValue('artist', data.artistName);
    form.setValue('venue_name', data.venueName);
    if (data.eventName) form.setValue('event_name', data.eventName);
    form.setValue('event_date', data.eventDate);
    // Note: city and country are not in the form schema, but event data is saved
    
    toast({
      title: 'Event Saved',
      description: 'Event saved successfully. Complete the form below to log your set.',
    });
  };

  // Handle manual entry cancel
  const handleManualEntryCancel = () => {
    setShowManualEntry(false);
    setSelectedArtist('');
    form.setValue('artist', '');
  };
  
  const handleCloudinaryUpload = async (file: File): Promise<string | null> => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "t1zl9m3q"); // Your unsigned preset

    try {
      const response = await fetch("https://api.cloudinary.com/v1_1/dnwm05r2r/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Cloudinary upload failed');
      }

      const data = await response.json();
      return data.secure_url ?? null;
    } catch (error) {
      console.error("Error uploading to Cloudinary:", error);
      return null;
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    // Show upload in progress
    toast({
      title: "Uploading media...",
      description: "Please wait while we upload your files.",
    });
    
    const newUrls: string[] = [];
    let successCount = 0;
    let failCount = 0;
    
    for (const file of Array.from(files)) {
      try {
        console.log("Uploading file to Cloudinary:", file.name);
        
        const cloudinaryUrl = await handleCloudinaryUpload(file);
        
        if (!cloudinaryUrl) {
          throw new Error('Upload failed');
        }
        
        // Add the URL to our array
        newUrls.push(cloudinaryUrl);
        successCount++;
        
      } catch (error) {
        console.error("Error uploading file:", file.name, error);
        failCount++;
      }
    }
    
    if (newUrls.length > 0) {
      // Combine with any existing uploaded media
      const updatedUrls = [...uploadedMediaUrls, ...newUrls];
      setUploadedMediaUrls(updatedUrls);
      form.setValue("media_urls", updatedUrls);
      
      toast({
        title: `${successCount} file${successCount !== 1 ? 's' : ''} uploaded!`,
        description: `Your media has been attached to your set.`,
      });
    }
    
    if (failCount > 0) {
      toast({
        title: `${failCount} upload${failCount !== 1 ? 's' : ''} failed`,
        description: "Some files could not be uploaded. Please try again.",
        variant: "destructive",
      });
    }
  };

  const onSubmit = (data: FormValues) => {
    // We need to use the original FormValues format that logSet expects
    logSet(data);
  };
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {/* Artist Search Field */}
        <FormField
          control={form.control}
          name="artist"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-medium text-gray-400">Artist *</FormLabel>
              <div className="relative">
                <FormControl>
                  <Input
                    {...field}
                    value={selectedArtist || field.value}
                    onChange={(e) => {
                      field.onChange(e);
                      setSelectedArtist(e.target.value);
                      // Enable dropdown when typing, unless we've explicitly selected an artist
                      if (!artistSelected) {
                        setIsDropdownActive(e.target.value.length >= 2);
                      }
                    }}
                    onFocus={() => {
                      // Only show dropdown on focus if we haven't selected an artist yet
                      // and the input has enough characters
                      if (!artistSelected && (selectedArtist || field.value).length >= 2) {
                        setIsDropdownActive(true);
                      }
                    }}
                    onBlur={() => {
                      // Delay hiding the dropdown to allow click events to fire first
                      setTimeout(() => {
                        if (!artistSelected) {
                          setIsDropdownActive(false);
                        }
                      }, 200);
                    }}
                    placeholder="Search for artist..."
                    className="w-full bg-zinc-900 border-none rounded-lg focus:ring-2 focus:ring-green-500 text-white"
                  />
                </FormControl>
                {isDropdownActive && !artistSelected && !showManualEntry && (
                  <ArtistSearchDropdown
                    searchTerm={selectedArtist || field.value}
                    onSelect={handleArtistSelect}
                  />
                )}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
        
        {/* Manual Entry Form */}
        {showManualEntry && (
          <ManualEntryForm
            initialArtistName={selectedArtist}
            onComplete={handleManualEntryComplete}
            onCancel={handleManualEntryCancel}
          />
        )}
        
        {/* Venue Field */}
        <FormField
          control={form.control}
          name="venue_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-medium text-gray-400">Venue *</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder="Where was the show?"
                  className="w-full bg-zinc-900 border-none rounded-lg focus:ring-2 focus:ring-green-500 text-white"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        {/* Event Name Field */}
        <FormField
          control={form.control}
          name="event_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-medium text-gray-400">Event Name</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder="Tour or festival name"
                  className="w-full bg-zinc-900 border-none rounded-lg focus:ring-2 focus:ring-green-500 text-white"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        {/* Dates Field Group */}
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="event_date"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium text-gray-400">Event Date *</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    value={field.value && field.value.length >= 10 ? 
                      (() => {
                        try {
                          return format(parseISO(field.value), 'MM/dd/yy');
                        } catch (e) {
                          return field.value;
                        }
                      })() : 
                      field.value
                    }
                    placeholder="MM/DD/YY"
                    className="bg-zinc-900"
                    onChange={(e) => {
                      const inputValue = e.target.value;
                      
                      // For partial inputs, we don't try to parse yet
                      if (inputValue.length < 8) {
                        field.onChange(inputValue);
                        return;
                      }
                      
                      try {
                        // Attempt to parse when input looks reasonably complete
                        const parsedDate = parse(inputValue, 'MM/dd/yy', new Date());
                        
                        if (isValid(parsedDate)) {
                          // Convert to ISO format for form state
                          const isoDate = parsedDate.toISOString().split('T')[0];
                          field.onChange(isoDate);
                        } else {
                          // Pass through the raw input if not valid
                          field.onChange(inputValue);
                        }
                      } catch (error) {
                        // Pass through raw input if parsing fails
                        field.onChange(inputValue);
                      }
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="experience_date"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium text-gray-400">Experience Date *</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    value={field.value && field.value.length >= 10 ? 
                      (() => {
                        try {
                          return format(parseISO(field.value), 'MM/dd/yy');
                        } catch (e) {
                          return field.value;
                        }
                      })() : 
                      field.value
                    }
                    placeholder="MM/DD/YY"
                    className="bg-zinc-900"
                    onChange={(e) => {
                      const inputValue = e.target.value;
                      
                      // For partial inputs, we don't try to parse yet
                      if (inputValue.length < 8) {
                        field.onChange(inputValue);
                        return;
                      }
                      
                      try {
                        // Attempt to parse when input looks reasonably complete
                        const parsedDate = parse(inputValue, 'MM/dd/yy', new Date());
                        
                        if (isValid(parsedDate)) {
                          // Convert to ISO format for form state
                          const isoDate = parsedDate.toISOString().split('T')[0];
                          field.onChange(isoDate);
                        } else {
                          // Pass through the raw input if not valid
                          field.onChange(inputValue);
                        }
                      } catch (error) {
                        // Pass through raw input if parsing fails
                        field.onChange(inputValue);
                      }
                    }}
                  />
                </FormControl>
                <div className="flex space-x-2">
                <button 
                  type="button" 
                  className="text-xs text-green-500 hover:bg-zinc-800 transition-colors rounded px-2 py-1 mt-1 focus:outline-none focus:ring-1 focus:ring-green-500"
                  onClick={() => {
                      const eventDate = form.getValues().event_date;
                      if (eventDate && typeof eventDate === 'string') {
                        form.setValue('experience_date', eventDate);
                    }
                  }}
                >
                  Copy from event date
                </button>
                  <button 
                    type="button" 
                    className="text-xs text-green-500 hover:bg-zinc-800 transition-colors rounded px-2 py-1 mt-1 focus:outline-none focus:ring-1 focus:ring-green-500"
                    onClick={() => {
                      // Set to today's date in ISO format
                      form.setValue('experience_date', format(new Date(), 'yyyy-MM-dd'));
                    }}
                  >
                    Today
                  </button>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        {/* Rating Field */}
        <FormField
          control={form.control}
          name="rating"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-medium text-gray-400">Rating *</FormLabel>
              <div className="flex space-x-4 justify-center">
                <Button
                  type="button"
                  variant="outline"
                  className={`emoji-button h-16 w-16 flex items-center justify-center text-3xl bg-zinc-900 border-2 ${
                    field.value === "liked" ? "border-green-500" : "border-transparent"
                  } rounded-full hover:border-green-500 focus:outline-none`}
                  onClick={() => field.onChange("liked")}
                >
                  👍
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className={`emoji-button h-16 w-16 flex items-center justify-center text-3xl bg-zinc-900 border-2 ${
                    field.value === "neutral" ? "border-green-500" : "border-transparent"
                  } rounded-full hover:border-green-500 focus:outline-none`}
                  onClick={() => field.onChange("neutral")}
                >
                  😐
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className={`emoji-button h-16 w-16 flex items-center justify-center text-3xl bg-zinc-900 border-2 ${
                    field.value === "disliked" ? "border-green-500" : "border-transparent"
                  } rounded-full hover:border-green-500 focus:outline-none`}
                  onClick={() => field.onChange("disliked")}
                >
                  👎
                </Button>
              </div>
              <FormMessage className="text-center mt-2" />
            </FormItem>
          )}
        />
        
        {/* Tags Field */}
        <FormField
          control={form.control}
          name="friends_tags"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-medium text-gray-400">Friends/Tags</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder="Add friends or tags (comma separated)"
                  className="w-full bg-zinc-900 border-none rounded-lg focus:ring-2 focus:ring-green-500 text-white"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        {/* Notes Field */}
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-medium text-gray-400">Notes</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  placeholder="Add any notes or memories about this set..."
                  className="w-full min-h-[100px] bg-zinc-900 border-none rounded-lg focus:ring-2 focus:ring-green-500 text-white"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        {/* Media Upload Field */}
        <FormField
          control={form.control}
          name="media_urls"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-medium text-gray-400">Add Media</FormLabel>
              <div className="space-y-3">
                <div className="flex items-center gap-4">
                  <Button
                    type="button" 
                    variant="outline"
                    className="relative bg-zinc-900 text-white border-dashed border-zinc-600 hover:border-green-500"
                    onClick={() => {
                      const fileInput = document.getElementById('media-upload');
                      if (fileInput) {
                        fileInput.click();
                      }
                    }}
                  >
                    Upload Media
                    <Input
                      id="media-upload"
                      type="file"
                      accept="image/*,video/*,audio/*"
                      multiple
                      className="hidden"
                      onChange={handleFileUpload}
                    />
                  </Button>
                </div>
                
                {uploadedMediaUrls.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {uploadedMediaUrls.map((url, index) => {
                      // Determine media type
                      const isImage = url.match(/\.(jpg|jpeg|png|gif|webp)$/i);
                      const isVideo = url.match(/\.(mp4|webm|mov)$/i);
                      const isAudio = url.match(/\.(mp3|wav|ogg)$/i);
                      
                      return (
                        <div key={index} className="relative">
                          {isImage ? (
                            <img 
                              src={url} 
                              alt={`Media ${index + 1}`}
                              className="h-16 w-16 object-cover rounded-md border border-zinc-600" 
                            />
                          ) : isVideo ? (
                            <div className="h-16 w-16 flex items-center justify-center bg-zinc-800 rounded-md border border-zinc-600">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </div>
                          ) : isAudio ? (
                            <div className="h-16 w-16 flex items-center justify-center bg-zinc-800 rounded-md border border-zinc-600">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                              </svg>
                            </div>
                          ) : (
                            <div className="h-16 w-16 flex items-center justify-center bg-zinc-800 rounded-md border border-zinc-600">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              const updatedUrls = uploadedMediaUrls.filter((_, i) => i !== index);
                              setUploadedMediaUrls(updatedUrls);
                              field.onChange(updatedUrls);
                            }}
                            className="absolute -top-2 -right-2 bg-zinc-800 text-white rounded-full p-1 text-xs hover:bg-red-500"
                            aria-label="Remove media"
                          >
                            ✕
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
                
                <input type="hidden" {...field} />
                <FormMessage />
              </div>
            </FormItem>
          )}
        />
        
        {/* Submit Button */}
        <div className="mt-8">
          <Button
            type="submit"
            className="w-full py-6 bg-green-600 hover:bg-green-500 text-white transition-colors rounded-lg text-lg font-semibold flex items-center justify-center"
          >
            {isPending ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                Logging Set...
              </>
            ) : (
              'Log Set'
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}

