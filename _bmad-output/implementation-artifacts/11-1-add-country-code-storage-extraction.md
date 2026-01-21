# Story 11.1: Add Country Code Storage & Extraction

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **system**,
I want **to extract and store country codes from entry coordinates**,
so that **country information is available for display throughout the app**.

## Acceptance Criteria

### AC 1: Add Country Code Field
**Given** the Entry location schema
**When** the schema is updated
**Then** a `countryCode` field (ISO 3166-1 alpha-2) is added to the location object

### AC 2: Extract Country on Entry Create
**Given** I create an entry with lat/long coordinates
**When** the entry is saved
**Then** the system reverse geocodes the coordinates to determine the country
**And** the country code (e.g., "US", "DE", "JP") is stored with the entry location

### AC 3: Extract Country on Entry Update
**Given** I edit an entry and change the location
**When** the entry is saved
**Then** the country code is updated based on the new coordinates

### AC 4: Backfill Existing Entries
**Given** existing entries have lat/long but no country code
**When** I run the backfill utility
**Then** all entries with locations are updated with country codes

## Tasks / Subtasks

### Phase 1: Update Database Schema

- [x] Add countryCode field to Prisma schema (AC: 1)
  - [x] Open `prisma/schema.prisma`
  - [x] Add `countryCode String?` field to Entry model (nullable, for gradual adoption)
  - [x] Run `npx prisma migrate dev --name add-country-code` to generate migration
  - [x] Run `npx prisma generate` to update Prisma client types

### Phase 2: Create Reverse Geocoding Utility

- [x] Create reverse geocoding utility (AC: 2, 3)
  - [x] Create `src/utils/reverse-geocode.ts`:
    - Add `reverseGeocode(latitude: number, longitude: number): Promise<string | null>` function
    - Call Nominatim reverse endpoint: `https://nominatim.openstreetmap.org/reverse`
    - Query params: `lat`, `lon`, `format=json`, `addressdetails=1`
    - Set User-Agent header: "TravelBlogs/1.0" (OSM requirement)
    - Extract `address.country_code` from response (already uppercase in response)
    - Return uppercase 2-char country code (ISO 3166-1 alpha-2)
    - Return `null` if geocoding fails or country not found
    - Add retry logic with exponential backoff (rate limiting)
    - Add 1-second delay between requests (OSM policy compliance)
  - [x] Add unit tests in `tests/utils/reverse-geocode.test.ts`:
    - Test successful reverse geocoding (mock Nominatim response)
    - Test country code extraction (US, DE, JP examples)
    - Test null return on API failure
    - Test null return when country not in response
    - Test User-Agent header is set correctly
    - Test rate limiting compliance (1 req/sec delay)

### Phase 3: Update Entry Type Definitions

- [x] Update location types to include countryCode (AC: 1)
  - [x] Modify `src/utils/entry-location.ts`:
    - Add `countryCode?: string | null` to `EntryLocation` type
    - Update `formatEntryLocationDisplay()` to handle countryCode (no display changes yet)
  - [x] Modify `src/types/trip-overview.ts`:
    - Update `TripOverviewEntry` location type to include countryCode

### Phase 4: Update API Schemas and Endpoints

- [x] Update create entry API to extract country code (AC: 2)
  - [x] Modify `src/app/api/entries/route.ts` (POST):
    - Add `countryCode: z.string().length(2).toUpperCase().optional()` to createEntrySchema
    - After saving entry, if latitude and longitude exist, call `reverseGeocode(latitude, longitude)`
    - Update entry with country code: `await prisma.entry.update({ where: { id }, data: { countryCode } })`
    - Add countryCode to location object in API response transformation
    - Handle reverseGeocode failures gracefully (null countryCode is acceptable)
  - [x] Add tests in `tests/api/entries/create-entry.test.ts`:
    - Test country code extracted when creating entry with coordinates
    - Test null countryCode when reverse geocoding fails
    - Test entry creation succeeds even if geocoding fails

