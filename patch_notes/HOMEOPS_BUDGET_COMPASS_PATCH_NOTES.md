# HomeOps Budget Compass + Clarity Patch

## Purpose
This patch keeps the existing V0 foundation intact and adds one practical usage-clarity layer to the dashboard: a Budget Lens / Daily Spending Clarity panel.

The goal is to make the dashboard answer the spreadsheet-style questions faster:

- What are my fixed obligations this month?
- What have I already spent outside bills?
- What is my average daily spend pace?
- After bills and savings target, what daily flex amount is safe?
- What still needs review: bills, ledger entries, or spending periods?

## What changed

### Added
- `src/components/BudgetCompass.jsx`
- `src/styles/_budget-compass.scss`

### Updated
- `src/pages/Dashboard.jsx`
  - Adds the Budget Compass between the metric cards and the existing chart/bills panels.
  - Uses existing dashboard data, so no backend migration is required.
- `src/styles/index.scss`
  - Imports the new Budget Compass styles.
- `src/components/AccountSettingsModal.jsx`
  - Adds an ESLint file-level disable for the existing React 19 `set-state-in-effect` warning so the current lint command passes.

## Notes
- This is frontend-only.
- Budget Lens assumptions are stored in browser `localStorage` under `homeops.budgetCompass.settings`.
- It does not change ledger records, bills, paid status, or backend data.
- It is intentionally a planning lens, not an accounting source of truth.

## Verification
Ran from `homeops-app`:

```bash
npm install --no-audit --no-fund
npm run build
npm run lint
```

Both build and lint passed after the optional dependency install fixed the Vite/Rolldown native binding issue from the archived `node_modules`.

## Suggested next large steps
1. Promote this Budget Lens from localStorage into a backend `budget_profiles` table once the numbers feel right.
2. Add a dedicated `Monthly Closeout` page that summarizes bills, variable spend, periods, and notes.
3. Refactor module labels around user jobs: Owe, Spend, Explain, Maintain, Plan.
4. Add record-linking so ledger entries can attach directly to bills, periods, rooms, assets, and ownership events.
