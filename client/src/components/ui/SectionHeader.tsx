import React from "react";

interface SectionHeaderProps {
  title: string;
  badge?: string;
  className?: string;
}

export function SectionHeader({ title, badge, className }: SectionHeaderProps) {
  return (
    <div className={`flex items-center gap-2 mb-2 ${className ?? ""}`}>
      <h2 className="text-lg font-semibold">{title}</h2>
      {badge && (
        <span className="bg-yellow-700 text-xs px-2 py-0.5 rounded-full text-white">{badge}</span>
      )}
    </div>
  );
} 