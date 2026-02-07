# Story 14.8: HEIC Upload Support

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a creator or contributor,
I want to upload HEIC/HEIF photos in the same places I can upload JPG/PNG/WebP,
so that iPhone photos work without manual conversion.

## Acceptance Criteria

1. **HEIC/HEIF accepted in upload pickers**
   - Given I am uploading a trip cover image or entry media
   - When I open the file picker
   - Then HEIC/HEIF files are selectable alongside JPG/PNG/WebP

2. **Server validation allows HEIC/HEIF**
   - Given I upload a HEIC/HEIF image
   - When the upload is validated server-side
   - Then the file is accepted as an image
   - And validation errors list HEIC/HEIF as supported formats

3. **HEIC/HEIF always converts to JPG on upload**
   - Given I upload a HEIC/HEIF image
   - When the upload completes successfully
   - Then the stored file is a JPG
   - And the returned URL ends with `.jpg`
   - And existing JPG/PNG/WebP uploads remain unchanged

4. **Compression/resizing behavior remains consistent**
   - Given I upload a large HEIC/HEIF image
   - When the server processes it
   - Then the image is resized to fit within 1920px and encoded as JPG at quality 85
   - Given I upload a small HEIC/HEIF image
   - When the server processes it
   - Then it is still converted to JPG even if no resize is needed

5. **GPS extraction uses the converted JPG**
   - Given a HEIC/HEIF image contains GPS metadata
   - When it is uploaded
   - Then GPS extraction runs against the converted JPG buffer
   - And the location response behaves the same as existing JPG uploads

6. **Mixed batch uploads work**
   - Given I upload multiple files including HEIC/HEIF and JPG/PNG/WebP
   - When the batch finishes
   - Then all valid images upload successfully and are labeled as `image`
   - And invalid types still fail with per-file errors

7. **Graceful failure if HEIC decode is unsupported**
   - Given the server build cannot decode HEIC/HEIF
   - When a HEIC/HEIF upload is attempted
   - Then the upload fails with a clear, translatable error message
   - And no partial file is written

## Tasks / Subtasks

- [x] Expand allowed image MIME types to include HEIC/HEIF (AC: 1, 2)
  - [x] Update `COVER_IMAGE_ALLOWED_MIME_TYPES` in `travelblogs/src/utils/media.ts`
  - [x] Ensure `ENTRY_MEDIA_ALLOWED_MIME_TYPES` inherits the updated list
  - [x] Update file input `accept` lists in create/edit trip and entry forms
  - [x] Update i18n strings for type errors to mention HEIC/HEIF in both English and German
- [x] Ensure HEIC/HEIF always outputs JPG (AC: 3, 4, 5)
  - [x] Extend `compressImage` to accept a hint or options (ex: `forceJpeg`) and re-encode even when no resize is needed
  - [x] Pass the upload MIME type into `compressImage` from both upload paths
  - [x] Make sure stored filenames use `.jpg` for HEIC/HEIF via `getCoverImageExtension`
  - [x] Run GPS extraction on the final JPG buffer
- [x] Align entry media server action with API upload behavior (AC: 3, 4, 5, 6)
  - [x] Reuse the same compression/convert flow in `travelblogs/src/actions/upload-media.ts`
  - [x] Preserve existing response shape `{ data, error }` and `mediaType` handling
- [x] Add regression coverage (AC: 1-7)
  - [x] Add HEIC fixture in `travelblogs/tests/fixtures/` (small file)
  - [x] Extend `travelblogs/tests/api/media/upload.test.ts` to accept HEIC and verify `.jpg` output
  - [x] Extend `travelblogs/tests/api/media/upload-cover-image.test.ts` for HEIC acceptance and conversion
  - [x] Add a unit test for `compressImage` to ensure HEIC is re-encoded even when below size threshold
  - [x] Add a failure test for unsupported HEIC decode (if feasible via mock)

## Dev Notes

### Story Foundation

- User request: allow HEIC/HEIF uploads and convert to JPG on upload for cover images and entry media.
- Existing upload validation and type lists live in `travelblogs/src/utils/media.ts` and are reused for entry media.

### Developer Context (Guardrails)

- **No new upload endpoints**; reuse `src/app/api/media/upload/route.ts` and `src/actions/upload-media.ts`.
- **Keep response shape** `{ data, error }` and `mediaType` values unchanged.
- **Preserve current max file size limits** (15MB for images, 100MB for videos).
- **Do not introduce new storage paths**; keep uploads under `public/uploads/trips`.

### Technical Requirements

- Add `image/heic` and `image/heif` to allowed MIME types.
- Map HEIC/HEIF to `.jpg` extension in `getCoverImageExtension`.
- Ensure HEIC/HEIF conversion happens even when no resize occurs (current `compressImage` returns the original buffer when under 1920px).
- Use the converted JPG buffer for GPS extraction and file write.
- Surface a clear error if the server cannot decode HEIC/HEIF (translatable message).

