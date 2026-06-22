# V0 Day View + Header Refinement Patch

Frontend-only patch.

## Changes

- Removed the extra `V0 Home Identity` eyebrow from Property Hub.
- Added source-level flex-column correction for page header inner wrappers.
- Added dashboard local loading state so stale data is dimmed/blanked while a context fetch is running.
- Day view chart now switches to hourly purchase/ledger activity instead of showing the monthly spending-period chart.
- Monthly/year views keep the spending-period chart.
- Dashboard chart heading and helper labels now respond to the selected time lens.
- Daily view labels now describe day-specific behavior more clearly.
- Added CSS polish for hourly chart bars and loading state.

## SQL / API

No SQL changes.
No API changes.
