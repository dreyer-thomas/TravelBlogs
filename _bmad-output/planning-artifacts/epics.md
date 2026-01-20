---
stepsCompleted: [1, 2, 3]
inputDocuments:
  - _bmad-output/prd.md
  - _bmad-output/architecture.md
  - _bmad-output/ux-design-specification.md
---

# TravelBlogs - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for TravelBlogs, decomposing the requirements from the PRD, UX Design if it exists, and Architecture requirements into implementable stories.

## Requirements Inventory

### Functional Requirements

FR1: Admin can create user accounts. (Phase 2)
FR2: Admin can assign a user role as creator or viewer. (Phase 2)
FR3: System can authenticate users with email and password. (Phase 2)
FR4: Creators can sign in and access their trips and entries. (Phase 2)
FR5: Viewers can sign in and access trips they are allowed to view. (Phase 2)
FR6: Creators can create trips. (Phase 1)
FR7: Creators can edit trip metadata (name, dates, cover). (Phase 1)
FR8: Creators can delete trips. (Phase 2)
FR9: System can display a list of trips for a creator. (Phase 1)
FR10: Creators can add a blog entry to a trip. (Phase 1)
FR11: Creators can edit a blog entry. (Phase 1)
FR12: Creators can delete a blog entry. (Phase 1)
FR13: Each entry can include a text body. (Phase 1)
FR14: Each entry can include multiple media files. (Phase 1)
FR15: System can display entries in a trip in chronological order. (Phase 1)
FR16: Users can upload multiple media files in one entry. (Phase 1)
FR17: System can display media-first entry pages. (Phase 1)
FR18: System can show media in a gallery or carousel within an entry. (Phase 1)
FR19: Creators can generate a shareable link to a trip. (Phase 1)
FR20: Anyone with the shareable link can view the trip. (Phase 1)
FR21: Creators can invite specific users to a trip as viewers. (Phase 2)
FR22: Creators can enable a viewer to contribute to a trip. (Phase 2)
FR23: Viewers can view trips they are invited to. (Phase 2)
FR24: Viewers with contribution enabled can add entries to that trip. (Phase 2)
FR25: Viewers with contribution enabled can edit entries in that trip. (Phase 2)
FR26: System can display a trip map view with entry locations. (Phase 3)
FR27: System can display a timeline view tied to map locations. (Phase 3)
FR28: System can extract coordinates from photo metadata. (Phase 3)
FR29: Users can view a trip overview with latest entries. (Phase 1)
FR30: Users can open an entry in a single-page view. (Phase 1)
FR31: Users can navigate between entries in a trip. (Phase 1)
FR32: Admin can manage user access and roles. (Phase 2)
FR33: Admin can deactivate users. (Phase 2)
FR34: Epic 8 - Entry tags & filtering
FR35: Epic 8 - Entry tags & filtering
FR36: Epic 8 - Entry tags & filtering
FR37: Epic 8 - Entry tags & filtering
FR38: Epic 8 - Entry tags & filtering
FR34: Creators/contributors can add free-text tags to entries with typeahead for existing tags. (Phase 2)
FR35: Tags display on entry cards in trip overview (signed-in + shared). (Phase 2)
FR36: Tags display in entry reader hero (top-right). (Phase 2)
FR37: Users can filter entries by tags (multi-select OR). (Phase 2)
FR38: Tag filter uses chips up to 8 tags, then a multi-select control. (Phase 2)

### MVP Scope Adjustment

- Lightweight authentication is required in MVP to protect creator trip/entry management.
- This is a scope change from the PRD (which labels auth in Phase 2). Update the PRD when convenient.

### NonFunctional Requirements

NFR1: Page load time is 5-10 seconds under typical home broadband.
NFR2: Entry switching response time is under 1 second.
NFR3: Trip switching response time is 2-5 seconds.
NFR4: Media upload supports 10-15 files per entry under normal consumer bandwidth.
NFR5: Use HTTPS for all traffic.
NFR6: Store passwords using secure hashing when user management is introduced (Phase 2).
NFR7: Shareable links are unguessable.
NFR8: Support current versions of Chrome, Safari, Firefox, and Edge.
NFR9: Provide responsive layout for desktop and mobile browsers.
NFR10: Accessibility follows standard good practices (UX specifies WCAG AA).
NFR11: SPA architecture with no multi-page app requirement.
NFR12: No SEO requirement; app is private.
NFR13: No real-time updates; viewers refresh to see new entries.
NFR14: Optimize media loading and rendering to support fast entry switching.
NFR15: Enforce role-based access on client and server.
NFR16: Support small groups up to 15 viewers per trip.
NFR17: Support low concurrency (2-3 concurrent viewers).

### Additional Requirements

