# Production Deployment Guide - Epic 7

This guide covers deploying Epic 7 changes to your production server.

## What Changed

- **Story 7.1**: Added Leaflet map view with OpenStreetMap tiles
- **Story 7.2**: GPS coordinate extraction from photo EXIF data
- **Story 7.3**: Map panel added to edit trip page with shared viewer layout
- **Story 7.4**: Manual story location selector + geocoding search with popup entry links
- **Database**: Added `latitude`, `longitude`, `locationName` fields to Entry table

## Prerequisites

- SSH access to your production server
- Git repository up to date on production
- Node.js and npm installed on production server

## Deployment Steps

### Epic 6 → Epic 7 Upgrade Checklist

- Confirm production is running the last Epic 6 tag/commit
- Pull latest Epic 7 code (stories 7.1–7.4)
- Install dependencies (`leaflet`, `react-leaflet`, `@types/leaflet`, `exifr`)
- Apply Prisma migration `20260110183000_add_entry_location_fields`
- Build and restart the app
- Verify map markers and story popups render
- Verify story location search + photo GPS selection work

### 1. Connect to Production Server

```bash
ssh user@your-production-server
cd /path/to/TravelBlogs
```

### 2. Pull Latest Code

```bash
git pull origin main
```

### 3. Navigate to Application Directory

```bash
cd travelblogs
```

### 4. Install New Dependencies

This installs Leaflet and related packages:

```bash
npm install
```

**New packages added (Epic 7):**
- `leaflet@^1.9.4` - Map rendering library
- `react-leaflet@^5.0.0` - React bindings for Leaflet
- `@types/leaflet@^1.9.21` - TypeScript types (dev dependency)
- `exifr@^7.1.3` - EXIF GPS extraction for uploaded photos

### 5. Apply Database Migration

This adds the location fields to your Entry table:

```bash
npx prisma migrate deploy
```

**Migration applied:** `20260110183000_add_entry_location_fields`

**Schema changes:**
- `Entry.latitude` (Float?, nullable)
- `Entry.longitude` (Float?, nullable)
- `Entry.locationName` (String?, nullable)

### 6. Build Application

```bash
npm run build
```

This compiles TypeScript, bundles Leaflet CSS, and generates Prisma client.

### 7. Restart Production Server

**If using npm:**
```bash
npm run start
```

**If using PM2:**
```bash
pm2 restart travelblogs
```

**If using systemd:**
```bash
sudo systemctl restart travelblogs
```

## Verification

### Check Map Rendering

1. Navigate to any trip overview page
2. Verify:
   - If trip has no entries with location data: Empty state message appears
   - If trip has entries with location data: OpenStreetMap tiles load and markers appear
   - Click on a map marker: Entry highlights and a popup with the story title opens
   - Click the popup title: Opens the entry page

### Check Edit Trip Map

1. Navigate to any edit trip page
2. Verify:
   - Map panel renders in the same layout as the shared viewer
   - Marker click behavior matches the overview page

### Check Manual Story Location

1. Create/edit an entry and type a place name
2. Verify:
   - Search results appear and can be selected
   - Selected location persists on save
   - "Use photo location" is available on image hover for GPS-tagged images

### Check for Errors

```bash
# Check application logs
pm2 logs travelblogs
# OR
journalctl -u travelblogs -f
```

**Look for:**
- ✅ No Leaflet-related errors
- ✅ Map tiles loading from `tile.openstreetmap.org`
- ✅ No SSR (Server-Side Rendering) errors

### Database Verification

```bash
cd /path/to/TravelBlogs/travelblogs
npx prisma studio
```

Check the Entry table schema includes: `latitude`, `longitude`, `locationName`

## Rollback (If Needed)

If you encounter critical issues:

### 1. Revert Code

```bash
git revert <commit-hash>
git push origin main
```

### 2. Rollback Migration

```bash
# This will remove the location fields
npx prisma migrate resolve --rolled-back 20260110183000_add_entry_location_fields
```

### 3. Rebuild and Restart

```bash
npm run build
pm2 restart travelblogs  # or your restart command
```

## Known Issues & Troubleshooting

### Map Tiles Not Loading

**Symptoms:** Beige/tan background appears but no map tiles

**Causes:**
- CORS issues with OpenStreetMap
- Firewall blocking tile requests
- Network connectivity

**Solution:**
```bash
# Check if tile server is reachable
curl -I https://tile.openstreetmap.org/0/0/0.png
```

### Build Fails with TypeScript Errors

**Symptoms:** Build fails with Leaflet type errors

**Solution:**
```bash
# Ensure types are installed
npm install --save-dev @types/leaflet
rm -rf .next
npm run build
```

### Migration Already Applied Error

**Symptoms:** `prisma migrate deploy` says migration already applied

**Solution:** This is normal if migration was previously applied. Skip to build step.

## Performance Notes

- **Bundle size increase:** ~150KB gzipped (Leaflet library)
- **Map tile caching:** Browser automatically caches tiles
- **First load:** 100ms delay before map initialization (prevents blocking)
- **Geocoding:** Location search is debounced in the UI and rate-limited server-side

## Security Notes

- OpenStreetMap tiles are served over HTTPS
- Location search uses OpenStreetMap Nominatim (no API key required)
- Attribution required: Already included in map component

## Support

If issues arise:
1. Check application logs
2. Verify all steps completed in order
3. Check browser console for client-side errors
4. Verify migration applied: `npx prisma migrate status`

---

**Last Updated:** 2026-01-11
**Epic:** 7 - Location Features
**Stories Completed:** 7.1, 7.2, 7.3, 7.4
