# Architecture Overview

## Overview

This repository contains a full-stack web application called "SoundOff" that allows users to rate, rank, and log live music sets they've experienced. The application follows a modern web architecture with a React frontend, Express.js backend, and PostgreSQL database.

The application features a music metadata service that aggregates data from multiple sources (Spotify, SoundCloud, Setlist.fm, Resident Advisor, and 1001Tracklists), user authentication via Supabase, and an ELO-based rating system for comparing and ranking music sets.

## System Architecture

The application follows a client-server architecture with the following main components:

### Frontend

- **Technology**: React with TypeScript
- **UI Framework**: Tailwind CSS with shadcn/ui components
- **State Management**: React Query for server state, React Context for application state
- **Routing**: Wouter for lightweight client-side routing

### Backend

- **Technology**: Express.js with TypeScript
- **API**: RESTful API endpoints for client-server communication
- **Authentication**: JWT-based authentication via Supabase
- **File Storage**: Local file storage with Multer for user uploads

### Database

- **Database**: PostgreSQL (hosted on Neon)
- **ORM**: Drizzle ORM for type-safe database operations
- **Schema**: Relational schema with entities for users, profiles, sets, artists, and comparisons

### External APIs

- **Music Metadata**: Integration with multiple music services:
  - Spotify API
  - SoundCloud API
  - Setlist.fm API
  - Resident Advisor (unofficial)
  - 1001Tracklists (unofficial)

## Key Components

### Client-Side Components

1. **Pages**: React components for different routes
   - Home page
   - Discover page
   - Log Set page
   - Lists page (rankings and timeline)
   - Profile page

2. **Context Providers**:
   - `AppContextProvider`: Manages user authentication state
   - `RankingModalProvider`: Handles set comparison and ranking functionality

3. **UI Components**:
   - Form components (auth, log set)
   - Set card components
   - Modal components
   - Navigation components

### Server-Side Components

1. **API Routes**:
   - User management
   - Set logging and retrieval
   - Artist and venue metadata
   - ELO rankings and comparisons

2. **Services**:
   - `MusicMetadataService`: Unified service for music metadata across different providers
   - Database operations via Drizzle ORM
   - Authentication middleware

3. **Data Models**:
   - Users and profiles
   - Music artists and mappings
   - Sets and comparisons
   - Rankings and preferences

## Data Flow

### Authentication Flow

1. User registers or logs in through the Auth modal
2. Supabase handles authentication and issues a JWT token
3. The token is stored in localStorage and sent with subsequent API requests
4. Server-side middleware validates the token on protected routes

### Set Logging Flow

1. User enters artist, venue, and event details in the Log Set form
2. Frontend sends data to the backend API
3. Backend validates the data and stores it in the database
4. Optional: User is prompted to compare the new set with existing sets

### Ranking Flow

1. User compares two sets side by side in the Ranking Modal
2. User selects the set they preferred
3. Backend calculates new ELO scores for both sets
4. Rankings are updated based on the new scores

### Metadata Retrieval Flow

1. Frontend requests data about artists, venues, or events
2. Backend queries the unified `MusicMetadataService`
3. `MusicMetadataService` aggregates data from multiple external APIs
4. Aggregated data is returned to the frontend

## External Dependencies

### Frontend Dependencies

- **@radix-ui/react-\***: UI component primitives
- **@tanstack/react-query**: Data fetching and server state management
- **@supabase/supabase-js**: Client for Supabase authentication
- **react-hook-form**: Form management with validation via Zod
- **Tailwind CSS**: Utility-first CSS framework
- **shadcn/ui**: Component library built on Radix UI and Tailwind

### Backend Dependencies

- **Express.js**: Web server framework
- **@neondatabase/serverless**: PostgreSQL client for Neon database
- **drizzle-orm**: Type-safe ORM for database operations
- **multer**: Middleware for handling file uploads
- **node-fetch**: Fetch API implementation for server-side requests

### External Services

- **Supabase**: Authentication and user management
- **Neon**: Serverless PostgreSQL database
- **Music APIs**: Spotify, SoundCloud, Setlist.fm, etc.

## Database Schema

The application uses a relational database schema with these main entities:

1. **Profiles**: User profile information, linked to Supabase Auth
2. **Music Artists**: Information about artists
3. **Artist Mappings**: Connections between different artist IDs across platforms
4. **Sets**: Records of live music performances that users have experienced
5. **Comparisons**: User comparisons between sets for ELO ranking
6. **Set Rankings**: Calculated ratings based on user comparisons

## Deployment Strategy

The application is configured for deployment on multiple platforms:

### Replit Deployment

- Uses Replit's Node.js environment
- Configuration in `.replit` file
- Supports hot reloading during development
- PostgreSQL database via Neon

### Vercel Deployment

- Configuration in `vercel.json`
- Separate builds for server and client
- API routes prefixed with `/api`
- Static client assets served from the built React app

### Build Process

1. Frontend: Vite builds the React application
2. Backend: ESBuild bundles the TypeScript server code
3. Combined build outputs are deployed together

## Architecture Decisions

### Database ORM Selection (Drizzle)

**Decision**: Use Drizzle ORM instead of Prisma or TypeORM.

**Rationale**: Drizzle provides type safety, isn't as heavy as Prisma, and integrates well with Neon's serverless PostgreSQL. The schema-defining approach allows for good type inference while keeping control over migrations.

### Authentication Strategy (Supabase)

**Decision**: Use Supabase for authentication rather than building a custom solution.

**Rationale**: Supabase provides a secure, production-ready authentication system with minimal setup. It handles user sessions, JWT tokens, email verification, and password resets out of the box.

### API Integration Strategy (Unified Service)

**Decision**: Create a unified `MusicMetadataService` that aggregates data from multiple sources.

**Rationale**: This abstraction layer simplifies the frontend by providing a single API for music metadata, regardless of the source. It also allows for fallbacks and enrichment by combining data from multiple services.

### Frontend Component Architecture (shadcn/ui)

**Decision**: Use shadcn/ui components built on Radix UI and Tailwind.

**Rationale**: This provides accessible, customizable components with consistent styling. The components are not installed as dependencies but copied into the codebase, allowing for maximum flexibility and customization.

### State Management Strategy

**Decision**: Use React Query for server state and React Context for application state.

**Rationale**: This separation of concerns allows for optimized data fetching and caching with React Query, while keeping global UI state manageable with React Context. This approach avoids the complexity of global state libraries like Redux for a relatively simple application.