- Starter: initialize with `npx create-next-app@latest travelblogs` and select TypeScript, App Router, Tailwind CSS, ESLint, and `src/` directory.
- Stack: Next.js + TypeScript; Tailwind CSS for styling.
- Database: SQLite with Prisma 7.2.0 and Prisma Migrate.
- Auth: Auth.js (NextAuth) 4.24.13 with JWT sessions.
- API: REST route handlers under `src/app/api`; endpoints are plural; error format `{ error: { code, message } }`; responses wrapped in `{ data, error }`.
- Validation: Zod 4.2.1; server-side only.
- Authorization: role checks plus per-trip ACL.
- State: Redux Toolkit 2.11.2; async status pattern `idle | loading | succeeded | failed`.
- Data fetching: server components plus `fetch`.
- Media: Next.js Image with lazy loading; media stored on NAS filesystem.
- Hosting: bare Node process on NAS; `.env` configuration; basic file logging; no rate limiting or TLS proxy in MVP.
- Naming/structure: singular table names; camelCase columns; feature-based components under `src/components/<feature>`; central `tests/` folder.
- UX system: themeable component library baseline (MUI or Tailwind UI) with custom trip hero, timeline entry card, entry reader, map+timeline panel, share/invite panel.
- UX layout: media-first entry pages; single-page entry reading; latest entry visible on entry; timeline is primary navigation.
- UX layout: map + timeline context (desktop side-by-side, tablet/mobile stacked).
- UX navigation: desktop sidebar + hamburger menu; mobile bottom bar for primary sections.
- UX accessibility: WCAG AA, visible focus states, keyboard navigation, 44x44 touch targets, 4.5:1 text contrast.
- UX typography: Fraunces headings, Source Serif 4 body, body size 17-18px, line length 55-75 chars.
- UX color tokens: warm terracotta primary, deep teal secondary, ivory/sand surfaces, charcoal text with defined semantic colors.

### FR Coverage Map

### FR Coverage Map

FR1: Epic 5 - Admin creates users  
FR2: Epic 5 - Role assignment  
FR3: Epic 5 - Authentication  
FR4: Epic 5 - Creator sign-in access  
FR5: Epic 5 - Viewer sign-in access  
FR6: Epic 1 - Create trips  
FR7: Epic 1 - Edit trip metadata  
FR8: Epic 1 - Delete trips  
FR9: Epic 1 - Trip list  
FR10: Epic 2 - Add entry  
FR11: Epic 2 - Edit entry  
FR12: Epic 2 - Delete entry  
FR13: Epic 2 - Entry text  
FR14: Epic 2 - Entry media  
FR15: Epic 3 - Chronological ordering  
FR16: Epic 2 - Multi-file upload  
FR17: Epic 3 - Media-first display  
FR18: Epic 3 - Gallery or carousel  
FR19: Epic 4 - Shareable link  
FR20: Epic 4 - Link viewing  
FR21: Epic 5 - Invite viewers  
FR22: Epic 5 - Enable contributor  
FR23: Epic 5 - Viewer access to invited trips  
FR24: Epic 5 - Contributor add entries  
FR25: Epic 5 - Contributor edit entries  
FR26: Epic 7 - Map view  
FR27: Epic 6 - Timeline view  
FR28: Epic 7 - Photo coordinate extraction  
FR29: Epic 3 - Trip overview with latest entries  
FR30: Epic 3 - Single-page entry view  
FR31: Epic 3 - Entry navigation  
FR32: Epic 5 - Admin manage roles  
FR33: Epic 5 - Admin deactivate users

## Epic List

### Epic 0: Lightweight Authentication (MVP)
Creators can sign in to manage their trips; shareable links remain public.
**FRs covered:** Not in PRD (MVP scope decision)

### Epic 1: Trip Creation & Management (MVP)
Users can create and manage trips with basic metadata and see their trip list.
**FRs covered:** FR6, FR7, FR8, FR9

### Epic 2: Daily Entry Creation & Media Upload (MVP)
Creators can add daily entries with text and multiple media files.
**FRs covered:** FR10, FR11, FR12, FR13, FR14, FR16

### Epic 3: Entry Reading & Navigation (MVP)
Viewers and creators can read entries in a fast, media-first, single-page experience with clear navigation.
**FRs covered:** FR15, FR17, FR18, FR29, FR30, FR31

### Epic 4: Simple Sharing (MVP)
Creators can generate a shareable link so others can view trips without friction.
**FRs covered:** FR19, FR20

### Epic 5: Accounts, Roles, and Contributions (Phase 2)
Admin and user management, authenticated access, and contributor permissions for trips.
**FRs covered:** FR1, FR2, FR3, FR4, FR5, FR21, FR22, FR23, FR24, FR25, FR32, FR33

### Epic 6: Timeline Storytelling (Phase 3)
Add timeline storytelling to show the journey in order.
**FRs covered:** FR27

### Epic 7: Map Handling (Phase 3)
Add spatial storytelling with maps and optional location extraction.
**FRs covered:** FR26, FR28
### Epic 8: Entry Tags & Filtering (Phase 2 - New)
Creators and contributors add tags to entries; viewers see tags and filter entries by tags.
**FRs covered:** FR34, FR35, FR36, FR37, FR38

### Epic 9: Rich Text Editor for Blog Entries (Phase 2 - Enhancement)
Replace plain text entry input with rich text editor supporting formatting, inline images, and backward compatibility.
**FRs covered:** Enhancement to FR13 (Entry text body)

### Epic 10: Media & UX Improvements (Phase 2 - Enhancement)
Improve media handling with larger file limits, video support, and UX refinements.
**FRs covered:** Enhancement to FR14, FR16 (Entry media files)


## Epic 0: Lightweight Authentication (MVP)

Creators can sign in to manage trips and entries; shareable links stay public.

### Story 0.1: Creator Sign-In (Single Account)
### Story 0.2: Enable HTTPS

