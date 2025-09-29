import React from 'react';
import { Badge } from '@/components/ui/badge';

interface TagListProps {
  tags: string[];
  onClick?: (tag: string) => void;
  className?: string;
}

export function TagList({ tags, onClick, className = '' }: TagListProps) {
  if (!tags || tags.length === 0) {
    return <p className="text-gray-500 text-sm">No tags available</p>;
  }

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {tags.map((tag) => (
        <Badge
          key={tag}
          variant={onClick ? "outline" : "secondary"}
          className={onClick ? "cursor-pointer hover:bg-primary hover:text-primary-foreground" : ""}
          onClick={() => onClick && onClick(tag)}
        >
          {tag}
        </Badge>
      ))}
    </div>
  );
} 