# V0 Profile Accordion Refinement Patch

## Purpose
Reduce the Property Hub wall-of-data feeling and make the page explain itself through optional info modals instead of permanent explainer blocks.

## Frontend changes
- Removed the permanent "what this page is for" explainer panel.
- Added a small info icon beside the Property Hub title.
- Added info icons inside each hub section header.
- Added modal explanations for:
  - Property Hub
  - Monthly baseline
  - Property snapshot
  - Optional context
- Converted the profile content into accordion sections:
  - Monthly baseline is open by default.
  - Property snapshot is collapsed by default.
  - Optional context is collapsed by default.
- Moved Rooms / Assets / Timeline into the Optional context accordion.
- Moved edit affordances to compact pencil icon buttons.
- Fixed the Primary Home edit icon to float at the top right of the hero card.
- Strengthened Rooms / Assets / Events metric cards so they read as actual boxes.

## Validation
- npm run lint passed.
- npm run build passed.

## Schema/API
- No API changes.
- No SQL changes.
