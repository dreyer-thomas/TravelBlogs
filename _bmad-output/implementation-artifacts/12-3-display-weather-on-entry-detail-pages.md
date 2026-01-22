# Story 12.3: Display Weather on Entry Detail Pages

Status: done

## Story

As a **viewer**,
I want **to see the weather conditions on entry detail pages**,
so that **I know what the weather was like during that part of the trip**.

## Acceptance Criteria

### AC 1: Weather Display Next to Country Flag
**Given** I am viewing an entry detail page
**And** the entry has weather data
**When** the page loads
**Then** I see the weather icon and temperature displayed to the right of the country flag and country name
**And** the format is: "🇺🇸 United States  ☀️ 75°F" (for English)
**And** the format is: "🇺🇸 United States  ☀️ 24°C" (for German)

### AC 2: Temperature Unit Based on Language
**Given** I am viewing an entry
**And** my language is set to English
**When** the weather is displayed
**Then** the temperature is shown in Fahrenheit

**Given** my language is set to German
**When** the weather is displayed
**Then** the temperature is shown in Celsius

### AC 3: Hide Weather if Not Available
**Given** an entry has no weather data
**When** the entry detail page loads
**Then** no weather icon or temperature is displayed
**And** only the country flag and name are shown

### AC 4: Weather Display on Shared Entry Pages
**Given** I am viewing a shared entry page
**And** the entry has weather data
**When** the page loads
**Then** I see the same weather display as in authenticated view
**And** temperature unit matches the viewer's browser language

## Tasks / Subtasks

### Phase 1: Create Weather Display Utilities

- [x] Create weather display utility file (AC: 1, 2)
  - [x] Create file `travelblogs/src/utils/weather-display.ts`
  - [x] Define TypeScript types (WeatherDisplayData interface)
  - [x] Create `getWeatherIcon(iconCode: string): string` function
    - [x] Map WMO codes to emoji icons (0→☀️, 1-3→⛅, 45/48→🌫️, 51-67→🌧️, 71-77→❄️, 80-99→⛈️)
    - [x] Use same mapping as Story 12.2's `mapWeatherCode()` but return emoji instead of text
  - [x] Create `formatTemperature(tempCelsius: number, locale: string): string` function
    - [x] Convert to Fahrenheit if locale is 'en' or starts with 'en-'
    - [x] Keep Celsius for 'de' or other locales
    - [x] Formula: F = (C × 9/5) + 32
    - [x] Round to nearest integer
    - [x] Return formatted string with degree symbol and unit (e.g., "75°F", "24°C")
  - [x] Create `formatWeatherDisplay(weatherCondition: string | null, weatherTemperature: number | null, weatherIconCode: string | null, locale: string): { icon: string; temperature: string } | null` function
    - [x] Return null if any weather data is missing
    - [x] Return object with icon and temperature string if all data present

- [x] Add unit tests for weather display utilities (AC: 1, 2)
  - [x] Create test file `tests/utils/weather-display.test.ts`
  - [x] Test `getWeatherIcon()` for all WMO code ranges
  - [x] Test `formatTemperature()` for Celsius (de locale)
  - [x] Test `formatTemperature()` for Fahrenheit (en locale)
  - [x] Test temperature conversion accuracy (0°C = 32°F, 24°C = 75°F)
  - [x] Test `formatWeatherDisplay()` with complete data
  - [x] Test `formatWeatherDisplay()` with missing data (returns null)

### Phase 2: Update Entry Detail Component

- [x] Update entry-detail.tsx component (AC: 1, 2, 3)
  - [x] Import weather display utilities from `utils/weather-display`
  - [x] Extract weather data from entry props (weatherCondition, weatherTemperature, weatherIconCode)
  - [x] Call `formatWeatherDisplay()` to get formatted weather data
  - [x] Update location display section (around lines 271-278)
    - [x] Keep existing country flag and name display
    - [x] Add weather icon and temperature to the right of country name
    - [x] Format: `{countryFlag} {countryName}  {weatherIcon} {temperature}`
    - [x] Use conditional rendering - only show weather if data exists
    - [x] Add spacing between country name and weather (2 spaces or gap-2)
  - [x] Ensure locale from `useTranslation()` hook is passed to weather utilities