Imported from implementation story file: 0-2-enable-https.md

### Story 0.3: Deactivate Creator Account

Imported from implementation story file: 0-3-deactivate-creator-account.md


As a creator,  
I want to sign in with email and password,  
So that only I can create and edit trips and entries.

**Acceptance Criteria:**

**Given** the app is configured with a single creator account  
**When** I submit valid credentials  
**Then** I am signed in and can access trip management routes  

**Given** I submit invalid credentials  
**When** I attempt to sign in  
**Then** I see a clear error and remain signed out  

**Given** I am not signed in  
**When** I attempt to access trip or entry management routes  
**Then** I am redirected to sign in  

**Given** I open a shareable trip link  
**When** the trip loads  
**Then** I can view the trip without signing in

## Epic 1: Trip Creation & Management (MVP)

Users can create and manage trips with basic metadata and see their trip list.

### Story 1.1: Initialize Project from Starter Template

As a developer,
I want to initialize the project using the approved Next.js starter,
So that the codebase matches the architecture decisions.

**Acceptance Criteria:**

**Given** a new workspace  
**When** I run `npx create-next-app@latest travelblogs` and select TypeScript, App Router, Tailwind CSS, ESLint, and `src/` directory  
**Then** a new Next.js project is created with those options configured  

**Given** the new project is created  
**When** I start the dev server  
**Then** the application runs successfully and renders the default Next.js page

### Story 1.2: Create Trip

As a creator,
I want to create a new trip with basic details,
So that I can start organizing entries for that trip.

**Acceptance Criteria:**

**Given** I am a creator viewing the trips area  
**When** I submit the create trip form with required fields (title, start date, end date)  
**Then** a new trip is created and I am taken to the trip view  
**And** the trip appears in my trip list  

**Given** I submit the create trip form with missing or invalid required fields  
**When** I attempt to save  
**Then** I see clear validation errors  
**And** the trip is not created

### Story 1.3: Delete Trip

As a creator,
I want to delete a trip,
So that I can remove trips I no longer want to keep.

**Acceptance Criteria:**

**Given** I am a creator viewing a trip I own  
**When** I choose delete and confirm the action  
**Then** the trip is removed from my trip list  
**And** I can no longer access its entries  

**Given** I initiate delete and cancel the confirmation  
**When** I return to the trip view  
**Then** the trip remains unchanged

### Story 1.4: Edit Trip Metadata

As a creator,
I want to edit a trip's basic details,
So that I can keep the trip information accurate.

**Acceptance Criteria:**

**Given** I am a creator viewing a trip I own  
**When** I update trip metadata (title, dates, cover) and save  
**Then** the changes are persisted  
**And** the updated metadata appears in the trip view and trip list  

**Given** I submit invalid metadata (missing title or invalid dates)  
**When** I attempt to save  
**Then** I see clear validation errors  
**And** the changes are not saved

### Story 1.5: View Trip List

As a creator,
I want to see a list of my trips,
So that I can quickly access and manage them.

**Acceptance Criteria:**

**Given** I am a creator with one or more trips  
**When** I open the trips area  
**Then** I see a list of my trips with basic metadata (title, dates, cover)  

**Given** I have no trips yet  
**When** I open the trips area  
**Then** I see an empty state with a clear call to create a trip

### Story 1.7: Typography Refresh (Sans-Serif)
### Story 1.6: Trip Cover Image Upload

Imported from implementation story file: 1-6-trip-cover-image-upload.md


As a creator or viewer,
I want the app typography to use a clean sans-serif style,
So that reading and navigation feel modern and crisp across the whole app.

**Acceptance Criteria:**

**Given** I open any page in the app  
**When** the UI renders  
**Then** headings and body text use the new sans-serif typography system  

**Given** the UI uses a sans-serif system  
**When** I view long-form entry text  
**Then** text remains readable and consistent with established spacing and sizing  

**Given** I inspect the UI styles  
**When** I check typography tokens or global styles  
**Then** legacy serif font references are removed or replaced with the new sans-serif font family

## Epic 2: Daily Entry Creation & Media Upload (MVP)

Creators can add daily entries with text and multiple media files.

### Story 2.1: Add Blog Entry

As a creator,
I want to add a daily blog entry to a trip with text and media,
So that I can capture the day's story in one place.

**Acceptance Criteria:**

**Given** I am a creator viewing a trip I own  
**When** I create a new entry with required text and at least one media file  
**Then** the entry is saved and appears in the trip's entry list in chronological order  
**And** I can open it immediately in the entry view  

**Given** I attempt to create an entry without required fields  
**When** I try to save  
**Then** I see clear validation errors  
**And** the entry is not created

### Story 2.2: Edit Blog Entry

As a creator,
I want to edit an existing blog entry,
So that I can fix mistakes or add more detail.

**Acceptance Criteria:**

**Given** I am a creator viewing an entry I own  
**When** I update the entry text or media and save  
**Then** the changes are persisted  
**And** the updated entry is shown in the entry view  

**Given** I submit invalid updates (missing required text or invalid media)  
**When** I attempt to save  
**Then** I see clear validation errors  
**And** the changes are not saved

### Story 2.3: Multi-File Media Upload

As a creator,
I want to upload multiple media files for an entry in one action,
So that I can add a full day's photos efficiently.

**Acceptance Criteria:**

