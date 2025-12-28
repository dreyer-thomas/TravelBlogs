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
FR26: Epic 6 - Map view  
FR27: Epic 6 - Timeline view  
FR28: Epic 6 - Photo coordinate extraction  
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

### Epic 6: Map & Timeline Storytelling (Phase 3)
Add spatial storytelling with maps, timelines, and optional location extraction.
**FRs covered:** FR26, FR27, FR28

## Epic 0: Lightweight Authentication (MVP)

Creators can sign in to manage trips and entries; shareable links stay public.

### Story 0.1: Creator Sign-In (Single Account)

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

### Story 5.8: Admin Deactivates User

As an admin,
I want to deactivate a user account,
So that removed users can no longer access the system.

**Acceptance Criteria:**

**Given** I am signed in as an admin  
**When** I deactivate a user  
**Then** the user is marked inactive and cannot sign in  

**Given** a deactivated user attempts to sign in  
**When** they submit valid credentials  
**Then** access is denied with a clear error

## Epic 6: Map & Timeline Storytelling (Phase 3)

Add spatial storytelling with maps, timelines, and optional location extraction.

### Story 6.1: Trip Map View

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

### Story 6.2: Trip Timeline View

As a viewer,
I want to see a timeline view of trip entries,
So that I can follow the journey in order.

**Acceptance Criteria:**

**Given** a trip has entries  
**When** I open the timeline view  
**Then** I see entries ordered chronologically  
**And** selecting an entry focuses it in the timeline  

**Given** a trip has no entries  
**When** I open the timeline view  
**Then** I see a clear empty state

### Story 6.3: Extract Coordinates from Photo Metadata

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
