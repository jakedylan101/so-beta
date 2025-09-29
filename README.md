# SoundOff

A dynamic music fan platform that revolutionizes how users log, rate, and rank live music sets through an innovative Elo-based algorithm and engaging social features.

## Features

- **Log Live Music Sets**: Document your experience at concerts and festivals
- **Rate & Rank**: Like, neutral, or dislike the sets you've experienced
- **ELO Rating System**: Compare sets for personalized rankings
- **Discover**: Find trending sets and personalized recommendations
- **Profile Stats**: Track your music tastes and preferences
- **Social Features**: Connect with friends and share your music experiences

## Tech Stack

- **Frontend**: React with TypeScript, Tailwind CSS with shadcn/ui components
- **Backend**: Express.js API with TypeScript
- **Database**: PostgreSQL (hosted on Neon)
- **Authentication**: Supabase Auth
- **APIs**:
  - Setlist.fm for live music data
  - Spotify for artist images and metadata
  - SoundCloud for music playback
  - Resident Advisor for event information

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database
- API keys for:
  - Spotify
  - Setlist.fm
  - SoundCloud

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/jakedylan101/so-u-2.git
   cd so-u-2
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Set up environment variables:
   Create a `.env` file with the following:
   ```
   DATABASE_URL=your_postgresql_connection_string
   SPOTIFY_CLIENT_ID=your_spotify_client_id
   SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
   SETLIST_FM_API_KEY=your_setlist_fm_api_key
   SOUNDCLOUD_CLIENT_ID=your_soundcloud_client_id
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. Run the development server:
   ```
   npm run dev
   ```

## Usage

- **Home Page**: View your personal timeline and latest updates
- **Discover**: Find trending sets and personalized recommendations
- **Log Set**: Document a live music experience
- **Lists**: View and manage your rankings and saved sets
- **Profile**: See your stats, liked sets, and preferences

## Recent Changes

See [CHANGES.md](CHANGES.md) for details on recent updates and bug fixes.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgements

- [Setlist.fm](https://www.setlist.fm/) for providing live music data
- [Spotify](https://developer.spotify.com/) for artist information
- [SoundCloud](https://developers.soundcloud.com/) for music integration
- [Shadcn UI](https://ui.shadcn.com/) for beautiful React components