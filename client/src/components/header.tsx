import React from 'react';
import { useUser, useSignOut } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { useLocation } from 'wouter';

interface HeaderProps {
  openAuthModal: () => void;
}

export function Header({ openAuthModal }: HeaderProps) {
  const { data: user, isLoading } = useUser();
  const { mutate: signOut } = useSignOut();
  const [, setLocation] = useLocation();

  return (
    <header className="sticky top-0 z-10 bg-spotify-black p-4 border-b border-spotify-gray flex justify-between items-center">
      <div className="flex items-center">
        <h1 className="text-xl font-montserrat font-bold text-white" onClick={() => setLocation('/')} style={{cursor: 'pointer'}}>
          <span className="text-spotify-green">Sound</span>Off
        </h1>
      </div>
      <div className="flex items-center space-x-2">
        {!isLoading && !user ? (
          <Button 
            onClick={openAuthModal}
            className="bg-spotify-green text-black font-montserrat font-semibold hover:bg-spotify-green/80"
            size="sm"
          >
            Sign In
          </Button>
        ) : (
          <Button 
            onClick={() => signOut()}
            className="bg-transparent border border-white text-white font-montserrat font-semibold hover:bg-spotify-gray"
            size="sm"
            variant="outline"
          >
            Logout
          </Button>
        )}
      </div>
    </header>
  );
}