- [x] Update edit entry API to update country code (AC: 3)
  - [x] Modify `src/app/api/entries/[id]/route.ts` (PATCH):
    - Add `countryCode: z.string().length(2).toUpperCase().optional().nullable()` to updateEntrySchema
    - If latitude or longitude changes, call `reverseGeocode()` with new coordinates
    - Update entry with new country code
    - Add countryCode to location object in API response transformation
    - If location is removed (set to null), clear countryCode
  - [x] Add tests in `tests/api/entries/update-entry.test.ts`:
    - Test country code updated when location changes
    - Test country code cleared when location removed
    - Test country code unchanged when location not modified

- [x] Update entry GET endpoints to include countryCode
  - [x] Modify `src/app/api/entries/[id]/route.ts` (GET):
    - Add countryCode to location object in response transformation
  - [x] Modify `src/app/api/trips/[id]/overview/route.ts` (GET):
    - Add countryCode to location object for each entry in response

### Phase 5: Create Backfill Utility

- [x] Create backfill utility for existing entries (AC: 4)
  - [x] Create `src/utils/backfill-country-codes.ts`:
    - Similar structure to `backfill-gps.ts` and `backfill-image-compression.ts`
    - Use `hasRun` flag to prevent re-running
    - Query all entries with latitude and longitude but no countryCode
    - For each entry:
      - Call `reverseGeocode(latitude, longitude)` with 1-second delay
      - Update entry with countryCode if successful
      - Log progress every 10 entries
    - Handle API failures gracefully (skip entry, log warning, continue)
    - Log final stats (updated: X, skipped: Y, errors: Z)
  - [x] Add tests in `tests/utils/backfill-country-codes.test.ts`:
    - Test migration runs once (hasRun flag)
    - Test entries with coordinates are updated
    - Test entries without coordinates are skipped
    - Test API failures are handled without crashing
    - Test console output includes progress logs
    - Test rate limiting (1 req/sec delay between calls)

- [x] Integrate backfill into server startup (AC: 4)
  - [x] Modify `server.js`:
    - After image compression backfill, call `backfillCountryCodes(prisma)`
    - Wrap in try/catch to prevent server startup failure
    - Log start and completion messages
  - [x] Modify `src/instrumentation.ts`:
    - Add same backfill call for Next.js dev mode
    - Follow same pattern as existing backfills

### Phase 6: Testing and Validation

- [x] Comprehensive testing (AC: All)
  - [x] Run unit tests: `npm test -- tests/utils/reverse-geocode.test.ts`
  - [x] Run unit tests: `npm test -- tests/utils/backfill-country-codes.test.ts`
  - [x] Run API tests: `npm test -- tests/api/entries/`
  - [x] Run full test suite: `npm test`
  - [x] Manual testing:
    - Create entry with US coordinates (e.g., 40.7128, -74.0060 for NYC), verify countryCode "US"
    - Create entry with DE coordinates (e.g., 52.5200, 13.4050 for Berlin), verify countryCode "DE"
    - Create entry with JP coordinates (e.g., 35.6762, 139.6503 for Tokyo), verify countryCode "JP"
    - Edit entry and change location, verify countryCode updates
    - Create entry without location, verify no error and null countryCode
    - Restart server, verify backfill runs once and logs progress
    - Restart server again, verify backfill skipped (hasRun flag)
    - Check console for "[Country Code Backfill] ..." logs

## Dev Notes

### Developer Context

**Epic 11 Overview:**

This story is the foundation for the country flags feature. We're adding infrastructure to extract and store country codes from geographic coordinates. The country code will be used in subsequent stories to display flag emojis on entry cards, entry detail pages, and trip overview pages.

**Business Value:**

Country codes enable visual identification of travel destinations throughout the app. By storing this data at the entry level, we can aggregate country information at the trip level and provide quick visual indicators of where entries were created.

