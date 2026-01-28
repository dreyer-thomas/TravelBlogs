# Story 14.5: Enforce Access Control in Map Visibility

Status: backlog

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **viewer**,
I want **the map to reflect only trips I’m allowed to see**,
so that **no hidden trip information is exposed**.

## Acceptance Criteria

### AC 1: Hidden Trips Do Not Affect Country Highlighting
**Given** I do not have access to any trips in a country
**When** the map renders
**Then** that country remains in the dark base state
**And** no trips from that country appear in hover popups
