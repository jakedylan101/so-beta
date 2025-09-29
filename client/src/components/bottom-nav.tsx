import React from 'react';
import { Link, useLocation } from 'wouter';
import { Home, Compass, PlusCircle, Trophy, User } from 'lucide-react';

export function BottomNav() {
  const [location] = useLocation();

  const navItems = [
    { name: 'Home', path: '/', icon: Home },
    { name: 'Discover', path: '/discover', icon: Compass },
    { name: 'Log a Set', path: '/log-set', icon: PlusCircle },
    { name: 'My Rankings', path: '/lists', icon: Trophy },
    { name: 'Profile', path: '/profile', icon: User },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-spotify-light-black border-t border-spotify-gray py-2 px-4">
      <div className="flex justify-between items-center max-w-screen-lg mx-auto">
        {navItems.map((item) => {
          const isActive = location === item.path;
          const Icon = item.icon;
          
          return (
            <Link 
              key={item.path} 
              href={item.path}
              className={`flex flex-col items-center p-2 ${
                isActive 
                  ? 'text-spotify-green' 
                  : 'text-spotify-light-gray hover:text-white'
              }`}
            >
              <Icon className="h-6 w-6 mb-1" />
              <span className="text-xs">{item.name}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}