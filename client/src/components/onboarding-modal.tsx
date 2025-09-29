import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { useLocation } from 'wouter';
import { queryClient } from '@/lib/queryClient';
import { supabase } from '@/lib/supabase';
import type { Database } from '../types/supabase';
import { useAppContext } from '@/context/app-context';

type MusicGenre = Database['public']['Tables']['music_genres']['Row'];

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  redirectPath?: string;
}

const fallbackGenres: MusicGenre[] = [
  { id: 'house', name: 'House', created_at: new Date().toISOString(), popularity_score: 100 },
  { id: 'techno', name: 'Techno', created_at: new Date().toISOString(), popularity_score: 95 },
  { id: 'ambient', name: 'Ambient', created_at: new Date().toISOString(), popularity_score: 90 },
  { id: 'edm', name: 'EDM', created_at: new Date().toISOString(), popularity_score: 85 },
  { id: 'hip-hop', name: 'Hip Hop', created_at: new Date().toISOString(), popularity_score: 80 },
  { id: 'rock', name: 'Rock', created_at: new Date().toISOString(), popularity_score: 75 },
  { id: 'trance', name: 'Trance', created_at: new Date().toISOString(), popularity_score: 70 },
  { id: 'drum-and-bass', name: 'Drum & Bass', created_at: new Date().toISOString(), popularity_score: 65 },
];

