import React from "react";
import { Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ComingSoonCardProps {
  title?: string;
  description?: string;
  onNotify?: () => void;
  onBrowse?: () => void;
}

export function ComingSoonCard({
  title = "Live Event Discovery Coming Soon!",
  description = "We're building integrations with Resident Advisor, Bandsintown, and more to bring you personalized event recommendations based on your music taste.",
  onNotify,
  onBrowse,
}: ComingSoonCardProps) {
  return (
    <div className="bg-gradient-to-br from-purple-800 to-zinc-900 p-6 rounded-xl text-center">
      <Calendar className="h-8 w-8 mx-auto text-white mb-3" />
      <p className="font-semibold text-yellow-400">{title}</p>
      <p className="text-sm text-zinc-300 mt-2">{description}</p>
      <div className="mt-4 flex justify-center gap-2">
        <Button variant="default" onClick={onNotify}>Get Notified</Button>
        <Button variant="ghost" onClick={onBrowse}>Browse RA ↗</Button>
      </div>
    </div>
  );
} 