**Given** I am creating or editing an entry  
**When** I select multiple media files to upload  
**Then** all selected files are attached to the entry  
**And** I see upload progress and completion states  

**Given** one or more files fail to upload  
**When** the upload completes  
**Then** I see which files failed  
**And** successfully uploaded files remain attached

### Story 2.4: Delete Blog Entry

As a creator,
I want to delete a blog entry,
So that I can remove entries I no longer want to keep.

**Acceptance Criteria:**

**Given** I am a creator viewing an entry I own  
**When** I choose delete and confirm the action  
**Then** the entry is removed from the trip's entry list  
**And** I can no longer access it  

**Given** I initiate delete and cancel the confirmation  
**When** I return to the entry view  
**Then** the entry remains unchanged

### Story 2.5: Entry Title

As a creator,
I want to add a short title for each blog entry,
So that the entry is summarized in one short message.

**Acceptance Criteria:**

**Given** I am creating or editing an entry  
**When** I enter a title up to 80 characters  
**Then** the title is saved with the entry  
**And** it appears in the entry list and entry view header  

**Given** I submit an entry without a title or with a title over 80 characters  
**When** I attempt to save  
**Then** I see a clear validation error  
**And** the entry is not saved

### Story 2.6: Unified Entry Image Library

As a creator,
I want all entry images managed in one place,
So that I can select the story image, insert inline photos, or remove images without re-uploading.

**Acceptance Criteria:**

**Given** I am creating or editing an entry  
**When** I upload images  
**Then** they appear in a single entry image library as the first step in the media flow  

**Given** I hover over an image in the library  
**When** I choose "Set as story image"  
**Then** that image becomes the story image selection  

**Given** I hover over an image in the library  
**When** I choose "Insert inline"  
**Then** an image link in the format `![Entry photo](<url>)` is inserted at the current cursor position in the entry text  
**And** if the image already has a custom alt in the entry text, it is preserved  

**Given** I hover over an image in the library  
**When** I choose "Remove"  
**Then** the image is removed from the entry media and no longer selectable for story or inline use  
**And** any inline references matching `![...](<url>)` are removed from the entry text

### Story 2.7: Full-Screen Photo Viewer

As a viewer,
I want to open any entry photo in full screen,
So that I can see the image in detail without leaving the entry.

**Acceptance Criteria:**

**Given** I am viewing an entry with inline photos in the text  
**When** I click an inline photo  
**Then** the photo opens in a full-screen viewer  
**And** I can exit the viewer to return to the entry view  
**And** the viewer shows an overlay with a close/back control and image position (e.g., "2 of 8")  
**And** I can use the left and right arrow keys to move between photos  
**And** I can press Escape to close the viewer  

**Given** I am viewing an entry with photos in the media section  
**When** I click a photo in the media section  
**Then** the photo opens in a full-screen viewer  
**And** I can exit the viewer to return to the entry view  
**And** on touch devices I can swipe left or right to move between photos  
**And** I can pinch to zoom the photo

### Story 2.8: Media Slideshow Viewer

As a viewer,
I want to start a slideshow from the media section,
So that I can view entry photos hands-free.

**Acceptance Criteria:**

**Given** I am viewing an entry with photos in the media section  
**When** I select the "Start slideshow" action  
**Then** the photos open in a full-screen slideshow  
**And** each photo displays for 5 seconds before advancing  
**And** after the last photo, the slideshow repeats from the first photo  
**And** I can pause and resume the slideshow  
**And** I can move to the next or previous photo using on-screen controls  
**And** I can press Escape to exit the slideshow  
**And** I can click a visible close button to exit the slideshow

## Epic 3: Entry Reading & Navigation (MVP)

Viewers and creators can read entries in a fast, media-first, single-page experience with clear navigation.

### Story 3.1: View Entry (Single-Page Reader)

As a viewer,
I want to open an entry in a single-page reader with a media-first layout,
So that I can consume the day's story quickly.

**Acceptance Criteria:**

**Given** I have access to a trip  
**When** I open an entry  
**Then** I see the entry on a single page with media displayed prominently  
**And** the entry text is readable without navigating to another page  

**Given** the entry includes multiple media files  
**When** the entry loads  
**Then** media is displayed in the entry view in a gallery or carousel

### Story 3.2: Entry Navigation

As a viewer,
I want to navigate between entries in a trip,
So that I can move through the story in order.

**Acceptance Criteria:**

**Given** I am viewing an entry in a trip  
**When** I select next or previous entry  
**Then** I am taken to that entry without leaving the entry reader  
**And** the entry content updates within the single-page view  

**Given** I am on the first or last entry  
**When** I attempt to navigate past the bounds  
**Then** the unavailable direction is disabled or clearly indicated

### Story 3.3: Trip Overview with Latest Entries

As a viewer,
I want to see a trip overview with the latest entries first,
So that I can quickly access the most recent updates.

**Acceptance Criteria:**

**Given** I open a trip  
**When** the trip overview loads  
**Then** I see the latest entries at the top in chronological order  
**And** each entry shows its title, date, and a preview image  

**Given** the trip has no entries  
**When** I open the trip overview  
**Then** I see a clear empty state

### Story 3.4: Fullscreen Viewer Minimal Chrome & Segmented Slideshow Progress

As a viewer,
I want a distraction-free fullscreen image viewer and a clear slideshow progress indicator,
So that I can focus on the photos without UI clutter.

