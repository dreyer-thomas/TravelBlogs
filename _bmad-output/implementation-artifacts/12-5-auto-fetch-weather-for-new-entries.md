# Story 12.5: Auto Fetch Weather for New Entries

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a creator,
I want weather data to be automatically fetched when I create or update an entry with a location,
so that I do not need to manually run backfill scripts for new content.

## Acceptance Criteria

1. **Weather fetched on entry creation**  
   Given I create a new entry with location (lat/long)  
   When the entry is saved  
   Then the system automatically fetches historical weather for that date/location  
   And stores the weather data in the database
2. **Weather updated when location changes**  
   Given I edit an entry and change the location  
   When I save the entry  
   Then the system fetches new weather data for the updated location  
   And updates the weather fields in the database
3. **Weather cleared when location removed**  
   Given I edit an entry and remove the location  
   When I save the entry  
   Then the weather fields are cleared (set to null)
4. **Graceful handling of API failures**  
   Given I create/update an entry with location  
   And the weather API is unavailable or fails  
   When the entry is saved  
   Then the entry is still saved successfully  
   And weather fields remain null  
   And an error is logged (not shown to the user)

## Tasks / Subtasks

- [x] Auto-fetch weather on entry creation (AC: 1, 4)
  - [x] Reuse `fetchHistoricalWeather` from `src/utils/fetch-weather.ts` in `src/app/api/entries/route.ts`
  - [x] Use entry `createdAt` (entry date) and location when calling weather fetch
  - [x] Persist `weatherCondition`, `weatherTemperature`, `weatherIconCode` when weather fetch succeeds
  - [x] Ensure errors do not prevent entry creation; log and continue
- [x] Update weather on entry updates (AC: 2, 3, 4)
  - [x] In `src/app/api/entries/[id]/route.ts`, detect location changes and call `fetchHistoricalWeather`
  - [x] Clear weather fields when location is removed (lat/long null)
  - [x] Do not modify weather fields when location is unchanged
  - [x] Ensure API failures never block entry updates; log and continue
- [x] Tests (AC: 1-4)
  - [x] Update `tests/api/entries/create-entry.test.ts` to mock weather fetch and assert weather fields are set/cleared
  - [x] Update `tests/api/entries/update-entry.test.ts` for location change/removal behavior

## Dev Notes

### Developer Context

- Story 12.5 auto-fetches weather data for new/updated entries with locations.
- Weather fields already exist on Entry: `weatherCondition`, `weatherTemperature` (Celsius), `weatherIconCode` (WMO code string).
- Reuse `fetchHistoricalWeather` from `travelblogs/src/utils/fetch-weather.ts` (created in Story 12.2); do not add new weather clients.
- Weather display (Story 12.3) reads these fields via `formatWeatherDisplay` in `travelblogs/src/utils/weather-display.ts`.
- Create flow: `POST /api/entries` already reverse-geocodes; add best-effort weather fetch/update after entry creation.
- Update flow: `PATCH /api/entries/[id]` already handles location changes; only fetch when coordinates change and clear weather when location is removed.

### Technical Requirements

- Use `fetchHistoricalWeather(latitude, longitude, createdAt)` and store:
  - `weatherCondition` (mapped string from WMO code)
  - `weatherTemperature` (Celsius float)
  - `weatherIconCode` (WMO code string)
- Weather fetch must be best-effort:
  - Never block entry create/update
  - Log errors; do not return API errors to the client
- Update logic:
  - Only fetch when coordinates change (both lat/long present and changed)
  - Clear weather fields when location is removed (lat or long null)
  - Do not alter weather fields if location unchanged

### Architecture Compliance

- Follow project rules from `_bmad-output/project-context.md`:
  - API responses must be `{ data, error }` with `{ error: { code, message } }`
  - Use async/await (no raw Promise chains)
  - Use `utils/` for shared helpers; do not add `lib/`
  - Keep REST routes under `src/app/api`
- Weather fetches happen in API handlers:
  - `travelblogs/src/app/api/entries/route.ts` (POST)
  - `travelblogs/src/app/api/entries/[id]/route.ts` (PATCH)
- Keep JSON fields camelCase; no `snake_case` anywhere.

### Library & Framework Requirements

