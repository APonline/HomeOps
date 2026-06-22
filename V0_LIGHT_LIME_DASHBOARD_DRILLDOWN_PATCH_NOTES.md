# V0 Light Lime + Dashboard Drilldown Patch

Frontend-only refinement.

## Changes

- Light mode branding now uses a lime-green to green scheme instead of blue-purple for active states, buttons, chart bars and metric accents.
- Added theme-aware sidebar logos: dark mode keeps the original blue/purple logo, light mode uses the lime/green logo assets.
- Light mode dashboard hierarchy cards now render as light cards instead of dark blocks.
- Removed the dashboard header action buttons: Mark Period, Add Bill and + Receipt.
- Monthly/yearly spending chart bars are now clickable.
  - Clicking a day bar drills into that selected day view.
  - Drag-scroll still works without accidentally triggering drilldown.
- Updated monthly chart hint to explain click-to-drill behavior.

## Validation

- npm run lint passed.
- npm run build passed.

## SQL/API

- No API changes.
- No SQL changes.