**User Experience Impact:**

This story has no direct UI changes - it's pure backend infrastructure. Users won't see any changes until Stories 11.2-11.4 are implemented. However, the backfill utility will ensure all existing entries get country codes populated automatically.

**Implementation Strategy:**

We're following the established pattern from Epic 7 (location features) and Story 10.2 (image compression backfill):
1. Add database field (nullable for gradual adoption)
2. Create utility function for core logic (reverse geocoding)
3. Update API endpoints to extract and store data
4. Create backfill utility for existing data
5. Integrate backfill into server startup

---

### Technical Requirements

**Database Schema Changes:**

Add `countryCode` field to Entry model in `prisma/schema.prisma`:

```prisma
model Entry {
  id           String      @id @default(cuid())
  tripId       String
  title        String
  coverImageUrl String?
  text         String
  latitude     Float?
  longitude    Float?
  locationName String?
  countryCode  String?     // NEW: ISO 3166-1 alpha-2 country code
  createdAt    DateTime    @default(now())
  updatedAt    DateTime    @updatedAt

  trip         Trip        @relation(fields: [tripId], references: [id], onDelete: Cascade)
  media        EntryMedia[]
  tags         EntryTag[]
}
```

**Why nullable:**
- Gradual adoption: Existing entries won't have country codes until backfill runs
- Graceful degradation: Entries without location data won't have country codes
- Optional feature: If reverse geocoding fails, entry creation still succeeds

**Reverse Geocoding with Nominatim:**

Use Nominatim's reverse endpoint to convert coordinates to country codes:

```typescript
// src/utils/reverse-geocode.ts
export async function reverseGeocode(
  latitude: number,
  longitude: number
): Promise<string | null> {
  try {
    // Build Nominatim reverse geocoding URL
    const url = new URL('https://nominatim.openstreetmap.org/reverse');
    url.searchParams.set('lat', latitude.toString());
    url.searchParams.set('lon', longitude.toString());
    url.searchParams.set('format', 'json');
    url.searchParams.set('addressdetails', '1');
    url.searchParams.set('zoom', '3'); // Country-level zoom

    // Make API request with User-Agent header (OSM requirement)
    const response = await fetch(url.toString(), {
      headers: {
        'User-Agent': 'TravelBlogs/1.0',
      },
    });

    if (!response.ok) {
      console.warn(`Nominatim reverse geocoding failed: ${response.status}`);
      return null;
    }

    const data = await response.json();

    // Extract country code from address details
    const countryCode = data.address?.country_code;

    if (!countryCode || typeof countryCode !== 'string') {
      console.warn('No country code in Nominatim response', { latitude, longitude });
      return null;
    }

    // Return uppercase 2-character ISO 3166-1 alpha-2 code
    return countryCode.toUpperCase();
  } catch (error) {
    console.error('Reverse geocoding error', error);
    return null;
  }
}
```

**Nominatim API Details:**

- **Endpoint:** `https://nominatim.openstreetmap.org/reverse`
- **Required params:**
  - `lat` - Latitude (e.g., "40.7128")
  - `lon` - Longitude (e.g., "-74.0060")
  - `format` - Response format ("json")
  - `addressdetails` - Include address breakdown ("1")
- **Optional params:**
  - `zoom` - Detail level (3 = country level, faster response)
- **Required headers:**
  - `User-Agent` - Must identify app ("TravelBlogs/1.0")
- **Rate limits:**
  - 1 request/second maximum (enforced by OSM)
  - No API key required (free service)
- **Response format:**
  ```json
  {
    "address": {
      "country": "United States",
      "country_code": "us"
    }
  }
  ```
- **Country code format:**
  - Returned as lowercase (e.g., "us", "de", "jp")
  - Must be uppercased for ISO 3166-1 alpha-2 standard (e.g., "US", "DE", "JP")