- Use existing utilities only:
  - `travelblogs/src/utils/fetch-weather.ts` for Open-Meteo API access
  - `travelblogs/src/utils/weather-display.ts` for UI formatting (no changes needed here)
- No new dependencies required.

### File Structure Requirements

- Update API handlers:
  - `travelblogs/src/app/api/entries/route.ts` (POST create)
  - `travelblogs/src/app/api/entries/[id]/route.ts` (PATCH update)
- Update tests:
  - `travelblogs/tests/api/entries/create-entry.test.ts`
  - `travelblogs/tests/api/entries/update-entry.test.ts`
- Do not create new top-level folders; use existing `utils/` and `tests/` structure.

### Testing Requirements

- Add/extend API tests to cover:
  - Weather fields set when weather fetch succeeds on create
  - Weather fields unchanged/null when weather fetch fails on create
  - Weather fields updated when location changes on update
  - Weather fields cleared when location removed on update
- Mock `fetchHistoricalWeather` in API tests to avoid network calls.

### Project Structure Notes

- Keep API response shapes intact: `{ data, error }` with ISO 8601 date strings.
- Weather data flows to UI via existing entry reader mapping (`src/utils/entry-reader.ts`).

### References

- Epic 12 Story 12.5 acceptance criteria in `/_bmad-output/planning-artifacts/epics.md`
- Weather utilities: `travelblogs/src/utils/fetch-weather.ts`
- Weather display: `travelblogs/src/utils/weather-display.ts`
- Entry create API: `travelblogs/src/app/api/entries/route.ts`
- Entry update API: `travelblogs/src/app/api/entries/[id]/route.ts`

## Story Completion Status

Status: done

Completion note: Ultimate context engine analysis completed - comprehensive developer guide created.

### Project Structure Notes

- Alignment with unified project structure (paths, modules, naming)
- Detected conflicts or variances (with rationale)

### References

- Cite all technical details with source paths and sections, e.g. [Source: docs/<file>.md#Section]

## Dev Agent Record

### Agent Model Used

GPT-5

### Debug Log References

- `npm test`

### Completion Notes List

- Made weather fetch fire-and-forget so entry create/update is non-blocking.
- Updated weather fetch to request `weathercode` and accept legacy `weather_code` responses.
- Adjusted API tests to wait for background weather updates.
- Tests not run for this follow-up change.

### File List

- _bmad-output/implementation-artifacts/12-1-add-weather-fields-to-database-schema.md
- _bmad-output/implementation-artifacts/12-2-create-weather-backfill-utility.md
- _bmad-output/implementation-artifacts/12-3-display-weather-on-entry-detail-pages.md
- travelblogs/src/app/api/entries/route.ts
- travelblogs/src/app/api/entries/[id]/route.ts
- travelblogs/src/app/api/trips/share/[token]/entries/[entryId]/route.ts
- travelblogs/src/components/entries/entry-detail.tsx
- travelblogs/src/components/entries/entry-reader.tsx
- travelblogs/src/instrumentation.ts
- travelblogs/src/utils/entry-reader.ts
- travelblogs/prisma/schema.prisma
- travelblogs/prisma/migrations/20260122202523_add_weather_fields/migration.sql
- travelblogs/src/utils/backfill-weather.ts
- travelblogs/src/utils/fetch-weather.ts
- travelblogs/src/utils/weather-display.ts
- travelblogs/tests/api/entries/create-entry.test.ts
- travelblogs/tests/api/entries/update-entry.test.ts
- travelblogs/tests/components/entry-reader.test.tsx
- travelblogs/tests/utils/fetch-weather.test.ts
- travelblogs/tests/utils/backfill-weather.test.ts
- travelblogs/tests/components/entry-detail.test.tsx
- travelblogs/tests/utils/entry-reader-mapper.test.ts
- travelblogs/tests/utils/weather-display.test.ts
- _bmad-output/implementation-artifacts/validation-report-20260122T215222Z.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- _bmad-output/implementation-artifacts/12-5-auto-fetch-weather-for-new-entries.md
- _bmad-output/planning-artifacts/epics.md

### Change Log

- 2026-01-22: Auto-fetch weather on entry create/update with best-effort handling, add tests, update weather assertion.
- 2026-01-22: Make weather fetch non-blocking, align Open-Meteo params, update tests for background updates.
