import React from "react";

const base = {
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.9,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
};

export const DashboardIcon = (props) => (
  <svg {...base} {...props}><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>
);

export const BillsIcon = (props) => (
  <svg {...base} {...props}><path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5"/><path d="M10 13h6"/><path d="M10 17h6"/><path d="M10 9h1"/></svg>
);

export const LedgerIcon = (props) => (
  <svg {...base} {...props}><path d="M5 4h14a1 1 0 0 1 1 1v14H6a2 2 0 0 1-2-2V5a1 1 0 0 1 1-1Z"/><path d="M8 4v15"/><path d="M11 8h6"/><path d="M11 12h6"/></svg>
);

export const ReceiptsIcon = (props) => (
  <svg {...base} {...props}><path d="M7 3h10v18l-2-1.4L13 21l-2-1.4L9 21l-2-1.4L5 21V5a2 2 0 0 1 2-2Z"/><path d="M9 8h6"/><path d="M9 12h6"/><path d="M9 16h4"/></svg>
);

export const MaintenanceIcon = (props) => (
  <svg {...base} {...props}><path d="M14.7 6.3a3.5 3.5 0 0 0 3.9 4.8l-7.8 7.8a2 2 0 0 1-2.8 0l-.8-.8a2 2 0 0 1 0-2.8l7.8-7.8a3.5 3.5 0 0 0-4.8-3.9L8 5.8"/></svg>
);

export const NeedsWantsIcon = (props) => (
  <svg {...base} {...props}><path d="M12 20s-7-4.4-7-10.1A4 4 0 0 1 12 7a4 4 0 0 1 7 2.9C19 15.6 12 20 12 20Z"/></svg>
);

export const SpendingPeriodsIcon = (props) => (
  <svg {...base} {...props}><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4"/><path d="M8 3v4"/><path d="M3 10h18"/><path d="M8 14h.01"/><path d="M12 14h.01"/><path d="M16 14h.01"/></svg>
);

export const FinancingIcon = (props) => (
  <svg {...base} {...props}><path d="M4 7h16"/><path d="M6 7V5a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v2"/><rect x="3" y="7" width="18" height="12" rx="2"/><path d="M3 11h18"/></svg>
);

export const AccountsIcon = (props) => (
  <svg {...base} {...props}><path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"/><path d="M4 20a8 8 0 0 1 16 0"/><path d="M8.5 9.5 6 12"/><path d="M15.5 9.5 18 12"/></svg>
);

export const DocumentsIcon = (props) => (
  <svg {...base} {...props}><path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5"/><path d="M9.5 13h5"/><path d="M9.5 17h5"/></svg>
);

export const ReportsIcon = (props) => (
  <svg {...base} {...props}><rect x="4" y="4" width="16" height="16" rx="2"/><path d="M8 15V9"/><path d="M12 15V7"/><path d="M16 15v-4"/></svg>
);

export const LockIcon = (props) => (
  <svg {...base} {...props}><rect x="6" y="11" width="12" height="9" rx="2"/><path d="M8 11V8a4 4 0 1 1 8 0v3"/></svg>
);

export const iconMap = {
  dashboard: DashboardIcon,
  bills: BillsIcon,
  ledger: LedgerIcon,
  receipts: ReceiptsIcon,
  maintenance: MaintenanceIcon,
  needs: NeedsWantsIcon,
  periods: SpendingPeriodsIcon,
  financing: FinancingIcon,
  accounts: AccountsIcon,
  documents: DocumentsIcon,
  reports: ReportsIcon,
};
