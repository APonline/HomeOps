# V0 Context Topbar + Icon Refinement Patch

This frontend-only patch responds to the UX review from the V0 context modal pass.

## What changed

- Slimmed the global HomeOps context strip.
- Removed the small `Home` label and city/region helper text from the top strip.
- Kept the home name as the left anchor.
- Added direct previous/next period arrows beside the active period label.
  - Month mode steps month-to-month.
  - Year mode steps year-to-year.
  - Day mode steps day-to-day.
  - All-time mode disables the arrows.
- Replaced ambiguous text/unicode controls with clearer SVG clock and home icons.
- Changed large `Edit details` buttons into circular pencil icon buttons.
- Changed snapshot edit to a small circular pencil icon.
- Changed Rooms / Assets / Timeline add actions into circular `+` buttons pinned top-right of each card.
- Renamed Optional structure to Optional context and tightened the copy.

## Notes

No backend or SQL changes are required for this patch.
