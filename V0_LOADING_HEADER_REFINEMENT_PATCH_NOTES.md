# V0 Loading + Header Refinement Patch

## What changed

- Added a lightweight HomeOps context loader when switching home/time context.
- Added animated HomeOps mark treatment with rotating/fading gear rings.
- Blurs and dims the current page while the new context is loading to avoid stale month/year data looking current.
- Dashboard title now updates immediately from the selected Time Lens instead of waiting for API payloads.
- Tightened dashboard/page header styling so the title areas feel less awkward and less billboard-like.
- Property Hub intro copy reduced now that section info lives behind info icons.
- Accordion panels explicitly override the base panel min-height so closed sections stay compact.

## Files touched

- src/components/AppShell.jsx
- src/components/HomeOpsDataLoader.jsx
- src/pages/Dashboard.jsx
- src/pages/HomeProfilePage.jsx
- src/styles/_v0-foundation.scss
- src/assets/brand/homeops-icon-256.png

## Validation

- npm run lint passed.
- npm run build passed.

## Notes

No API changes and no SQL changes are required for this patch.