- [x] Add integration tests for entry detail weather display (AC: 1, 2, 3)
  - [x] Update or create test file for entry-detail component
  - [x] Test weather display appears when data is present
  - [x] Test Fahrenheit for English locale
  - [x] Test Celsius for German locale
  - [x] Test no weather display when data is missing
  - [x] Test weather icon matches weatherIconCode

### Phase 3: Update Shared Entry Reader Component

- [x] Update entry-reader.tsx component (AC: 4)
  - [x] Import weather display utilities from `utils/weather-display`
  - [x] Extract weather data from entry props
  - [x] Call `formatWeatherDisplay()` to get formatted weather data
  - [x] Find location display section (likely in header area with country flag)
  - [x] Add weather icon and temperature display matching entry-detail.tsx format
  - [x] Use locale from `useTranslation()` hook for temperature unit conversion
  - [x] Ensure conditional rendering (only show if weather data exists)

- [x] Add integration tests for shared entry reader weather display (AC: 4)
  - [x] Update or create test file for entry-reader component
  - [x] Test weather display on shared view
  - [x] Test temperature unit matches viewer's locale
  - [x] Test no weather display when data is missing

### Phase 4: Manual Testing and Validation

- [x] Test on entry detail page (AC: 1, 2, 3)
  - [x] Navigate to entry with weather data
  - [x] Verify weather icon displays correctly
  - [x] Verify temperature shows in correct unit based on language
  - [x] Switch language and verify unit changes
  - [x] Navigate to entry without weather data
  - [x] Verify no weather display (graceful degradation)

- [x] Test on shared entry page (AC: 4)
  - [x] Access shared entry link
  - [x] Verify weather displays same as authenticated view
  - [x] Test with different browser language settings
  - [x] Verify temperature unit respects browser language

## Dev Notes

### Developer Context

**Epic 12 Overview:**

Story 12.3 is the first UI story in Epic 12 (Historical Weather Data). It builds directly on Stories 12.1 and 12.2:
- **Story 12.1** added weather fields to database schema (weatherCondition, weatherTemperature, weatherIconCode)
- **Story 12.2** created utilities to fetch weather data and backfilled existing entries (8 entries now have weather data)
- **Story 12.3** (this story) displays weather data on entry detail pages

**Business Value:**

Enriches the travel blog experience by showing contextual weather information for each entry. Users can see what the weather was like during that moment of their trip, adding depth to their memories.

**User Experience Impact:**

Weather information appears inline with country flag and location on entry detail pages. The display is subtle and non-intrusive - weather enhances the entry without overwhelming other content. Temperature units adapt to user's language preference (Fahrenheit for English, Celsius for German).

**Implementation Strategy:**

1. Create reusable weather display utilities
2. Update both authenticated and shared entry views
3. Implement language-based temperature conversion
4. Use conditional rendering for graceful degradation (no weather data = no display)

This is a **3 story point task** - involves utility creation, component updates, and testing across multiple views.

---

### Technical Requirements

**Weather Display Components:**

- Two components need updates:
  1. `travelblogs/src/components/entries/entry-detail.tsx` (authenticated view)
  2. `travelblogs/src/components/entries/entry-reader.tsx` (shared view)

**Weather Data Source:**

- Database fields (already populated by Story 12.2):
  - `weatherCondition`: String (e.g., "Clear", "Rain")
  - `weatherTemperature`: Float (stored in Celsius)
  - `weatherIconCode`: String (WMO code, e.g., "0", "61")

**Temperature Conversion Logic:**

- **Celsius (stored format):** Display for German locale (`de`)
- **Fahrenheit (calculated):** Display for English locale (`en`, `en-US`, `en-GB`, etc.)
- Conversion formula: `F = (C × 9/5) + 32`
- Round to nearest integer for display
- Always include unit symbol (°C or °F)

**Weather Icon Mapping (WMO Codes to Emoji):**

```
0: Clear sky → ☀️
1-3: Partly cloudy → ⛅
45, 48: Fog → 🌫️
51-67: Rain → 🌧️
71-77: Snow → ❄️
80-99: Thunderstorm → ⛈️
Unknown: (fallback) → ❓
```

**Display Format:**

