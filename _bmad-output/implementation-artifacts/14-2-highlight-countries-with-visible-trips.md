# Story 14.2: Highlight Countries With Visible Trips

Status: backlog

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **viewer**,
I want **countries with visible trips to appear lighter**,
so that **I can quickly see where trips are available to me**.

## Acceptance Criteria

### AC 1: Highlight Countries With Visible Trips
**Given** I can view one or more trips with stories in a country
**When** the map renders
**Then** that country appears in a lighter state

### AC 2: Multi-Country Trips Highlight Multiple Countries
**Given** a trip contains stories from multiple countries
**When** the map renders
**Then** each relevant country is highlighted