**Rate Limiting Strategy:**

For backfill utility, add 1-second delay between requests:

```typescript
// In backfill-country-codes.ts
for (const entry of entries) {
  const countryCode = await reverseGeocode(entry.latitude, entry.longitude);

  if (countryCode) {
    await prisma.entry.update({
      where: { id: entry.id },
      data: { countryCode },
    });
  }

  // Wait 1 second before next request (OSM policy compliance)
  await new Promise(resolve => setTimeout(resolve, 1000));
}
```

For real-time entry creation/editing, rate limiting is less critical (single requests), but consider caching if we implement location search with reverse geocoding in the future.

**TypeScript Type Updates:**

Update `EntryLocation` type in `src/utils/entry-location.ts`:

```typescript
export type EntryLocation = {
  latitude: number;
  longitude: number;
  label?: string | null;
  countryCode?: string | null; // NEW: ISO 3166-1 alpha-2 country code
};
```

**API Response Transformation:**

Update location object construction in API endpoints:

```typescript
// Before (current)
location:
  entry.latitude !== null && entry.longitude !== null
    ? {
        latitude: entry.latitude,
        longitude: entry.longitude,
        label: entry.locationName,
      }
    : null

// After (with countryCode)
location:
  entry.latitude !== null && entry.longitude !== null
    ? {
        latitude: entry.latitude,
        longitude: entry.longitude,
        label: entry.locationName,
        countryCode: entry.countryCode, // NEW
      }
    : null
```

---

### Architecture Compliance

**Project Rules to Follow:**

