import { cn } from "@/lib/utils";
import React from "react";

interface GenrePillProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
}

export function GenrePill({ active, className, children, ...props }: GenrePillProps) {
  return (
    <button
      className={cn(
        "px-4 py-1 text-sm rounded-full border transition-colors",
        active
          ? "bg-green-500 text-black font-semibold border-green-500"
          : "border-zinc-600 text-zinc-300 hover:bg-zinc-800",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
} 