**Acceptance Criteria:**

**Given** I open the fullscreen image viewer from any entry photo  
**When** the viewer is displayed  
**Then** no on-screen buttons are visible  
**And** no image position text (e.g., "2 of 8") is shown  

**Given** the fullscreen viewer is open  
**When** I want to exit  
**Then** I can close it without on-screen buttons (Escape key and tap/click anywhere)  

**Given** I start a slideshow  
**When** the slideshow is running  
**Then** a horizontal progress bar is shown with one segment per image  
**And** the progress bar advances in order and loops after the last image

### Story 3.5: Transfer Trip Ownership

As a trip owner or administrator,  
I want to transfer ownership of a trip to another active creator or administrator,  
so that trip stewardship can move to the right person.

**Acceptance Criteria:**

**Given** I am the trip owner or an administrator  
**When** I open Trip Actions  
**Then** I see a "Transfer ownership" action  

**Given** I open the transfer action  
**When** I view the selection list  
**Then** I can only select active users with role `creator` or `administrator`  

**Given** I select an eligible user and confirm  
**When** the transfer completes  
**Then** the trip owner is updated to the selected user  
**And** the trip remains accessible to the new owner  

**Given** I am not the trip owner and not an administrator  
**When** I attempt to transfer ownership  
**Then** the action is forbidden with an owner-or-admin error  

**Given** the target user is inactive or not a creator/administrator  
**When** I attempt to transfer ownership  
**Then** the action is blocked with a clear validation error

## Epic 4: Simple Sharing (MVP)

Creators can generate a shareable link so others can view trips without friction.

### Story 4.1: Create Shareable Trip Link

As a creator,
I want to generate a shareable link for a trip,
So that I can invite others to view it without requiring an account.

**Acceptance Criteria:**

**Given** I am a creator viewing a trip I own  
**When** I generate a shareable link  
**Then** I receive a unique, unguessable URL for that trip  

**Given** I copy the shareable link and open it  
**When** the trip loads  
**Then** I can view the trip without signing in

### Story 4.2: Regenerate Shareable Link

As a creator,
I want to regenerate a trip's shareable link,
So that I can invalidate an old link if it was shared too broadly.

**Acceptance Criteria:**

**Given** I am a creator viewing a trip I own  
**When** I regenerate the shareable link  
**Then** a new unique, unguessable URL is created  
**And** the previous link no longer grants access  

**Given** I open the new link  
**When** the trip loads  
**Then** I can view the trip without signing in

### Story 4.3: Revoke Shareable Link

As a creator,
I want to revoke a trip's shareable link,
So that the trip is no longer accessible via that link.

**Acceptance Criteria:**

**Given** I am a creator viewing a trip I own  
**When** I revoke the shareable link  
**Then** the link is disabled and no longer grants access  

**Given** I open a revoked link  
**When** the trip is requested  
**Then** I see an access denied or not found message

### Story 4.4: Discreet Share UI

As a creator,
I want the share controls to be subtle and secondary in the trip UI,
So that sharing is available without dominating the trip experience.

**Acceptance Criteria:**

**Given** I view a trip I own  
**When** the trip header renders  
**Then** the share control is shown as a small icon/button in the header near the Owner label  

**Given** I open trip actions  
**When** I review destructive options  
**Then** revoke share link is placed in the Trip Actions area  

**Given** the share UI is visible  
**When** I look for link actions  
**Then** there is no "Regenerate" action (Revoke + Generate only)  

**Given** no share link exists  
**When** I use the share control  
**Then** I can generate a new share link and copy it  

**Given** a share link exists  
**When** I use the share control  
**Then** I can view and copy the existing link without excessive UI emphasis

### Story 4.5: Invalidate Shared Entry Pages on Revoke

As a creator,
I want revoked share links to invalidate all shared pages immediately,
So that old links never grant access after revocation or replacement.

**Acceptance Criteria:**

**Given** I revoke a trip share link  
**When** I open the old share link to the trip overview  
**Then** I see not found or access denied  

**Given** I revoke a trip share link  
**When** I open a shared entry page using the old token  
**Then** I see not found or access denied  

**Given** I revoke and then generate a new share link  
**When** I open the old share link or any old shared entry page  
**Then** access is denied and no data is returned  

**Given** I open a valid share link  
**When** I navigate between overview and entry pages  
**Then** access remains valid for that token only

## Epic 5: Accounts, Roles, and Contributions (Phase 2)

Admin and user management, authenticated access, and contributor permissions for trips.

### Story 5.1: Admin Creates User Accounts

As an admin,
I want to create user accounts,
So that I can onboard creators and viewers.

**Acceptance Criteria:**

**Given** I am signed in as an admin  
**When** I create a user with email, name, and role (creator or viewer)  
**Then** the user account is created and visible in the user list  

**Given** I submit invalid or duplicate user data  
**When** I attempt to create the user  
**Then** I see clear validation errors  
**And** the user is not created

### Story 5.2: User Sign-In

As a user,
I want to sign in with my email and password,
So that I can access trips based on my role.

**Acceptance Criteria:**

**Given** I have a valid account  
**When** I submit the correct email and password  
**Then** I am signed in and taken to my trips  

**Given** I submit invalid credentials  
**When** I attempt to sign in  
**Then** I see a clear error  
**And** I remain signed out

