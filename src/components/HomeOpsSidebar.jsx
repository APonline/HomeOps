import { useEffect, useState } from "react";
import HomeOpsThemeToggle from "./HomeOpsThemeToggle";
import homeOpsLogo from "../assets/brand/homeops-logo-horizontal-master-transparent.png";

import {
    DashboardIcon,
    BillsIcon,
    LedgerIcon,
    ReceiptsIcon,
    MaintenanceIcon,
    NeedsWantsIcon,
    SpendingPeriodsIcon,
    FinancingIcon,
    AccountsIcon,
    DocumentsIcon,
    ReportsIcon,
    LockIcon,
} from "./HomeOpsNavIcons";

const primaryNavItems = [
    { key: "dashboard", label: "Dashboard", Icon: DashboardIcon },
    { key: "bills", label: "Bills", Icon: BillsIcon },
    { key: "ledger", label: "Ledger", Icon: LedgerIcon },
    { key: "receipts", label: "Receipts", Icon: ReceiptsIcon },
    { key: "maintenance", label: "Maintenance", Icon: MaintenanceIcon },
    { key: "wishlist", label: "Needs & Wants", Icon: NeedsWantsIcon },
    { key: "periods", label: "Spending Periods", Icon: SpendingPeriodsIcon },
];

const lockedNavItems = [
    { key: "financing", label: "Financing", Icon: FinancingIcon, badge: "V1" },
    { key: "accounts", label: "Accounts", Icon: AccountsIcon, badge: "V1" },
    { key: "documents", label: "Documents", Icon: DocumentsIcon, badge: "V1" },
    { key: "reports", label: "Reports", Icon: ReportsIcon, badge: "V2" },
];

function NavButton({ item, activePage, setActivePage, locked = false, onDone }) {
    const { Icon } = item;
    const isActive = activePage === item.key;

    return (
        <button
            type="button"
            className={`homeops-nav-item ${isActive ? "is-active" : ""} ${locked ? "is-locked" : ""}`}
            onClick={() => {
                if (locked) return;
                setActivePage(item.key);
                onDone?.();
            }}
            disabled={locked}
            title={locked ? `${item.label} is locked until ${item.badge}` : item.label}
        >
            <span className="homeops-nav-item__main">
                <span className="homeops-nav-item__icon">
                    <Icon />
                </span>
                <span className="homeops-nav-item__label">{item.label}</span>
            </span>

            {locked && (
                <span className="homeops-nav-item__meta">
                    <span className="homeops-nav-badge">{item.badge}</span>
                    <LockIcon className="homeops-nav-lock" />
                </span>
            )}
        </button>
    );
}

export default function HomeOpsSidebar({ activePage, setActivePage }) {
    const [mobileNavOpen, setMobileNavOpen] = useState(false);
    const closeMobileNav = () => setMobileNavOpen(false);

    useEffect(() => {
        document.body.classList.toggle("homeops-mobile-nav-open", mobileNavOpen);
        return () => document.body.classList.remove("homeops-mobile-nav-open");
    }, [mobileNavOpen]);

    useEffect(() => {
        if (!mobileNavOpen) return undefined;

        function handleKeyDown(event) {
            if (event.key === "Escape") closeMobileNav();
        }

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [mobileNavOpen]);

    return (
        <>
            <aside className="sidebar homeops-nav">
                <div className="homeops-nav__topbar">
                    <div className="homeops-nav__brand">
                        <img src={homeOpsLogo} alt="HomeOps" className="homeops-nav__logo" />
                    </div>

                    <div className="homeops-nav__actions">
                        <HomeOpsThemeToggle />

                        <button
                            type="button"
                            className="homeops-nav__menu-button"
                            onClick={() => setMobileNavOpen(true)}
                            aria-label="Open navigation menu"
                            aria-expanded={mobileNavOpen}
                        >
                            <span aria-hidden="true">☰</span>
                        </button>
                    </div>
                </div>

                <div className={`homeops-nav__drawer ${mobileNavOpen ? "is-open" : ""}`}>
                    <div className="homeops-nav__drawer-head">
                        <img src={homeOpsLogo} alt="HomeOps" className="homeops-nav__drawer-logo" />

                        <button
                            type="button"
                            className="homeops-nav__drawer-close"
                            onClick={closeMobileNav}
                            aria-label="Close navigation menu"
                        >
                            ×
                        </button>
                    </div>

                    <nav className="homeops-nav-list" aria-label="HomeOps navigation">
                        {primaryNavItems.map((item) => (
                            <NavButton
                                key={item.key}
                                item={item}
                                activePage={activePage}
                                setActivePage={setActivePage}
                                onDone={closeMobileNav}
                            />
                        ))}

                        <div className="homeops-nav-divider" />

                        {lockedNavItems.map((item) => (
                            <NavButton
                                key={item.key}
                                item={item}
                                activePage={activePage}
                                setActivePage={setActivePage}
                                locked
                            />
                        ))}
                    </nav>
                </div>
            </aside>

            {mobileNavOpen && (
                <button
                    type="button"
                    className="homeops-nav-backdrop"
                    onClick={closeMobileNav}
                    aria-label="Close navigation menu"
                />
            )}
        </>
    );
}
