# Story 14.3: Show Trip List on Country Hover

Status: backlog

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **viewer**,
I want **a popup list of trips when I hover a country**,
so that **I can select a trip directly from the map**.

## Acceptance Criteria

### AC 1: Popup Lists Trips for Hovered Country
**Given** I hover a country with at least one visible trip
**When** the hover state is active
**Then** a popup lists the titles of trips that include at least one story in that country

### AC 2: No Popup for Countries Without Visible Trips
**Given** I hover a country with no visible trips
**When** the hover state is active
**Then** no trip list is shown