- Location: `{countryFlag} {countryName}  {weatherIcon} {temperature}`
- Example (English): `🇺🇸 United States  ☀️ 75°F`
- Example (German): `🇺🇸 United States  ☀️ 24°C`
- Spacing: Use 2 spaces or `gap-2` between country name and weather
- Conditional: Only display weather if all weather data exists (weatherCondition, weatherTemperature, weatherIconCode)

**Locale Detection:**

- Use `useTranslation()` hook's `locale` value (already in use on both components)
- Locale determines temperature unit:
  - `en`, `en-US`, `en-GB`, etc. → Fahrenheit
  - `de` → Celsius
  - Other locales → Celsius (default)

---

### Architecture Compliance

**Project Structure:**

Follow project conventions from project-context.md:
- Utilities go in `src/utils/` (NOT `src/lib/`)
- Use camelCase for function names
- Components use PascalCase, files use kebab-case.tsx
- Tests go in central `tests/` directory (NOT colocated)

**Naming Conventions:**

- File: `weather-display.ts` (kebab-case)
- Functions: `getWeatherIcon()`, `formatTemperature()`, `formatWeatherDisplay()` (camelCase)
- Test file: `weather-display.test.ts` (in `tests/utils/`)

**API & Data Patterns:**

- NO API changes needed (data already in database from Story 12.2)
- Read weather fields from entry object passed to component
- All data is optional (String? and Float? in Prisma schema)

**Component Patterns:**

