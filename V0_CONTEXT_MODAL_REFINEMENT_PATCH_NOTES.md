# V0 Context Modal Refinement Patch

## Focus
This patch is a UX correction pass for the V0 foundation layer.

## Changed
- Replaced the large sticky HomeOps context control panel with a compact top strip.
- Top strip now shows:
  - selected home on the left
  - current time lens summary on the right
  - circular Time Lens button
  - compact Home Settings button
- Moved Today / Month / Year / All Time controls into a proper Time Lens modal.
- Added previous/next period controls inside the modal.
- Fixed modal layering by rendering modals through a React portal to document.body.
- Added body scroll lock while modals are open.
- Fixed the modal being visually trapped inside the scrolling content region.
- Cleaned the Property Hub metrics so rooms/assets/events use consistent value/label layout.
- Simplified the Property Hub mental model:
  - property identity first
  - baseline costs second
  - rooms/assets/timeline as optional structure
- Reduced duplicate/overwhelming room/asset/timeline presentation.

## SQL
No new SQL is required beyond the original V0 foundation migration/SQL.