### Story 5.3: Admin Changes User Role

As an admin,
I want to change a user's role between creator and viewer,
So that access aligns with their responsibilities.

**Acceptance Criteria:**

**Given** I am signed in as an admin  
**When** I update a user's role  
**Then** the new role is saved and shown in the user list  

**Given** I attempt to change the role with invalid input  
**When** I save  
**Then** I see a clear validation error  
**And** the role is not updated

### Story 5.4: Invite Viewers to a Trip

As a creator,
I want to invite specific users to a trip as viewers,
So that only chosen people can access it.

**Acceptance Criteria:**

**Given** I am a creator viewing a trip I own  
**When** I invite a user as a viewer  
**Then** the user is added to the trip's viewer list  
**And** they can access the trip once signed in  

**Given** I invite a user who does not exist  
**When** I submit the invite  
**Then** I see a clear error  
**And** the invite is not created

### Story 5.5: Enable Contributor Access for a Viewer

As a creator,
I want to enable a viewer to contribute to a specific trip,
So that trusted people can add or edit entries.

**Acceptance Criteria:**

**Given** I am a creator viewing a trip I own  
**When** I enable contributor access for a viewer  
**Then** that viewer gains contributor permissions for this trip only  

**Given** I disable contributor access  
**When** the viewer tries to add or edit entries  
**Then** they are blocked and can only view the trip

### Story 5.6: Viewer Access to Invited Trips

As a viewer,
I want to see trips I've been invited to,
So that I can view the shared travel story.

**Acceptance Criteria:**

**Given** I am signed in as a viewer with trip invites  
**When** I open my trips list  
**Then** I see the trips I've been invited to  

**Given** I try to access a trip I have not been invited to  
**When** I open its link or route  
**Then** I am denied access

### Story 5.7: Contributor Adds and Edits Entries

As a contributor,
I want to add and edit entries for a trip I'm invited to,
So that I can help tell the story.

**Acceptance Criteria:**

**Given** I am signed in as a viewer with contributor access on a trip  
**When** I add a new entry  
**Then** the entry is created and appears in the trip's entry list  

**Given** I am signed in as a contributor on a trip  
**When** I edit an existing entry  
**Then** my changes are saved and visible in the entry view

### Story 5.8: Admin Deactivates or Deletes User

As an admin,
I want to deactivate or delete a user account,
So that removed users can no longer access the system and I can permanently remove users when needed.

**Acceptance Criteria:**

**Given** I am signed in as an admin  
**When** I deactivate a user  
**Then** the user is marked inactive and cannot sign in  

**Given** a deactivated user attempts to sign in  
**When** they submit valid credentials  
**Then** access is denied with a clear error

**Given** I am signed in as an admin  
**When** I delete a user  
**Then** the user account is removed from the system  
**And** the user no longer appears in the user list

**Given** I delete a user  
**When** they attempt to sign in  
**Then** access is denied with a clear error

### Story 5.9: Administrator Role and Admin Safeguards

As an admin,
I want an Administrator role with the same rights as the default admin,
So that trusted users can manage accounts while protecting critical admin access.

**Acceptance Criteria:**

**Given** a user is assigned the Administrator role  
**When** they access admin-only areas  
**Then** they have the same permissions as the default admin

**Given** I am signed in as an Administrator  
**When** I deactivate the default admin in the Manage Users page  
**Then** the default admin is marked inactive and cannot sign in

**Given** there is only one active admin left  
**When** I attempt to delete that admin  
**Then** the action is blocked with a clear error

**Given** I am signed in as an Administrator  
**When** I attempt to remove my own admin privilege  
**Then** the action is blocked with a clear error

### Story 5.10: Refine Viewer Invitations with Custom Selector

As a creator,
I want to select invitees from a themed selector and manage the invited list,
so that inviting viewers is faster and mistakes are easy to undo.

**Acceptance Criteria:**

**Given** I am a creator viewing a trip I own  
**When** I open the invite selector  
**Then** I can choose from all active viewers and creators  
**And** already invited users are not shown in the selector  

**Given** I am viewing the invited users list  
**When** I remove an invited user  
**Then** the user is removed from the list  
**And** they can no longer access the trip  

**Given** I am inviting a user  
**When** I interact with the selector  
**Then** the selector matches the application's custom share panel styling

### Story 5.18: Provide Edit Button Only for Editors
### Story 5.11: Change Password

Imported from implementation story file: 5-11-change-password.md

### Story 5.12: Shared View Button on Trip

Imported from implementation story file: 5-12-shared-view-button.md

### Story 5.13: Active Badge Date Range

Imported from implementation story file: 5-13-active-badge-date-range.md

### Story 5.14: Relative Redirects for Sign-In

Imported from implementation story file: 5-14-relative_redirects.md

### Story 5.15: Shared View Hero Image Uses Selected Cover

Imported from implementation story file: 5-15-shared-view-hero-image.md

### Story 5.17: Shared View Link Back to Trip Overview

Imported from implementation story file: 5-17-shared-view-back-to-overview.md

### Story 5.19: Fix Edit Navigation Targets

Imported from implementation story file: 5-19-fix-edit-navigation.md

### Story 5.20: Add Back to Trips Navigation from Trip Views

Imported from implementation story file: 5-20-back-to-trips-navigation.md