- Use conditional rendering for weather display
- Import from `utils/weather-display` (shared utilities)
- Maintain existing component structure (don't refactor unnecessarily)
- Keep weather display inline with country flag (same section)

**Testing Standards:**

- Unit tests for utility functions (vitest)
- Integration tests for component rendering (React Testing Library recommended)
- Test both locales (en and de)
- Test with and without weather data

---

### Library & Framework Requirements

**Existing Dependencies (No New Installs Needed):**

- **Next.js:** Already configured with App Router
- **React:** Component updates use existing patterns
- **TypeScript:** Type safety for weather utilities
- **Vitest:** Testing framework for unit tests
- **useTranslation hook:** Already available, provides `locale` value

**Type Definitions:**

Create types in `weather-display.ts`:
```typescript
export interface WeatherDisplayData {
  icon: string;
  temperature: string;
}

// Function signatures
export function getWeatherIcon(iconCode: string): string;
export function formatTemperature(tempCelsius: number, locale: string): string;
export function formatWeatherDisplay(
  weatherCondition: string | null,
  weatherTemperature: number | null,
  weatherIconCode: string | null,
  locale: string
): WeatherDisplayData | null;
```

**Reuse Pattern from Story 11 (Country Flags):**

Story 11.3 (Display Flags on Entry Detail Pages) shows the pattern:
- Location: `travelblogs/src/components/entries/entry-detail.tsx` (lines ~271-278)
- Current display: Country flag + country name
- Update: Add weather icon + temperature to the right

**Reference Utilities:**

- `countryCodeToFlag()` and `countryCodeToName()` from `utils/country-flag.ts` (Story 11)
- Similar pattern: map code → display value
- Weather utilities will map WMO code → emoji

---

### File Structure Requirements

**Files to Create:**

1. `travelblogs/src/utils/weather-display.ts` (weather display utilities)
2. `tests/utils/weather-display.test.ts` (unit tests)

**Files to Modify:**

1. `travelblogs/src/components/entries/entry-detail.tsx` (authenticated entry view)
2. `travelblogs/src/components/entries/entry-reader.tsx` (shared entry view)

**Existing File Context:**

- **entry-detail.tsx**: Already imports `useTranslation`, `countryCodeToFlag`, `countryCodeToName`
- **entry-reader.tsx**: Also imports country flag utilities
- Both components have location display section with country flag/name
- Weather display goes inline with existing country display (lines ~271-278 in entry-detail.tsx)

**DO NOT Create:**

- No new API routes needed
- No database migrations needed
- No new components needed

---

### Testing Requirements

**Unit Tests (weather-display.test.ts):**

Test coverage for utility functions:
1. `getWeatherIcon()` - all WMO code ranges (0, 1-3, 45/48, 51-67, 71-77, 80-99, unknown)
2. `formatTemperature()` - Celsius for `de`, Fahrenheit for `en`/`en-US`
3. Temperature conversion accuracy (e.g., 0°C = 32°F, 24°C = 75°F, -10°C = 14°F)
4. `formatWeatherDisplay()` - returns data when all fields present, returns null when any field missing

**Integration Tests (component tests):**

Test coverage for component updates:
1. Weather displays on entry detail when data present
2. Weather displays on shared entry reader when data present
3. Fahrenheit shown for English locale
4. Celsius shown for German locale
5. No weather display when any weather field is null
6. Weather icon matches weatherIconCode
7. Temperature value matches entry.weatherTemperature (converted)

**Manual Testing Checklist:**

1. Navigate to entry with weather data in both English and German
2. Verify weather displays inline with country flag
3. Verify temperature unit changes with language
4. Navigate to entry without weather data
5. Verify no weather display (graceful degradation)
6. Access shared entry link
7. Verify weather displays same as authenticated view

**Testing Framework:**

- **Unit tests:** Vitest (already configured)
- **Component tests:** React Testing Library (if available) or Vitest with jsdom
- Follow existing test patterns from Story 11 (country flag tests)

---

### Previous Story Intelligence

**Story 12.2 Learnings:**

From the completed Story 12.2 (Create Weather Backfill Utility):

**Key Files Created:**
1. `travelblogs/src/utils/fetch-weather.ts` - Weather API client with `fetchHistoricalWeather()` and `mapWeatherCode()`
2. `travelblogs/src/utils/backfill-weather.ts` - Backfill script (runs at startup via instrumentation.ts)

**Weather Data Structure:**
```typescript
interface WeatherData {
  condition: string;      // Human-readable (e.g., "Clear", "Rain")
  temperature: number;    // Temperature in Celsius
  iconCode: string;       // WMO code as string (e.g., "0", "61")
}
```

**WMO Code Mapping (from fetch-weather.ts):**
```typescript
export function mapWeatherCode(wmoCode: number): string {
  if (wmoCode === 0) return 'Clear';
  if (wmoCode >= 1 && wmoCode <= 3) return 'Partly Cloudy';
  if (wmoCode === 45 || wmoCode === 48) return 'Fog';
  if (wmoCode >= 51 && wmoCode <= 67) return 'Rain';
  if (wmoCode >= 71 && wmoCode <= 77) return 'Snow';
  if (wmoCode >= 80 && wmoCode <= 99) return 'Thunderstorm';
  return 'Unknown';
}
```

**IMPORTANT:** This story (12.3) creates **NEW** utilities for **display** (emoji icons, temperature conversion). Do NOT modify or import from `fetch-weather.ts` (that's for API fetching). Create separate `weather-display.ts` utilities.

**Database State:**
- 8 entries have weather data populated (from backfill)
- Weather fields are optional (can be null)
- Temperature stored in Celsius

**Testing Patterns:**
- Story 12.2 used Vitest with mocked fetch and PrismaBetterSqlite3
- 24 tests total (17 unit + 7 integration)
- Follow similar test structure for weather display utilities

**Architectural Pattern:**
- Runtime execution via instrumentation.ts (NOT CLI scripts)
- Utilities accept parameters (don't create globals)
- Idempotency handled with hasRun flags

---

### Git Intelligence Summary

**Recent Commits (Context for Story 12.3):**

1. **21b7739** - Story 11.4 Bugfix 1
2. **e77f0c3** - Story 11.4 Aggregate trip flags
3. **2987d26** - Story 11.1 Add Country Code
4. **131989e** - Story 10.3 Crossfade in slideshow
5. **ae45099** - Story 10.2 Bugfix 1

**Relevant Patterns from Recent Work:**

**Epic 11 (Country Flags) - Direct Parallel:**
- Story 11.3 implemented country flag display on entry detail pages
- Pattern: Added flag emoji + country name inline in entry header
- Location: `entry-detail.tsx` lines ~271-278
- Utilities: `countryCodeToFlag()` and `countryCodeToName()` from `utils/country-flag.ts`
- **This story follows the same pattern:** Add weather icon + temperature to the right of country display

**Code Conventions from Recent Commits:**

- Utility files in `src/utils/` (country-flag.ts)
- Emoji used for visual indicators (country flags)
- Conditional rendering for optional data (`countryFlag ? ... : null`)
- Translation hook provides locale: `const { t, formatDate, locale } = useTranslation()`
- Component files use kebab-case: `entry-detail.tsx`, `entry-reader.tsx`

**Testing Conventions:**

- Tests in `tests/utils/` directory (NOT colocated)
- Vitest framework for unit tests
- Test files mirror source structure: `tests/utils/weather-display.test.ts`

**DO NOT:**
- Don't introduce new patterns - follow Epic 11 display pattern
- Don't refactor existing components unnecessarily
- Don't change location display structure (just add weather inline)

---

### Project Context Reference

**From project-context.md:**

**Technology Stack:**
- Next.js (App Router), React, TypeScript, Tailwind CSS
- Prisma 7.2.0 (ORM), SQLite (database)
- Vitest (testing)

**Critical Rules:**
1. **Naming:** camelCase for variables/functions, PascalCase for components, kebab-case for files
2. **Structure:** Utilities in `src/utils/`, components in `src/components/<feature>/`
3. **Testing:** Central `tests/` directory (NO colocated tests)
4. **Translations:** All user-facing strings must be translatable (English + German)

**API Patterns:**
- No API changes needed for this story
- Data already in database from Story 12.2

**Component Patterns:**
- Use Next.js Image component for media
- Follow existing component structure
- Conditional rendering for optional data

**DO NOT:**
- Don't use snake_case in code or JSON
- Don't colocate tests with source files
- Don't introduce Docker/TLS in MVP work
- Don't create `lib/` folder (use `utils/` instead)

---

## Dev Agent Record

### Agent Model Used

Codex GPT-5

### Debug Log References

- `npm test -- tests/utils/weather-display.test.ts tests/components/entry-detail.test.tsx tests/components/entry-reader.test.tsx` (passes; jsdom canvas warnings from video thumbnail)
- `npm test` (passes; jsdom canvas warnings + existing stderr from image compression and weather utilities)

### Implementation Plan

- Add weather display utilities for emoji mapping and locale temperature formatting.
- Render weather alongside country flag/name in entry detail and shared entry reader.
- Extend entry reader types/mapping to surface weather fields.

### Completion Notes

- Added weather display utilities for WMO emoji mapping and locale-based temperature formatting.
- Integrated weather display into entry detail and shared entry reader headers with conditional rendering.
- Added unit/integration tests for weather utilities and locale-specific display cases.
- Shared view now derives weather units from browser locale and weather display no longer depends on country flag presence.
- Weather display treats blank conditions as missing, with tests covering format grouping.
- Full test suite passes; existing stderr noise persists (canvas thumbnail + compression warnings).
- Manual checks confirmed for entry detail and shared entry weather display.

### File List

- travelblogs/src/utils/weather-display.ts
- travelblogs/src/utils/entry-reader.ts
- travelblogs/src/components/entries/entry-detail.tsx
- travelblogs/src/components/entries/entry-reader.tsx
- travelblogs/tests/utils/weather-display.test.ts
- travelblogs/tests/components/entry-detail.test.tsx
- travelblogs/tests/components/entry-reader.test.tsx
- travelblogs/tests/utils/entry-reader-mapper.test.ts
- travelblogs/prisma/schema.prisma
- travelblogs/prisma/migrations/20260122202523_add_weather_fields/migration.sql
- travelblogs/src/instrumentation.ts
- travelblogs/src/utils/backfill-weather.ts
- travelblogs/src/utils/fetch-weather.ts
- travelblogs/tests/utils/backfill-weather.test.ts
- travelblogs/tests/utils/fetch-weather.test.ts
- _bmad-output/planning-artifacts/epics.md
- travelblogs/src/app/api/trips/share/[token]/entries/[entryId]/route.ts
- _bmad-output/implementation-artifacts/sprint-status.yaml
- _bmad-output/implementation-artifacts/12-3-display-weather-on-entry-detail-pages.md

### Change Log

- 2026-01-22: Added weather display utilities, entry detail/shared reader weather rendering, and tests.
- 2026-01-22: Use browser locale for shared view weather units, render weather without country flag, tighten weather display validation, update tests, reconcile file list.
- 2026-01-22: Include weather fields in shared entry API payload for weather rendering.
- 2026-01-22: Right-align shared weather display inside hero overlay box.
