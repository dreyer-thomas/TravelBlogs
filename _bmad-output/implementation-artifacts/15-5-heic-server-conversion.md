# Story 15.5: HEIC Server-Side Conversion

Status: done

## Story

As an administrator,
I want HEIC/HEIF uploads to be converted to JPG on the server,
so that all uploaded images are web-compatible and render consistently.

## Acceptance Criteria

1. **Server-side conversion**
   - Given I upload a HEIC/HEIF image (trip cover or entry media)
   - When the server processes the upload
   - Then the image is converted to JPG and stored as JPG

2. **Consistent URL/extension**
   - Given the server converts a HEIC/HEIF image
   - Then the returned URL points to a `.jpg` file
   - And any HEIC/HEIF file is never stored as `.heic` or `.heif`

3. **Metadata and GPS extraction**
   - Given a HEIC/HEIF image contains EXIF GPS data
   - When the server converts it
   - Then GPS extraction still works (using converted buffer)

4. **Graceful failure**
   - Given HEIC conversion fails (missing libheif or corrupt file)
   - Then the upload is rejected with a clear error message
   - And no partial files are left on disk

## Tasks / Subtasks

- [x] Enforce HEIC conversion in cover/entry upload endpoints (AC: 1-4)
  - [x] Ensure `compressImage` uses `sharp` HEIC support or fails fast
  - [x] Reject HEIC/HEIF uploads if conversion fails (no fallback storage)
  - [x] Always emit `.jpg` filename for HEIC uploads
- [x] Update server action upload flow for entry media (AC: 1-4)
  - [x] Mirror conversion behavior in `uploadMediaAction`
- [x] Update user-facing error copy (AC: 4)
  - [x] Use existing i18n keys or add new ones for conversion failure
- [x] Tests (AC: 1-4)
  - [x] Media upload API: HEIC converts to JPG and returns `.jpg`
  - [x] Server action: HEIC converts to JPG and returns `.jpg`
  - [x] Conversion failure returns HEIC-specific error and no file written

## Dev Notes

### Developer Context

- Upload API: `travelblogs/src/app/api/media/upload/route.ts`
- Server action: `travelblogs/src/actions/upload-media.ts`
- Image compression: `travelblogs/src/utils/compress-image.ts`
- Media helpers: `travelblogs/src/utils/media.ts`
- Translations: `travelblogs/src/utils/i18n.ts`

### Technical Requirements

- **Conversion:** Use `sharp` with HEIC support (libheif). If unavailable, return a clear error.
- **Output format:** Always store HEIC/HEIF as JPG with `.jpg` extension.
- **No fallback:** Do not store original HEIC/HEIF on disk if conversion fails.
- **API shape:** Responses must be `{ data, error }` with `{ error: { code, message } }`.

### Testing Requirements

- API test: HEIC upload returns `.jpg` and writes JPEG to disk (stub `sharp`).
- API test: HEIC conversion failure returns `HEIC_UNSUPPORTED` with message.
- Server action test: HEIC conversion failure returns error and no file written.

## Dev Agent Record

### Agent Model Used

GPT-5

### Debug Log References

N/A

### Implementation Plan

- Detect HEIC MIME type and force JPEG conversion.
- Ensure conversion failures return consistent errors.
- Add tests for conversion success/failure.

### Completion Notes List

- [x] Enforced HEIC conversion failures to return `HEIC_UNSUPPORTED` and avoid HEIC storage for API/server-action uploads.
- [x] Added/updated tests for HEIC conversion success and failure (API + server action).
- [x] Returned server-action responses in `{ data, error }` shape and routed HEIC errors through i18n keys.
- [x] Cleaned up partial files when HEIC conversion fails during multi-file uploads.

### File List

- `_bmad-output/implementation-artifacts/15-5-heic-server-conversion.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `travelblogs/src/actions/upload-media.ts`
- `travelblogs/src/app/api/media/upload/route.ts`
- `travelblogs/src/app/layout.tsx`
- `travelblogs/src/utils/entry-media.ts`
- `travelblogs/tests/api/media/upload-cover-image.test.ts`
- `travelblogs/tests/components/admin/trips-restore.test.tsx`
- `travelblogs/tests/utils/upload-media-action.test.ts`

## Change Log

- 2026-02-08: Enforced HEIC conversion failure handling; added HEIC conversion tests and updated test baselines.
- 2026-02-08: Aligned server-action response shape, HEIC i18n keys, multi-file cleanup, and stabilized HEIC tests.
- 2026-02-08: Restored global typography setup required by existing tests.
