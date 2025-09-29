import { parse } from 'node-html-parser';
import fetch from 'node-fetch';

// Interface for RA event data
export interface RAEvent {
  id: string;
  eventName: string;
  artistName: string;
  venueName: string;
  eventDate: string;
  city: string;
  country: string;
  source: string;
}

export async function fetchResidentAdvisorEvent(eventUrl: string): Promise<RAEvent | null> {
  try {
    // Extract event ID from URL
    const eventIdMatch = eventUrl.match(/\/events\/(\d+)/);
    if (!eventIdMatch || !eventIdMatch[1]) {
      console.error('Invalid Resident Advisor event URL');
      return null;
    }
    
    const eventId = eventIdMatch[1];
    
    // Fetch the event page
    const response = await fetch(eventUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      }
    });
    
    if (!response.ok) {
      console.error(`Error fetching event: ${response.status} ${response.statusText}`);
      return null;
    }
    
    const html = await response.text();
    const root = parse(html);
    
    // Parse event data from the HTML
    // Event name
    const eventNameElement = root.querySelector('h1');
    const eventName = eventNameElement ? eventNameElement.text.trim() : 'Unknown Event';
    
    // Main artist/lineup
    let artistName = 'Various Artists';
    const artistElements = root.querySelectorAll('.lineup span');
    if (artistElements && artistElements.length > 0) {
      // Get the first artist or combine if multiple headliners
      if (artistElements.length === 1) {
        artistName = artistElements[0].text.trim();
      } else {
        // Take the first artist or a combination
        artistName = artistElements[0].text.trim();
      }
    }
    
    // Venue name
    let venueName = 'Unknown Venue';
    const venueElement = root.querySelector('.venue__name');
    if (venueElement) {
      venueName = venueElement.text.trim();
    }
    
    // Event date
    let eventDate = '';
    const dateElement = root.querySelector('.event-detail time');
    if (dateElement) {
      const dateStr = dateElement.text.trim();
      
      // Try to parse and format the date
      try {
        const date = new Date(dateStr);
        eventDate = date.toISOString().split('T')[0]; // YYYY-MM-DD
      } catch {
        eventDate = dateStr;
      }
    }
    
    // Location (city/country)
    let city = '';
    let country = '';
    const locationElement = root.querySelector('.event-detail__address');
    if (locationElement) {
      const locationText = locationElement.text.trim();
      const parts = locationText.split(',').map(part => part.trim());
      
      if (parts.length >= 2) {
        city = parts[parts.length - 2];
        country = parts[parts.length - 1];
      } else if (parts.length === 1) {
        city = parts[0];
      }
    }
    
    return {
      id: `ra-${eventId}`,
      eventName,
      artistName,
      venueName,
      eventDate,
      city,
      country,
      source: 'resident-advisor'
    };
  } catch (error) {
    console.error('Error parsing Resident Advisor event:', error);
    return null;
  }
}

export async function searchResidentAdvisorEvents(query: string): Promise<RAEvent[]> {
  try {
    // Build the search URL
    const searchUrl = `https://ra.co/events?q=${encodeURIComponent(query)}`;
    
    // Fetch the search results page
    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      }
    });
    
    if (!response.ok) {
      console.error(`Error searching events: ${response.status} ${response.statusText}`);
      return [];
    }
    
    const html = await response.text();
    const root = parse(html);
    
    // Parse event cards from search results
    const eventCards = root.querySelectorAll('.jsx-3811456307');
    const events: RAEvent[] = [];
    
    for (const card of eventCards) {
      try {
        const linkElement = card.querySelector('a');
        if (!linkElement) continue;
        
        const eventUrl = linkElement.getAttribute('href');
        if (!eventUrl) continue;
        
        // Extract event ID from URL
        const eventIdMatch = eventUrl.match(/\/events\/(\d+)/);
        if (!eventIdMatch || !eventIdMatch[1]) continue;
        
        const eventId = eventIdMatch[1];
        
        // Event name
        const titleElement = card.querySelector('h3');
        const eventName = titleElement ? titleElement.text.trim() : 'Unknown Event';
        
        // Artist name
        let artistName = 'Various Artists';
        const artistElement = card.querySelector('.lineup');
        if (artistElement) {
          artistName = artistElement.text.trim();
        }
        
        // Venue name
        let venueName = 'Unknown Venue';
        const venueElement = card.querySelector('.venue__name');
        if (venueElement) {
          venueName = venueElement.text.trim();
        }
        
        // Event date
        let eventDate = '';
        const dateElement = card.querySelector('time');
        if (dateElement) {
          const dateStr = dateElement.text.trim();
          
          // Try to parse and format the date
          try {
            const date = new Date(dateStr);
            eventDate = date.toISOString().split('T')[0]; // YYYY-MM-DD
          } catch {
            eventDate = dateStr;
          }
        }
        
        // Location (city/country)
        let city = '';
        let country = '';
        const locationElement = card.querySelector('.event-listing__location');
        if (locationElement) {
          const locationText = locationElement.text.trim();
          const parts = locationText.split(',').map(part => part.trim());
          
          if (parts.length >= 2) {
            city = parts[parts.length - 2];
            country = parts[parts.length - 1];
          } else if (parts.length === 1) {
            city = parts[0];
          }
        }
        
        events.push({
          id: `ra-${eventId}`,
          eventName,
          artistName,
          venueName,
          eventDate,
          city,
          country,
          source: 'resident-advisor'
        });
      } catch (error) {
        console.error('Error parsing event card:', error);
        continue;
      }
    }
    
    return events;
  } catch (error) {
    console.error('Error searching Resident Advisor events:', error);
    return [];
  }
}