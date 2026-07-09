# HomeOps V0 UX Context Patch

## Goal
Turn the raw V0 skeleton into a cleaner product-feeling foundation.

## App changes
- Reworked the global V0 Context Bar so it feels like a Home + Time Lens controller instead of a database form.
- Added Today / Month / Year / All Time pill navigation.
- Added previous / next period stepping for day, month and year modes.
- Kept jump controls for month/year/day, but moved them into a secondary compact row.
- Renamed the profile experience to Property Hub.
- Moved Create/Edit Home into a modal instead of showing the giant form inline.
- Changed the property page into a hub: hero, baseline cards, snapshot, rooms, assets and timeline.
- Added explanatory empty states for rooms, assets and timeline.
- Added content transition animation when switching home/time/page context.
- Kept the V0 schema/API assumptions from the first skeleton patch.

## Validation
- npm run lint passes.
- npm run build passes.