As a user,
I want the Edit button shown only to users who can edit a trip,
so that view-only users cannot access trip edit flows.

**Acceptance Criteria:**

**Given** I view the Manage Trips list for a trip I own  
**When** the trip row renders  
**Then** I see the Edit button alongside View  

**Given** I view the Manage Trips list for a trip where I am a contributor  
**When** the trip row renders  
**Then** I see the Edit button alongside View  

**Given** I view the Manage Trips list for a trip where I am a viewer only  
**When** the trip row renders  
**Then** the Edit button is hidden  
**And** I cannot open the trip edit flow from the list

## Epic 6: Timeline Storytelling (Phase 3)

Add timeline storytelling to show the journey in order.

### Story 6.6: Date Formatting Consistency
### Story 6.4: User Manual

Imported from implementation story file: 6-4-user-manual.md

### Story 6.5: Language Selection (EN/DE)

Imported from implementation story file: 6-5-language-selection.md


As a user,
I want all dates displayed in a consistent, locale-aware format,
so that dates are clear and uniform across the app.

**Acceptance Criteria:**

**Given** my language is English  
**When** a date is displayed anywhere in the UI  
**Then** it follows the format "May 16th, 2024" (full month name, ordinal day, comma, year)

**Given** my language is German  
**When** a date is displayed anywhere in the UI  
**Then** it follows the format "16. Mai 2024"

**Given** any date-only display (trip dates, entry dates, admin created dates, shared views)  
**When** the UI renders  
**Then** all date-only rendering uses the same shared formatting utility

**Given** date/time displays still exist  
**When** the UI renders date+time values  
**Then** they remain locale-aware and consistent with existing date-time formatting utilities

## Epic 7: Map Handling (Phase 3)

Add spatial storytelling with maps and optional location extraction.

### Story 7.1: Trip Map View

As a viewer,
I want to see a map view with entry locations,
So that I can understand where the trip took place.

**Acceptance Criteria:**

**Given** a trip has entries with location data  
**When** I open the map view  
**Then** I see pins for each entry location  
**And** selecting a pin highlights the related entry  

**Given** a trip has entries without location data  
**When** I open the map view  
**Then** I see a clear message or empty state indicating no locations are available

### Story 7.2: Extract Coordinates from Photo Metadata

As a creator,
I want the system to extract location coordinates from uploaded photos,
So that entries can be placed on the map automatically.

**Acceptance Criteria:**

**Given** I upload photos that contain GPS metadata  
**When** the upload completes  
**Then** the system extracts coordinates and associates them with the entry  

**Given** I upload photos without GPS metadata  
**When** the upload completes  
**Then** the system leaves location empty and does not error

### Story 7.3: Map on Edit Trip Page

As a creator,
I want the trip map panel visible on the edit trip page,
So that I can review location context while updating trip details.

**Acceptance Criteria:**

**Given** I open the edit trip page for a trip with entries that have location data  
**When** the page loads  
**Then** I see the map panel and entry list arranged in the same layout as the shared viewer  
**And** map pins match the trip entry locations  

**Given** I open the edit trip page for a trip with no entry locations  
**When** the map panel renders  
**Then** I see the same empty-state message used in the shared viewer  
**And** the layout still matches the shared viewer styling  

**Given** I select a map pin on the edit trip page  
**When** the selection changes  
**Then** the corresponding entry card is highlighted in the list

### Story 7.4: Story Location Selector

As a creator,
I want to choose a story location even when photos have no GPS metadata,
So that each entry can appear on the trip map.

**Acceptance Criteria:**

**Given** I am creating or editing a story with no photo location data  
**When** I enter a place name (e.g., "London Tower Bridge")  
**Then** the app searches for matching locations and shows results  
**And** if the search is ambiguous, I am prompted to select the correct result  

**Given** I select a location result  
**When** the selection is saved  
**Then** the story location is stored with latitude, longitude, and a readable name  
**And** the story appears on the trip map in the overview  

**Given** a story has photos with GPS data  
**When** I hover over a photo in the story image library  
**Then** I see a control to use that photo's location as the story location  
**And** selecting it sets the story location to that photo's coordinates  

### Story 7.6: Entry Location Section
### Story 7.5: Map View in Shared Hero Image

Imported from implementation story file: 7-5-map-view-in-shared-hero-image.md

### Story 7.7: Fullscreen Trip Map

Imported from implementation story file: 7-7-fullscreen-trip-map.md

### Story 7.8: Edit Entry Location Display

Imported from implementation story file: 7-8-edit-entry-location-display.md

### Story 7.9: Chronological Map Path

Imported from implementation story file: 7-9-chronological-map-path.md


As a viewer,
I want to see the entry location in the entry view,
so that I understand where the story took place.

**Acceptance Criteria:**

**Given** I open an entry that has a saved story location
**When** the entry page renders
**Then** I see a "Location" section after the Media section at the bottom of the page
**And** the section shows the location name
**And** the section optionally shows latitude/longitude when available

**Given** I open an entry with no saved location
**When** the entry page renders
**Then** the Location section is hidden (no empty placeholder)

**Given** I view the entry on mobile or desktop
**When** the Location section is displayed
**Then** it follows the existing entry layout and responsive spacing

**Given** the Location section is displayed
**When** I view UI text
**Then** all user-facing strings are available in English and German