### Architecture Compliance

- App Router only; keep API routes under `src/app/api`.
- Tests live under `tests/` (no co-located tests).
- All user-facing strings must be translated in English and German. [Source: _bmad-output/project-context.md]

### Library / Framework Requirements

- Sharp uses libvips for HEIF/HEIC support and requires libheif to be present in the build. [Source: sharp docs (HEIF output), libvips docs (libheif support)]
- If libheif is unavailable, HEIC decode will fail; handle this gracefully with a user-facing error.

### File Structure Requirements

- `travelblogs/src/utils/media.ts`
- `travelblogs/src/utils/compress-image.ts`
- `travelblogs/src/app/api/media/upload/route.ts`
- `travelblogs/src/actions/upload-media.ts`
- `travelblogs/src/components/trips/create-trip-form.tsx`
- `travelblogs/src/components/trips/edit-trip-form.tsx`
- `travelblogs/src/components/entries/create-entry-form.tsx`
- `travelblogs/src/components/entries/edit-entry-form.tsx`
- `travelblogs/src/utils/i18n.ts`
- `travelblogs/tests/api/media/upload.test.ts`
- `travelblogs/tests/api/media/upload-cover-image.test.ts`
- `travelblogs/tests/utils/compress-image.test.ts`

### Testing Requirements

- Verify HEIC/HEIF is accepted in both single and batch uploads.
- Verify converted output is `.jpg` and still returns `mediaType: image`.
- Verify small HEIC files are still re-encoded to JPG.
- Verify clear error when HEIC decode is unsupported (mock if needed).

### Previous Story Intelligence

- Recent story files use explicit task lists and reference file paths; follow that structure. [Source: _bmad-output/implementation-artifacts/14-7-enable-map-zoom-and-pan.md]

### Git Intelligence

- Recent commits are focused on world-map work; no recent changes in upload flow. [Source: `git log -5 --name-only`]

### Latest Tech Information

- HEIF/HEIC support in Sharp depends on libvips with libheif enabled; confirm runtime build supports HEIF decode. [Source: sharp docs (HEIF output), libvips docs (libheif support)]

### Project Context Reference

- Follow `_bmad-output/project-context.md` for naming, API shape, and translation rules.

### References

- Project context: `_bmad-output/project-context.md`
- PRD media handling: `_bmad-output/planning-artifacts/prd.md`
- Epic context: `_bmad-output/planning-artifacts/epics.md`
- Upload API: `travelblogs/src/app/api/media/upload/route.ts`
- Upload server action: `travelblogs/src/actions/upload-media.ts`
- Compression utility: `travelblogs/src/utils/compress-image.ts`
- Media validation: `travelblogs/src/utils/media.ts`

## Dev Agent Record

### Agent Model Used

GPT-5

### Debug Log References

- User request: enable HEIC/HEIF uploads and convert to JPG (2026-02-07)

### Completion Notes List

- ✅ Added HEIC/HEIF to allowed MIME types and user-facing error strings; accept lists now include HEIC/HEIF.
- ✅ Forced HEIC/HEIF uploads through JPEG conversion with GPS extraction on the converted buffer; aligned server action flow.
- ✅ Added HEIC fixture and regression tests (HEIC conversion + unsupported decode) and ran `npm test`.
- ✅ Review fixes: force JPEG conversion even without metadata, preserve HEIC error codes in batch failures, update cover format hint text.

### File List

- `_bmad-output/implementation-artifacts/14-8-heic-upload-support.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `travelblogs/src/actions/upload-media.ts`
- `travelblogs/src/app/api/media/upload/route.ts`
- `travelblogs/src/utils/compress-image.ts`
- `travelblogs/src/utils/cover-upload.ts`
- `travelblogs/src/utils/entry-media.ts`
- `travelblogs/src/utils/i18n.ts`
- `travelblogs/src/utils/media.ts`
- `travelblogs/tests/api/media/upload-cover-image.test.ts`
- `travelblogs/tests/api/media/upload.test.ts`
- `travelblogs/tests/components/cover-image-form.test.tsx`
- `travelblogs/tests/components/create-entry-form.test.tsx`
- `travelblogs/tests/components/edit-entry-form.test.tsx`
- `travelblogs/tests/fixtures/test-image.heic`
- `travelblogs/tests/utils/compress-image.test.ts`

### Change Log

- 2026-02-07: Added HEIC/HEIF upload support with JPEG conversion, error handling, and regression coverage.
- 2026-02-07: Review fixes for forced JPEG conversion, batch error codes, and copy update.
