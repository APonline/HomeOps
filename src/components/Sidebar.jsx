import homeOpsLogo from "../assets/brand/homeops-logo-horizontal-master-transparent.png";
import HomeOpsThemeToggle from "./HomeOpsThemeToggle";

const navItems = [
    { key: "dashboard", label: "Dashboard", enabled: true },
    { key: "bills", label: "Bills", enabled: true },
    { key: "ledger", label: "Ledger", enabled: true },
    { key: "receipts", label: "Receipts", enabled: true },
    { key: "maintenance", label: "Maintenance", enabled: true },
    { key: "wishlist", label: "Needs & Wants", enabled: true },
    { key: "periods", label: "Spending Periods", enabled: true },

    { key: "financing", label: "Financing", enabled: false, badge: "V1" },
    { key: "accounts", label: "Accounts", enabled: false, badge: "V1" },
    { key: "documents", label: "Documents", enabled: false, badge: "V1" },
    { key: "reports", label: "Reports", enabled: false, badge: "V2" },
];

export default function Sidebar({ activePage, onPageChange }) {
    return (
        <aside className="sidebar">
            <div className="brand">
                <img src={homeOpsLogo} alt="HomeOps" className="brand__logo" />
                {/* <p>Owner mode: enabled.</p> */}
            </div>

            <nav className="side-nav" aria-label="HomeOps sections">
                {navItems.map((item) => {
                    const className = [
                        activePage === item.key ? "active" : "",
                        !item.enabled ? "locked" : "",
                    ].filter(Boolean).join(" ");

                    return (
                        <button
                            key={item.key}
                            className={className}
                            type="button"
                            disabled={!item.enabled}
                            aria-disabled={!item.enabled}
                            title={!item.enabled ? `${item.label} is locked until ${item.badge}` : item.label}
                            onClick={() => {
                                if (!item.enabled) return;
                                onPageChange(item.key);
                            }}
                        >
                            <span>{item.label}</span>

                            {!item.enabled && (
                                <small className="nav-lock">
                                    {item.badge}
                                </small>
                            )}
                        </button>
                    );
                })}
            </nav>

            <div className="sidebar-theme-control">
                <HomeOpsThemeToggle />
            </div>
        </aside>
    );
}