export function OnboardingModal({ isOpen, onClose, redirectPath }: OnboardingModalProps): JSX.Element {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const { setUser } = useAppContext();
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [selectedGenreNames, setSelectedGenreNames] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [genres, setGenres] = useState<MusicGenre[]>(fallbackGenres);
  const [isLoadingGenres, setIsLoadingGenres] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [forcedOpen, setForcedOpen] = useState(false);
  
  // Track modal open state
  useEffect(() => {
    if (isOpen) {
      setForcedOpen(true);
    }
  }, [isOpen]);
  
  // Use polling to reliably get user ID
  useEffect(() => {
    if (!forcedOpen) return;
    
    let attempt = 0;
    const maxAttempts = 15;
    let pollTimer: number | undefined;
    
    const pollForSession = async () => {
      const { data, error } = await supabase.auth.getSession();
      const id = data?.session?.user?.id;
      
      if (id && id.length === 36) {
        console.log('[Auth] Valid userId found:', id);
        setUserId(id);
      } else if (attempt < maxAttempts) {
        attempt++;
        pollTimer = window.setTimeout(pollForSession, 250);
      } else {
        console.error('[Auth] Max polling attempts reached');
      }
    };
    
    pollForSession();
    
    return () => {
      if (pollTimer) {
        window.clearTimeout(pollTimer);
      }
    };
  }, [forcedOpen]);

  // Effect to track when the modal becomes visible
  useEffect(() => {
    if (forcedOpen) {
      console.log("Onboarding modal opened");
      localStorage.setItem('onboardingShownAt', Date.now().toString());
      localStorage.setItem('pendingOnboarding', 'true');
    }
  }, [forcedOpen]);
  
  // Load genres when modal opens (with fallback)
  useEffect(() => {
    if (!forcedOpen) return;
    
    const fetchGenres = async () => {
      setIsLoadingGenres(true);
      try {
        console.log('[Genres] Fetching initial genres');
        const { data, error } = await supabase
          .from('music_genres')
          .select('*');
        
        if (error) throw error;
        
        if (data && data.length > 0) {
          console.log('[Genres] Loaded genres:', data);
          setGenres(data);
        }
      } catch (err) {
        console.error('[Genres] Error loading genres:', err);
        // Fallback always available
      } finally {
        setIsLoadingGenres(false);
      }
    };
    
    fetchGenres();
  }, [forcedOpen]);

  // Clear arrays at the beginning to avoid any previous state issues
  useEffect(() => {
    if (forcedOpen) {
      // Reset selected genres whenever modal opens
      setSelectedGenres([]);
      setSelectedGenreNames([]);
    }
  }, [forcedOpen]);

  const toggleGenre = (id: string, name: string) => {
    if (selectedGenres.includes(id)) {
      // Remove from both arrays
      setSelectedGenres(prev => prev.filter(gId => gId !== id));
      setSelectedGenreNames(prev => prev.filter(n => n !== name));
    } else {
      // Add to both arrays
      setSelectedGenres(prev => [...prev, id]);
      setSelectedGenreNames(prev => [...prev, name]);
    }
  };

  const savePreferences = async () => {
    if (!userId) {
      toast({
        title: "Error",
        description: "Session not established. Please try again.",
        variant: "destructive"
      });
      return;
    }
    
    if (selectedGenres.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one genre",
        variant: "destructive"
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Get current session to extract user data
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;
      
      if (!user) {
        throw new Error("User session not found");
      }
      
      // Very important - set the onboarding flags FIRST before any async operations
      console.log("[Profile] Setting onboarding flags FIRST");
      localStorage.setItem('onboardingComplete', 'true');
      localStorage.setItem('userIsAuthenticated', 'true');
      localStorage.removeItem('pendingOnboarding');
      localStorage.removeItem('newSignup');
      
      // Log only selectedGenreNames to avoid duplicates
      console.log("[Profile] Updating user profile with genres:", selectedGenreNames);
      
      // First ensure profile exists with basic info
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      let updateOperation;
      
      if (!existingProfile) {
        console.log("[Profile] Creating new profile");
        // Create profile if it doesn't exist
        updateOperation = supabase
          .from('profiles')
          .insert({
            id: userId,
            email: user.email,
            username: user.email?.split('@')[0] || userId.slice(0, 8),
            preferred_genres: selectedGenreNames,
            onboarded: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
      } else {
        console.log("[Profile] Updating existing profile");
        // Update existing profile
        updateOperation = supabase
          .from('profiles')
          .update({
            preferred_genres: selectedGenreNames,
            email: user.email,
            username: existingProfile.username || user.email?.split('@')[0] || userId.slice(0, 8),
            onboarded: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', userId);
      }
      
      const { error } = await updateOperation;
      
      if (error) {
        console.error("[Profile] Update error:", error);
        throw error;
      }
      
      console.log("[Profile] Update successful");
      
      // Create a user data object that reflects the updated profile
      const updatedUserData = {
        id: userId,
        email: user.email || '',
        username: existingProfile?.username || user.email?.split('@')[0] || userId.slice(0, 8),
        onboarded: true,
        preferred_genres: selectedGenreNames,
        isNewUser: false, // No longer a new user
        updated_at: new Date().toISOString()
      };
      
      // Store directly in localStorage for immediate persistence
      localStorage.setItem('userData', JSON.stringify(updatedUserData));
      
      // Update the React Query cache 
      queryClient.setQueryData(['/api/auth/user'], updatedUserData);
      
      // Force refresh all user data queries
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      await queryClient.refetchQueries({ queryKey: ['/api/auth/user'] });
      
      // Update AppContext state directly
      setUser(updatedUserData);
      
      toast({
        title: "Success!",
        description: "Profile created successfully."
      });
      
      // Close modal and allow navigation
      setForcedOpen(false);
      onClose();
      
      // Redirect to the appropriate page
      console.log("[Profile] Redirecting to:", redirectPath || '/');
      if (redirectPath) {
        navigate(redirectPath);
      } else {
        // Default to homepage if no redirect path
        navigate('/');
      }
    } catch (err) {
      console.error('[SavePreferences] Error:', err);
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to save preferences",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = async () => {
    if (!userId) {
      toast({
        title: "Error",
        description: "Session not established. Please try again.",
        variant: "destructive"
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Very important - set the onboarding flags FIRST before any async operations
      console.log("[Profile] Setting onboarding flags FIRST for skip action");
      localStorage.setItem('onboardingComplete', 'true');
      localStorage.setItem('userIsAuthenticated', 'true');
      localStorage.removeItem('pendingOnboarding');
      localStorage.removeItem('newSignup');
      
      // Get current session
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;
      
      if (!user) {
        throw new Error("User session not found");
      }
      
      console.log("[Profile] Skipping genre selection - updating profile");
      
      // First check if profile exists
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      let updateOperation;
      
      if (!existingProfile) {
        console.log("[Profile] Creating new profile without genres");
        // Create profile if it doesn't exist
        updateOperation = supabase
          .from('profiles')
          .insert({
            id: userId,
            email: user.email,
            username: user.email?.split('@')[0] || userId.slice(0, 8),
            preferred_genres: [],
            onboarded: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
      } else {
        console.log("[Profile] Updating existing profile without genres");
        // Update existing profile
        updateOperation = supabase
          .from('profiles')
          .update({
            preferred_genres: [],
            onboarded: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', userId);
      }
      
      const { error } = await updateOperation;
      
      if (error) {
        console.error("[Profile] Skip update error:", error);
        throw error;
      }
      
      console.log("[Profile] Skip update successful");
      
      // Create a user data object that reflects the updated profile
      const updatedUserData = {
        id: userId,
        email: user.email || '',
        username: existingProfile?.username || user.email?.split('@')[0] || userId.slice(0, 8),
        onboarded: true,
        preferred_genres: [],
        isNewUser: false, // No longer a new user
        updated_at: new Date().toISOString()
      };
      
      // Store directly in localStorage for immediate persistence
      localStorage.setItem('userData', JSON.stringify(updatedUserData));
      
      // Update the React Query cache
      queryClient.setQueryData(['/api/auth/user'], updatedUserData);
      
      // Force refresh all user data queries
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      await queryClient.refetchQueries({ queryKey: ['/api/auth/user'] });
      
      // Update AppContext state directly
      setUser(updatedUserData);
      
      toast({
        title: "Skipped",
        description: "You can set your preferences later in your profile."
      });
      
      // Close modal and allow navigation
      setForcedOpen(false);
      onClose();
      
      // Redirect to the appropriate page
      console.log("[Profile] Redirecting to:", redirectPath || '/');
      if (redirectPath) {
        navigate(redirectPath);
      } else {
        // Default to homepage if no redirect path
        navigate('/');
      }
    } catch (err) {
      console.error('[Skip] Error:', err);
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to skip",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Simple search filter
  const filteredGenres = searchTerm 
    ? genres.filter(genre => 
        genre.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : genres;
  
  // Handle attempts to close the modal before selection
  const handleOpenChange = (open: boolean) => {
    if (!open && forcedOpen) {
      toast({
        title: "Selection Required",
        description: "Please select genres and click Complete, or click Skip to continue.",
        variant: "destructive" 
      });
      // Don't allow closing
      return;
    }
  };
  
  return (
    <Dialog open={forcedOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md bg-gradient-to-br from-slate-900 to-slate-800 text-white">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            Select Your Favorite Music Genres
          </DialogTitle>
          <DialogDescription className="text-slate-300">
            Help us personalize your experience by selecting the genres you enjoy.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search genres..."
              className="pl-8 bg-slate-800 border-slate-700 text-white"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto">
            {isLoadingGenres ? (
              <div className="col-span-2 text-center text-slate-400">Loading genres...</div>
            ) : filteredGenres.length === 0 ? (
              <div className="col-span-2 text-center text-slate-400">No genres found</div>
            ) : (
              filteredGenres.map((genre) => (
                <div key={genre.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={genre.id}
                    checked={selectedGenres.includes(genre.id)}
                    onCheckedChange={() => toggleGenre(genre.id, genre.name)}
                    className="bg-slate-700 border-slate-600"
                  />
                  <Label
                    htmlFor={genre.id}
                    className="text-sm text-slate-200 cursor-pointer"
                  >
                    {genre.name}
                  </Label>
                </div>
              ))
            )}
          </div>
          
          <div className="flex flex-col gap-2">
            <Button
              onClick={savePreferences}
              disabled={isSubmitting || selectedGenres.length === 0 || !userId}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
            >
              {isSubmitting ? 'Saving...' : !userId ? 'Waiting for session...' : 'Complete'}
            </Button>
            
            <Button
              variant="ghost"
              onClick={handleSkip}
              disabled={isSubmitting || !userId}
              className="text-sm text-slate-400 hover:text-slate-300"
            >
              Skip for now
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}