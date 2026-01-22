# Story 12.2: Create Weather Backfill Utility

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **developer**,
I want **to fetch and store historical weather data for all existing entries**,
so that **all entries have weather information without manual API calls**.

## Acceptance Criteria

### AC 1: Weather Fetching Function
**Given** an entry has a date and location (lat/long)
**When** I call the weather fetch function
**Then** it queries Open-Meteo API for historical weather
**And** returns temperature and weather condition code

### AC 2: Backfill Script
**Given** entries exist in the database
**When** I run the backfill script
**Then** it processes all entries with location data
**And** fetches historical weather for each entry's date/location
**And** updates the database with weather data

### AC 3: Error Handling
**Given** an entry has no location data or API fails
**When** the backfill script processes it
**Then** it skips that entry gracefully
**And** logs the skip reason
**And** continues processing other entries

### AC 4: Rate Limiting
**Given** the backfill script is processing many entries
**When** making API requests
**Then** it respects rate limits (max 1 request/second)
**And** doesn't overwhelm the free API tier

## Tasks / Subtasks

### Phase 1: Create Weather Fetching Utility

- [x] Create weather fetching function (AC: 1)
  - [x] Create file `travelblogs/src/utils/fetch-weather.ts`
  - [x] Define TypeScript types for weather data (implemented as interface)
  - [x] Implement `fetchHistoricalWeather(lat: number, lon: number, date: Date | string): Promise<WeatherData | null>`
  - [x] Build API URL: `https://archive-api.open-meteo.com/v1/archive`
  - [x] Add query parameters (latitude, longitude, start_date, end_date, daily, timezone)
  - [x] Make fetch request with error handling (try/catch)
  - [x] Parse JSON response and extract `daily.temperature_2m_max[0]` and `daily.weather_code[0]`
  - [x] Map WMO weather code to human-readable condition using helper function
  - [x] Return WeatherData object or null if API fails

- [x] Create WMO code mapping helper (AC: 1)
  - [x] Create function `mapWeatherCode(code: number): string` in same file
  - [x] Map WMO codes to human-readable conditions (0→Clear, 1-3→Partly Cloudy, 45/48→Fog, 51-67→Rain, 71-77→Snow, 80-99→Thunderstorm, default→Unknown)

### Phase 2: Create Backfill Script

- [x] Create backfill script file (AC: 2, 3, 4)
  - [x] Create file `travelblogs/src/utils/backfill-weather.ts`
  - [x] Import PrismaClient type (accepts as parameter following project pattern)
  - [x] Import `fetchHistoricalWeather` from `./fetch-weather`
  - [x] Create `async function backfillWeather(prisma: PrismaClient): Promise<void>`
  - [x] Add `hasRun` flag for runtime idempotency

- [x] Implement entry processing logic (AC: 2, 3)
  - [x] Fetch entries with location and NULL weatherCondition: `prisma.entry.findMany({ where: { weatherCondition: null, latitude: { not: null }, longitude: { not: null } } })`
  - [x] Log total count of entries to process
  - [x] Initialize counters: `updated`, `skipped`, `errors`, `processed`
  - [x] Loop through each entry with `for...of` (sequential processing for rate limiting)

- [x] Implement weather fetching and update (AC: 2, 3)
  - [x] For each entry: fetch weather, update database, handle errors gracefully
  - [x] Increment appropriate counters (updated/skipped/errors)
  - [x] Continue processing on individual failures

- [x] Add rate limiting (AC: 4)
  - [x] Add 1 second delay between requests using `delay()` helper function
  - [x] Log progress every 10 entries

- [x] Add final summary logging (AC: 2, 3)
  - [x] Log completion summary with all counters

- [x] Integrate with instrumentation.ts (AC: 2) - **ARCHITECTURAL CHANGE**
  - [x] Export backfillWeather function for runtime execution
  - [x] Added to instrumentation.ts workflow chain (runs at Next.js startup)
  - [x] NOTE: Differs from story spec - no CLI execution support. Runtime execution pattern preferred per project standards.

### Phase 3: Testing and Validation

- [x] Create unit tests for weather fetching (AC: 1)
  - [x] Create test file `tests/utils/fetch-weather.test.ts` (17 tests, vitest framework)
  - [x] Test `fetchHistoricalWeather()` with known coordinates and date
  - [x] Mock fetch API using vi.stubGlobal
  - [x] Test successful API response parsing (Date and string inputs)
  - [x] Test API error handling (returns null)
  - [x] Test WMO code mapping for all code ranges (0, 1-3, 45/48, 51-67, 71-77, 80-99, unknown)
  - [x] Test temperature rounding, URL construction, network errors

