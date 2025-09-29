# SoundOff Design References

## Design System
- Uses Tailwind CSS with custom Spotify-inspired color palette
- Component library based on shadcn/ui (Button, Modal, Card, etc.)
- Mobile-first, responsive layouts
- Accessible modals and navigation

## Figma/Design Files
- [Figma Prototype](https://www.figma.com/file/your-figma-link) (replace with actual link if available)
- Design tokens: Colors, spacing, typography in Tailwind config

## Key Design Notes
- Bottom navigation for mobile, sidebar for desktop
- Full-screen modals for Auth, Set Details, Ranking
- Loading skeletons and empty states for all lists
- Share button uses native dialog with clipboard fallback
- Consistent use of spacing, border radius, and color tokens

## Assets
- All icons are from Lucide or custom SVGs
- Images and avatars stored in Supabase Storage

## Accessibility
- All interactive elements have focus states
- Modals are keyboard accessible
- Color contrast meets WCAG AA 