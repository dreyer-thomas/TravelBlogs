# TravelBlogs - Product Epics

*Generated: 2025-12-21*
*Product: TravelBlogs - Private travel blog platform for creators*

---

## Epic 0: Foundation & Security

Initial platform setup, authentication, and security configuration.

**Business Value:** Establish secure foundation for single-creator blog platform with HTTPS support.

**Dependencies:** None - foundational work

### Story 0.1: Creator Sign-In (Single Account)

**As a** creator
**I want to** sign in with my credentials
**So that** I can access my private travel blog

**Acceptance Criteria:**

#### AC 1: Sign-In Form
**Given** I am on the sign-in page
**When** I enter my username and password
**Then** I am authenticated and redirected to the trips page

#### AC 2: Invalid Credentials
**Given** I enter incorrect credentials
**When** I attempt to sign in
**Then** I see an error message and remain on the sign-in page

#### AC 3: Session Persistence
**Given** I am signed in
**When** I close and reopen my browser
**Then** I remain signed in (session persists)

**Technical Requirements:**
- NextAuth.js with credentials provider
- JWT session strategy
- Single hardcoded user account (no registration flow)
- Session stored in HTTP-only cookies

**Testing Requirements:**
- Valid login redirects to /trips
- Invalid credentials show error
- Session persists across browser restarts

**Source:** MVP requirement for basic access control
**Priority:** Critical - Required for any content creation
**Story Points:** 2

### Story 0.2: Enable HTTPS for Local Development

**As a** creator
**I want** HTTPS enabled in local development
**So that** I can use secure features (camera, geolocation) and simulate production environment

**Acceptance Criteria:**

#### AC 1: Self-Signed Certificate Generation
**Given** I set up the development environment
**When** I run the certificate generation script
**Then** a self-signed SSL certificate is created for localhost

#### AC 2: HTTPS Access
**Given** the development server is running
**When** I navigate to https://localhost:3000
**Then** the site loads with HTTPS (browser warning expected for self-signed cert)

#### AC 3: Secure Features Work
**Given** I am using HTTPS in development
**When** I access camera or geolocation features
**Then** the browser permits access to these secure APIs

**Technical Requirements:**
- mkcert or similar tool for local certificate generation
- Next.js server configured to use HTTPS in development
- Certificate files in .gitignore
- README documentation for setup

**Testing Requirements:**
- HTTPS loads successfully
- Camera access works (manual test)
- Geolocation access works (manual test)

**Source:** Required for PWA features and secure APIs
**Priority:** High - Enables geolocation and media features
**Story Points:** 1

### Story 0.3: Deactivate Creator Account

**As an** administrator
**I want to** deactivate the creator account without deleting data
**So that** I can temporarily disable access while preserving all trip and entry content

**Acceptance Criteria:**

#### AC 1: Account Deactivation
**Given** I am an administrator
**When** I deactivate the creator account
**Then** the account status is set to inactive
**And** all trips and entries remain in the database unchanged

#### AC 2: Sign-In Prevention
**Given** the creator account is deactivated
**When** the creator attempts to sign in with correct credentials
**Then** authentication is denied with message "Account is inactive"
**And** the creator is not granted access to the platform

#### AC 3: Account Reactivation
**Given** the creator account is deactivated
**When** I reactivate the account
**Then** the account status is set to active
**And** the creator can sign in and access all their content normally

**Technical Requirements:**
- Add `isActive` boolean field to User model (default: true)
- Update authentication middleware to check `isActive` status
- Deny login if `isActive === false`
- All content (trips, entries, media) remains untouched during deactivation
- Admin interface or script to toggle `isActive` status

**Testing Requirements:**
- Active account can sign in successfully
- Deactivated account cannot sign in (shows error message)
- Reactivated account can sign in again
- Deactivation does not delete or modify any trips/entries
- All user content remains accessible after reactivation

**Source:** Admin requirement for account management without data loss
**Priority:** Medium - Administrative control feature
**Story Points:** 2

---

## Epic 1: Core Trip Management

Basic trip creation, viewing, and management functionality.

**Business Value:** Enable creators to organize travel content into trip collections.

**Dependencies:** Epic 0 (Authentication required)

### Story 1.1: Initialize Project from Starter Template

**As a** developer
**I want to** initialize the TravelBlogs project from create-next-app
**So that** I have a clean Next.js foundation with TypeScript, Tailwind, and recommended tooling

**Acceptance Criteria:**

#### AC 1: Next.js Project Scaffolding
**Given** I run the initialization command
**When** the process completes
**Then** a Next.js project is created with App Router, TypeScript, Tailwind CSS, and ESLint

#### AC 2: Development Server Runs
**Given** the project is initialized
**When** I run `npm run dev`
**Then** the development server starts successfully on http://localhost:3000

#### AC 3: Project Structure Validation
**Given** the project is initialized
**When** I inspect the directory structure
**Then** the following are present:
- `src/app/` directory (App Router)
- `src/components/` directory
- `tailwind.config.ts`
- `tsconfig.json`
- `.eslintrc.json`
- `package.json` with Next.js, React, TypeScript, Tailwind dependencies

**Technical Requirements:**
- Use `npx create-next-app@latest` with recommended options
- TypeScript enabled
- App Router (not Pages Router)
- Tailwind CSS configured
- ESLint configured
- No custom modifications during initialization

**Testing Requirements:**
- Project builds without errors (`npm run build`)
- Development server runs without errors
- TypeScript compiles successfully
- Tailwind CSS is functional (test with a styled component)

**Source:** Foundation requirement for all subsequent work
**Priority:** Critical - Must be completed first
**Story Points:** 1

### Story 1.2: Create Trip

**As a** creator
**I want to** create a new trip with title, description, and date range
**So that** I can organize my travel blog entries by trip

**Acceptance Criteria:**

#### AC 1: Trip Creation Form
**Given** I am on the trips page
**When** I click "Create Trip"
**Then** I see a form with fields for:
- Title (required)
- Description (optional)
- Start date (required)
- End date (optional)

#### AC 2: Successful Trip Creation
**Given** I fill out the trip form with valid data
**When** I submit the form
**Then** the trip is created and I am redirected to the trip detail page

#### AC 3: Validation
**Given** I attempt to create a trip
**When** I leave the title or start date empty
**Then** I see validation errors and the trip is not created

**Technical Requirements:**
- API endpoint: POST /api/trips
- Database: Trip model with title, description, startDate, endDate
- Form validation (Zod schema)
- Date picker component for date fields

**Testing Requirements:**
- Valid trip creation succeeds
- Missing required fields show errors
- Trip appears in database
- Redirect works after creation

**Source:** Core feature for organizing content
**Priority:** Critical
**Story Points:** 3

### Story 1.3: Delete Trip

**As a** creator
**I want to** delete a trip and all its entries
**So that** I can remove trips I no longer want

**Acceptance Criteria:**

#### AC 1: Delete Confirmation
**Given** I am viewing a trip
**When** I click "Delete Trip"
**Then** I see a confirmation dialog warning that all entries will also be deleted

#### AC 2: Successful Deletion
**Given** I confirm trip deletion
**When** the deletion completes
**Then** the trip and all its entries are removed from the database
**And** I am redirected to the trips list

#### AC 3: Cancel Deletion
**Given** I click "Delete Trip"
**When** I cancel the confirmation dialog
**Then** no changes are made and the trip remains

**Technical Requirements:**
- API endpoint: DELETE /api/trips/:id
- Cascade delete all entries associated with trip
- Confirmation modal component

**Testing Requirements:**
- Deleting trip removes trip and entries
- Cancel keeps trip intact
- Redirect works after deletion

**Source:** Basic CRUD functionality
**Priority:** High
**Story Points:** 2

### Story 1.4: Edit Trip Metadata

**As a** creator
**I want to** edit a trip's title, description, and date range
**So that** I can update trip details as plans change

**Acceptance Criteria:**

#### AC 1: Edit Form Pre-populated
**Given** I am viewing a trip
**When** I click "Edit Trip"
**Then** I see a form with the trip's current title, description, and dates

#### AC 2: Successful Update
**Given** I modify trip details
**When** I save changes
**Then** the trip is updated in the database
**And** I am redirected to the trip detail page with updated information

#### AC 3: Validation
**Given** I am editing a trip
**When** I clear required fields
**Then** I see validation errors and changes are not saved

**Technical Requirements:**
- API endpoint: PUT /api/trips/:id
- Reuse trip form component from Story 1.2
- Populate form with existing trip data

**Testing Requirements:**
- Form shows existing trip data
- Valid updates are saved
- Invalid updates show errors
- Updated trip reflects changes

**Source:** Basic CRUD functionality
**Priority:** High
**Story Points:** 2

### Story 1.5: View Trip List

**As a** creator
**I want to** see a list of all my trips
**So that** I can navigate to a specific trip

**Acceptance Criteria:**

#### AC 1: Trip List Display
**Given** I have created trips
**When** I navigate to the trips page
**Then** I see a list of all trips with title, date range, and entry count

#### AC 2: Empty State
**Given** I have no trips
**When** I navigate to the trips page
**Then** I see a message encouraging me to create my first trip

#### AC 3: Trip Navigation
**Given** I am viewing the trip list
**When** I click on a trip
**Then** I am taken to that trip's detail page

**Technical Requirements:**
- API endpoint: GET /api/trips
- List view component
- Sort trips by start date (most recent first)
- Display entry count for each trip

**Testing Requirements:**
- List shows all trips
- Empty state renders when no trips exist
- Clicking trip navigates correctly
- Entry counts are accurate

**Source:** Core navigation feature
**Priority:** Critical
**Story Points:** 2

### Story 1.6: Trip Cover Image Upload

**As a** creator
**I want to** upload a cover image for each trip
**So that** my trip list is visually appealing and easier to navigate

**Acceptance Criteria:**

#### AC 1: Cover Image Upload on Create
**Given** I am creating a new trip
**When** I upload an image file (JPEG, PNG, WebP)
**Then** the image is saved and associated with the trip

#### AC 2: Cover Image Upload on Edit
**Given** I am editing an existing trip
**When** I upload a new cover image
**Then** the previous cover image is replaced
**And** the new image displays on the trip card

#### AC 3: Cover Image Display
**Given** a trip has a cover image
**When** I view the trip list
**Then** the cover image is displayed on the trip card
**And** the image is optimized for web display

#### AC 4: No Cover Image Fallback
**Given** a trip has no cover image
**When** I view the trip list
**Then** a placeholder or default background is shown on the trip card

**Technical Requirements:**
- Extend trip form to include image upload field
- API endpoint: POST/PUT /api/trips with multipart/form-data support
- Store images in NAS storage directory
- Use Next.js Image component for optimized display
- Support JPEG, PNG, WebP formats
- Max file size: 5MB

**Testing Requirements:**
- Image upload on create works
- Image upload on edit replaces old image
- Supported formats upload successfully
- File size limit enforced
- Trip list displays cover images correctly

**Source:** User request for visual trip organization
**Priority:** Medium - Enhances UX but not critical
**Story Points:** 3

### Story 1.7: Typography Refresh (Sans-Serif)

**As a** creator
**I want** the application to use a clean sans-serif font
**So that** the interface feels modern and content is easy to read

**Acceptance Criteria:**

#### AC 1: Sans-Serif Font Applied
**Given** I view any page in the application
**When** the page renders
**Then** all text uses a sans-serif font family (e.g., Inter, system-ui)

#### AC 2: Consistent Font Sizing
**Given** I view different pages
**When** comparing headings, body text, and labels
**Then** font sizes follow a consistent typographic scale

#### AC 3: Readability Maintained
**Given** I read long-form entry content
**When** viewing on desktop and mobile
**Then** line height, spacing, and font weight ensure comfortable reading

**Technical Requirements:**
- Update Tailwind config to use sans-serif font stack
- Remove any serif font references
- Ensure Next.js font optimization (next/font)
- Apply font-sans class globally via layout

**Testing Requirements:**
- Visual inspection across all pages
- Font loads correctly on first visit
- No serif fonts present anywhere

**Source:** Design improvement request
**Priority:** Low - Cosmetic change
**Story Points:** 1

---

## Epic 2: Entry Management

Create, edit, and view travel blog entries with text and media.

**Business Value:** Core content creation functionality for travel blogging.

**Dependencies:** Epic 1 (Trips must exist to add entries)

### Story 2.1: Add Blog Entry

**As a** creator
**I want to** add a blog entry to a trip with title, date, text, and location
**So that** I can document my travel experiences

**Acceptance Criteria:**

#### AC 1: Entry Creation Form
**Given** I am viewing a trip
**When** I click "Add Entry"
**Then** I see a form with fields for:
- Title (required)
- Date (defaults to today, editable)
- Text content (optional)
- Location (optional, with map picker)

#### AC 2: Successful Entry Creation
**Given** I fill out the entry form
**When** I submit the form
**Then** the entry is created and I see it in the trip's entry list

#### AC 3: Entry Date Validation
**Given** I am creating an entry
**When** I select a date outside the trip's date range
**Then** I see a warning (but can still save the entry)

**Technical Requirements:**
- API endpoint: POST /api/trips/:tripId/entries
- Entry model: title, content, date, location (lat/long)
- Rich text editor for content (e.g., Tiptap or simple textarea)
- Optional: Map picker for location (Leaflet or Google Maps)

**Testing Requirements:**
- Entry creation succeeds
- Entry appears in trip
- Date validation works
- Location picker functional (if implemented)

**Source:** Core content creation feature
**Priority:** Critical
**Story Points:** 5

### Story 2.2: Edit Blog Entry

**As a** creator
**I want to** edit an existing blog entry
**So that** I can update or correct my content

**Acceptance Criteria:**

#### AC 1: Edit Form Pre-populated
**Given** I am viewing an entry
**When** I click "Edit Entry"
**Then** I see the entry form with all current values populated

#### AC 2: Successful Update
**Given** I modify entry details
**When** I save changes
**Then** the entry is updated in the database
**And** I see the updated entry

**Technical Requirements:**
- API endpoint: PUT /api/entries/:id
- Reuse entry form component from Story 2.1

**Testing Requirements:**
- Form shows existing entry data
- Updates are saved correctly
- Validation works

**Source:** Basic CRUD functionality
**Priority:** High
**Story Points:** 2

### Story 2.3: Multi-File Media Upload

**As a** creator
**I want to** upload multiple photos to an entry at once
**So that** I can efficiently add media to my travel entries

**Acceptance Criteria:**

#### AC 1: Multi-Select Upload
**Given** I am creating or editing an entry
**When** I click "Add Photos"
**Then** I can select multiple image files from my device

#### AC 2: Upload Progress
**Given** I have selected multiple files
**When** upload begins
**Then** I see progress indicators for each file

#### AC 3: Media Gallery Display
**Given** an entry has multiple photos
**When** I view the entry
**Then** I see all photos in a gallery layout

