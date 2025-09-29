import React from 'react';
import { Calendar } from 'lucide-react';

export function DiscoverEventsSection() {
  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-bold text-white">Events Near You</h2>
      <div className="bg-spotify-gray/20 rounded-lg p-6 flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-lg text-white">
            We're working on bringing local events to SoundOff.
          </p>
          <p className="text-spotify-light-gray">Stay tuned!</p>
        </div>
        <Calendar className="h-8 w-8 text-spotify-light-gray" />
      </div>
    </section>
  );
} 