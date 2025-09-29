import type { RatingEnum } from '@shared/types';

export type SetCardProps = {
  setId: string | number;
  inModal?: boolean;
  ranking?: number;
  showDateBadge?: boolean;
  displayMode?: 'ranking' | 'timeline';
  event_date?: string;
  listened_date?: string;
}; 