**Technical Requirements:**
- API endpoint: POST /api/entries/:entryId/media (multipart/form-data)
- Support multiple files in single request
- Store images in NAS storage
- Create media records in database

**Testing Requirements:**
- Upload multiple files successfully
- Gallery displays all uploaded images
- Progress indicators work

**Source:** Core media functionality
**Priority:** High
**Story Points:** 3

### Story 2.4: Delete Blog Entry

**As a** creator
**I want to** delete a blog entry
**So that** I can remove entries I no longer want

**Acceptance Criteria:**

#### AC 1: Delete Confirmation
**Given** I am viewing an entry
**When** I click "Delete Entry"
**Then** I see a confirmation dialog

#### AC 2: Successful Deletion
**Given** I confirm entry deletion
**When** the deletion completes
**Then** the entry and its media are removed
**And** I am redirected to the trip page

**Technical Requirements:**
- API endpoint: DELETE /api/entries/:id
- Cascade delete entry media files

**Testing Requirements:**
- Entry deletion removes entry and media
- Cancel keeps entry intact

**Source:** Basic CRUD functionality
**Priority:** High
**Story Points:** 2

### Story 2.5: Entry Title

**As a** creator
**I want** every entry to have a title
**So that** I can quickly identify entries in lists and navigation

**Acceptance Criteria:**

#### AC 1: Title Required on Creation
**Given** I am creating a new entry
**When** I attempt to save without entering a title
**Then** I see a validation error and the entry is not created

#### AC 2: Title Required on Edit
**Given** I am editing an entry
**When** I delete the title and attempt to save
**Then** I see a validation error and changes are not saved

#### AC 3: Title Display
**Given** entries have titles
**When** I view an entry list or entry detail
**Then** the title is prominently displayed

**Technical Requirements:**
- Update Entry model: title field required (non-nullable)
- Update entry forms: title field marked required
- API validation: reject requests without title
- Migration: Add titles to any existing entries (if needed)

**Testing Requirements:**
- Entry creation without title fails
- Entry update without title fails
- Title displays correctly in UI

**Source:** Content organization requirement
**Priority:** High
**Story Points:** 1

### Story 2.6: Unified Entry Image Library

**As a** creator
**I want** all entry images stored in a central library
**So that** I can manage media efficiently and insert images into text content

**Acceptance Criteria:**

#### AC 1: Image Upload to Library
**Given** I am creating or editing an entry
**When** I upload images
**Then** images are added to the entry's media library
**And** each image is assigned a unique ID

#### AC 2: Insert Image from Library
**Given** I am editing entry text content
**When** I click "Insert Image"
**Then** I see a gallery of all images uploaded to this entry
**And** I can select an image to insert at the cursor position

#### AC 3: Image Gallery View
**Given** an entry has multiple images
**When** I view the entry
**Then** I see all images in a gallery below the text content
**And** clicking an image opens a full-screen viewer

**Technical Requirements:**
- Media stored in database with entryId foreign key
- Rich text editor supports image insertion by media ID
- Gallery component displays all entry media
- Full-screen viewer for media (lightbox)

**Testing Requirements:**
- Images upload to library successfully
- Insert image from library works in editor
- Gallery displays all entry images
- Full-screen viewer opens on click

**Source:** Media management and content creation improvement
**Priority:** Medium
**Story Points:** 5

### Story 2.7: Full-Screen Photo Viewer

**As a** viewer
**I want to** view entry photos in full-screen mode
**So that** I can appreciate travel photos in detail

**Acceptance Criteria:**

#### AC 1: Full-Screen Viewer Launch
**Given** I am viewing an entry with photos
**When** I click on a photo thumbnail in the gallery
**Then** the photo opens in a full-screen viewer overlay

#### AC 2: Navigation Controls
**Given** the full-screen viewer is open
**When** I use arrow keys or on-screen controls
**Then** I can navigate to the next or previous photo

#### AC 3: Close Viewer
**Given** the full-screen viewer is open
**When** I press Escape or click the close button
**Then** the viewer closes and I return to the entry view

#### AC 4: Zoom Support (Optional)
**Given** the full-screen viewer is open
**When** I pinch-zoom (mobile) or use zoom controls (desktop)
**Then** I can zoom in to see photo details

**Technical Requirements:**
- Full-screen modal component
- Keyboard navigation (arrow keys, Escape)
- Touch gestures for mobile (swipe, pinch-zoom)
- Use Next.js Image component for optimized display

**Testing Requirements:**
- Viewer opens on photo click
- Arrow keys navigate between photos
- Escape/close button closes viewer
- Zoom works (if implemented)

**Source:** Enhanced photo viewing experience
**Priority:** Medium
**Story Points:** 3

### Story 2.8: Media Slideshow Viewer

**As a** viewer
**I want to** start a slideshow of entry photos
**So that** I can view all photos automatically without manual navigation

**Acceptance Criteria:**

#### AC 1: Slideshow Mode
**Given** I am in the full-screen photo viewer
**When** I click "Start Slideshow"
**Then** photos advance automatically every 5 seconds

#### AC 2: Pause/Resume Slideshow
**Given** a slideshow is playing
**When** I press the spacebar or click a pause button
**Then** the slideshow pauses
**And** I can resume by pressing spacebar again

#### AC 3: Exit Slideshow
**Given** a slideshow is playing
**When** I press Escape or click the close button
**Then** the slideshow stops and the viewer closes

#### AC 4: Manual Navigation During Slideshow
**Given** a slideshow is playing
**When** I use arrow keys or swipe gestures
**Then** the slideshow pauses and I can manually navigate
**And** I can resume the slideshow afterward

**Technical Requirements:**
- Add slideshow mode to full-screen viewer (Story 2.7)
- Auto-advance timer (5 seconds per photo)
- Pause/resume controls
- Progress indicator showing current photo number

**Testing Requirements:**
- Slideshow advances automatically
- Pause/resume works correctly
- Manual navigation pauses slideshow
- Exit closes viewer and stops slideshow

**Source:** Enhanced media viewing experience
**Priority:** Low - Nice-to-have feature
**Story Points:** 2

---

## Epic 3: Reader Experience

Improve content viewing with better navigation and presentation.

**Business Value:** Enhance reading experience for blog viewers.

**Dependencies:** Epic 2 (Entries must exist to view)

### Story 3.1: View Entry (Single-Page Reader)

**As a** viewer
**I want to** read an entry on its own dedicated page
**So that** I can focus on the content without distractions

**Acceptance Criteria:**

#### AC 1: Entry Page Route
**Given** an entry exists
**When** I navigate to `/trips/:tripId/entries/:entryId`
**Then** I see the entry title, date, location, text content, and media gallery

#### AC 2: Entry Metadata Display
**Given** I am viewing an entry page
**When** the page loads
**Then** I see:
- Entry title as page heading
- Entry date formatted (e.g., "December 15, 2024")
- Location label (if set)
- Entry text content
- Media gallery below content

#### AC 3: Responsive Layout
**Given** I am viewing an entry on mobile or desktop
**When** the page renders
**Then** the layout adapts appropriately to the screen size

**Technical Requirements:**
- Next.js page: `src/app/trips/[tripId]/entries/[entryId]/page.tsx`
- API endpoint: GET /api/entries/:id
- Render entry text as HTML or Markdown
- Display media gallery using component from Story 2.7

**Testing Requirements:**
- Entry page loads successfully
- All entry metadata displays correctly
- Layout is responsive
- Media gallery renders

**Source:** Core reading experience
**Priority:** High
**Story Points:** 3

### Story 3.2: Entry Navigation

**As a** viewer
**I want to** navigate between entries within a trip
**So that** I can read entries in sequence without returning to the trip page

**Acceptance Criteria:**

#### AC 1: Next/Previous Buttons
**Given** I am viewing an entry
**When** there are other entries in the trip
**Then** I see "Next" and "Previous" buttons to navigate between entries

#### AC 2: Sequential Navigation
**Given** I am viewing an entry
**When** I click "Next"
**Then** I am taken to the next entry in chronological order

#### AC 3: First/Last Entry Handling
**Given** I am viewing the first entry in a trip
**When** the page renders
**Then** the "Previous" button is disabled or hidden

**Given** I am viewing the last entry in a trip
**When** the page renders
**Then** the "Next" button is disabled or hidden

**Technical Requirements:**
- API endpoint: GET /api/trips/:tripId/entries (returns all entries sorted by date)
- Determine current entry position in trip
- Render navigation buttons based on position

**Testing Requirements:**
- Next/Previous buttons navigate correctly
- First/last entry handling works
- Keyboard navigation (optional: arrow keys)

**Source:** Reading experience improvement
**Priority:** Medium
**Story Points:** 2

### Story 3.3: Trip Overview with Latest Entries

**As a** viewer
**I want to** see a trip overview page with the latest entries
**So that** I can quickly browse recent content in a trip

**Acceptance Criteria:**

#### AC 1: Trip Overview Page
**Given** I navigate to `/trips/:tripId`
**When** the page loads
**Then** I see:
- Trip title, description, and date range
- List of entries sorted by date (most recent first)
- Entry preview showing title, date, and first 2-3 lines of text

#### AC 2: Entry Preview Limit
**Given** a trip has many entries
**When** I view the trip overview
**Then** I see the latest 10 entries
**And** a "Load More" or "View All Entries" button if there are more

#### AC 3: Navigate to Full Entry
**Given** I am viewing the trip overview
**When** I click on an entry preview
**Then** I am taken to the full entry page (Story 3.1)

**Technical Requirements:**
- API endpoint: GET /api/trips/:tripId/entries (with pagination)
- Display latest 10 entries
- Truncate text preview to 3 lines with "..." ellipsis

**Testing Requirements:**
- Trip overview shows latest entries
- Entry previews are truncated correctly
- Clicking entry navigates to full entry page

**Source:** Trip browsing experience
**Priority:** High
**Story Points:** 3

### Story 3.4: Full-Screen Viewer: Minimal Chrome & Segmented Slideshow Progress

**As a** viewer watching a slideshow
**I want** the full-screen viewer to have minimal UI and show segmented progress
**So that** I can focus on photos with a clean interface and track progress visually

**Acceptance Criteria:**

#### AC 1: Minimal Chrome
**Given** I open the full-screen photo viewer
**When** the viewer displays
**Then** I see only:
- The current photo (full-screen)
- Minimal controls (close, next/prev arrows on hover)
- No distracting UI elements (no visible toolbar, counts, or labels unless hovered)

#### AC 2: Segmented Slideshow Progress Bar
**Given** I start a slideshow with multiple photos
**When** the slideshow plays
**Then** I see a segmented progress bar at the top of the screen
**And** each segment represents one photo in the slideshow
**And** the current segment fills progressively over 5 seconds
**And** completed segments remain filled
**And** upcoming segments remain unfilled

#### AC 3: Progress Bar Auto-Hide (Optional)
**Given** I am viewing the slideshow
**When** I do not interact for 3 seconds
**Then** the progress bar fades to minimal opacity (but remains visible)
**And** reappears at full opacity on interaction (mouse move, key press)

**Technical Requirements:**
- Remove or minimize UI chrome in full-screen viewer (Story 2.7)
- Add segmented progress bar component:
  - Total segments = total photos
  - Active segment animates fill over duration
  - Completed segments remain filled
  - Use CSS transitions for smooth fill animation
- Optional: Auto-hide controls with fade effect

**Testing Requirements:**
- Full-screen viewer has minimal UI
- Segmented progress bar displays correctly
- Progress animates during slideshow
- Segments update correctly as slideshow advances
- Auto-hide works (if implemented)

**Source:** Enhanced slideshow UX
**Priority:** Medium
**Story Points:** 3

### Story 3.5: Transfer Trip Ownership

**As a** creator
**I want to** transfer ownership of a trip to another user
**So that** I can delegate trip management while retaining access

**Acceptance Criteria:**

#### AC 1: Transfer Ownership Option
**Given** I am the owner of a trip
**When** I view the trip settings
**Then** I see a "Transfer Ownership" button

#### AC 2: Select New Owner
**Given** I click "Transfer Ownership"
**When** a dialog appears
**Then** I can select a user from a dropdown list (only users with access to this trip)
**And** I see a confirmation message explaining I will become a contributor after transfer

#### AC 3: Successful Transfer
**Given** I confirm the ownership transfer
**When** the transfer completes
**Then** the selected user becomes the trip owner
**And** I become a contributor with edit access
**And** both users receive a notification (if notifications exist)

#### AC 4: Owner-Only Capabilities
**Given** ownership has been transferred
**When** I (the previous owner) view the trip
**Then** I can no longer:
- Delete the trip
- Transfer ownership again
- Manage trip viewers/contributors (owner-only actions)

**Technical Requirements:**
- Add `ownerId` field to Trip model (if not already present)
- API endpoint: POST /api/trips/:tripId/transfer-ownership
- Update user role to contributor after transfer
- Verify new owner is an existing trip contributor/viewer
- Send notifications (if notification system exists)

**Testing Requirements:**
- Ownership transfer succeeds for valid users
- Previous owner becomes contributor after transfer
- New owner has full owner permissions
- Previous owner loses owner-only capabilities
- Transfer fails if selected user is not a trip participant

**Source:** Multi-user collaboration feature
**Priority:** Low - Only needed for multi-user scenarios
**Story Points:** 3

---

## Epic 4: Sharing & Collaboration

Enable sharing trips with others via links.

**Business Value:** Allow creators to share trips with friends and family without requiring accounts.

**Dependencies:** Epic 2 (Content must exist to share)

### Story 4.1: Create Shareable Trip Link

**As a** creator
**I want to** generate a shareable link for a trip
**So that** others can view my trip without signing in

**Acceptance Criteria:**

#### AC 1: Generate Share Link
**Given** I am viewing a trip
**When** I click "Share Trip"
**Then** a unique share link is generated

#### AC 2: Copy Link
**Given** a share link is generated
**When** I click "Copy Link"
**Then** the link is copied to my clipboard

#### AC 3: Public Access
**Given** I have a share link
**When** I open it in an incognito browser
**Then** I can view the trip and all its entries without signing in

**Technical Requirements:**
- Generate unique token for trip (UUID or similar)
- API endpoint: GET /api/trips/share/:token
- Share link format: `/trips/share/:token`
- No authentication required for share URLs

**Testing Requirements:**
- Share link generates successfully
- Link works in incognito mode
- Non-authenticated users can view shared content

**Source:** Core sharing feature
**Priority:** High
**Story Points:** 3

### Story 4.2: Regenerate Shareable Link

**As a** creator
**I want to** regenerate a trip's shareable link
**So that** I can revoke access from the old link if needed

**Acceptance Criteria:**

#### AC 1: Regenerate Link Option
**Given** a trip has an active share link
**When** I view sharing settings
**Then** I see a "Regenerate Link" button

#### AC 2: Confirm Regeneration
**Given** I click "Regenerate Link"
**When** a confirmation dialog appears
**Then** I see a warning that the old link will stop working