## Epic 8: Entry Tags & Filtering (Phase 2 - New)

Creators and contributors add tags to entries; viewers see tags and filter entries by tags.

### Story 8.1: Add Tags to Entry Create/Edit

As a creator or contributor,
I want to add tags to an entry while editing,
So that I can group stories by place or phase.

**Acceptance Criteria:**

**Given** I am creating or editing an entry
**When** I type a tag
**Then** I can select from trip-specific suggestions while still entering free text
**And** the same tag text cannot be added twice to the same entry

**Given** I add more than three tags
**When** I save the entry
**Then** all tags are saved without blocking me

### Story 8.2: Show Tags on Trip Overview Entry Cards

As a viewer,
I want to see tags on entry cards in the trip overview,
So that I can quickly understand what each story is about.

**Acceptance Criteria:**

**Given** a trip overview page is shown (signed-in or shared)
**When** entries have tags
**Then** each entry card displays its tags as chips

**Given** an entry has no tags
**When** I view the entry card
**Then** no tag chips are shown

### Story 8.3: Show Tags on Entry Reader Hero

As a viewer,
I want to see entry tags on the story hero image,
So that I can understand the story context at a glance.

**Acceptance Criteria:**

**Given** I open an entry reader page (signed-in or shared)
**When** the entry has tags
**Then** the tags appear on the hero image at the top-right corner

### Story 8.4: Filter Entries by Tags

As a viewer,
I want to filter entries by tags on the trip overview,
So that I can see all stories related to selected tags.

**Acceptance Criteria:**

**Given** the trip overview shows tags
**When** there are eight or fewer distinct tags
**Then** a horizontal tag chip list allows multi-select filtering (OR behavior)

**Given** there are more than eight distinct tags
**When** I open the tag filter
**Then** a multi-select control allows choosing one or more tags with OR behavior

**Given** no tags are selected
**When** I view the trip overview
**Then** all entries are shown

### Story 8.5: Show Tags on Trip Cards

As a viewer,
I want to see trip tags on the trips page cards,
so that I can quickly recognize what each trip is about.

**Acceptance Criteria:**

**Given** I am on the /trips page
**When** a trip has tagged entries
**Then** the trip card shows the distinct tags for that trip below the trip title, to the right of the cover image, listed left to right

**Given** a trip has no tags
**When** I view the trip card
**Then** no tag list is shown

**Given** a trip has tags
**When** I view the trip card
**Then** tags are shown in a predictable sorted order (alphabetical)

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
**I want** images automatically compressed to a reasonable size during upload and on app startup
**So that** page loads are faster and storage is optimized without sacrificing visual quality

**Acceptance Criteria:**

#### AC 1: Compress Images During Upload
**Given** I am uploading a photo to an entry
**When** the photo dimensions exceed 1920x1080 or contains HDR/unnecessary metadata
**Then** the image is automatically compressed before saving to disk
**And** the compressed version replaces the uploaded file
**And** the aspect ratio is preserved during scaling

#### AC 2: Upload Progress Shows Compression Phase
**Given** I am uploading a photo that requires compression
**When** the upload completes (100%)
**Then** I see the existing progress indicator transition to show compression is happening
**And** the UI does not freeze during compression
**And** the compression happens after the upload progress reaches 100%

#### AC 3: Startup Migration Compresses Existing Images
**Given** the app starts up and there are existing uncompressed images in the system
**When** the startup migration runs
**Then** all existing images larger than 1920x1080 are compressed automatically
**And** compression progress is logged to the console
**And** the migration runs only once (uses a flag to prevent re-running)
**And** the migration is non-blocking (server starts immediately)

#### AC 4: Compression Settings
**Given** any image compression operation
**When** the compression executes
**Then** the maximum dimensions are 1920x1080 (width or height, aspect ratio preserved)
**And** JPEG quality is set to 85 (lossy compression acceptable)
**And** HDR and unnecessary EXIF metadata are stripped (except GPS if present)
**And** the output format is JPEG for compatibility

#### AC 5: No Originals Kept
**Given** an image has been compressed
**When** I view the entry or check the file system
**Then** only the compressed version exists
**And** the original uploaded file is not stored

#### AC 6: Skip Already-Compressed Images
**Given** an image is already 1920x1080 or smaller
**When** the compression logic processes it
**Then** the image is not re-compressed
**And** the file is kept as-is

**Technical Requirements:**
- Use `sharp` library for image processing (already in dependencies)
- Maximum dimensions: 1920x1080 (preserve aspect ratio)
- JPEG quality: 85 (lossy compression acceptable)
- Strip HDR and unnecessary EXIF metadata (preserve GPS if present)
- Compress during upload AND on app startup for existing images
- Server-side compression after upload completes
- No originals kept (replace uploaded file)
- Follow GPS backfill pattern for startup migration

**Architecture Constraints:**
- Follow existing backfill pattern from `backfill-gps.ts`
- Use `hasRun` flag to prevent re-running migration
- Non-blocking startup (migration runs async)
- Graceful error handling (log warnings, don't crash server)
- In-place file replacement (no backup copies)

**Testing Requirements:**
- Unit tests for compression utility
- API tests for upload compression
- Migration tests for startup backfill
- Manual testing for image quality and page load speed

**Source:** User request for performance optimization
**Priority:** High - Improves page load performance
**Story Points:** 3
