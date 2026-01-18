# Rich Text End-to-End Test Plan

## Core Flows
- Create new entry with rich formatting (bold, italic, headings, lists, links, alignment).
- Insert gallery image inline and save entry with entryImage nodes.
- Edit legacy plain text entry, add rich formatting, and save.
- View legacy plain text entry without editing (view-only conversion).
- Delete gallery image referenced inline and confirm removal from rendered content.

## Data Fixtures
- New entry: title + body JSON with rich marks and block types.
- Legacy entry (plain text): string body with no JSON markers.
- Media fixtures: entryMedia with known ids and urls for inline node mapping.
- Deletion scenario: entry with entryImage node pointing at a removable media id.

## Serialization Expectations
- Create/edit: rich text persists as serialized Tiptap JSON string.
- Edit legacy entry: conversion to JSON occurs only on save, not on view.
- View legacy entry: conversion is display-only and does not persist.
- Inline images: entryImage nodes keep entryMediaId linkage after save.
- Image deletion: entryImage nodes referencing removed media are stripped without breaking paragraphs.

## Cross-Browser QA Checklist (Manual Testing Required)
- Chrome: create rich entry, save, view formatting and inline images.
- Safari: edit legacy plain entry, save, verify JSON conversion and rendering.
- Firefox: view legacy entry without edits, confirm display-only conversion.
- Edge: delete gallery image used inline, confirm rendered content remains intact.
- All browsers see links, lists, headings, alignment, and inline images consistently.