#### AC 3: Successful Regeneration
**Given** I confirm link regeneration
**When** the process completes
**Then** a new share link is generated
**And** the old link returns a "Link no longer valid" error

**Technical Requirements:**
- API endpoint: POST /api/trips/:tripId/regenerate-share-link
- Generate new token and update database
- Invalidate old token

**Testing Requirements:**
- New link works
- Old link returns error
- Confirmation dialog prevents accidental regeneration

**Source:** Security and access control
**Priority:** Medium
**Story Points:** 2

### Story 4.3: Revoke Shareable Link

**As a** creator
**I want to** revoke a trip's shareable link entirely
**So that** I can stop sharing the trip without deleting it

**Acceptance Criteria:**

#### AC 1: Revoke Link Option
**Given** a trip has an active share link
**When** I view sharing settings
**Then** I see a "Revoke Link" button

#### AC 2: Confirm Revocation
**Given** I click "Revoke Link"
**When** a confirmation dialog appears
**Then** I see a warning that the link will stop working

#### AC 3: Successful Revocation
**Given** I confirm link revocation
**When** the process completes
**Then** the share link is deactivated
**And** accessing the old link returns a "Trip is no longer shared" error

**Technical Requirements:**
- API endpoint: DELETE /api/trips/:tripId/share-link
- Set share token to null in database
- Return 404 or appropriate error for revoked links

**Testing Requirements:**
- Revoked link returns error
- Trip is no longer accessible via old link
- Creator can still access trip normally

**Source:** Access control feature
**Priority:** Medium
**Story Points:** 2

### Story 4.4: Discreet Share UI

**As a** creator
**I want** sharing controls tucked away in a menu
**So that** the UI remains clean and sharing is optional

**Acceptance Criteria:**

#### AC 1: Share Button Location
**Given** I am viewing a trip
**When** the page loads
**Then** I see a "Share" button in the trip actions menu (not prominently displayed on main UI)

#### AC 2: Share Modal
**Given** I click "Share"
**When** the share dialog opens
**Then** I see:
- Current share link (if active)
- "Copy Link" button
- "Regenerate Link" button (if link exists)
- "Revoke Link" button (if link exists)

#### AC 3: No Default Sharing
**Given** I create a new trip
**When** the trip is created
**Then** no share link is generated automatically
**And** sharing is opt-in via the Share button

**Technical Requirements:**
- Share button in trip actions dropdown/menu
- Share modal component with all sharing controls
- Do not auto-generate share links on trip creation

**Testing Requirements:**
- Share button is accessible but not intrusive
- Share modal displays correct options
- New trips have no share link by default

**Source:** UI/UX improvement for optional sharing
**Priority:** Medium
**Story Points:** 2

### Story 4.5: Invalidate Shared Entry Pages on Revoke

**As a** creator
**I want** all shared entry pages to stop working when I revoke the trip share link
**So that** revoking access is comprehensive and immediate

**Acceptance Criteria:**

#### AC 1: Entry Links Follow Trip Share Status
**Given** a trip has a shareable link
**When** I share individual entry links (e.g., `/trips/share/:token/entries/:entryId`)
**Then** the entry links work as long as the trip share link is active

#### AC 2: Revoke Invalidates Entry Links
**Given** I revoke the trip share link
**When** someone tries to access a previously shared entry link
**Then** they see a "Trip is no longer shared" error
**And** the entry content is not accessible

#### AC 3: Regenerate Updates Entry Links
**Given** I regenerate the trip share link
**When** the new link is generated
**Then** new entry links use the new token
**And** old entry links with the old token no longer work

**Technical Requirements:**
- Entry share URLs use trip share token: `/trips/share/:token/entries/:entryId`
- API endpoint: GET /api/trips/share/:token/entries/:entryId
- Validate trip share token before returning entry data
- Return 404 or appropriate error if token is invalid/revoked

**Testing Requirements:**
- Entry links work when trip is shared
- Entry links fail after trip share link is revoked
- Entry links update correctly after regeneration

**Source:** Comprehensive access control
**Priority:** High - Security and consistency requirement
**Story Points:** 2

---

## Epic 5: Multi-User Access Control

Introduce user accounts, roles, and trip-based permissions.

**Business Value:** Enable multiple users to collaborate on trips with role-based access control.

**Dependencies:** Epic 0 (Authentication foundation), Epic 4 (Sharing baseline)

### Story 5.1: Admin Creates User Accounts

**As an** administrator
**I want to** create user accounts manually
**So that** I can invite collaborators without a public registration flow

**Acceptance Criteria:**

#### AC 1: Admin User Management Page
**Given** I am an administrator
**When** I navigate to `/admin/users`
**Then** I see a list of all users and a "Create User" button

#### AC 2: Create User Form
**Given** I click "Create User"
**When** the form appears
**Then** I can enter:
- Username (required, unique)
- Email (required, unique)
- Display name (required)
- Temporary password (required, user must change on first login)

#### AC 3: Successful User Creation
**Given** I fill out the form with valid data
**When** I submit
**Then** the user account is created
**And** the user appears in the user list
**And** the user can sign in with the temporary password

**Technical Requirements:**
- Admin-only route: `/admin/users`
- API endpoint: POST /api/admin/users
- User model: username, email, displayName, hashedPassword
- Role field: 'admin', 'creator', 'viewer'
- `mustChangePassword` flag set to true for new users

**Testing Requirements:**
- Admin can create users
- Non-admin users cannot access admin routes
- Newly created users can sign in
- Duplicate username/email validation works

**Source:** Multi-user access foundation
**Priority:** High
**Story Points:** 3

### Story 5.2: User Sign-In

**As a** user
**I want to** sign in with my username and password
**So that** I can access trips I'm invited to

**Acceptance Criteria:**

#### AC 1: Sign-In Page
**Given** I navigate to `/auth/signin`
**When** the page loads
**Then** I see a sign-in form with username and password fields

#### AC 2: Successful Sign-In
**Given** I enter valid credentials
**When** I submit the form
**Then** I am authenticated and redirected to `/trips`

#### AC 3: Invalid Credentials
**Given** I enter invalid credentials
**When** I submit the form
**Then** I see an error message and remain on the sign-in page

#### AC 4: Force Password Change
**Given** I sign in with a temporary password (mustChangePassword = true)
**When** authentication succeeds
**Then** I am redirected to `/auth/change-password` before accessing any other page

**Technical Requirements:**
- NextAuth credentials provider (same as Story 0.1, expanded for multiple users)
- Validate credentials against database
- Redirect to change password if `mustChangePassword` is true

**Testing Requirements:**
- Valid sign-in works
- Invalid credentials rejected
- Temporary password forces password change

**Source:** Multi-user access requirement
**Priority:** High
**Story Points:** 2

### Story 5.3: Admin Changes User Role

**As an** administrator
**I want to** change a user's role (admin, creator, viewer)
**So that** I can grant or restrict permissions

**Acceptance Criteria:**

#### AC 1: Edit User Role
**Given** I am viewing the user list as an administrator
**When** I click "Edit" next to a user
**Then** I see a dropdown to change their role (admin, creator, viewer)

#### AC 2: Successful Role Change
**Given** I change a user's role
**When** I save the change
**Then** the user's role is updated in the database
**And** the user's permissions immediately reflect the new role

#### AC 3: Role Definitions
**Given** users have different roles
**When** they access the application
**Then** their capabilities are:
- **Admin**: Full access, can create/delete users, manage all trips
- **Creator**: Can create trips, manage own trips, invite viewers/contributors
- **Viewer**: Can only view trips they're invited to (no creation/editing)

**Technical Requirements:**
- Add `role` field to User model (enum: 'admin', 'creator', 'viewer')
- API endpoint: PUT /api/admin/users/:userId
- Middleware to check role-based permissions

**Testing Requirements:**
- Admin can change user roles
- Permissions update immediately after role change
- Non-admin users cannot change roles

**Source:** Role-based access control
**Priority:** High
**Story Points:** 2

### Story 5.4: Invite Viewers to a Trip

**As a** trip owner
**I want to** invite users to view my trip
**So that** I can share content with specific people (not via public link)

**Acceptance Criteria:**

#### AC 1: Invite Viewers Option
**Given** I am the owner of a trip
**When** I view trip settings
**Then** I see an "Invite Viewers" button

#### AC 2: Select Users to Invite
**Given** I click "Invite Viewers"
**When** a dialog appears
**Then** I see a list of all users in the system
**And** I can select one or more users to invite as viewers

#### AC 3: Successful Invitation
**Given** I select users and confirm
**When** the invitation completes
**Then** the selected users gain view-only access to the trip
**And** the trip appears in their trips list
**And** invited users receive a notification (if notifications exist)

#### AC 4: Viewer Permissions
**Given** I am a viewer on a trip
**When** I access the trip
**Then** I can view all entries and media
**And** I cannot create, edit, or delete entries
**And** I do not see trip management options (delete trip, invite others, etc.)

**Technical Requirements:**
- Add TripAccess model: tripId, userId, role ('owner', 'contributor', 'viewer')
- API endpoint: POST /api/trips/:tripId/invite
- Query trips by user access (not just ownership)
- Enforce read-only permissions for viewers in UI and API

**Testing Requirements:**
- Viewers can access invited trips
- Viewers cannot edit or delete content
- Trip appears in viewer's trip list
- Only trip owner can invite users

**Source:** Selective trip sharing feature
**Priority:** Medium
**Story Points:** 5

### Story 5.5: Enable Contributor Access for a Viewer

**As a** trip owner
**I want to** promote a viewer to contributor
**So that** they can create and edit entries in my trip

**Acceptance Criteria:**

#### AC 1: Change Access Level
**Given** I am the owner of a trip
**When** I view the list of trip participants
**Then** I see each viewer's current role (viewer/contributor)
**And** I can promote a viewer to contributor

#### AC 2: Successful Promotion
**Given** I promote a viewer to contributor
**When** the change completes
**Then** the user's role updates to contributor
**And** they can now create and edit entries in the trip

#### AC 3: Contributor Permissions
**Given** I am a contributor on a trip
**When** I access the trip
**Then** I can:
- View all entries
- Create new entries
- Edit any entry (not just my own)
- Upload media
**And** I cannot:
- Delete the trip
- Manage trip participants (owner-only)

**Technical Requirements:**
- Update TripAccess role field
- API endpoint: PUT /api/trips/:tripId/access/:userId (change role)
- Enforce contributor permissions in API and UI

**Testing Requirements:**
- Promoted contributor can edit entries
- Contributor cannot delete trip or manage access
- Only trip owner can promote users

**Source:** Collaboration feature
**Priority:** Medium
**Story Points:** 3

### Story 5.6: Viewer Access to Invited Trips

**As a** viewer
**I want to** see a list of trips I've been invited to
**So that** I can access shared content easily

**Acceptance Criteria:**

#### AC 1: Trips List Shows Invited Trips
**Given** I have been invited as a viewer or contributor to trips
**When** I navigate to `/trips`
**Then** I see:
- Trips I own
- Trips I've been invited to (labeled as "Shared with me" or similar)

#### AC 2: Invited Trip Indicators
**Given** I am viewing the trips list
**When** the page renders
**Then** invited trips show a visual indicator (e.g., badge or label)
**And** I can see my role (viewer or contributor)

#### AC 3: Access Invited Trip
**Given** I click on an invited trip
**When** the trip page loads
**Then** I can view all entries and media according to my permissions

**Technical Requirements:**
- Query trips by TripAccess records (not just ownership)
- Display trips grouped by ownership vs. invited
- Show role badge (viewer/contributor) on trip cards

**Testing Requirements:**
- Invited trips appear in trips list
- Trips list shows ownership vs. shared correctly
- Access permissions work as expected

**Source:** Multi-user trip access
**Priority:** High
**Story Points:** 2

### Story 5.7: Contributor Adds and Edits Entries

**As a** contributor
**I want to** create and edit entries in a shared trip
**So that** I can collaborate on trip content

**Acceptance Criteria:**

#### AC 1: Create Entry
**Given** I am a contributor on a trip
**When** I view the trip page
**Then** I see the "Add Entry" button
**And** I can create a new entry

#### AC 2: Edit Any Entry
**Given** I am a contributor on a trip
**When** I view an entry (created by me or others)
**Then** I see the "Edit Entry" button
**And** I can edit the entry

#### AC 3: No Delete Permission
**Given** I am a contributor (not owner)
**When** I view an entry
**Then** I do not see a "Delete Entry" button
**And** attempting to delete via API returns a permissions error

**Technical Requirements:**
- Check TripAccess role before allowing create/edit/delete
- API endpoints enforce role permissions
- Hide delete buttons for non-owners in UI

**Testing Requirements:**
- Contributors can create entries
- Contributors can edit any entry
- Contributors cannot delete entries
- API enforces permissions

**Source:** Collaboration permissions
**Priority:** High
**Story Points:** 3

### Story 5.8: Admin Deactivates or Deletes User

**As an** administrator
**I want to** deactivate or permanently delete a user account
**So that** I can manage user access and remove inactive users

**Acceptance Criteria:**

#### AC 1: Deactivate User
**Given** I am an administrator
**When** I view the user list and click "Deactivate" on a user
**Then** the user's `isActive` status is set to false
**And** the user cannot sign in
**And** all user data (trips, entries, media) remains in the database

#### AC 2: Reactivate User
**Given** a user is deactivated
**When** I click "Reactivate"
**Then** the user's `isActive` status is set to true
**And** the user can sign in again

#### AC 3: Delete User
**Given** I am an administrator
**When** I view the user list and click "Delete" on a user
**Then** I see a confirmation warning that all user data will be permanently removed
**And** if confirmed, the user account and all associated data (trips, entries, media) are deleted

#### AC 4: Deactivation Prevents Sign-In
**Given** a user is deactivated
**When** the user attempts to sign in
**Then** authentication fails with message "Account is inactive"

**Technical Requirements:**
- Add `isActive` boolean field to User model (default: true)
- API endpoint: PUT /api/admin/users/:userId/status (activate/deactivate)
- API endpoint: DELETE /api/admin/users/:userId (permanent deletion)
- Cascade delete user's trips, entries, and media on deletion
- Check `isActive` in authentication middleware

**Testing Requirements:**
- Deactivated user cannot sign in
- Reactivated user can sign in
- User deletion removes all associated data
- Only admin can deactivate or delete users

**Source:** User management requirement
**Priority:** Medium
**Story Points:** 3

### Story 5.9: Administrator Role and Admin Safeguards

**As the** system
**I want** administrator accounts to have special protections
**So that** critical admin functions remain secure and admin accounts cannot be accidentally locked out

**Acceptance Criteria:**

#### AC 1: Admin Cannot Be Deactivated by Another Admin
**Given** I am an administrator viewing the user list
**When** I view another administrator's account
**Then** I do not see a "Deactivate" button for admin users
**And** attempting to deactivate an admin via API returns a permissions error