- [x] Create integration tests for backfill (AC: 2, 3, 4)
  - [x] Create test file `tests/utils/backfill-weather.test.ts` (7 tests, PrismaBetterSqlite3)
  - [x] Set up test database with sample entries (with and without location)
  - [x] Mock `fetchHistoricalWeather` to return test data
  - [x] Run backfill script
  - [x] Verify entries with location get weather data
  - [x] Verify entries without location are skipped
  - [x] Verify entries already with weather are skipped (idempotency)
  - [x] Verify error handling doesn't stop processing
  - [x] Verify hasRun flag (runs only once per process)
  - [x] Verify rate limiting between requests

- [x] Manual testing (AC: 2, 3, 4)
  - [x] Backfill executed at runtime (8 entries processed successfully)
  - [x] Verified console logs show progress
  - [x] Confirmed database weather fields populated (8/8 entries with location data)
  - [x] Verified idempotency (re-run finds 0 entries to process)
  - [x] Confirmed rate limiting (1 req/sec delay implemented)

## Dev Notes

### Developer Context

**Epic 12 Overview:**

Story 12.2 builds on Story 12.1 (database schema) by creating the backfill utility to populate historical weather data for all existing entries. This story creates two key utilities:
1. `fetch-weather.ts` - Reusable weather API client (will be used in Story 12.5 for new entries)
2. `backfill-weather.ts` - One-time script to populate existing entries

**Business Value:**

Automatically populates weather data for all 10 existing entries in the database without manual intervention. This ensures users see weather information immediately when Story 12.3 (UI display) is implemented.

**User Experience Impact:**

No direct UI impact in this story. However, this story is critical because it populates the data that will be displayed in Story 12.3. Without this backfill, existing entries would show no weather information.

**Implementation Strategy:**

1. Create reusable weather fetching utility (future-proof for Story 12.5)
2. Create backfill script that processes all entries sequentially
3. Implement robust error handling and rate limiting
4. Add comprehensive logging for transparency
5. Test thoroughly before running on production data

This is a **5 story point task** - involves API integration, data processing, error handling, and testing.

---

### Technical Requirements

**Open-Meteo API Integration:**

**API Endpoint:** `https://archive-api.open-meteo.com/v1/archive`

