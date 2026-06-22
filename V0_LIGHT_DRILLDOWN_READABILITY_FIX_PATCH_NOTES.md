# V0 Light Drilldown + Readability Fix

Frontend-only follow-up patch.

## Changes

- Fixed monthly chart bar drilldown so pointer-up on a non-dragged bar reliably switches the global Time Lens into Day view.
- Made drilldown parsing more tolerant of chart payload shapes (`day`, `date_day`, `label`, `date`, `entry_date`, `selected_day`, `iso_date`).
- Preserved drag/scroll behavior: dragging the chart sideways will not trigger day drilldown.
- Added keyboard accessibility for chart bars using Enter / Space.
- Improved light-mode readability for dashboard panels, bill rows, period cards, maintenance cards, status pills, bill type pills, and chart labels.
- Kept the lime/green light-mode branding while increasing contrast on operational text.

## Validation

- `node node_modules/eslint/bin/eslint.js .` passed.
- `node node_modules/vite/bin/vite.js build` passed.

No API changes. No SQL changes.
