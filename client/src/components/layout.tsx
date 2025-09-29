import React from 'react';
import { BottomNav } from './bottom-nav';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-spotify-black text-foreground">
      <div className="max-w-md mx-auto relative min-h-screen pb-24">
        {children}
      </div>
      <BottomNav />
    </div>
  );
} 