From [project-context.md](_bmad-output/project-context.md):
1. ✅ **camelCase** for functions: `reverseGeocode()`, `backfillCountryCodes()`
2. ✅ **kebab-case** for files: `reverse-geocode.ts`, `backfill-country-codes.ts`
3. ✅ **Utilities in src/utils/**: Place reverse geocoding and backfill logic here
4. ✅ **Central tests/**: Tests in `tests/utils/` and `tests/api/`
5. ✅ **API response format**: Maintain `{ data, error }` wrapper
6. ✅ **Error handling**: Graceful failures, log warnings, don't crash server
7. ✅ **Async/await**: No raw Promise chains
8. ✅ **Database naming**: Singular model names (Entry, not Entries)

**Architectural Decisions:**

- **Nullable field**: countryCode is optional to support gradual adoption and graceful degradation
- **Server-side extraction**: Reverse geocoding happens on backend after entry save
- **Automatic backfill**: Existing entries get country codes on server startup (one-time migration)
- **Non-blocking**: Server starts immediately, backfill runs asynchronously
- **Idempotent**: Backfill checks `hasRun` flag to prevent re-running
- **Fail-safe**: If reverse geocoding fails, entry operations still succeed (null countryCode)

**Consistency with Existing Location Features:**

From Epic 7 stories (7.1-7.8), the location system uses:
- Denormalized storage: Separate columns (`latitude`, `longitude`, `locationName`)
- Client-side aggregation: API responses combine fields into location object
- Nullable coordinates: Entries can exist without location data
- GPS extraction: Photo EXIF data can populate coordinates (Story 7.2)

We're extending this pattern by adding `countryCode` as another denormalized column that gets aggregated into the location object in API responses.

---

### Library & Framework Requirements

**Dependencies:**

All required libraries already in project:
- ✅ **Prisma**: Database ORM for schema changes and queries
- ✅ **Zod**: Schema validation for API endpoints
- ✅ **fetch** (native): HTTP requests to Nominatim API
- ✅ **node:fs/promises**: Not needed for this story (no file operations)

**No new packages needed.**

**Nominatim Integration Pattern:**

Follow existing pattern from [src/app/api/locations/search/route.ts](travelblogs/src/app/api/locations/search/route.ts:20-38):

```typescript
// Existing forward geocoding pattern (place name → coordinates)
const nominatimUrl = new URL("https://nominatim.openstreetmap.org/search");
nominatimUrl.searchParams.set("q", query);
nominatimUrl.searchParams.set("format", "json");
nominatimUrl.searchParams.set("limit", "5");
nominatimUrl.searchParams.set("addressdetails", "1");

const response = await fetch(nominatimUrl.toString(), {
  headers: {
    "User-Agent": "TravelBlogs/1.0",
  },
});
```

**New reverse geocoding pattern (coordinates → place name/country):**

```typescript
// New reverse geocoding pattern
const nominatimUrl = new URL("https://nominatim.openstreetmap.org/reverse");
nominatimUrl.searchParams.set("lat", latitude.toString());
nominatimUrl.searchParams.set("lon", longitude.toString());
nominatimUrl.searchParams.set("format", "json");
nominatimUrl.searchParams.set("addressdetails", "1");
nominatimUrl.searchParams.set("zoom", "3"); // Country level

const response = await fetch(nominatimUrl.toString(), {
  headers: {
    "User-Agent": "TravelBlogs/1.0",
  },
});
```

**Error Handling:**

Follow existing pattern from location search API:
- Return `null` on failure (don't throw)
- Log warnings for debugging
- Don't crash server or block operations
- Client code handles null gracefully

---

### File Structure Requirements

**New Files to Create:**

```
prisma/
  migrations/
    <timestamp>_add_country_code/
      migration.sql               # Generated by Prisma

src/
  utils/
    reverse-geocode.ts            # Core reverse geocoding utility
    backfill-country-codes.ts     # Startup migration

tests/
  utils/
    reverse-geocode.test.ts       # Reverse geocoding utility tests
    backfill-country-codes.test.ts # Migration tests
```

**Files to Modify:**

```
prisma/schema.prisma              # Add countryCode field to Entry model

src/utils/entry-location.ts       # Add countryCode to EntryLocation type
src/types/trip-overview.ts        # Update TripOverviewEntry location type

src/app/api/entries/route.ts      # Extract country on create (POST)
src/app/api/entries/[id]/route.ts # Update country on edit (PATCH), include in GET
src/app/api/trips/[id]/overview/route.ts # Include countryCode in location object

server.js                         # Add country code backfill call
src/instrumentation.ts            # Add country code backfill for dev mode

tests/api/entries/create-entry.test.ts  # Add country code tests
tests/api/entries/update-entry.test.ts  # Add country code tests
```

---

### Testing Requirements

**Unit Tests:**

1. **Reverse Geocoding Utility** (`tests/utils/reverse-geocode.test.ts`):
   - Mock Nominatim API responses with test data
   - Test successful country code extraction (US, DE, JP examples)
   - Test null return when API returns non-200 status
   - Test null return when response missing country_code
   - Test country code uppercasing (input "us" → output "US")
   - Test User-Agent header is sent correctly
   - Test error handling (network failures, invalid JSON)
   - Test coordinate edge cases (0,0 coordinates, poles, etc.)

2. **Backfill Utility** (`tests/utils/backfill-country-codes.test.ts`):
   - Test `hasRun` flag prevents re-execution
   - Test entries with coordinates get country codes updated
   - Test entries without coordinates are skipped
   - Test entries with existing country codes are skipped
   - Test API failures handled gracefully (warning logged, no crash)
   - Test console logs include progress updates
   - Test final stats logged (updated: X, skipped: Y, errors: Z)
   - Test rate limiting (1 req/sec delay between calls)

**API Tests:**

1. **Create Entry** (`tests/api/entries/create-entry.test.ts`):
   - Test entry creation with coordinates triggers reverse geocoding
   - Test country code stored in database
   - Test country code included in API response location object
   - Test entry creation succeeds even if geocoding fails (null countryCode)
   - Test entry creation without coordinates (no geocoding attempt)

2. **Update Entry** (`tests/api/entries/update-entry.test.ts`):
   - Test updating location triggers reverse geocoding
   - Test country code updated in database
   - Test country code included in API response
   - Test removing location clears country code
   - Test updating entry without location change (no geocoding call)

**Integration Tests:**

1. **Server Startup** (manual or `tests/server.test.ts`):
   - Server starts successfully with country code backfill
   - Backfill logs appear in console
   - Backfill runs only once across restarts
   - Server startup not blocked by backfill

**Manual Testing Checklist:**

- [ ] Create entry with NYC coordinates (40.7128, -74.0060) → verify countryCode "US"
- [ ] Create entry with Berlin coordinates (52.5200, 13.4050) → verify countryCode "DE"
- [ ] Create entry with Tokyo coordinates (35.6762, 139.6503) → verify countryCode "JP"
- [ ] Edit entry and change location → verify countryCode updates
- [ ] Edit entry and remove location → verify countryCode cleared
- [ ] Create entry without location → verify no errors, null countryCode
- [ ] Restart server → verify backfill runs once and logs progress
- [ ] Restart server again → verify backfill skipped (hasRun flag)
- [ ] Check console for "[Country Code Backfill] ..." logs
- [ ] Verify database entries have countryCode populated
- [ ] Check API responses include countryCode in location object

---

### Previous Story Intelligence

**Story 10.2** (Automatic Image Compression - Most Recent):
- Added server-side processing after upload (compression)
- Pattern: Extract utility function, update API endpoints, create backfill migration
- Files: `src/utils/compress-image.ts`, `src/utils/backfill-image-compression.ts`
- **Lesson**: Follow same pattern for reverse geocoding and country code backfill
- **Lesson**: Use `hasRun` flag to prevent duplicate backfill execution
- **Lesson**: Wrap backfill in try/catch to prevent server startup failure

**Story 10.1** (Enhanced Media Support):
- Added video upload support with validation
- Pattern: Server-side validation and processing after upload
- **Lesson**: Add processing logic after upload validation, before saving

**Story 7.2** (GPS Extraction from Photos):
- Created `extractGpsFromImage()` utility for EXIF parsing
- Created `backfill-gps.ts` for migrating existing entries
- Pattern: Server-side metadata extraction during upload
- **Lesson**: Use same backfill pattern established in this story
- **Lesson**: Handle missing data gracefully (return null, log warnings)

**Story 7.4** (Location Selector):
- Implemented Nominatim forward geocoding (place name → coordinates)
- Pattern: Nominatim API integration with User-Agent header
- **Lesson**: Reuse Nominatim integration patterns from this story
- **Lesson**: Respect OSM rate limits (1 req/sec)

**Common Patterns Across Stories:**
- ✅ Utility-first approach (core logic in `src/utils/`)
- ✅ Server-side processing (keep client simple)
- ✅ Async/await for all I/O operations
- ✅ Graceful error handling (log warnings, don't crash)
- ✅ Comprehensive test coverage (unit + integration)
- ✅ Startup migrations with `hasRun` flag pattern

---

### Git Intelligence Summary

**Recent Commit Analysis** (last 10 commits):

From git log:
1. **131989e** - Story 10.3 Crossfade in slideshow
2. **ae45099** - Story 10.2 Bugfix 1
3. **fc14a84** - Story 10.2 Image compression
4. **1a3a035** - Bugfixes with videos - 3
5. **0bae0d3** - Bugfixes with videos - 2
6. **bfb3340** - Bugfix Uploading Videos - 2
7. **ae969ac** - Bugfix Uploading Videos
8. **fbbbc1c** - Story 10.1 Include MOV files - 2
9. **238f801** - Story 10.1 Include MOV files
10. **11a21fd** - Story 10.1 Enhanced Media Support

**Key Insights:**

- Recent work focused on media enhancements (Epic 10)
- Multiple bugfix commits show iterative refinement pattern
- Pattern: Implement core feature, then fix edge cases
- File modification patterns: API routes, utilities, tests, story files

**Files Frequently Modified for Backend Features:**
- `src/app/api/entries/route.ts` - Entry CRUD operations
- `src/app/api/entries/[id]/route.ts` - Single entry operations
- `src/utils/*.ts` - Utility functions
- `tests/api/entries/*.test.ts` - API endpoint tests
- `tests/utils/*.test.ts` - Utility function tests
- `server.js` - Server startup and migrations
- `src/instrumentation.ts` - Dev mode startup

**Follow These Patterns for Story 11.1:**
1. Start with utility function (`reverse-geocode.ts`)
2. Update Prisma schema and run migration
3. Update API endpoints (`entries/route.ts`, `entries/[id]/route.ts`)
4. Create backfill migration (`backfill-country-codes.ts`)
5. Wire backfill into server startup (`server.js`, `instrumentation.ts`)
6. Write comprehensive tests
7. Manual testing to catch edge cases
8. Expect 0-2 bugfix commits for edge cases discovered in testing

---

### Latest Technical Information

**Nominatim API Best Practices (2026):**

OpenStreetMap's Nominatim service is the de facto standard for open-source geocoding:
- **Free and open**: No API key required, community-supported
- **Rate limits**: 1 request/second maximum (strictly enforced)
- **User-Agent**: Required to identify your application
- **Reliability**: 99%+ uptime, production-ready
- **Data quality**: High accuracy for country-level data, variable for precise addresses
- **Privacy**: Open-source, no tracking, no data collection

**Reverse Geocoding Accuracy:**

Country-level data is highly reliable:
- **Land coordinates**: >99% accuracy (e.g., NYC → US, Berlin → DE)
- **Ocean coordinates**: May return null or nearest country
- **Border regions**: May return unexpected country (e.g., near state lines)
- **Remote areas**: Reliable for country, may lack detailed address data

**Recommended Configuration:**

```typescript
// For country-level data (fastest, most reliable)
url.searchParams.set('zoom', '3'); // Country zoom level
url.searchParams.set('addressdetails', '1'); // Include address breakdown
```

**Alternative Geocoding Services:**

If Nominatim rate limits become an issue (unlikely for this use case), alternatives include:
- **Google Maps Geocoding API**: Paid, requires API key, very reliable
- **Mapbox Geocoding API**: Paid, requires API key, fast
- **OpenCage Geocoding API**: Paid, aggregates multiple sources
- **GeoNames**: Free, simple API, country-level focus

For this story, Nominatim is the correct choice because:
1. We're already using it for location search (consistency)
2. Country-level data is highly reliable in Nominatim
3. Rate limits are acceptable for backfill (1 req/sec, run once at startup)
4. No API key or payment required

**ISO 3166-1 Alpha-2 Country Codes:**

Standard format used by Nominatim and globally recognized:
- **2 characters**: Uppercase letters (e.g., "US", "DE", "JP")
- **Official standard**: ISO 3166-1 alpha-2 (maintained by ISO)
- **Coverage**: 249 countries and territories
- **Stability**: Country codes rarely change (last major change: 2011)

**Common country codes for testing:**
- US - United States
- DE - Germany (Deutschland)
- JP - Japan
- GB - United Kingdom
- FR - France
- IT - Italy
- ES - Spain
- CN - China
- IN - India
- AU - Australia

---

### Project Context Reference

**Critical Rules from project-context.md:**

| Rule | Application to This Story |
|------|---------------------------|
| Use `camelCase` for variables/functions | `reverseGeocode`, `backfillCountryCodes`, `countryCode`, `hasRun` |
| Use `kebab-case.ts` for files | `reverse-geocode.ts`, `backfill-country-codes.ts` |
| Utilities in `src/utils/` | All geocoding and backfill logic in utilities |
| Tests in central `tests/` folder | Mirror structure: `tests/utils/`, `tests/api/` |
| API errors: `{ error: { code, message } }` | Maintain error format |
| API responses: `{ data, error }` wrapper | No changes to response structure |
| Use async/await (no Promise chains) | All API calls and DB queries use async/await |
| Log meaningful messages | Use `[Country Code Backfill]` prefix for migration logs |
| Keep DB names singular | Entry model (not Entries) |
| App Router only | All routes under `src/app/api` |

**Don't Break These Patterns:**

- ❌ No synchronous I/O operations
- ❌ No blocking server startup (migration runs async)
- ❌ No crashing on API errors (catch, log, continue)
- ❌ No snake_case in code or JSON (use camelCase)
- ❌ No colocated tests (use central `tests/` folder)
- ❌ No raw Promise chains (use async/await)

---

## Change Log

- 2026-01-21: Added countryCode storage, extraction, backfill, and API coverage.

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.5 (claude-sonnet-4-5-20250929)

### Debug Log References

### Completion Notes List

- Added Entry.countryCode column, created migration, generated Prisma client, and added model coverage. Tests: `npm test -- tests/api/entries/entry-country-code-model.test.ts`.
- Added reverse geocoding utility with retry/delay handling and unit coverage. Tests: `npm test -- tests/utils/reverse-geocode.test.ts`.
- Added countryCode to EntryLocation type. Tests: `npm test -- tests/utils/entry-location.test.ts`.
- TripOverviewEntry already uses EntryLocation, so countryCode is included without structural change.
- Added create-entry geocoding flow, persisted countryCode, and API coverage. Tests: `npm test -- tests/api/entries/create-entry.test.ts`.
- Added update-entry geocoding flow, countryCode clearing, and response coverage. Tests: `npm test -- tests/api/entries/update-entry.test.ts`, `npm test -- tests/api/entries/get-entry.test.ts`.
- Added countryCode to entry detail and trip overview responses. Tests: `npm test -- tests/api/entries/get-entry.test.ts`, `npm test -- tests/api/trips/trip-overview.test.ts`.
- Added country code backfill utility with coverage and rate-limit checks. Tests: `npm test -- tests/utils/backfill-country-codes.test.ts`.
- Wired country code backfill into server startup and instrumentation flow.
- Ran automated tests: `npm test -- tests/utils/reverse-geocode.test.ts`, `npm test -- tests/utils/backfill-country-codes.test.ts`, `npm test -- tests/api/entries/`, `npm test`.
- Manual checks: verified countryCode for US/DE/JP updates and cleared on location removal.
- Code review fixes: include countryCode in entry list responses, align POST updatedAt with geocode update, remove unused countryCode input fields from entry schemas. Tests not run for review fixes.

### File List

- _bmad-output/implementation-artifacts/sprint-status.yaml
- _bmad-output/planning-artifacts/epics.md
- travelblogs/prisma/schema.prisma
- travelblogs/prisma/migrations/20260121173755_add_country_code/migration.sql
- travelblogs/tests/api/entries/entry-country-code-model.test.ts
- travelblogs/src/utils/reverse-geocode.ts
- travelblogs/tests/utils/reverse-geocode.test.ts
- travelblogs/src/utils/entry-location.ts
- travelblogs/src/app/api/entries/route.ts
- travelblogs/tests/api/entries/create-entry.test.ts
- travelblogs/src/app/api/entries/[id]/route.ts
- travelblogs/tests/api/entries/update-entry.test.ts
- travelblogs/tests/api/entries/get-entry.test.ts
- travelblogs/src/app/api/trips/[id]/overview/route.ts
- travelblogs/tests/api/trips/trip-overview.test.ts
- travelblogs/src/utils/backfill-country-codes.ts
- travelblogs/tests/utils/backfill-country-codes.test.ts
- travelblogs/server.js
- travelblogs/src/instrumentation.ts
