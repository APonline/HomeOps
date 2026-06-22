# HomeOps V0 Foundation Patch

This patch adds a first-pass V0 skeleton for Home Identity + Time Lens.

## Frontend added
- Global `HomeOpsProvider` context with selected home, year, month, day and view mode.
- V0 context bar above all screens.
- Home Profile page for property basics, recurring baseline costs, rooms, assets and timeline events.
- Dashboard hierarchy cards for Annual Health, Monthly Detail, Today Snapshot and Home.
- Existing Bills, Ledger, Receipts, Maintenance, Needs/Wants and Spending Periods now pass `home_id` and time context into API calls.

## Validation
- `npm run lint` passes.
- `npm run build` passes and `dist/` has been regenerated.

## Notes
- This is a skeleton/refactor foundation, not a final-polished V0 UX.
- Run the updated API migrations before expecting the Home Profile API to return live data.
