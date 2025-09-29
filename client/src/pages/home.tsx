import React, { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { SetCard } from '@/components/set-card';
import { useAppContext } from '@/context/app-context';
import { VolumeIcon } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface HomeProps {
  openAuthModal: () => void;
}

export function Home({ openAuthModal }: HomeProps) {
  const [, setLocation] = useLocation();
  const { user, setUser } = useAppContext();
  
  // Try to recover from completed onboarding state
  useEffect(() => {
    const checkAuthFlags = async () => {
      const isAuthenticated = localStorage.getItem('userIsAuthenticated') === 'true';
      const onboardingComplete = localStorage.getItem('onboardingComplete') === 'true';
      
      if (!user && (isAuthenticated || onboardingComplete)) {
        // Check session directly
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          // Try to load user data from localStorage
          const storedUserData = localStorage.getItem('userData');
          if (storedUserData) {
            try {
              const userData = JSON.parse(storedUserData);
              setUser(userData);
              
              // Reload the page in case recovery was needed
              // setTimeout(() => window.location.reload(), 100);
            } catch (e) {
              // Error parsing stored user data
            }
          }
        }
      }
    };
    
    checkAuthFlags();
  }, [user, setUser]);
  
  // Fetch user stats if logged in
  const { data: stats, isLoading: isLoadingStats } = useQuery({
    queryKey: [`/api/users/${user?.id}/stats`],
    enabled: !!user?.id,
  });
  
  // Fetch recent sets if logged in
  const { data: recentSets = [], isLoading: isLoadingSets } = useQuery({
    queryKey: [`/api/sets?userId=${user?.id}&limit=3`],
    enabled: !!user?.id,
  });
  
  const handleLogSetClick = () => {
    if (user) {
      setLocation('/log-set');
    } else {
      openAuthModal();
    }
  };

  const handleDiscoverClick = () => {
    setLocation('/discover');
  };

  const handleRankingsClick = () => {
    setLocation('/lists');
  };

  const handleProfileClick = () => {
    if (user) {
      setLocation('/profile');
    } else {
      openAuthModal();
    }
  };
  
  // Content for logged-out users (first login)
  if (!user) {
    return (
      <div className="flex flex-col items-center text-center min-h-[80vh] px-4 py-6">
        <h1 className="text-4xl font-montserrat font-bold mb-2">
          SoundOff <VolumeIcon className="inline-block ml-1 mb-1" />
        </h1>
        <p className="text-lg italic text-spotify-light-gray mb-8">
          Log, rank, relive your music;<br />
          discover where the beat<br />
          takes you next
        </p>
        
        {/* Music-themed illustration */}
        <div className="w-full max-w-sm mb-10">
          <div className="relative w-full">
            <div className="w-full h-32 bg-gradient-to-r from-purple-600 via-pink-500 to-orange-400 rounded-full opacity-80 blur-sm absolute -z-10 top-0"></div>
            <div className="relative z-10 flex justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="200" height="150" viewBox="0 0 200 150">
                <g transform="translate(0,0)">
                  <ellipse cx="100" cy="80" rx="80" ry="40" fill="#4B0082" opacity="0.7" />
                  <rect x="80" y="15" width="40" height="80" rx="5" fill="#00FFFF" />
                  <path d="M 85 40 L 115 40 L 115 70 L 100 60 L 85 70 Z" fill="#000000" />
                  <g transform="translate(50,10)">
                    <circle cx="10" cy="10" r="5" fill="#FFFFFF" opacity="0.8" />
                    <circle cx="80" cy="15" r="7" fill="#FFFFFF" opacity="0.8" />
                    <circle cx="30" cy="5" r="3" fill="#FFFFFF" opacity="0.8" />
                    <circle cx="100" cy="10" r="4" fill="#FFFFFF" opacity="0.8" />
                    <circle cx="120" cy="20" r="6" fill="#FFFFFF" opacity="0.8" />
                    <circle cx="20" cy="25" r="8" fill="#FFFFFF" opacity="0.8" />
                  </g>
                </g>
                <g transform="translate(65,0)">
                  <path d="M 10,20 Q 20,5 30,20 Q 40,35 50,20" stroke="#FFFFFF" strokeWidth="2" fill="none" opacity="0.6" />
                  <path d="M 0,40 Q 15,20 30,40 Q 45,60 60,40" stroke="#FFFFFF" strokeWidth="2" fill="none" opacity="0.6" /> 
                  <path d="M 15,60 Q 30,40 45,60 Q 60,80 75,60" stroke="#FFFFFF" strokeWidth="2" fill="none" opacity="0.6" />
                </g>
              </svg>
            </div>
          </div>
        </div>
        
        {/* Action buttons */}
        <div className="grid grid-cols-2 gap-4 w-full max-w-sm mb-4">
          <Button 
            onClick={handleDiscoverClick}
            className="h-14 bg-[#8D7147] hover:bg-[#A38456] text-white font-montserrat font-semibold rounded-md"
          >
            Discover
          </Button>
          <Button 
            onClick={handleLogSetClick}
            className="h-14 bg-[#8D7147] hover:bg-[#A38456] text-white font-montserrat font-semibold rounded-md"
          >
            Log a Set
          </Button>
        </div>
        
        <Button 
          onClick={openAuthModal}
          className="h-14 w-full max-w-sm bg-[#8D7147] hover:bg-[#A38456] text-white font-montserrat font-semibold rounded-md"
        >
          Sign in/Sign Up
        </Button>
      </div>
    );
  }
  
  // Content for logged-in users (returning)
  return (
    <div className="flex flex-col items-center text-center min-h-[80vh] px-4 py-6">
      <h1 className="text-4xl font-montserrat font-bold mb-2">
        SoundOff <VolumeIcon className="inline-block ml-1 mb-1" />
      </h1>
      <p className="text-lg italic text-spotify-light-gray mb-8">
        Log, rank, relive your music;<br />
        discover where the beat<br />
        takes you next
      </p>
      
      {/* Music-themed illustration - same as for first login */}
      <div className="w-full max-w-sm mb-10">
        <div className="relative w-full">
          <div className="w-full h-32 bg-gradient-to-r from-purple-600 via-pink-500 to-orange-400 rounded-full opacity-80 blur-sm absolute -z-10 top-0"></div>
          <div className="relative z-10 flex justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="200" height="150" viewBox="0 0 200 150">
              <g transform="translate(0,0)">
                <ellipse cx="100" cy="80" rx="80" ry="40" fill="#4B0082" opacity="0.7" />
                <rect x="80" y="15" width="40" height="80" rx="5" fill="#00FFFF" />
                <path d="M 85 40 L 115 40 L 115 70 L 100 60 L 85 70 Z" fill="#000000" />
                <g transform="translate(50,10)">
                  <circle cx="10" cy="10" r="5" fill="#FFFFFF" opacity="0.8" />
                  <circle cx="80" cy="15" r="7" fill="#FFFFFF" opacity="0.8" />
                  <circle cx="30" cy="5" r="3" fill="#FFFFFF" opacity="0.8" />
                  <circle cx="100" cy="10" r="4" fill="#FFFFFF" opacity="0.8" />
                  <circle cx="120" cy="20" r="6" fill="#FFFFFF" opacity="0.8" />
                  <circle cx="20" cy="25" r="8" fill="#FFFFFF" opacity="0.8" />
                </g>
              </g>
              <g transform="translate(65,0)">
                <path d="M 10,20 Q 20,5 30,20 Q 40,35 50,20" stroke="#FFFFFF" strokeWidth="2" fill="none" opacity="0.6" />
                <path d="M 0,40 Q 15,20 30,40 Q 45,60 60,40" stroke="#FFFFFF" strokeWidth="2" fill="none" opacity="0.6" /> 
                <path d="M 15,60 Q 30,40 45,60 Q 60,80 75,60" stroke="#FFFFFF" strokeWidth="2" fill="none" opacity="0.6" />
              </g>
            </svg>
          </div>
        </div>
      </div>
      
      {/* Action buttons for returning users - 2x2 grid */}
      <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
        <Button 
          onClick={handleDiscoverClick}
          className="h-14 bg-[#8D7147] hover:bg-[#A38456] text-white font-montserrat font-semibold rounded-md"
        >
          Discover
        </Button>
        <Button 
          onClick={handleLogSetClick}
          className="h-14 bg-[#8D7147] hover:bg-[#A38456] text-white font-montserrat font-semibold rounded-md"
        >
          Log a Set
        </Button>
        <Button 
          onClick={handleRankingsClick}
          className="h-14 bg-[#8D7147] hover:bg-[#A38456] text-white font-montserrat font-semibold rounded-md"
        >
          Your Rankings
        </Button>
        <Button 
          onClick={handleProfileClick}
          className="h-14 bg-[#8D7147] hover:bg-[#A38456] text-white font-montserrat font-semibold rounded-md"
        >
          Your Profile
        </Button>
      </div>
    </div>
  );
}
