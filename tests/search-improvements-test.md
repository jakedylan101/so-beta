# Search Improvements Test Plan

## Overview
This document outlines the test cases for the Search Improvements feature implementation.

## 1. Database Indexes Test

### Pre-requisite
Run the migration script in Supabase SQL Editor:
- File: `db/migration-search-indexes.sql`

### Verify indexes were created:
```sql
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'sets' 
ORDER BY indexname;
```

Expected indexes:
- `idx_sets_artist_name`
- `idx_sets_artist_name_trgm`
- `idx_sets_location_name`
- `idx_sets_location_name_trgm`
- `idx_sets_event_date`
- `idx_sets_city`
- `idx_sets_city_trgm`
- `idx_sets_dedup`
- `idx_sets_artist_date`
- `idx_sets_location_date`

---

## 2. Search Functionality Tests

### 2.1 Artist-Only Search
| Test Case | Query | Expected Result |
|-----------|-------|-----------------|
| Basic artist search | "Avalon Emerson" | Returns events featuring Avalon Emerson |
| Partial artist name | "Charli" | Returns Charli XCX events |
| Case insensitive | "FRED AGAIN" | Returns Fred Again.. events |

### 2.2 Artist + Venue Search (Multi-field)
| Test Case | Query | Expected Result |
|-----------|-------|-----------------|
| Artist + venue | "Avalon Emerson Hart Plaza" | Returns Avalon Emerson at Hart Plaza |
| Artist + festival | "Charli XCX Coachella" | Returns Charli XCX at Coachella |
| Artist + city | "Peggy Gou Berlin" | Returns Peggy Gou events in Berlin |

### 2.3 Database Search (Manual Events)
| Test Case | Action | Expected Result |
|-----------|--------|-----------------|
| Manual event appears in search | Add event manually, then search for artist | Event appears in dropdown |
| Deduplication | Add same event twice | Only one result appears |

---

## 3. Manual Entry Validation Tests

### 3.1 Artist Validation
| Test Case | Input | Expected Result |
|-----------|-------|-----------------|
| Valid Spotify artist | "Avalon Emerson" | ✓ Green checkmark, validated via Spotify |
| Valid SoundCloud artist | "Tale Of Us" | ✓ Green checkmark, validated via SoundCloud |
| Invalid artist | "asdfghjkl123" | ✗ Red X, not validated (can still submit) |

### 3.2 Venue Validation (Google Maps)
| Test Case | Input | Expected Result |
|-----------|-------|-----------------|
| Valid venue | "Nowadays" | ✓ Dropdown with venue options |
| Multiple matches | "Brooklyn Mirage" | Dropdown shows multiple locations |
| Auto-fill city/country | Select venue from dropdown | City and Country fields auto-populated |

### 3.3 Manual Entry Flow
| Test Case | Action | Expected Result |
|-----------|--------|-----------------|
| Complete form | Fill all fields, submit | Event created, appears in Log Set form |
| Form persistence | After "Add Event" | Artist, venue, date, event name populate main form |
| Dropdown closes | Select venue option | Dropdown closes on single click |

---

## 4. Form Integration Tests

### 4.1 Search Dropdown Selection
| Test Case | Action | Expected Result |
|-----------|--------|-----------------|
| Select from dropdown | Click on search result | Form fields populated (artist, venue, date, event) |
| Cancel and re-search | Clear artist, type new query | Dropdown reappears with new results |

### 4.2 Manual Entry Integration
| Test Case | Action | Expected Result |
|-----------|--------|-----------------|
| Click "Enter Manually" | Click manual entry button | Manual entry form appears |
| Cancel manual entry | Click cancel | Returns to search mode |
| Complete manual entry | Fill form, submit | Main form populated, ready to log set |

---

## 5. Performance Tests

### 5.1 Response Time
| Metric | Target | How to Verify |
|--------|--------|---------------|
| Search response time | ≤300ms for 90% of queries | Check browser Network tab |
| Debounce delay | 300ms after typing stops | Observe search trigger timing |

### 5.2 Database Query Performance
```sql
-- Test query with EXPLAIN ANALYZE
EXPLAIN ANALYZE
SELECT id, artist_name, location_name, event_name, event_date, city, country, source
FROM sets
WHERE artist_name ILIKE '%avalon%'
ORDER BY event_date DESC
LIMIT 10;
```

---

## 6. Error Handling Tests

| Test Case | Scenario | Expected Result |
|-----------|----------|-----------------|
| API failure | Disconnect network | Error message shown, graceful degradation |
| Google Maps API error | Invalid API key | Error message, can still submit manually |
| Empty search results | Search for gibberish | "No results found" message with manual entry button |

---

## 7. Browser Console Logs to Verify

### Successful Search:
```
🔍 Searching database for: "avalon emerson"
🔍 SupabaseAdmin available: true
✅ Found X results from database:
✅ Added X database results to search results
```

### Successful Manual Entry:
```
✅ Event saved successfully: { setId: ... }
   Event ID: ...
   Artist: ...
   Venue: ...
Form reset complete. Current values: { artist: "...", venue_name: "...", ... }
```

### Venue Validation:
```
Validating venue: "nowadays"
Google Places API (New) response - places count: X
✓ Found X matching venues for "nowadays"
```

---

## 8. Success Metrics (from PRD)

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Successful searches (no manual entry) | ≥85% | Analytics tracking |
| Average search response time | ≤300ms | Performance monitoring |
| Search-to-log completion rate | ≥70% | User flow analytics |
| Manual events reused by others | ≥25% | Database query |
| User satisfaction | ≥4.5/5 | User feedback |
| Drop-off rate during search | ≤10% | Funnel analytics |

---

## Test Execution Checklist

- [ ] Run database migration in Supabase
- [ ] Verify indexes created
- [ ] Test basic artist search
- [ ] Test artist + venue search
- [ ] Test manual entry artist validation
- [ ] Test manual entry venue validation (Google Maps)
- [ ] Test venue dropdown selection (single click close)
- [ ] Test form persistence after "Add Event"
- [ ] Test manual event appears in search
- [ ] Verify response times
- [ ] Test error handling scenarios
