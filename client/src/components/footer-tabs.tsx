import React from 'react';
import { useLocation } from 'wouter';
import { cn } from '@/lib/utils';
import { useAppContext } from '@/context/app-context';
import { HomeIcon, CompassIcon, ListIcon, UserIcon, PlusIcon } from 'lucide-react';

interface FooterTabsProps {
  openAuthModal: () => void;
}

export function FooterTabs({ openAuthModal }: FooterTabsProps) {
  const [location, setLocation] = useLocation();
  const { user } = useAppContext();
  
  const navigateTo = (path: string) => {
    if (path === '/log' && !user) {
      // If user tries to log a set but is not authenticated
      openAuthModal();
    } else {
      setLocation(path);
    }
  };
  
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-spotify-black border-t border-spotify-gray p-2">
      <div className="max-w-md mx-auto flex justify-around">
        <button 
          className={cn(
            "p-2 flex flex-col items-center w-16", 
            location === '/' ? "text-spotify-green" : "text-spotify-light-gray"
          )}
          onClick={() => navigateTo('/')}
        >
          <HomeIcon className="h-5 w-5" />
          <span className="text-xs mt-1">Home</span>
        </button>
        
        <button 
          className={cn(
            "p-2 flex flex-col items-center w-16", 
            location === '/discover' ? "text-spotify-green" : "text-spotify-light-gray"
          )}
          onClick={() => navigateTo('/discover')}
        >
          <CompassIcon className="h-5 w-5" />
          <span className="text-xs mt-1">Discover</span>
        </button>
        
        <button 
          className="p-2 flex flex-col items-center w-16"
          onClick={() => navigateTo('/log')}
        >
          <div className="bg-spotify-green text-black rounded-full h-10 w-10 flex items-center justify-center">
            <PlusIcon className="h-5 w-5" />
          </div>
          <span className="text-xs mt-1 text-spotify-light-gray">Log</span>
        </button>
        
        <button 
          className={cn(
            "p-2 flex flex-col items-center w-16", 
            location === '/lists' ? "text-spotify-green" : "text-spotify-light-gray"
          )}
          onClick={() => navigateTo('/lists')}
        >
          <ListIcon className="h-5 w-5" />
          <span className="text-xs mt-1">Rankings</span>
        </button>
        
        <button 
          className={cn(
            "p-2 flex flex-col items-center w-16", 
            location === '/profile' ? "text-spotify-green" : "text-spotify-light-gray"
          )}
          onClick={() => navigateTo('/profile')}
        >
          <UserIcon className="h-5 w-5" />
          <span className="text-xs mt-1">Profile</span>
        </button>
      </div>
    </div>
  );
}