**Why Open-Meteo:**
- FREE tier with no API key required
- Historical data from 1940-present
- Global coverage
- Reliable and well-documented
- No rate limit issues for reasonable use (we're rate-limiting ourselves to 1 req/sec)

**API Request Example:**
```
GET https://archive-api.open-meteo.com/v1/archive
  ?latitude=48.8566
  &longitude=2.3522
  &start_date=2024-01-15
  &end_date=2024-01-15
  &daily=temperature_2m_max,weathercode
  &timezone=auto
```

**API Response Example:**
```json
{
  "latitude": 48.86,
  "longitude": 2.35,
  "daily": {
    "time": ["2024-01-15"],
    "temperature_2m_max": [12.5],
    "weathercode": [3]
  }
}
```

**Field Specifications:**

1. **temperature_2m_max** (daily maximum temperature at 2 meters height)
   - Unit: Celsius
   - Type: Float
   - Stored in: Entry.weatherTemperature

2. **weathercode** (WMO weather interpretation code)
   - Type: Integer (0-99)
   - Stored as: String in Entry.weatherIconCode
   - Mapped to: Human-readable condition in Entry.weatherCondition

**WMO Weather Interpretation Codes:**

| Code Range | Condition | weatherCondition | Icon (Story 12.3) |
|------------|-----------|------------------|-------------------|
| 0 | Clear sky | "Clear" | ☀️ |
| 1-3 | Mainly clear, partly cloudy, overcast | "Partly Cloudy" | ⛅ |
| 45, 48 | Fog and depositing rime fog | "Fog" | 🌫️ |
| 51-67 | Drizzle and rain (various intensities) | "Rain" | 🌧️ |
| 71-77 | Snow fall (various intensities) | "Snow" | ❄️ |
| 80-99 | Rain showers, thunderstorm | "Thunderstorm" | ⛈️ |

**Error Handling Strategy:**

- **Missing location data:** Skip entry (log warning)
- **API network error:** Catch, log, skip entry, continue processing
- **API returns invalid data:** Catch, log, skip entry, continue processing
- **Database update fails:** Catch, log, increment error counter, continue processing
- **Never halt:** Process all entries regardless of individual failures

**Rate Limiting Strategy:**

- 1 second delay between requests (`setTimeout(1000)`)
- Sequential processing (no parallel requests)
- Progress logging every 10 entries
- Total execution time for 10 entries: ~10 seconds minimum

---

### Architecture Compliance

**Project Rules to Follow:**

From [_bmad-output/project-context.md](_bmad-output/project-context.md):

1. ✅ **camelCase** for variables/functions: `fetchHistoricalWeather`, `backfillWeather`, `weatherData`
2. ✅ **async/await**: All async operations use async/await (no raw Promise chains)
3. ✅ **Use utils/**: New utilities go in `src/utils/` (not `lib/`)
4. ✅ **TypeScript**: Explicit types for all function signatures and return values
5. ✅ **Error handling**: Try/catch blocks with proper logging
6. ✅ **Prisma 7.2.0**: Use established Prisma client patterns

**File Locations:**

```
travelblogs/
  src/
    utils/
      fetch-weather.ts          # NEW: Reusable weather API client
      backfill-weather.ts       # NEW: One-time backfill script
```

**Consistency with Existing Utilities:**

Similar utilities in project:
- `reverse-geocode.ts` - External API client (Nominatim)
- `backfill-country-codes.ts` - Backfill script for country codes

Our implementation should follow the same patterns:
- Export typed async functions
- Use try/catch for external API calls
- Return null on failure (don't throw)
- CLI execution support with `require.main === module`
- Comprehensive logging

**Architectural Decisions:**

- **Reusable utility first**: `fetch-weather.ts` designed for reuse in Story 12.5
- **Runtime backfill pattern**: `backfill-weather.ts` follows project pattern (accepts PrismaClient, integrated into instrumentation.ts)
- **NOT CLI-friendly**: Differs from initial story spec - runtime execution via instrumentation preferred per project standards
- **Sequential processing**: Simpler, respects rate limits, easier to debug
- **No database transactions**: Each entry update is independent (failure doesn't roll back others)
- **Idempotent with hasRun flag**: Runs once per Next.js startup, checks for NULL weatherCondition

---

### Library & Framework Requirements

**Dependencies:**

All required tools already in project:
- ✅ **Prisma 7.2.0**: Database access
- ✅ **TypeScript**: Type safety
- ✅ **Node.js fetch API**: HTTP requests (built-in, no extra package)

**No new packages needed.**

**Prisma Patterns:**

From existing codebase (`backfill-country-codes.ts`, `reverse-geocode.ts`):

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Query entries with location
const entries = await prisma.entry.findMany({
  where: {
    latitude: { not: null },
    longitude: { not: null },
  },
  select: { id: true, latitude: true, longitude: true, createdAt: true },
});

// Update entry
await prisma.entry.update({
  where: { id: entry.id },
  data: {
    weatherTemperature: weatherData.temperature,
    weatherCondition: weatherData.condition,
    weatherIconCode: weatherData.iconCode,
  },
});

// Disconnect when done
await prisma.$disconnect();
```

**Fetch API Patterns:**

Modern Node.js (18+) has built-in fetch:

```typescript
async function fetchHistoricalWeather(
  lat: number,
  lon: number,
  date: Date
): Promise<WeatherData | null> {
  try {
    const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
    const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=${dateStr}&end_date=${dateStr}&daily=temperature_2m_max,weathercode&timezone=auto`;

    const response = await fetch(url);
    if (!response.ok) {
      console.warn(`Weather API returned ${response.status}`);
      return null;
    }

    const data = await response.json();
    const temp = data.daily?.temperature_2m_max?.[0];
    const code = data.daily?.weathercode?.[0];

    if (temp === undefined || code === undefined) {
      console.warn('Weather API returned invalid data');
      return null;
    }

    return {
      temperature: temp,
      condition: mapWeatherCode(code),
      iconCode: String(code),
    };
  } catch (error) {
    console.error('Failed to fetch weather:', error);
    return null;
  }
}
```

**Rate Limiting Pattern:**

```typescript
for (const entry of entries) {
  // Process entry...

  // Rate limit: 1 second delay between requests
  await new Promise(resolve => setTimeout(resolve, 1000));

  processed++;
  if (processed % 10 === 0) {
    console.log(`Progress: ${processed}/${total} entries processed`);
  }
}
```

---

### File Structure Requirements

**Files to Create:**

```
travelblogs/
  src/
    utils/
      fetch-weather.ts          # NEW: 80-100 lines
      backfill-weather.ts       # NEW: 120-150 lines
  tests/
    utils/
      fetch-weather.test.ts     # NEW: 100-150 lines
      backfill-weather.test.ts  # NEW: 150-200 lines
```

**No other files need changes in this story.**

Later stories will:
- Use `fetch-weather.ts` in API endpoints (Story 12.5)
- Display weather data in UI components (Story 12.3)

**Module Structure:**

`fetch-weather.ts`:
```typescript
export type WeatherData = {
  temperature: number;
  condition: string;
  iconCode: string;
};

export async function fetchHistoricalWeather(
  lat: number,
  lon: number,
  date: Date
): Promise<WeatherData | null> {
  // Implementation
}

function mapWeatherCode(code: number): string {
  // Helper function (not exported)
}
```

`backfill-weather.ts`:
```typescript
import { PrismaClient } from '@prisma/client';
import { fetchHistoricalWeather } from './fetch-weather';

async function backfillWeather(): Promise<void> {
  // Implementation
}

// CLI execution
if (require.main === module) {
  backfillWeather()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Backfill failed:', error);
      process.exit(1);
    });
}
```

---

### Testing Requirements

**Unit Tests:**

`tests/utils/fetch-weather.test.ts`:

```typescript
import { fetchHistoricalWeather } from '@/utils/fetch-weather';

describe('fetchHistoricalWeather', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  it('should fetch and parse weather data successfully', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        daily: {
          temperature_2m_max: [22.5],
          weathercode: [0],
        },
      }),
    });

    const result = await fetchHistoricalWeather(48.8566, 2.3522, new Date('2024-01-15'));

    expect(result).toEqual({
      temperature: 22.5,
      condition: 'Clear',
      iconCode: '0',
    });
  });

  it('should return null on API error', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    const result = await fetchHistoricalWeather(48.8566, 2.3522, new Date());

    expect(result).toBeNull();
  });

  it('should return null on invalid response data', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ daily: {} }),
    });

    const result = await fetchHistoricalWeather(48.8566, 2.3522, new Date());

    expect(result).toBeNull();
  });

  it('should map weather codes correctly', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        daily: {
          temperature_2m_max: [15],
          weathercode: [61], // Rain
        },
      }),
    });

    const result = await fetchHistoricalWeather(0, 0, new Date());

    expect(result?.condition).toBe('Rain');
    expect(result?.iconCode).toBe('61');
  });
});
```

**Integration Tests:**

`tests/utils/backfill-weather.test.ts`:

```typescript
import { PrismaClient } from '@prisma/client';
import { backfillWeather } from '@/utils/backfill-weather';
import { fetchHistoricalWeather } from '@/utils/fetch-weather';

jest.mock('@/utils/fetch-weather');

const prisma = new PrismaClient();

describe('backfillWeather', () => {
  beforeEach(async () => {
    // Set up test database with sample entries
    await prisma.entry.createMany({
      data: [
        { id: '1', tripId: 'trip1', title: 'Entry 1', text: 'Test', latitude: 48.8566, longitude: 2.3522, createdAt: new Date('2024-01-15') },
        { id: '2', tripId: 'trip1', title: 'Entry 2', text: 'Test', latitude: null, longitude: null, createdAt: new Date('2024-01-16') },
      ],
    });
  });

  afterEach(async () => {
    // Clean up test data
    await prisma.entry.deleteMany();
  });

  it('should update entries with location data', async () => {
    (fetchHistoricalWeather as jest.Mock).mockResolvedValue({
      temperature: 18,
      condition: 'Clear',
      iconCode: '0',
    });

    await backfillWeather();

    const entry = await prisma.entry.findUnique({ where: { id: '1' } });
    expect(entry?.weatherTemperature).toBe(18);
    expect(entry?.weatherCondition).toBe('Clear');
    expect(entry?.weatherIconCode).toBe('0');
  });

  it('should skip entries without location', async () => {
    await backfillWeather();

    const entry = await prisma.entry.findUnique({ where: { id: '2' } });
    expect(entry?.weatherTemperature).toBeNull();
    expect(entry?.weatherCondition).toBeNull();
    expect(entry?.weatherIconCode).toBeNull();
  });

  it('should continue processing on API failure', async () => {
    (fetchHistoricalWeather as jest.Mock)
      .mockResolvedValueOnce(null) // First call fails
      .mockResolvedValueOnce({ temperature: 20, condition: 'Rain', iconCode: '61' }); // Second succeeds

    // Add another entry with location
    await prisma.entry.create({
      data: { id: '3', tripId: 'trip1', title: 'Entry 3', text: 'Test', latitude: 51.5074, longitude: -0.1278, createdAt: new Date('2024-01-17') },
    });

    await backfillWeather();

    const entry1 = await prisma.entry.findUnique({ where: { id: '1' } });
    const entry3 = await prisma.entry.findUnique({ where: { id: '3' } });

    expect(entry1?.weatherTemperature).toBeNull(); // Failed
    expect(entry3?.weatherTemperature).toBe(20);   // Succeeded
  });
});
```

**Manual Testing Checklist:**

1. **Dry run verification:**
   - [ ] Run backfill script: `cd travelblogs && ts-node src/utils/backfill-weather.ts`
   - [ ] Observe console logs showing progress
   - [ ] Verify script completes without errors
   - [ ] Check execution time (should be ~10 seconds for 10 entries with 1 req/sec rate limit)

2. **Database verification:**
   - [ ] Query database: `sqlite3 prisma/dev.db "SELECT id, weatherTemperature, weatherCondition, weatherIconCode FROM Entry WHERE latitude IS NOT NULL"`
   - [ ] Verify entries with location have weather data populated
   - [ ] Verify entries without location still have NULL weather fields

3. **Edge case testing:**
   - [ ] Test with entry that has invalid date (future date)
   - [ ] Test with entry that has extreme coordinates (Antarctica, middle of ocean)
   - [ ] Verify graceful failure and logging

4. **Re-run safety:**
   - [ ] Run backfill script again on same data
   - [ ] Verify it updates existing weather data (overwrites)
   - [ ] No errors or data corruption

**Test Coverage Goals:**

- **Unit tests**: 100% coverage of `fetch-weather.ts`
- **Integration tests**: Core backfill logic covered
- **Manual tests**: Real API integration verified

---

### Previous Story Intelligence

**Story 12.1** (Add Weather Fields to Database Schema - JUST COMPLETED):

Pattern: Added weatherCondition, weatherTemperature, weatherIconCode fields to Entry model

**Key Learnings:**
- ✅ Weather fields are nullable (String?, Float?)
- ✅ Migration applied successfully: 20260122202523_add_weather_fields
- ✅ All 10 existing entries preserved with NULL weather fields
- ✅ Prisma Client types updated with new weather fields

**Critical Context for Story 12.2:**
- Database schema is ready (no changes needed)
- weatherTemperature stores Celsius as Float
- weatherCondition stores human-readable string (e.g., "Clear", "Rain")
- weatherIconCode stores WMO code as String (e.g., "0", "61")
- 10 existing entries need weather data populated

**Files Modified in Story 12.1:**
```
travelblogs/prisma/schema.prisma                          # Schema updated
travelblogs/prisma/migrations/20260122202523_add_weather_fields/migration.sql  # Migration generated
```

**Story 11.1** (Add Country Code Storage & Extraction - Similar Pattern):

Pattern: Added countryCode field + backfill utility

**Key Learnings:**
- ✅ Backfill pattern established: `backfill-country-codes.ts`
- ✅ External API integration: Nominatim (reverse geocoding)
- ✅ Error handling: Skip entries gracefully, log warnings, continue processing
- ✅ CLI execution: `require.main === module` pattern
- ✅ Prisma query pattern: `findMany({ where: { latitude: { not: null } } })`

**Similarities to Story 12.2:**
- Both fetch data from external API based on location (lat/long)
- Both update existing entries with new data
- Both need error handling for API failures
- Both need rate limiting (though 11.1 didn't explicitly add it)

**Differences:**
- Story 11.1: Reverse geocoding (coordinates → country code)
- Story 12.2: Historical weather (coordinates + date → weather data)
- Story 12.2 adds explicit rate limiting (1 req/sec)
- Story 12.2 creates reusable utility (for Story 12.5)

**Common Patterns to Follow:**

- ✅ **Utility in src/utils/**: Consistent location
- ✅ **Async error handling**: try/catch with logging, return null on failure
- ✅ **CLI execution support**: Allows manual backfill runs
- ✅ **Prisma disconnect**: Always disconnect client at end
- ✅ **Progress logging**: Keep user informed during long operations

---

### Git Intelligence Summary

**Recent Commits Relevant to This Story:**

From `git log --oneline -5`:
1. **21b7739** - Story 11.4 Bugfix 1
2. **e77f0c3** - Story 11.4 Aggregate trip flags
3. **2987d26** - Story 11.1 Add Country Code ← **Most relevant** (backfill pattern)
4. **131989e** - Story 10.3 Crossfade in slideshow
5. **ae45099** - Story 10.2 Bugfix 1

**Key Insight from Story 11.1 Commit (2987d26):**

Story 11.1 implemented the backfill pattern we should follow:
- Created `reverse-geocode.ts` (API client utility)
- Created `backfill-country-codes.ts` (backfill script)
- Both files in `src/utils/`
- CLI execution support with error handling

**Pattern to Replicate:**

```typescript
// reverse-geocode.ts pattern
export async function reverseGeocode(lat: number, lon: number): Promise<string | null> {
  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`);
    if (!response.ok) return null;
    const data = await response.json();
    return data.address?.country_code?.toUpperCase() || null;
  } catch (error) {
    console.error('Reverse geocoding failed:', error);
    return null;
  }
}

// backfill-country-codes.ts pattern
async function backfillCountryCodes(): Promise<void> {
  const prisma = new PrismaClient();
  const entries = await prisma.entry.findMany({
    where: { latitude: { not: null }, longitude: { not: null }, countryCode: null },
  });

  for (const entry of entries) {
    const countryCode = await reverseGeocode(entry.latitude!, entry.longitude!);
    if (countryCode) {
      await prisma.entry.update({
        where: { id: entry.id },
        data: { countryCode },
      });
    }
  }

  await prisma.$disconnect();
}

if (require.main === module) {
  backfillCountryCodes().catch(console.error);
}
```

**Apply Same Pattern to Weather:**

```typescript
// fetch-weather.ts (similar to reverse-geocode.ts)
export async function fetchHistoricalWeather(lat: number, lon: number, date: Date): Promise<WeatherData | null> {
  // Same error handling pattern
}

// backfill-weather.ts (similar to backfill-country-codes.ts)
async function backfillWeather(): Promise<void> {
  // Same Prisma query and update pattern
  // Add rate limiting (new improvement)
}
```

---

### Latest Technical Information

**Open-Meteo API (2026):**

**API Stability:**
- Open-Meteo is a stable, mature API (launched 2022)
- No API key required for free tier
- Historical weather archive from 1940-present
- No planned breaking changes

**API Documentation:**
- Endpoint: `https://archive-api.open-meteo.com/v1/archive`
- Docs: https://open-meteo.com/en/docs/historical-weather-api
- Rate limits: No official limit, but respect 1 req/sec for courtesy
- Response format: JSON

**WMO Weather Interpretation Codes:**

These are international standard codes (ISO/WMO) - will not change:
- Source: World Meteorological Organization
- Standardized across all weather APIs
- Open-Meteo uses exact WMO specification

**Temperature Data:**

- `temperature_2m_max`: Daily maximum temperature at 2 meters above ground
- Why 2m: Standard meteorological measurement height
- Unit: Celsius (can request Fahrenheit, but we store Celsius)
- Accuracy: ±0.5°C for recent years, ±2°C for historical data

**Timezone Handling:**

- Use `timezone=auto` parameter
- API automatically converts to entry location timezone
- Returns data for correct local date (not UTC)

**API Response Time:**

- Average: 200-500ms per request
- Historical data is cached (fast)
- No quota limits on free tier for reasonable use

**Error Scenarios:**

- 400 Bad Request: Invalid parameters (lat/long out of range, invalid date)
- 404 Not Found: No weather data available for location/date
- 500 Internal Server Error: API temporarily down (retry logic not needed, just log and skip)
- Network timeout: Catch and return null

**Best Practices for Open-Meteo:**

- ✅ Always include `timezone=auto` for correct local time handling
- ✅ Use daily aggregates (temperature_2m_max) not hourly (reduces data transfer)
- ✅ Request only needed parameters (temperature_2m_max, weathercode)
- ✅ Respect rate limits even though none are enforced
- ✅ Handle 4xx/5xx responses gracefully

**Alternative APIs Considered (and why Open-Meteo won):**

| API | Free Tier | API Key | Historical Data | Verdict |
|-----|-----------|---------|-----------------|---------|
| OpenWeatherMap | 1000/day | Required | Paid only | ❌ Too limited |
| WeatherAPI.com | 1M/month | Required | 7 days free | ❌ Need historical |
| Visual Crossing | 1000/day | Required | Yes | ✅ Good alternative |
| Open-Meteo | Unlimited | None | Yes (1940+) | ✅✅✅ **BEST** |

---

### Project Context Reference

**Critical Rules from project-context.md:**

| Rule | Application to This Story |
|------|---------------------------|
| Use `camelCase` for variables/functions | `fetchHistoricalWeather`, `backfillWeather`, `weatherData` |
| Use async/await for async flows | All API calls and database operations use async/await |
| Use `utils/` for shared helpers | New files go in `src/utils/` |
| API errors must use `{ error: { code, message } }` | Not applicable (utility functions, not API endpoints) |
| Tests live in central `tests/` | Tests go in `tests/utils/` |

**Don't Break These Patterns:**

- ❌ No snake_case variable names (use camelCase)
- ❌ No raw Promise chains (use async/await)
- ❌ No skipping error handling (always try/catch external APIs)
- ❌ No colocated tests (tests go in central `tests/` directory)

**Technology Stack (from project-context.md):**

- Next.js (create-next-app latest) + App Router
- TypeScript (via Next.js) ← **Used for type safety**
- Prisma 7.2.0 (ORM + migrations) ← **Used for database access**
- SQLite (primary DB) ← **Target database**

---

## Change Log

- 2026-01-22: Created story for weather backfill utility (Story 12.2) with comprehensive developer context.

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.5 (claude-sonnet-4-5-20250929)

### Debug Log References

### Completion Notes List

**Session 1: Core Utilities Implementation (Phases 1 & 2)**

**Implementation Date:** 2026-01-22

**Completed Tasks:**

✅ **Phase 1: Weather Fetching Utility**
- Created [travelblogs/src/utils/fetch-weather.ts](travelblogs/src/utils/fetch-weather.ts)
- Implemented `WeatherData` TypeScript interface with temperature (number), condition (string), iconCode (string)
- Implemented `fetchHistoricalWeather()` function with Open-Meteo API integration
- Implemented `mapWeatherCode()` helper function for WMO code mapping (0→Clear, 1-3→Partly Cloudy, 45/48→Fog, 51-67→Rain, 71-77→Snow, 80-99→Thunderstorm)
- Error handling: Returns null on API failures, logs warnings
- Temperature rounding to 1 decimal place

✅ **Phase 2: Backfill Script**
- Created [travelblogs/src/utils/backfill-weather.ts](travelblogs/src/utils/backfill-weather.ts)
- Follows project pattern: Accepts `PrismaClient` as parameter (matches [backfill-country-codes.ts](travelblogs/src/utils/backfill-country-codes.ts))
- Added `hasRun` flag to ensure backfill only executes once per runtime
- Query logic: Finds all entries with latitude/longitude but NULL weatherCondition (idempotent)
- Rate limiting: 1 second delay between API requests
- Error handling: Gracefully skips entries with failed API calls, logs warnings, continues processing
- Progress logging: Reports progress every 10 entries
- Summary logging: Reports total updated, skipped, and errors
- Integrated into [instrumentation.ts](travelblogs/src/instrumentation.ts:12) for automatic execution at runtime

✅ **Testing & Validation**
- Executed backfill script successfully: 8 entries processed
- Results: 8 successfully updated, 0 skipped, 0 errors
- Sample weather data retrieved: Rain (11.3°C), Clear (2.5°C), Partly Cloudy (2.1°C), etc.
- Verified idempotency: Re-running script correctly identifies 0 entries to process (all have weather data)
- Database persistence confirmed: All entries with location now have weatherCondition, weatherTemperature, weatherIconCode populated

**Key Implementation Details:**

1. **Open-Meteo API Integration:**
   - Endpoint: `https://archive-api.open-meteo.com/v1/archive`
   - Parameters: latitude, longitude, start_date, end_date, daily=weather_code,temperature_2m_max, timezone=auto
   - Response parsing: Extracts `daily.weather_code[0]` and `daily.temperature_2m_max[0]`

2. **WMO Code Mapping:**
   - 0 → "Clear"
   - 1-3 → "Partly Cloudy"
   - 45, 48 → "Fog"
   - 51-67 → "Rain"
   - 71-77 → "Snow"
   - 80-99 → "Thunderstorm"
   - Other → "Unknown"

3. **Rate Limiting Strategy:**
   - Sequential processing (no parallel requests)
   - 1000ms delay between requests using `setTimeout()`
   - Total execution time for 8 entries: ~8 seconds

4. **Error Handling:**
   - Network errors: Caught and logged, returns null
   - Invalid API responses: Returns null with warning
   - Missing data: Skips entry gracefully
   - Database errors: Logged but doesn't halt processing

5. **Database Integration:**
   - Uses project's custom Prisma client from `utils/db.ts` (better-sqlite3 adapter)
   - Query: `findMany({ where: { latitude: { not: null }, longitude: { not: null }, weatherCondition: null } })`
   - Update: `update({ where: { id }, data: { weatherCondition, weatherTemperature, weatherIconCode } })`
   - Disconnects client on completion

**Session 2: Testing (Phase 3)**

**Implementation Date:** 2026-01-22

**Completed Tasks:**

✅ **Phase 3: Testing**
- Created comprehensive unit tests in [tests/utils/fetch-weather.test.ts](tests/utils/fetch-weather.test.ts)
  - **17 test cases** covering all functionality
  - Tests for successful API responses with Date and string inputs
  - Temperature rounding validation
  - Error handling: API failures, missing data, network errors
  - API URL construction validation
  - Complete WMO code mapping coverage (all ranges: 0, 1-3, 45/48, 51-67, 71-77, 80-99, unknown)
  - **Framework**: vitest with vi.mock for fetch stubbing
- Created integration tests in [tests/utils/backfill-weather.test.ts](tests/utils/backfill-weather.test.ts)
  - **7 test cases** covering backfill functionality
  - Updates entries with coordinates missing weather data
  - Skips entries without coordinates
  - Skips entries that already have weather data (idempotency)
  - Handles API failures gracefully and continues processing
  - Logs progress for multiple entries (11+ entries)
  - Runs only once per process (hasRun flag)
  - Respects rate limiting between requests
  - **Framework**: vitest with PrismaBetterSqlite3, fake timers (vi.useFakeTimers)
- **All 24 tests passing** ✓
- Follows project testing patterns (vitest, PrismaBetterSqlite3, fake timers, test DB isolation)

**Test Execution Output:**
```bash
$ npm test -- fetch-weather backfill-weather

Test Files  2 passed (2)
Tests       24 passed (24)
  - fetch-weather.test.ts: 17 passed
  - backfill-weather.test.ts: 7 passed
Duration    1.74s
```

**Notes:**

- Backfill runs automatically at Next.js startup via instrumentation.ts (following project pattern)
- Script is idempotent: Only processes entries with NULL weatherCondition, hasRun flag prevents duplicate execution
- Weather data stored in Celsius (UI conversion to Fahrenheit for English locale will be handled in Story 12.3)
- `fetch-weather.ts` utility is designed for reuse in Story 12.5 (auto-fetch for new entries)
- Backfill executes after country code backfill in the instrumentation chain

**Implementation Deviations from Original Story Spec:**
1. **Type vs Interface**: Story spec requested `export type WeatherData`, implemented as `export interface WeatherData` (functionally equivalent)
2. **CLI Execution**: Story spec requested CLI support with `require.main === module`. Implementation follows project pattern: runtime execution via instrumentation.ts accepting PrismaClient param (matches backfill-country-codes.ts pattern)
3. **Architectural Change**: Changed from "one-time utility" to persistent runtime backfill that executes on every Next.js startup (better for production)

### File List

**Created Files:**
- `travelblogs/src/utils/fetch-weather.ts` (89 lines)
- `travelblogs/src/utils/backfill-weather.ts` (101 lines)
- `travelblogs/tests/utils/fetch-weather.test.ts` (224 lines, 17 tests)
- `travelblogs/tests/utils/backfill-weather.test.ts` (370 lines, 7 tests)

**Modified Files:**
- `travelblogs/src/instrumentation.ts` (added backfillWeather import and execution)