#### AC 2: Admin Cannot Demote Another Admin
**Given** I am an administrator
**When** I attempt to change another admin's role to creator or viewer
**Then** the role change is blocked
**And** I see an error message: "Cannot change admin role. Contact system administrator."

#### AC 3: Self-Demotion Warning
**Given** I am an administrator editing my own user account
**When** I attempt to change my role from admin to creator/viewer
**Then** I see a warning: "You are about to remove your admin privileges. This action cannot be undone."
**And** I must confirm before the change is saved

#### AC 4: Admin Full Access to All Trips
**Given** I am an administrator
**When** I view the trips list
**Then** I see all trips in the system (regardless of ownership)
**And** I can view, edit, and manage any trip

**Technical Requirements:**
- Middleware: Block deactivation/demotion of admin users by other admins
- Self-demotion requires explicit confirmation
- Admins have implicit access to all trips (no TripAccess record needed)
- API returns all trips for admin users

**Testing Requirements:**
- Admin cannot deactivate another admin
- Admin cannot demote another admin
- Self-demotion requires confirmation
- Admin can access all trips

**Source:** Security and admin safety requirements
**Priority:** High
**Story Points:** 3

### Story 5.10: Refine Viewer Invitations with Custom Selector

**As a** trip owner
**I want** a better UI for inviting viewers to my trip
**So that** I can quickly find and select users from a searchable list

**Acceptance Criteria:**

#### AC 1: Searchable User Selector
**Given** I am inviting viewers to a trip
**When** I open the invite dialog
**Then** I see a searchable dropdown or multi-select component
**And** I can type to filter users by name or username

#### AC 2: Current Participants Excluded
**Given** I am inviting viewers
**When** the user list appears
**Then** I do not see users who already have access to the trip
**And** only users without access are shown in the selector

#### AC 3: Multiple Selection
**Given** I am selecting users to invite
**When** I click on users
**Then** I can select multiple users at once
**And** I see a count of selected users before confirming

**Technical Requirements:**
- Custom searchable multi-select component (or use library like react-select)
- Filter out existing trip participants from selector
- API endpoint: GET /api/users (exclude existing participants)

**Testing Requirements:**
- User search filters correctly
- Existing participants are excluded
- Multiple selection works
- Invite confirmation shows correct count

**Source:** UX improvement for Story 5.4
**Priority:** Low - Nice-to-have refinement
**Story Points:** 2

### Story 5.11: Change Password

**As a** user
**I want to** change my password
**So that** I can update my credentials or replace a temporary password

**Acceptance Criteria:**

#### AC 1: Change Password Page
**Given** I am signed in
**When** I navigate to `/settings/change-password`
**Then** I see a form with fields:
- Current password (required)
- New password (required)
- Confirm new password (required)

#### AC 2: Successful Password Change
**Given** I enter my current password correctly and a valid new password
**When** I submit the form
**Then** my password is updated
**And** `mustChangePassword` flag is set to false (if it was true)
**And** I see a success message

#### AC 3: Validation
**Given** I attempt to change my password
**When** I enter an incorrect current password or mismatched new passwords
**Then** I see validation errors and the password is not changed

#### AC 4: Force Password Change on First Sign-In
**Given** I sign in with a temporary password (`mustChangePassword = true`)
**When** authentication succeeds
**Then** I am redirected to `/settings/change-password`
**And** I cannot access other pages until I change my password

**Technical Requirements:**
- API endpoint: POST /api/users/change-password
- Validate current password before allowing change
- Hash new password using bcrypt (same as initial password creation)
- Update `mustChangePassword` flag to false
- Middleware to enforce password change redirect

**Testing Requirements:**
- Password change succeeds with valid inputs
- Incorrect current password rejected
- Forced password change on first sign-in works
- User can access app normally after changing password

**Source:** Security and user account management
**Priority:** High
**Story Points:** 3

### Story 5.12: Shared View Button on Trip

**As a** trip owner
**I want** a "View Shared Link" button on the trip page
**So that** I can quickly preview how the trip looks to public viewers

**Acceptance Criteria:**

#### AC 1: Button Visibility
**Given** I am the owner of a trip with an active share link
**When** I view the trip page
**Then** I see a "View Shared Link" button in the trip actions

#### AC 2: Open Shared View
**Given** I click "View Shared Link"
**When** the action completes
**Then** I am taken to the public shared trip view (same as `/trips/share/:token`)
**And** I see the trip as public viewers would see it (without edit controls)

#### AC 3: Button Hidden if Not Shared
**Given** a trip does not have an active share link
**When** I view the trip page
**Then** I do not see the "View Shared Link" button

**Technical Requirements:**
- Check if trip has an active share token
- Render "View Shared Link" button if token exists
- Button opens `/trips/share/:token` (same URL public viewers use)

**Testing Requirements:**
- Button appears for shared trips
- Button does not appear for non-shared trips
- Clicking button opens shared view

**Source:** UX improvement for share preview
**Priority:** Low
**Story Points:** 1

### Story 5.13: Active Badge & Date Range

**As a** viewer
**I want** to see which trips are currently active (date range includes today)
**So that** I can quickly identify ongoing trips

**Acceptance Criteria:**

#### AC 1: Active Badge on Trips List
**Given** a trip's date range includes today
**When** I view the trips list
**Then** I see an "Active" badge on the trip card

#### AC 2: Date Range Display
**Given** I am viewing a trip card
**When** the card renders
**Then** I see the trip's start and end dates (e.g., "Dec 15, 2024 - Dec 22, 2024")

#### AC 3: Active Badge on Trip Page
**Given** I am viewing a trip page for a currently active trip
**When** the page loads
**Then** I see an "Active" badge near the trip title

**Technical Requirements:**
- Calculate if trip is active: `today >= startDate && (endDate === null || today <= endDate)`
- Display badge on trip cards and trip detail page
- Format dates consistently (e.g., "MMM DD, YYYY")

**Testing Requirements:**
- Active badge shows for current trips
- Badge does not show for past or future trips
- Date range displays correctly

**Source:** Trip status visibility
**Priority:** Low
**Story Points:** 1

### Story 5.14: Relative Redirects for Sign-In

**As a** user
**I want** to be redirected back to the page I was viewing after signing in
**So that** I don't lose my place when authentication expires

**Acceptance Criteria:**

#### AC 1: Redirect After Sign-In
**Given** I am signed out and attempt to view a protected page (e.g., `/trips/123`)
**When** I am redirected to the sign-in page
**Then** the URL includes a `callbackUrl` parameter (e.g., `/auth/signin?callbackUrl=/trips/123`)

#### AC 2: Return to Original Page
**Given** I sign in with a `callbackUrl` in the URL
**When** authentication succeeds
**Then** I am redirected to the `callbackUrl` page (not the default `/trips` page)

#### AC 3: Default Redirect
**Given** I sign in without a `callbackUrl`
**When** authentication succeeds
**Then** I am redirected to `/trips` (default)

**Technical Requirements:**
- Middleware: Capture original URL and add as `callbackUrl` query param
- NextAuth: Configure `callbackUrl` redirect after sign-in
- Sanitize `callbackUrl` to prevent open redirect vulnerabilities

**Testing Requirements:**
- Sign-in redirects to original page when `callbackUrl` is present
- Sign-in redirects to `/trips` when no `callbackUrl`
- Open redirect attack prevented

**Source:** UX improvement for session management
**Priority:** Low
**Story Points:** 1

### Story 5.15: Shared View Hero Image Uses Selected Cover

**As a** trip owner
**I want** the shared trip view to use the trip's cover image as the hero image
**So that** the shared view looks polished and visually consistent

**Acceptance Criteria:**

#### AC 1: Hero Image on Shared Trip Overview
**Given** a trip has a cover image
**When** a viewer opens the shared trip link
**Then** the cover image is displayed as a hero image at the top of the page

#### AC 2: Fallback for No Cover Image
**Given** a trip has no cover image
**When** a viewer opens the shared trip link
**Then** a default hero background or placeholder is shown

#### AC 3: Shared Entry Pages (No Change)
**Given** a viewer is viewing a shared entry page
**When** the page loads
**Then** the entry page layout remains unchanged (no hero image, just entry content)

**Technical Requirements:**
- Shared trip overview page: Display trip cover image as hero
- Use Next.js Image component for optimization
- Default hero background if no cover image

**Testing Requirements:**
- Hero image displays correctly on shared trip view
- Fallback works when no cover image
- Shared entry pages unaffected

**Source:** Visual consistency for shared trips
**Priority:** Low
**Story Points:** 2

### Story 5.17: Shared View Link Back to Trip Overview

**As a** viewer on a shared entry page
**I want** a "Back to Trip" link
**So that** I can easily return to the trip overview without using browser back button

**Acceptance Criteria:**

#### AC 1: Back to Trip Link
**Given** I am viewing a shared entry page (e.g., `/trips/share/:token/entries/:entryId`)
**When** the page loads
**Then** I see a "Back to Trip" or "← Trip Overview" link near the top of the page

#### AC 2: Link Navigation
**Given** I click "Back to Trip"
**When** the navigation completes
**Then** I am taken to the shared trip overview page (e.g., `/trips/share/:token`)

