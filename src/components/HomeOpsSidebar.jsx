import { useEffect, useState } from "react";
import HomeOpsThemeToggle from "./HomeOpsThemeToggle";
import { useAuth } from "../context/AuthContext";
import homeOpsLogo from "../assets/brand/homeops-logo-horizontal-master-transparent.png";
import homeOpsLogoLime from "../assets/brand/homeops-logo-horizontal-lime-transparent.png";

import {
    DashboardIcon,
    PropertyIcon,
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
} from "./HomeOpsNavIcons";

const navGroups = [
    {
        label: "Home",
        items: [
            { key: "dashboard", label: "Dashboard", Icon: DashboardIcon },
            { key: "home", label: "Property Profile", Icon: PropertyIcon },
            { key: "documents", label: "Documents", Icon: DocumentsIcon },
        ],
    },
    {
        label: "Money",
        items: [
            { key: "bills", label: "Bills", Icon: BillsIcon },
            { key: "ledger", label: "Ledger", Icon: LedgerIcon },
            { key: "receipts", label: "Receipts", Icon: ReceiptsIcon },
            { key: "financing", label: "Financing", Icon: FinancingIcon },
            { key: "reports", label: "Reports", Icon: ReportsIcon },
        ],
    },
    {
        label: "Planning",
        items: [
            { key: "maintenance", label: "Maintenance", Icon: MaintenanceIcon },
            { key: "wishlist", label: "Needs & Wants", Icon: NeedsWantsIcon },
            { key: "periods", label: "Spending Periods", Icon: SpendingPeriodsIcon },
        ],
    },
    {
        label: "Account",
        items: [
            { key: "accounts", label: "Account & Access", Icon: AccountsIcon },
        ],
    },
];

function NavButton({ item, activePage, setActivePage, onDone }) {
    const { Icon } = item;
    const isActive = activePage === item.key;

    return (
        <button
            type="button"
            className={`homeops-nav-item ${isActive ? "is-active" : ""}`}
            onClick={() => {
                setActivePage(item.key);
                onDone?.();
            }}
            title={item.label}
        >
            <span className="homeops-nav-item__main">
                <span className="homeops-nav-item__icon">
                    <Icon />
                </span>
                <span className="homeops-nav-item__label">{item.label}</span>
            </span>
        </button>
    );
}

export default function HomeOpsSidebar({ activePage, setActivePage }) {
    const { user, logout } = useAuth();
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
                        <img src={homeOpsLogo} alt="HomeOps" className="homeops-nav__logo homeops-nav__logo--default" />
                        <img src={homeOpsLogoLime} alt="HomeOps" className="homeops-nav__logo homeops-nav__logo--light" />
                    </div>

                    <div className="homeops-nav__actions">
                        <HomeOpsThemeToggle />

                        <button
                            type="button"
                            className="homeops-nav__account-button"
                            onClick={() => setActivePage("accounts")}
                            title={user?.email || "Account"}
                        >
                            {user?.name?.slice(0, 1) || "A"}
                        </button>

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

                {mobileNavOpen && (
                    <button
                        type="button"
                        className="homeops-nav-backdrop"
                        onClick={closeMobileNav}
                        aria-label="Close navigation menu"
                    />
                )}

                <div className={`homeops-nav__drawer ${mobileNavOpen ? "is-open" : ""}`}>
                    <div className="homeops-nav__drawer-head">
                        <img src={homeOpsLogo} alt="HomeOps" className="homeops-nav__drawer-logo homeops-nav__logo--default" />
                        <img src={homeOpsLogoLime} alt="HomeOps" className="homeops-nav__drawer-logo homeops-nav__logo--light" />

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
                        {navGroups.map((group) => (
                            <section className="homeops-nav-group" key={group.label} aria-label={group.label}>
                                <h2 className="homeops-nav-group__label">{group.label}</h2>
                                <div className="homeops-nav-group__items">
                                    {group.items.map((item) => (
                                        <NavButton
                                            key={item.key}
                                            item={item}
                                            activePage={activePage}
                                            setActivePage={setActivePage}
                                            onDone={closeMobileNav}
                                        />
                                    ))}
                                </div>
                            </section>
                        ))}
                    </nav>

                    <div className="homeops-nav__session">
                        <span>{user?.name || "Signed in"}</span>
                        <button type="button" onClick={logout}>Logout</button>
                    </div>
                </div>
            </aside>
        </>
    );
}