#### AC 3: Link Not Present on Trip Overview
**Given** I am viewing the shared trip overview page
**When** the page loads
**Then** I do not see a "Back to Trip" link (since I'm already on the trip overview)

**Technical Requirements:**
- Add navigation link to shared entry page layout
- Link targets `/trips/share/:token` (trip overview)

**Testing Requirements:**
- Link appears on shared entry pages
- Link navigates to trip overview
- Link does not appear on trip overview itself

**Source:** Navigation improvement for shared views
**Priority:** Low
**Story Points:** 1

### Story 5.18: Provide Edit Button Only for Editors

**As a** viewer (without edit permissions)
**I want** edit buttons to be hidden on entries
**So that** I don't see actions I can't perform

**Acceptance Criteria:**

#### AC 1: No Edit Button for Viewers
**Given** I am a viewer (not contributor or owner) on a trip
**When** I view an entry
**Then** I do not see an "Edit Entry" button

#### AC 2: Edit Button for Contributors
**Given** I am a contributor or owner on a trip
**When** I view an entry
**Then** I see an "Edit Entry" button

#### AC 3: No Delete Button for Contributors
**Given** I am a contributor (not owner) on a trip
**When** I view an entry
**Then** I do not see a "Delete Entry" button

**Technical Requirements:**
- Check user's TripAccess role before rendering edit/delete buttons
- Hide buttons in UI based on permissions
- API still enforces permissions (UI is not the only gate)

**Testing Requirements:**
- Viewers do not see edit buttons
- Contributors see edit but not delete buttons
- Owners see both edit and delete buttons

**Source:** UI consistency with permissions
**Priority:** Medium
**Story Points:** 1

### Story 5.19: Fix Edit Navigation Targets

**As a** user editing an entry
**I want** to be redirected to the entry detail page after saving
**So that** I can immediately see the updated entry

**Acceptance Criteria:**

#### AC 1: Redirect After Edit
**Given** I edit an entry
**When** I save changes
**Then** I am redirected to the entry detail page (not the trip overview)

#### AC 2: Correct URL
**Given** the redirect happens
**When** I arrive at the entry page
**Then** the URL is `/trips/:tripId/entries/:entryId`

**Technical Requirements:**
- Update entry edit handler to redirect to entry detail page
- Ensure redirect works for both authenticated and shared views

**Testing Requirements:**
- Edit redirect goes to entry detail page
- URL is correct after redirect

**Source:** UX bug fix
**Priority:** Low
**Story Points:** 1

### Story 5.20: Add "Back to Trips" Navigation from Trip Views

**As a** user viewing a trip
**I want** a "Back to Trips" link
**So that** I can easily return to the trips list

**Acceptance Criteria:**

#### AC 1: Back Link on Trip Page
**Given** I am viewing a trip overview or entry page
**When** the page loads
**Then** I see a "Back to Trips" or "← Trips" link near the top of the page

#### AC 2: Link Navigation
**Given** I click "Back to Trips"
**When** the navigation completes
**Then** I am taken to the trips list page (`/trips`)

**Technical Requirements:**
- Add navigation link to trip layout
- Link targets `/trips`

**Testing Requirements:**
- Link appears on trip and entry pages
- Link navigates to trips list

**Source:** Navigation improvement
**Priority:** Low
**Story Points:** 1

---

## Epic 6: Internationalization & Documentation

Add German language support and user documentation.

**Business Value:** Make the platform accessible to German-speaking users and provide help resources.

**Dependencies:** Epic 5 (Most UI is complete)

### Story 6.4: User Manual

**As a** user
**I want** a user manual or help documentation
**So that** I can learn how to use the platform effectively

**Acceptance Criteria:**

#### AC 1: Manual Page
**Given** I am signed in
**When** I navigate to `/help` or click a "Help" link
**Then** I see a user manual with sections:
- Getting started
- Creating trips and entries
- Managing media
- Sharing trips
- User roles and permissions

#### AC 2: Searchable Help (Optional)
**Given** I am viewing the help page
**When** I search for a topic (e.g., "invite viewers")
**Then** I see relevant help sections highlighted or filtered

**Technical Requirements:**
- Static help page or Markdown-based documentation
- Sections for all major features
- Include screenshots or examples

**Testing Requirements:**
- Help page loads successfully
- All sections are present and accurate

**Source:** User onboarding and support
**Priority:** Low
**Story Points:** 3

### Story 6.5: Language Selection (EN/DE)

**As a** user
**I want to** switch between English and German
**So that** I can use the platform in my preferred language

**Acceptance Criteria:**

#### AC 1: Language Selector
**Given** I am on any page
**When** I view the header or settings menu
**Then** I see a language selector dropdown (EN/DE)

#### AC 2: Switch Language
**Given** I select German from the language dropdown
**When** the page reloads or updates
**Then** all UI text is displayed in German

#### AC 3: Language Persistence
**Given** I change the language to German
**When** I sign out and sign in again
**Then** the language remains set to German

**Technical Requirements:**
- i18n library (e.g., next-intl or react-i18next)
- Translation files for English and German
- Store language preference in user settings or localStorage
- Translate all UI strings (buttons, labels, messages)

**Testing Requirements:**
- Language selector changes language
- All UI text updates correctly
- Language preference persists across sessions

**Source:** Internationalization requirement
**Priority:** Medium
**Story Points:** 5

### Story 6.6: Date Formatting Consistency

**As a** user
**I want** dates to be formatted consistently throughout the app
**So that** date displays are clear and predictable

**Acceptance Criteria:**

#### AC 1: Consistent Date Format
**Given** I view dates on trip cards, entry headers, and other UI elements
**When** the page renders
**Then** all dates use the same format (e.g., "December 15, 2024" or "15 Dec 2024")

#### AC 2: Locale-Aware Formatting
**Given** I have selected German as my language
**When** dates are displayed
**Then** dates use German formatting conventions (e.g., "15. Dezember 2024")

#### AC 3: Relative Dates (Optional)
**Given** I view an entry created recently
**When** the date displays
**Then** I see a relative format (e.g., "2 hours ago", "Yesterday")
**And** the absolute date is shown on hover

**Technical Requirements:**
- Use a date formatting library (e.g., date-fns or Intl.DateTimeFormat)
- Apply locale-based formatting (EN vs. DE)
- Consistent format across all components

**Testing Requirements:**
- All dates use the same format
- German dates format correctly
- Relative dates work (if implemented)

**Source:** UX consistency improvement
**Priority:** Low
**Story Points:** 2

---

## Epic 7: Location Features

Add location support with maps, coordinate extraction, and location display.

**Business Value:** Enable location-based travel content with maps and automatic geolocation extraction.

**Dependencies:** Epic 2 (Entries must support location field)

### Story 7.1: Trip Map View

**As a** viewer
**I want to** see a map showing all entry locations in a trip
**So that** I can visualize the travel route

**Acceptance Criteria:**

#### AC 1: Map Display on Trip Page
**Given** a trip has entries with location data
**When** I view the trip overview page
**Then** I see a map with markers for each entry location

#### AC 2: Marker Click
**Given** I click on a map marker
**When** the click event fires
**Then** I see a popup with the entry title and date
**And** clicking the popup navigates to the entry detail page

#### AC 3: No Map if No Locations
**Given** a trip has no entries with location data
**When** I view the trip page
**Then** no map is displayed (or an empty state message is shown)

**Technical Requirements:**
- Integrate map library (e.g., Leaflet, Mapbox, or Google Maps)
- Display markers for each entry with location
- Marker popup shows entry title and link
- Map bounds auto-fit to show all markers

**Testing Requirements:**
- Map displays correctly with multiple markers
- Clicking marker shows entry popup
- No map shown if no locations

**Source:** Location-based visualization feature
**Priority:** Medium
**Story Points:** 5

### Story 7.2: Extract Coordinates from Photo Metadata

**As a** creator
**I want** GPS coordinates automatically extracted from uploaded photos
**So that** I don't have to manually enter location data

**Acceptance Criteria:**

#### AC 1: Automatic GPS Extraction on Upload
**Given** I upload a photo with GPS metadata (EXIF data)
**When** the upload completes
**Then** the photo's GPS coordinates are extracted and associated with the media record

#### AC 2: Set Entry Location from First Photo
**Given** I upload photos to an entry that has no location set
**When** the first photo with GPS data is uploaded
**Then** the entry's location is automatically set to the photo's GPS coordinates

#### AC 3: No GPS Data Handling
**Given** I upload a photo without GPS metadata
**When** the upload completes
**Then** no location is set and no error is shown

**Technical Requirements:**
- Use EXIF parsing library (e.g., exif-js, exifr)
- Extract latitude and longitude from EXIF data
- Store coordinates in media record
- Auto-populate entry location if not already set

**Testing Requirements:**
- GPS coordinates extracted from photos with EXIF data
- Entry location auto-populated from first photo
- Photos without GPS data upload successfully

**Source:** Automation feature for location data
**Priority:** Medium
**Story Points:** 3

### Story 7.3: Map on Edit Trip Page

**As a** creator
**I want** to see a map on the trip edit page
**So that** I can visualize the trip's location coverage while editing

**Acceptance Criteria:**

#### AC 1: Map Display on Edit Page
**Given** I am editing a trip
**When** the edit page loads
**Then** I see a map showing all entry locations for the trip

#### AC 2: Map Updates on Entry Changes
**Given** I add or edit an entry location
**When** I save changes
**Then** the map updates to reflect the new location

**Technical Requirements:**
- Add map component to trip edit page
- Display markers for all entry locations
- Map is read-only (no location editing on this page)

**Testing Requirements:**
- Map displays on edit page
- Map shows correct markers
- Map updates after entry changes

**Source:** Location visualization while editing
**Priority:** Low
**Story Points:** 2

### Story 7.4: Story Location Selector

**As a** creator
**I want** to search for and select a location when creating or editing an entry
**So that** I can easily add location data without manually entering coordinates

**Acceptance Criteria:**

#### AC 1: Location Search Field
**Given** I am creating or editing an entry
**When** I view the entry form
**Then** I see a location search field

#### AC 2: Search and Select Location
**Given** I type a location name (e.g., "Berlin, Germany")
**When** search results appear
**Then** I can select a location from the list
**And** the entry's location is set to the selected coordinates

#### AC 3: Display Selected Location
**Given** I have selected a location
**When** the entry form renders
**Then** I see the location name and a preview map marker

**Technical Requirements:**
- Use geocoding API (e.g., Nominatim, Mapbox Geocoding, or Google Places API)
- Location field returns lat/long and label
- Store coordinates and label in entry record

**Testing Requirements:**
- Location search returns results
- Selecting a location sets coordinates
- Selected location displays correctly

**Source:** UX improvement for location entry
**Priority:** Medium
**Story Points:** 3

### Story 7.5: Map View in Shared Hero Image

**As a** viewer
**I want** to see a map on the shared trip overview page
**So that** I can visualize the trip's locations even in the public view

**Acceptance Criteria:**

#### AC 1: Map on Shared Trip Overview
**Given** a shared trip has entries with locations
**When** I view the shared trip page
**Then** I see a map with markers for each entry location

#### AC 2: Map Styling
**Given** the map is displayed
**When** the page renders
**Then** the map is styled to fit the hero section or trip overview layout

**Technical Requirements:**
- Add map to shared trip overview page
- Use same map component as Story 7.1

**Testing Requirements:**
- Map displays on shared trip view
- Map shows correct markers

**Source:** Public-facing location visualization
**Priority:** Low
**Story Points:** 2

### Story 7.6: Entry Location Section

**As a** viewer
**I want** to see the entry's location displayed on the entry detail page
**So that** I know where the entry took place

**Acceptance Criteria:**

#### AC 1: Location Display
**Given** an entry has a location set
**When** I view the entry detail page
**Then** I see:
- Location label (e.g., "Berlin, Germany")
- Coordinates (optional, e.g., "52.5200° N, 13.4050° E")
- Small map preview (optional)

#### AC 2: No Location Handling
**Given** an entry has no location set
**When** I view the entry detail page
**Then** no location section is displayed

**Technical Requirements:**
- Add location section to entry detail layout
- Display location label and coordinates
- Optional: Embed small map preview

**Testing Requirements:**
- Location displays correctly on entry page
- No location section if location is not set

**Source:** Entry metadata display
**Priority:** Medium
**Story Points:** 2

### Story 7.7: Fullscreen Trip Map

**As a** viewer
**I want** to open the trip map in fullscreen
**So that** I can explore the trip's locations in detail

**Acceptance Criteria:**

#### AC 1: Fullscreen Map Button
**Given** I am viewing a trip with a map
**When** I click "View Map" or a fullscreen button
**Then** the map opens in fullscreen mode

#### AC 2: Fullscreen Map Features
**Given** the map is in fullscreen mode
**When** I interact with the map
**Then** I can:
- Zoom in/out
- Pan around
- Click markers to see entry popups
- Close fullscreen mode with Escape or a close button

**Technical Requirements:**
- Add fullscreen map modal/page
- Map displays all entry markers
- Fullscreen mode supports all map interactions

**Testing Requirements:**
- Fullscreen map opens correctly
- All interactions work in fullscreen mode
- Close button/Escape key exits fullscreen

**Source:** Enhanced map exploration
**Priority:** Low
**Story Points:** 2

### Story 7.8: Edit Entry Location Display

**As a** creator
**I want** to see the current location on the entry edit page
**So that** I can verify or update the entry's location

**Acceptance Criteria:**

#### AC 1: Location Field Pre-populated
**Given** I am editing an entry with a location
**When** the edit form loads
**Then** I see the location field pre-populated with the current location label

#### AC 2: Update Location
**Given** I change the location in the search field
**When** I save the entry
**Then** the entry's location is updated to the new coordinates and label

**Technical Requirements:**
- Pre-populate location field with existing location
- Use location selector from Story 7.4

**Testing Requirements:**
- Location field shows existing location
- Updating location saves correctly

**Source:** Location editing UX
**Priority:** Medium
**Story Points:** 1

### Story 7.9: Chronological Map Path

**As a** viewer
**I want** to see a line connecting entry markers on the trip map in chronological order
**So that** I can visualize the travel route

**Acceptance Criteria:**

#### AC 1: Path Line on Map
**Given** a trip has multiple entries with locations
**When** I view the trip map
**Then** I see a line connecting markers in chronological order (by entry date)

#### AC 2: Path Styling
**Given** the path line is displayed
**When** the map renders
**Then** the line is styled distinctly (e.g., colored, dashed, or semi-transparent)

#### AC 3: No Path if Insufficient Data
**Given** a trip has fewer than 2 entries with locations
**When** I view the map
**Then** no path line is displayed (only markers)

**Technical Requirements:**
- Sort entries by date
- Draw polyline connecting markers in order
- Style path line (color, width, opacity)

**Testing Requirements:**
- Path line displays correctly
- Path follows chronological order
- No path for single-location trips

**Source:** Travel route visualization
**Priority:** Low
**Story Points:** 2

---

## Epic 8: Tags & Trip Cards

Add tagging system for entries and improve trip list visualization.

**Business Value:** Enable content categorization and enhance trip list presentation.

**Dependencies:** Epic 2 (Entries), Epic 3 (Trip overview)

### Story 8.1: Add Tags to Entry (Create/Edit)

**As a** creator
**I want to** add tags to entries when creating or editing
**So that** I can categorize entry content by themes or topics

**Acceptance Criteria:**

#### AC 1: Tag Input Field
**Given** I am creating or editing an entry
**When** I view the entry form
**Then** I see a tag input field where I can add multiple tags

#### AC 2: Add Multiple Tags
**Given** I am entering tags
**When** I type a tag name and press Enter or comma
**Then** the tag is added to the entry
**And** I can add multiple tags

#### AC 3: Tag Autocomplete (Optional)
**Given** I start typing a tag name
**When** matching tags exist in the system
**Then** I see autocomplete suggestions

**Technical Requirements:**
- Add tags field to entry form
- Store tags as array of strings in Entry model
- Tag input component (e.g., react-tag-input or custom)
- Optional: Autocomplete from existing tags

**Testing Requirements:**
- Tags are saved with entry
- Multiple tags can be added
- Tag input validates correctly

**Source:** Content categorization feature
**Priority:** Medium
**Story Points:** 3

### Story 8.2: Show Tags on Trip Overview Entry Cards

**As a** viewer
**I want to** see entry tags on trip overview entry cards
**So that** I can quickly identify entry topics

**Acceptance Criteria:**

#### AC 1: Tags Display on Cards
**Given** an entry has tags
**When** I view the trip overview page
**Then** I see the entry's tags displayed on the entry card

#### AC 2: Tag Styling
**Given** tags are displayed
**When** the page renders
**Then** tags are styled as badges or pills

**Technical Requirements:**
- Add tag display to entry card component
- Style tags as badges (Tailwind: rounded, colored background)

**Testing Requirements:**
- Tags display on entry cards
- Tags are styled correctly

**Source:** Visual categorization on overview
**Priority:** Low
**Story Points:** 1

### Story 8.3: Show Tags on Entry Reader Hero

**As a** viewer
**I want to** see entry tags on the entry detail page
**So that** I can see the entry's categories while reading

**Acceptance Criteria:**

#### AC 1: Tags Display on Entry Page
**Given** an entry has tags
**When** I view the entry detail page
**Then** I see the entry's tags displayed near the title or metadata section

**Technical Requirements:**
- Add tag display to entry detail layout
- Style consistently with Story 8.2

**Testing Requirements:**
- Tags display on entry detail page
- Tags are styled correctly

**Source:** Entry metadata display
**Priority:** Low
**Story Points:** 1

### Story 8.4: Filter Entries by Tags

**As a** viewer
**I want to** filter trip entries by tags
**So that** I can view only entries with specific topics

**Acceptance Criteria:**

#### AC 1: Tag Filter UI
**Given** I am viewing a trip overview
**When** entries have tags
**Then** I see a tag filter dropdown or tag cloud

#### AC 2: Filter Entries
**Given** I select a tag from the filter
**When** the filter applies
**Then** only entries with the selected tag are displayed

#### AC 3: Clear Filter
**Given** a tag filter is active
**When** I click "Clear Filter" or deselect the tag
**Then** all entries are displayed again

**Technical Requirements:**
- Add tag filter component to trip overview
- Filter entries on client side or via API
- Display filtered entry list

**Testing Requirements:**
- Tag filter displays available tags
- Filtering works correctly
- Clear filter restores all entries

**Source:** Content discovery feature
**Priority:** Medium
**Story Points:** 3

### Story 8.5: Trip Cards

**As a** viewer
**I want** the trips list to display trips as visual cards with cover images
**So that** the list is more engaging and easier to navigate

**Acceptance Criteria:**

#### AC 1: Card Layout
**Given** I am viewing the trips list
**When** the page loads
**Then** I see trips displayed as cards in a grid layout

#### AC 2: Card Content
**Given** I view a trip card
**When** the card renders
**Then** I see:
- Trip cover image (or placeholder)
- Trip title
- Date range
- Entry count
- Active badge (if trip is ongoing)

#### AC 3: Responsive Grid
**Given** I view the trips list on different screen sizes
**When** the page renders
**Then** the card grid adapts responsively (e.g., 1 column on mobile, 2-3 on desktop)

**Technical Requirements:**
- Refactor trips list to use card layout
- Use Tailwind grid for responsive layout
- Display trip metadata on cards

**Testing Requirements:**
- Cards display correctly
- Grid is responsive
- All metadata shows on cards

**Source:** Visual improvement for trips list
**Priority:** Medium
**Story Points:** 3

---

## Epic 9: Rich Text Editor

Replace plain text entry content with a rich text editor supporting formatting and inline media.

**Business Value:** Enable creators to format entry content with headings, lists, bold/italic, and inline images/videos.

**Dependencies:** Epic 2 (Entry content system), Epic 10 (Video support if inline videos needed)

### Story 9.1: Install and Configure Tiptap

**As a** developer
**I want to** install and configure Tiptap rich text editor
**So that** creators can format entry content with rich text features

**Acceptance Criteria:**

#### AC 1: Tiptap Installed
**Given** the project is set up
**When** I run `npm install`
**Then** Tiptap and required extensions are installed

#### AC 2: Basic Editor Renders
**Given** I navigate to the entry creation page
**When** the page loads
**Then** I see a Tiptap editor with a basic toolbar (bold, italic, headings)

#### AC 3: Editor Saves JSON
**Given** I format text in the editor
**When** I save the entry
**Then** the editor content is saved as Tiptap JSON format

**Technical Requirements:**
- Install `@tiptap/react`, `@tiptap/starter-kit`
- Configure Tiptap component with basic extensions
- Store content as JSON (not HTML or Markdown)

**Testing Requirements:**
- Tiptap editor renders in entry form
- Content saves as JSON
- Basic formatting (bold, italic) works

**Source:** Foundation for rich text editing
**Priority:** High
**Story Points:** 2

### Story 9.2: Update Entry Schema for Dual-Format Support

**As a** developer
**I want** the Entry model to support both plain text and Tiptap JSON
**So that** existing entries remain readable while new entries use rich text

**Acceptance Criteria:**

#### AC 1: Schema Supports Both Formats
**Given** the Entry model is updated
**When** I inspect the database schema
**Then** the `content` field can store both plain text and JSON

#### AC 2: Detect Content Format
**Given** an entry's content is loaded
**When** the system reads the content
**Then** it detects whether the content is plain text or Tiptap JSON

#### AC 3: Render Based on Format
**Given** an entry's content format is detected
**When** the entry is displayed
**Then** plain text is rendered as plain text
**And** Tiptap JSON is rendered with the Tiptap viewer

**Technical Requirements:**
- Update Entry model: `content` field remains text (JSON stored as string)
- Add `contentFormat` field: 'plaintext' | 'tiptap'
- Detection logic: Check if content parses as valid Tiptap JSON

**Testing Requirements:**
- Schema supports both formats
- Format detection works correctly
- Both formats render correctly

**Source:** Migration support for existing content
**Priority:** High
**Story Points:** 2

### Story 9.3: Build Tiptap Editor Component

**As a** developer
**I want** a reusable Tiptap editor component with a full toolbar
**So that** creators can format content with headings, lists, bold, italic, links, etc.

**Acceptance Criteria:**

#### AC 1: Editor Toolbar
**Given** I view the entry form
**When** the editor loads
**Then** I see a toolbar with buttons for:
- Bold, italic, strikethrough
- Headings (H1, H2, H3)
- Bullet list, numbered list
- Blockquote
- Link (optional)

#### AC 2: Formatting Works
**Given** I select text and click a toolbar button
**When** the formatting applies
**Then** the text updates with the selected format

#### AC 3: Editor State Management
**Given** I switch between editor and preview
**When** I return to the editor
**Then** my content and formatting are preserved

**Technical Requirements:**
- Tiptap extensions: Bold, Italic, Strike, Heading, BulletList, OrderedList, Blockquote, Link
- Toolbar component with formatting buttons
- Editor state managed by React component

**Testing Requirements:**
- All toolbar buttons work
- Formatting applies correctly
- Editor state persists

**Source:** Core rich text editing component
**Priority:** High
**Story Points:** 5

### Story 9.4: Integrate Editor with Create Entry Form

**As a** creator
**I want** the entry creation form to use the rich text editor
**So that** I can format new entry content

**Acceptance Criteria:**

#### AC 1: Editor in Create Form
**Given** I navigate to the create entry page
**When** the form loads
**Then** I see the Tiptap editor instead of a plain textarea

#### AC 2: Save Formatted Content
**Given** I format text in the editor
**When** I save the entry
**Then** the content is saved as Tiptap JSON
**And** the `contentFormat` field is set to 'tiptap'

**Technical Requirements:**
- Replace textarea with Tiptap editor in create entry form
- Save editor content as JSON
- Set `contentFormat` to 'tiptap'

**Testing Requirements:**
- Editor displays in create form
- Formatted content saves correctly

**Source:** Enable rich text for new entries
**Priority:** High
**Story Points:** 2

### Story 9.5: Integrate Editor with Edit Entry Form

**As a** creator
**I want** the entry edit form to use the rich text editor
**So that** I can update entry formatting

**Acceptance Criteria:**

#### AC 1: Editor in Edit Form
**Given** I navigate to the edit entry page
**When** the form loads
**Then** I see the Tiptap editor with the entry's current content

#### AC 2: Plain Text Migration on Edit
**Given** I edit an entry with plain text content
**When** the editor loads
**Then** the plain text is converted to Tiptap JSON
**And** `contentFormat` is updated to 'tiptap' on save

**Technical Requirements:**
- Replace textarea with Tiptap editor in edit entry form
- Convert plain text to Tiptap JSON on load (if needed)
- Update `contentFormat` to 'tiptap' on save

**Testing Requirements:**
- Editor displays in edit form
- Plain text entries migrate to Tiptap on edit

**Source:** Enable rich text editing for existing entries
**Priority:** High
**Story Points:** 3

### Story 9.6: Implement Custom Image Node with entryMediaId

**As a** developer
**I want** a custom Tiptap image node that stores `entryMediaId` instead of image URLs
**So that** inline images reference existing media records

**Acceptance Criteria:**

#### AC 1: Custom Image Node
**Given** the Tiptap editor is configured
**When** I insert an image from the gallery
**Then** the image node stores `entryMediaId` (not the image URL)

#### AC 2: Image Rendering
**Given** an entry has inline images
**When** the entry is displayed
**Then** images are rendered by fetching URLs from media records via `entryMediaId`

**Technical Requirements:**
- Custom Tiptap image node extension
- Node attributes: `entryMediaId`
- Render image by resolving media URL from `entryMediaId`

**Testing Requirements:**
- Image node stores `entryMediaId`
- Images render correctly in viewer

**Source:** Media reference integrity
**Priority:** High
**Story Points:** 3

### Story 9.7: Update Gallery Insert to Use Custom Image Nodes

**As a** creator
**I want** to insert images from the entry gallery into the editor
**So that** I can place images inline with text

**Acceptance Criteria:**

#### AC 1: Insert Image Button
**Given** I am editing an entry with uploaded images
**When** I click "Insert Image"
**Then** I see a gallery of all images uploaded to this entry

#### AC 2: Insert Image into Editor
**Given** I select an image from the gallery
**When** I click "Insert"
**Then** the image is inserted at the cursor position in the editor
**And** the image node uses the custom `entryMediaId` node

**Technical Requirements:**
- "Insert Image" button in editor toolbar
- Image gallery modal showing entry media
- Insert image as custom node with `entryMediaId`

**Testing Requirements:**
- Image gallery displays correctly
- Inserting image works
- Image displays in editor and viewer

**Source:** Inline media insertion
**Priority:** High
**Story Points:** 3

### Story 9.8: Update Entry Viewer to Render Tiptap JSON

**As a** viewer
**I want** entry content to display with formatting
**So that** I can read entries with headings, lists, and inline images

**Acceptance Criteria:**

#### AC 1: Rich Text Rendering
**Given** an entry uses Tiptap JSON content
**When** I view the entry
**Then** I see the content rendered with all formatting (headings, bold, lists, images)

#### AC 2: Inline Images Display
**Given** an entry has inline images
**When** I view the entry
**Then** images are displayed inline with the text

**Technical Requirements:**
- Use Tiptap EditorContent component in read-only mode
- Resolve `entryMediaId` to image URLs for rendering

**Testing Requirements:**
- Rich text renders correctly
- Inline images display

**Source:** Display rich text content
**Priority:** High
**Story Points:** 2

### Story 9.9: Implement Plain Text to Tiptap Converter

**As a** developer
**I want** a utility function to convert plain text to Tiptap JSON
**So that** old entries can be migrated to the new format

**Acceptance Criteria:**

#### AC 1: Conversion Function
**Given** a plain text string
**When** I pass it to the converter function
**Then** it returns valid Tiptap JSON with the text as paragraphs

#### AC 2: Preserve Line Breaks
**Given** plain text has line breaks
**When** converted to Tiptap JSON
**Then** line breaks are preserved as separate paragraphs

**Technical Requirements:**
- Converter function: `plainTextToTiptap(text: string): TiptapJSON`
- Split text by line breaks and create paragraph nodes

**Testing Requirements:**
- Conversion produces valid Tiptap JSON
- Line breaks preserved

**Source:** Migration utility
**Priority:** Medium
**Story Points:** 2

### Story 9.10: Add Lazy Migration Logic (Convert on Edit)

**As a** system
**I want** plain text entries to be automatically migrated to Tiptap JSON when edited
**So that** entries are gradually migrated without a bulk update

**Acceptance Criteria:**

#### AC 1: Detect Plain Text on Edit
**Given** I edit an entry with plain text content
**When** the edit form loads
**Then** the system detects the content is plain text

#### AC 2: Convert to Tiptap JSON
**Given** plain text content is detected
**When** the editor loads
**Then** the plain text is converted to Tiptap JSON
**And** displayed in the editor

#### AC 3: Save as Tiptap JSON
**Given** I save the entry after editing
**When** the save completes
**Then** the content is saved as Tiptap JSON
**And** `contentFormat` is updated to 'tiptap'

**Technical Requirements:**
- Check `contentFormat` field on edit
- Convert plain text to Tiptap JSON if needed
- Update `contentFormat` on save

**Testing Requirements:**
- Plain text entries convert on edit
- Converted entries save as Tiptap JSON

**Source:** Gradual migration strategy
**Priority:** Medium
**Story Points:** 2

### Story 9.11: Update Gallery Delete to Remove Image Nodes

**As a** system
**I want** image nodes to be removed from entry content when media is deleted
**So that** entries don't show broken images

**Acceptance Criteria:**

#### AC 1: Detect Image Usage
**Given** I delete a media file from an entry
**When** the deletion is triggered
**Then** the system checks if the media is used in any image nodes in the entry content

#### AC 2: Remove Image Nodes
**Given** the deleted media is used in image nodes
**When** the media is deleted
**Then** all image nodes referencing the media are removed from the entry content

#### AC 3: Confirmation Warning (Optional)
**Given** I attempt to delete media used in the entry content
**When** the deletion dialog appears
**Then** I see a warning: "This image is used in the entry content and will be removed."

**Technical Requirements:**
- Parse entry content JSON to find image nodes with matching `entryMediaId`
- Remove matching nodes from content
- Update entry content after media deletion

**Testing Requirements:**
- Image nodes are removed when media is deleted
- Entry content updates correctly

**Source:** Content integrity
**Priority:** Medium
**Story Points:** 3

### Story 9.12: Add Format Detection and Migration Status

**As a** creator
**I want** to see which entries use plain text vs. rich text
**So that** I know which entries need migration

**Acceptance Criteria:**

#### AC 1: Format Indicator on Entry List
**Given** I view the trip overview or entry list
**When** entries are displayed
**Then** I see a badge or icon indicating content format (plain text vs. rich text)

#### AC 2: Migration Status (Optional)
**Given** I view the trip settings or admin panel
**When** the page loads
**Then** I see a count of entries by format (e.g., "15 rich text, 3 plain text")

**Technical Requirements:**
- Display `contentFormat` field on entry cards
- Optional: Count entries by format in trip stats

**Testing Requirements:**
- Format indicator displays correctly
- Counts are accurate (if implemented)

**Source:** Migration visibility
**Priority:** Low
**Story Points:** 1

### Story 9.13: Test Rich Text Features End-to-End

**As a** QA tester
**I want** to verify all rich text features work correctly
**So that** creators can confidently use the editor

**Acceptance Criteria:**

#### AC 1: Create Entry with Rich Text
**Given** I create a new entry
**When** I format text with headings, bold, lists, and insert images
**Then** the entry saves successfully
**And** the content displays correctly in the viewer

#### AC 2: Edit Entry with Rich Text
**Given** I edit an existing rich text entry
**When** I modify formatting and save
**Then** the changes are saved
**And** the content displays correctly

#### AC 3: Migrate Plain Text Entry
**Given** I edit a plain text entry
**When** I add formatting and save
**Then** the entry is migrated to rich text
**And** the content displays correctly

**Technical Requirements:**
- Manual testing checklist
- Automated tests for editor component and viewer

**Testing Requirements:**
- All formatting options work
- Images insert and display correctly
- Migration works correctly

**Source:** Quality assurance
**Priority:** High
**Story Points:** 3

---

## Epic 10: Media & UX Improvements

Enhance media handling capabilities and user experience with better file size limits, video support, and interface improvements.

**Business Value:** Improve user experience for travel bloggers who want to share high-quality photos and video content from their trips.

**Dependencies:**
- Epic 2 (Entry media foundation)
- Epic 9 (Rich text editor for inline media)

### Story 10.1: Enhanced Media Support (Photos + Videos)

**As a** creator
**I want to** upload larger photos (up to 15MB) and video files (up to 100MB)
**So that** I can share high-quality travel memories without compression or external hosting

**Acceptance Criteria:**

#### AC 1: Increased Photo File Size Limit
**Given** I am creating or editing an entry
**When** I select a photo file between 5MB and 15MB
**Then** the file uploads successfully without size validation errors
**And** the photo displays correctly in the entry gallery

**Given** I select a photo file larger than 15MB
**When** I attempt to upload
**Then** I see a clear error message: "Photo must be 15MB or less"

#### AC 2: Video File Upload Support
**Given** I am creating or editing an entry
**When** I select a video file in MP4 or WebM format up to 100MB
**Then** the file uploads successfully
**And** the video appears in the entry gallery with a video player icon

**Given** I select a video file larger than 100MB
**When** I attempt to upload
**Then** I see a clear error message: "Video must be 100MB or less"

#### AC 3: Video Playback in Entry Viewer
**Given** an entry contains uploaded video files
**When** I view the entry
**Then** videos display with an HTML5 video player
**And** I can play, pause, and control volume
**And** videos auto-play on mute when scrolled into view (optional)

#### AC 4: Video Thumbnail Generation (Optional)
**Given** a video has been uploaded
**When** the video processes on the server
**Then** a thumbnail image is generated from the first frame
**And** the thumbnail displays in the gallery before playback

#### AC 5: Mixed Media Gallery
**Given** an entry contains both photos and videos
**When** I view the entry gallery
**Then** photos and videos display together in chronological upload order
**And** videos are clearly distinguished with a play icon overlay

#### AC 6: Inline Video Support (Rich Text Editor)
**Given** I have uploaded a video to an entry
**When** I use the rich text editor
**Then** I can insert the video inline within the text content
**And** the video plays within the text flow in the entry viewer

**Technical Requirements:**
- Update COVER_IMAGE_MAX_BYTES from 5MB to 15MB for photos
- Add VIDEO_MAX_BYTES = 100MB constant
- Update COVER_IMAGE_ALLOWED_MIME_TYPES to include video/mp4 and video/webm
- Server-side validation for file types and sizes
- HTML5 video player component for entry viewer
- Optional: Server-side thumbnail generation using ffmpeg or sharp
- Update inline image insertion to support video nodes in Tiptap editor

**Architecture Constraints:**
- NAS storage must handle larger files (verify disk space)
- Video streaming should use HTML5 video tag (no transcoding initially)
- Bandwidth considerations for video downloads
- Browser compatibility: MP4 (H.264) for widest support, WebM as alternative

**Testing Requirements:**
- Upload validation tests for 15MB photos and 100MB videos
- File type validation (reject unsupported formats)
- Video playback tests across browsers (Chrome, Safari, Firefox, Edge)
- Gallery display tests with mixed media
- Inline video tests in rich text editor
- Performance tests with multiple large files

**Source:** User request for enhanced media capabilities
**Priority:** High - Improves core content creation experience
**Story Points:** 5

### Story 10.2: Automatic Image Compression

**As a** creator
**I want** uploaded images to be automatically compressed
**So that** my entries load faster and consume less storage space

**Acceptance Criteria:**

#### AC 1: Automatic Compression on Upload
**Given** I upload an image larger than 500KB
**When** the upload completes
**Then** the image is automatically compressed to reduce file size
**And** the compressed image is stored
**And** the original is discarded (or kept as backup, depending on strategy)

#### AC 2: Compression Quality
**Given** an image is compressed
**When** I view the image in the entry
**Then** the image quality remains visually acceptable (minimal noticeable degradation)

#### AC 3: Skip Small Images
**Given** I upload an image smaller than 500KB
**When** the upload completes
**Then** the image is stored without compression (no unnecessary processing)

#### AC 4: Compression Feedback (Optional)
**Given** I upload a large image
**When** compression occurs
**Then** I see a progress indicator or success message
**And** I am informed of the file size reduction (e.g., "5.2 MB → 1.8 MB")

**Technical Requirements:**
- Use image compression library (e.g., sharp, jimp, or ImageMagick)
- Compress images server-side after upload
- Target compression: Reduce file size by 50-70% while maintaining quality
- Supported formats: JPEG, PNG, WebP
- Compression quality setting: ~80-85% for JPEG
- Skip compression for images < 500KB

**Architecture Constraints:**
- Compression must happen server-side (not client-side)
- Compressed images stored in same location as originals
- No compression for videos (out of scope)

**Testing Requirements:**
- Large images are compressed correctly
- Small images are not compressed
- Compressed images display correctly
- File size reduction meets targets
- No visual quality degradation beyond acceptable limits

**Source:** Performance and storage optimization
**Priority:** Medium - Improves app performance
**Story Points:** 3

### Story 10.3: Slideshow Crossfade Transitions

**As a** viewer watching a slideshow
**I want** smooth crossfade transitions between images instead of hard cuts
**So that** the slideshow experience feels more polished and professional

**Acceptance Criteria:**

#### AC 1: Image Crossfade Transitions
**Given** I am watching a slideshow with multiple images
**When** the slideshow transitions from one image to the next image
**Then** the new image fades in over the old image with a 1-second crossfade
**And** the transition uses CSS opacity animation for smooth performance
**And** the crossfade effect applies only when both media are images

#### AC 2: Video Hard Cut
**Given** I am watching a slideshow that includes video files
**When** the slideshow transitions to or from a video
**Then** the transition is an instant hard cut (no crossfade)
**And** the video plays normally without fade effects

#### AC 3: Manual Navigation Crossfade
**Given** I am in slideshow mode
**When** I manually navigate using arrow keys or swipe gestures
**Then** the image transitions use the same 1-second crossfade
**And** the crossfade works consistently with auto-advance transitions

#### AC 4: Crossfade Always Enabled
**Given** I am using slideshow mode
**When** the slideshow is active
**Then** crossfade is always enabled (no user settings to toggle)
**And** there are no UI controls to enable/disable crossfade

#### AC 5: No Viewer Mode Changes
**Given** I am in regular viewer mode (not slideshow)
**When** I navigate between images
**Then** navigation behavior remains unchanged (instant switching)
**And** crossfade only applies to slideshow mode

**Technical Requirements:**
- Modify slideshow component (Story 2.8)
- CSS transitions for opacity (not JavaScript animation)
- Two-layer rendering during crossfade: outgoing image + incoming image
- Transition duration: 1 second
- Timing function: ease-in-out
- Crossfade only for image-to-image transitions
- Hard cut for video transitions
- No new dependencies required

**Testing Requirements:**
- Unit tests for crossfade state management
- Component tests for two-layer rendering
- Tests for video hard cut behavior
- Tests for viewer mode (no crossfade)
- Manual testing on mobile devices for performance

**Source:** User request for better slideshow UX
**Priority:** Medium - UX enhancement, not critical functionality
**Story Points:** 2

---

## Epic 11: Country Flags from Geolocation

Extract country information from entry coordinates and display country flags throughout the application for visual trip organization and travel statistics.

**Business Value:** Provide visual indicators of travel destinations and enable quick identification of countries visited in each trip.

**Dependencies:**
- Epic 7 (Location features with lat/long data)
- Entry location field must exist

### Story 11.1: Add Country Code Storage & Extraction

**As a** system
**I want to** extract and store country codes from entry coordinates
**So that** country information is available for display throughout the app

**Acceptance Criteria:**

#### AC 1: Add Country Code Field
**Given** the Entry location schema
**When** the schema is updated
**Then** a `countryCode` field (ISO 3166-1 alpha-2) is added to the location object

#### AC 2: Extract Country on Entry Create
**Given** I create an entry with lat/long coordinates
**When** the entry is saved
**Then** the system reverse geocodes the coordinates to determine the country
**And** the country code (e.g., "US", "DE", "JP") is stored with the entry location

#### AC 3: Extract Country on Entry Update
**Given** I edit an entry and change the location
**When** the entry is saved
**Then** the country code is updated based on the new coordinates

#### AC 4: Backfill Existing Entries
**Given** existing entries have lat/long but no country code
**When** I run the backfill utility
**Then** all entries with locations are updated with country codes

**Technical Requirements:**
- Add `countryCode` field to Entry location schema (nullable string, 2 chars)
- Use Nominatim reverse geocoding API (consistent with existing location search)
- Extract country code from reverse geocode response
- Backfill utility: iterate existing entries, reverse geocode, update country code
- Handle failures gracefully (no country code if geocoding fails)

**Testing Requirements:**
- Country code is extracted and stored on entry create
- Country code updates when location changes
- Backfill utility updates existing entries
- Graceful handling when country cannot be determined

**Source:** Foundation for country flag features
**Priority:** High - Required for subsequent stories
**Story Points:** 3

### Story 11.2: Display Flags on Entry Cards

**As a** viewer
**I want to** see country flag emojis on entry cards
**So that** I can quickly identify the country for each entry

**Acceptance Criteria:**

#### AC 1: Flag Display on Trip Overview Cards
**Given** I am viewing the trip overview page
**When** entry cards are displayed
**Then** I see a country flag emoji next to each entry title (if country code exists)

#### AC 2: Flag Display on Shared Trip Overview Cards
**Given** I am viewing a shared trip overview page
**When** entry cards are displayed
**Then** I see country flag emojis on entry cards (same as authenticated view)

#### AC 3: No Flag if Country Unknown
**Given** an entry has no country code
**When** the entry card is displayed
**Then** no flag is shown (graceful degradation)

**Technical Requirements:**
- Helper function: `countryCodeToFlag(code: string): string`
  - Convert ISO 3166-1 alpha-2 code to Unicode flag emoji
  - Example: "US" → 🇺🇸, "DE" → 🇩🇪, "JP" → 🇯🇵
- Add flag display to entry card components
- Use flag emoji (no image assets needed)

**Testing Requirements:**
- Flags display correctly on entry cards
- No flag shown if country code is missing
- Flag conversion function works for all country codes

**Source:** Visual country indicators on entry cards
**Priority:** Medium
**Story Points:** 2

### Story 11.3: Display Flags on Entry Detail Pages

**As a** viewer
**I want to** see the country flag on entry detail pages
**So that** I know which country the entry is from while reading

**Acceptance Criteria:**

#### AC 1: Flag Display Below Entry Title
**Given** I am viewing an entry detail page
**When** the page loads
**Then** I see the country flag emoji displayed below or next to the entry title

#### AC 2: Flag Display on Shared Entry Pages
**Given** I am viewing a shared entry page
**When** the page loads
**Then** I see the country flag emoji (same as authenticated view)

#### AC 3: No Flag if Country Unknown
**Given** an entry has no country code
**When** the entry detail page loads
**Then** no flag is shown (graceful degradation)

**Technical Requirements:**
- Add flag display to entry detail page layout
- Use same `countryCodeToFlag()` helper from Story 11.2

**Testing Requirements:**
- Flag displays on entry detail pages
- Flag displays on shared entry pages
- No flag shown if country code is missing

**Source:** Country indicator on entry pages
**Priority:** Medium
**Story Points:** 1

### Story 11.4: Aggregate Trip Country Flags

**As a** viewer
**I want to** see a list of country flags for all countries visited in a trip
**So that** I can quickly see which countries the trip covers

**Acceptance Criteria:**

#### AC 1: Flag List on Trip Overview
**Given** I am viewing a trip overview page
**When** the page loads
**Then** I see a list of country flags below the trip title
**And** flags are displayed in chronological order (first appearance in trip)
**And** each country appears only once (no duplicates)

#### AC 2: Flag List on Shared Trip Overview
**Given** I am viewing a shared trip overview page
**When** the page loads
**Then** I see the same country flag list as in the authenticated view

#### AC 3: No Flags if No Locations
**Given** a trip has no entries with location data
**When** the trip overview loads
**Then** no country flag list is displayed

#### AC 4: Flag Order Reflects Chronology
**Given** a trip has entries in multiple countries
**When** the flag list is displayed
**Then** flags appear in the order they first appear chronologically in the trip

**Technical Requirements:**
- Compute unique countries from trip entries (sorted by first entry date)
- Display flag list below trip title on overview pages
- Helper function: `getTripCountries(entries: Entry[]): string[]`
  - Extract country codes from entries
  - Remove duplicates
  - Sort by first appearance (entry date)
- Display flags horizontally (e.g., 🇺🇸 🇩🇪 🇯🇵)

**Testing Requirements:**
- Flag list displays correctly on trip overview
- Flags are in chronological order
- No duplicate flags
- No flag list if no countries

**Source:** Trip-level country visualization
**Priority:** Medium
**Story Points:** 3

---
## Epic 12: Historical Weather Data

Display historical weather conditions (icon + temperature) for each entry based on the date and location of the story.

**Business Value:** Enrich travel memories with contextual weather information, helping readers understand the conditions during the trip.

**Dependencies:** Epic 11 (Country Flags) - requires location data (lat/long) and date fields

### Story 12.1: Add Weather Fields to Database Schema

**As a** developer
**I want to** add weather data fields to the Entry model
**So that** I can store historical weather information for each entry

**Acceptance Criteria:**

#### AC 1: Database Schema Update
**Given** the Entry model in Prisma schema
**When** I add weather fields
**Then** the following optional fields are added:
- `weatherCondition` (String, optional) - e.g., "Clear", "Cloudy", "Rain"
- `weatherTemperature` (Float, optional) - temperature in Celsius
- `weatherIconCode` (String, optional) - weather icon code from API

#### AC 2: Database Migration
**Given** the schema has been updated
**When** I generate and run the migration
**Then** the database is updated without data loss
**And** existing entries have null weather fields

**Technical Requirements:**
- Update `travelblogs/prisma/schema.prisma`
- Add three optional fields to Entry model:
  - `weatherCondition String?`
  - `weatherTemperature Float?`
  - `weatherIconCode String?`
- Generate migration: `npx prisma migrate dev --name add_weather_fields`
- Run migration to update database

**Testing Requirements:**
- Migration runs successfully
- Existing entries preserved with null weather fields
- New entries can store weather data

**Source:** Foundation for weather feature
**Priority:** Critical - Required for all weather stories
**Story Points:** 1

### Story 12.2: Create Weather Backfill Utility

**As a** developer
**I want to** fetch and store historical weather data for all existing entries
**So that** all entries have weather information without manual API calls

**Acceptance Criteria:**

#### AC 1: Weather Fetching Function
**Given** an entry has a date and location (lat/long)
**When** I call the weather fetch function
**Then** it queries Open-Meteo API for historical weather
**And** returns temperature and weather condition code

#### AC 2: Backfill Script
**Given** entries exist in the database
**When** I run the backfill script
**Then** it processes all entries with location data
**And** fetches historical weather for each entry's date/location
**And** updates the database with weather data

#### AC 3: Error Handling
**Given** an entry has no location data or API fails
**When** the backfill script processes it
**Then** it skips that entry gracefully
**And** logs the skip reason
**And** continues processing other entries

#### AC 4: Rate Limiting
**Given** the backfill script is processing many entries
**When** making API requests
**Then** it respects rate limits (max 1 request/second)
**And** doesn't overwhelm the free API tier

**Technical Requirements:**
- Create utility file: `travelblogs/src/utils/fetch-weather.ts`
  - Function: `fetchHistoricalWeather(lat: number, lon: number, date: Date): Promise<WeatherData | null>`
  - Uses Open-Meteo API: `https://archive-api.open-meteo.com/v1/archive`
  - Query params: `latitude`, `longitude`, `start_date`, `end_date`, `daily=temperature_2m_max,weathercode`
  - Returns: `{ temperature: number, condition: string, iconCode: string }`
- Create backfill script: `travelblogs/src/utils/backfill-weather.ts`
  - Fetch all entries with `latitude` and `longitude`
  - For each entry, call `fetchHistoricalWeather()`
  - Update entry with weather data
  - Add delay between requests (1000ms)
- Weather icon code mapping (WMO Weather interpretation codes):
  - 0: Clear sky → "☀️"
  - 1-3: Partly cloudy → "⛅"
  - 45,48: Fog → "🌫️"
  - 51-67: Rain → "🌧️"
  - 71-77: Snow → "❄️"
  - 80-99: Thunderstorm → "⛈️"

**Testing Requirements:**
- Weather fetch function returns correct data for known date/location
- Backfill script processes all entries
- Entries without location are skipped
- API errors are handled gracefully
- Rate limiting prevents API overload

**Source:** Data population for weather display
**Priority:** High - Required before UI display
**Story Points:** 5

### Story 12.3: Display Weather on Entry Detail Pages

**As a** viewer
**I want to** see the weather conditions on entry detail pages
**So that** I know what the weather was like during that part of the trip

**Acceptance Criteria:**

#### AC 1: Weather Display Next to Country Flag
**Given** I am viewing an entry detail page
**And** the entry has weather data
**When** the page loads
**Then** I see the weather icon and temperature displayed to the right of the country flag and country name
**And** the format is: "🇺🇸 United States  ☀️ 75°F" (for English)
**And** the format is: "🇺🇸 United States  ☀️ 24°C" (for German)

#### AC 2: Temperature Unit Based on Language
**Given** I am viewing an entry
**And** my language is set to English
**When** the weather is displayed
**Then** the temperature is shown in Fahrenheit

**Given** my language is set to German
**When** the weather is displayed
**Then** the temperature is shown in Celsius

#### AC 3: Hide Weather if Not Available
**Given** an entry has no weather data
**When** the entry detail page loads
**Then** no weather icon or temperature is displayed
**And** only the country flag and name are shown

#### AC 4: Weather Display on Shared Entry Pages
**Given** I am viewing a shared entry page
**And** the entry has weather data
**When** the page loads
**Then** I see the same weather display as in authenticated view
**And** temperature unit matches the viewer's browser language

**Technical Requirements:**
- Update `travelblogs/src/components/entries/entry-detail.tsx`
  - Add weather display after country name (lines ~271-278)
  - Format: `{countryFlag} {countryName}  {weatherIcon} {temperature}°{unit}`
- Update `travelblogs/src/components/entries/entry-reader.tsx` (shared view)
  - Same weather display logic
- Create utility: `travelblogs/src/utils/weather-display.ts`
  - Function: `formatTemperature(tempCelsius: number, locale: string): string`
    - Convert to Fahrenheit if locale is 'en' or 'en-US'
    - Return Celsius for 'de' or other locales
    - Formula: F = (C × 9/5) + 32
  - Function: `getWeatherIcon(iconCode: string): string`
    - Map WMO code to emoji icon
- Pass locale from Next.js i18n or browser language

**Testing Requirements:**
- Weather displays correctly next to country flag
- Fahrenheit shown for English locale
- Celsius shown for German locale
- No weather shown if data is missing
- Shared pages display weather correctly

**Source:** Weather visualization for users
**Priority:** High
**Story Points:** 3

### Story 12.5: Auto-Fetch Weather for New Entries

**As a** creator
**I want** weather data to be automatically fetched when I create a new entry with location
**So that** I don't need to manually run backfill scripts for new content

**Acceptance Criteria:**

#### AC 1: Weather Fetched on Entry Creation
**Given** I create a new entry with location (lat/long)
**When** the entry is saved
**Then** the system automatically fetches historical weather for that date/location
**And** stores the weather data in the database

#### AC 2: Weather Updated When Location Changes
**Given** I edit an existing entry and change the location
**When** I save the entry
**Then** the system fetches new weather data for the updated location
**And** updates the weather fields in the database

#### AC 3: Weather Cleared When Location Removed
**Given** I edit an entry and remove the location
**When** I save the entry
**Then** the weather fields are cleared (set to null)

#### AC 4: Graceful Handling of API Failures
**Given** I create/update an entry with location
**And** the weather API is unavailable or fails
**When** the entry is saved
**Then** the entry is still saved successfully
**And** weather fields remain null
**And** an error is logged (but not shown to user)

**Technical Requirements:**
- Update `travelblogs/src/app/api/entries/route.ts` (POST endpoint)
  - After reverse geocoding (lines 241-250), call `fetchHistoricalWeather()`
  - Store weather data in entry creation
- Update `travelblogs/src/app/api/entries/[id]/route.ts` (PATCH endpoint)
  - When location changes (lines 500-509), fetch new weather data
  - When location is removed (lines 492-499), clear weather fields
- Reuse `fetchHistoricalWeather()` function from Story 12.2
- Handle API errors gracefully (try/catch, log but don't throw)
- Weather fetch should not block entry save operation

**Testing Requirements:**
- New entries with location get weather data
- Editing location updates weather data
- Removing location clears weather data
- Entry saves successfully even if weather API fails
- No user-facing errors if weather fetch fails

**Source:** Automated weather data management
**Priority:** High - Ensures ongoing data population
**Story Points:** 3

---

## Epic 13: Performance & UX Polish

Final polish for entry detail page performance and user experience improvements, including layout refinements, image loading optimization, and interaction enhancements.

**Business Value:** Improve page load performance metrics (LCP), enhance visual presentation of entry content, and create smoother user interactions.

**Dependencies:** Epic 2 (Blog Entries), Epic 7 (Maps), Epic 10 (Media), Epic 11 (Country Flags), Epic 12 (Weather)

### Story 13.6: Preload Slideshow Images for Smooth Playback

**As a** viewer
**I want** slideshow images to be preloaded before the slideshow starts
**So that** transitions are smooth without delays or blank screens, especially on slower network connections

**Acceptance Criteria:**

#### AC 1: Preload All Slideshow Images Before Starting
**Given** I open a slideshow with multiple images
**When** the slideshow initializes
**Then** all images in the slideshow are preloaded before playback begins
**And** a loading indicator is displayed during preload
**And** the slideshow only starts after all images are loaded
**And** the progress bar does not start until images are ready

#### AC 2: Show Loading State During Preload
**Given** slideshow images are being preloaded
**When** I view the slideshow interface
**Then** I see a loading indicator (spinner or progress bar)
**And** the indicator shows preload progress (e.g., "Loading 3 of 8 images")
**And** slideshow controls are disabled until preload completes

#### AC 3: Handle Preload Failures Gracefully
**Given** one or more images fail to load during preload
**When** the preload timeout expires or an error occurs
**Then** the slideshow starts with successfully loaded images
**And** failed images are skipped or show a placeholder
**And** an error is logged but not shown to the user
**And** slideshow continues to function with available images

#### AC 4: Smooth Transitions After First Loop
**Given** the slideshow has completed one full loop
**When** the slideshow repeats from the beginning
**Then** all transitions are instant (images already cached)
**And** no loading delays occur on subsequent loops

#### AC 5: Maintain Existing Slideshow Functionality
**Given** images are preloaded
**When** I interact with slideshow controls (play/pause, next/prev)
**Then** all existing functionality works as before
**And** crossfade transitions still work smoothly
**And** keyboard navigation still works
**And** progress indicators still update correctly

**Technical Requirements:**
- Update slideshow component (likely `travelblogs/src/components/media/slideshow.tsx` or similar)
- Implement image preloading using `Image` preload or `new Image()` pattern
- Add loading state management (useState hook)
- Display loading UI during preload (spinner or progress indicator)
- Track preload progress (loaded count / total count)
- Implement preload timeout (e.g., 30 seconds max)
- Handle image load errors gracefully
- Disable slideshow start until preload completes
- Maintain existing slideshow timing and transition logic
- Preserve accessibility (ARIA labels, keyboard controls)

**Testing Requirements:**
- Preload initiates when slideshow opens
- Loading indicator displays during preload
- Slideshow starts only after images loaded
- Progress bar synchronized with image readiness
- Failed images don't block slideshow start
- All controls work correctly after preload
- Transitions smooth on first loop
- Second loop has instant transitions (cached)
- Test on simulated slow network (throttling)

**Source:** Production performance issue - slideshow delays on slow networks
**Priority:** High - Affects production UX on slower connections
**Story Points:** 5

### Story 13.7: Improve Trip Card Hover Interactions

**As a** viewer
**I want** trip cards on the trips list page to have the same enhanced hover feedback as entry cards
**So that** the interface feels consistent and modern across all card interactions

**Acceptance Criteria:**

#### AC 1: Enhanced Hover State with Background Color
**Given** I view the trips list page at `/trips`
**When** I hover my mouse over a trip card
**Then** the card background changes to the same color used for entry cards (#F2ECE3)
**And** the hover effect is smooth with a transition
**And** the transition timing matches entry cards (duration-200)

#### AC 2: Consistent Hover Behavior with Entry Cards
**Given** I view both the trips list and a trip overview page
**When** I hover over cards on each page
**Then** the hover behavior (background color, transition timing) is identical
**And** all cards respond consistently to hover

#### AC 3: Accessibility Maintained
**Given** I use keyboard navigation on the trips list
**When** I tab through trip cards
**Then** focused cards also show the same visual feedback as hovered cards
**And** screen readers still announce the cards as clickable links

#### AC 4: Preserve Existing Functionality
**Given** I interact with trip cards
**When** I click or navigate to a trip
**Then** all existing functionality works as before
**And** no visual regressions occur (images, text, layout)

**Technical Requirements:**
- Locate trip card components (likely in `travelblogs/src/app/trips/page.tsx` or `travelblogs/src/components/trips/trip-cards.tsx`)
- Apply same hover styling as entry cards from Story 13.5:
  - `hover:bg-[#F2ECE3]` - Background color on hover (matches entry cards)
  - `transition-colors duration-200` - Smooth color transition
  - `focus-visible:bg-[#F2ECE3]` - Keyboard focus states
  - `cursor-pointer` - Explicit cursor indication
- Preserve existing border and shadow hover effects
- Maintain card layout and structure
- No changes to functionality, only styling enhancements

**Testing Requirements:**
- Visual verification: Trip cards have same hover effect as entry cards
- Hover transition is smooth (200ms)
- Keyboard navigation: Focus states match hover states
- No layout shifts or visual regressions
- Test on desktop, tablet, and mobile
- Verify consistency across all trip card instances

**Source:** Follow-up to Story 13.5 - Apply same hover improvements to trip cards
**Priority:** Medium - UI consistency improvement
**Story Points:** 2

---

### Story 13.8: Simplify Share Link UI Layout

**As a** trip creator
**I want** a cleaner share link interface with actions grouped together
**So that** the UI is more intuitive and less cluttered

**Acceptance Criteria:**

#### AC 1: Remove Share URL Input Field
**Given** I have generated a share link for a trip
**When** I view the Share Link section
**Then** the URL input field is NOT displayed
**And** I can still access the URL via the "Copy Link" button
**And** the share section is more compact without the input field

#### AC 2: Move Revoke Button to Share Section
**Given** I have a generated share link
**When** I view the trip detail page
**Then** the "Revoke Share Link" button is displayed in the Share Link section (not in Trip Actions)
**And** the button is placed beside the "Copy Link" button
**And** the "Revoke Share Link" button is removed from the Trip Actions section

#### AC 3: Buttons Displayed Side-by-Side
**Given** I have a generated share link
**When** I view the Share Link section
**Then** "Copy Link" and "Revoke Share Link" buttons are displayed horizontally beside each other
**And** buttons have consistent sizing and spacing
**And** buttons wrap gracefully on smaller screens (flex-wrap)

#### AC 4: Maintain All Existing Functionality
**Given** I interact with the share functionality
**When** I click "Copy Link"
**Then** the URL is copied to clipboard and shows "Copied" confirmation
**When** I click "Revoke Share Link"
**Then** the revoke confirmation modal opens as before
**And** revoking works exactly as it did previously

#### AC 5: Visual Design Consistency
**Given** I view the share buttons
**When** I compare them to other buttons in the interface
**Then** the styling is consistent with the design system
**And** "Copy Link" uses the outline button style (border-[#1F6F78])
**And** "Revoke Share Link" uses the destructive button style (border-[#B64A3A])

**Technical Requirements:**
- Update `travelblogs/src/components/trips/trip-detail.tsx`
- Remove input field from share section (lines ~1170-1176)
- Move "Revoke Share Link" button from Trip Actions (lines ~1647-1656) to share section
- Place both buttons in horizontal flex layout (gap-3, flex-wrap)
- Preserve all button functionality (onClick handlers, disabled states)
- Maintain button styling (classes should remain identical)
- No changes to modal behavior or API calls
- Update layout to accommodate both buttons side-by-side

**Testing Requirements:**
- Share link can be generated successfully
- "Copy Link" button copies URL to clipboard
- "Copied" confirmation displays briefly after copy
- "Revoke Share Link" button opens confirmation modal
- Modal allows revoking or keeping the link
- After revoke, link is cleared and "Generate Link" button shows
- Both buttons wrap gracefully on mobile screens
- No visual regressions in share section layout
- Trip Actions section no longer shows revoke button

**Source:** User feedback - URL input field is redundant, actions should be grouped
**Priority:** Medium - UX improvement and layout simplification
**Story Points:** 3

---

## Epic 14: Trips Page World Map (Phase 3)

Add a scratch-map style world map above the Trips list for country-based navigation.

### Story 14.1: Render Trips Page World Map

**As a** viewer  
**I want** to see a world map above the Trips list  
**So that** I can scan countries at a glance before choosing a trip

**Acceptance Criteria:**

#### AC 1: Map Renders Above Trips List
**Given** I open the Trips page  
**When** the page loads  
**Then** a world map renders above the trip card list  
**And** all countries are shown in a dark base state by default  
**And** the existing trip list remains visible and usable

---

### Story 14.2: Highlight Countries With Visible Trips

**As a** viewer  
**I want** countries with visible trips to appear lighter  
**So that** I can quickly see where trips are available to me

**Acceptance Criteria:**

#### AC 1: Highlight Countries With Visible Trips
**Given** I can view one or more trips with stories in a country  
**When** the map renders  
**Then** that country appears in a lighter state

#### AC 2: Multi-Country Trips Highlight Multiple Countries
**Given** a trip contains stories from multiple countries  
**When** the map renders  
**Then** each relevant country is highlighted

---

### Story 14.3: Show Trip List on Country Hover

**As a** viewer  
**I want** a popup list of trips when I hover a country  
**So that** I can select a trip directly from the map

**Acceptance Criteria:**

#### AC 1: Popup Lists Trips for Hovered Country
**Given** I hover a country with at least one visible trip  
**When** the hover state is active  
**Then** a popup lists the titles of trips that include at least one story in that country

#### AC 2: No Popup for Countries Without Visible Trips
**Given** I hover a country with no visible trips  
**When** the hover state is active  
**Then** no trip list is shown

---

### Story 14.4: Navigate to Trip From Map Popup

**As a** viewer  
**I want** to click a trip in the popup  
**So that** I can navigate directly to that trip detail page

**Acceptance Criteria:**

#### AC 1: Click Trip Title Navigates to Trip Detail
**Given** I see a trip list in the country popup  
**When** I click a trip title  
**Then** I am navigated to that trip’s detail page

---

### Story 14.5: Enforce Access Control in Map Visibility

**As a** viewer  
**I want** the map to reflect only trips I’m allowed to see  
**So that** no hidden trip information is exposed

**Acceptance Criteria:**

#### AC 1: Hidden Trips Do Not Affect Country Highlighting
**Given** I do not have access to any trips in a country  
**When** the map renders  
**Then** that country remains in the dark base state  
**And** no trips from that country appear in hover popups

---

### Story 14.7: Enable Map Zoom Controls and Dragging

**As a** viewer  
**I want** to zoom and pan the Trips page world map  
**So that** I can interact with small destinations more easily

**Acceptance Criteria:**

#### AC 1: Zoom Controls Enabled
**Given** I view the Trips page map  
**When** the map loads  
**Then** visible zoom controls (+ / -) are present  
**And** clicking them zooms the map in and out

#### AC 2: Map Dragging Enabled
**Given** I view the Trips page map  
**When** I click/touch and drag the map  
**Then** the map pans accordingly  
**And** I can reposition small countries into view

#### AC 3: Baseline Map Settings Remain Unchanged
**Given** the Trips page map renders  
**Then** the initial zoom, latitude center, height, and white ocean background remain identical to Story 14.1

#### AC 4: Existing Interactions Still Work
**Given** I interact with the map  
**When** I click a country with visible trips  
**Then** the trip popup still appears and links still work  
**And** highlight styling remains unchanged
