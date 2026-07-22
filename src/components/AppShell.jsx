import { useEffect, useRef, useState } from "react";
import HomeOpsSidebar from "./HomeOpsSidebar";
import V0ContextBar from "./V0ContextBar";
import HomeOpsDataLoader from "./HomeOpsDataLoader";
import { useHomeOps } from "../context/HomeOpsContext";
import PropertySetupWizard from "./PropertySetupWizard";

const pageLabels = {
    dashboard: "Overview",
    home: "Property",
    documents: "Documents",
    bills: "Bills",
    ledger: "Transactions",
    receipts: "Receipts",
    financing: "Financing",
    reports: "Reports",
    maintenance: "Maintenance",
    wishlist: "Plans",
    periods: "Spending periods",
    accounts: "Account",
};

export default function AppShell({ activePage, children, setActivePage }) {
    const { homeId, viewMode, selectedYear, selectedMonth, selectedDay, propertySetupOpen } = useHomeOps();
    const contentKey = `${activePage}-${homeId || "no-home"}-${viewMode}-${selectedYear}-${selectedMonth}-${selectedDay}`;
    const firstRender = useRef(true);
    const [transitioning, setTransitioning] = useState(false);

    useEffect(() => {
        if (firstRender.current) {
            firstRender.current = false;
            return undefined;
        }

        setTransitioning(true);
        const timer = window.setTimeout(() => setTransitioning(false), 650);

        return () => window.clearTimeout(timer);
    }, [contentKey]);

    return (
        <div className="app-shell platform-shell">
            <HomeOpsSidebar activePage={activePage} setActivePage={setActivePage} />

            <div className="app-main platform-main">
                <header className="platform-global-header">
                    <div className="platform-global-header__page">
                        <span>HomeOps workspace</span>
                        <strong>{pageLabels[activePage] || "Overview"}</strong>
                    </div>
                    <V0ContextBar onOpenHome={() => setActivePage("home")} />
                </header>

                <HomeOpsDataLoader active={transitioning} label="Updating workspace" />

                <main
                    className={`app-content-transition platform-content ${transitioning ? "is-loading-context" : ""}`}
                    key={contentKey}
                >
                    {children}
                </main>
            </div>

            <PropertySetupWizard active={propertySetupOpen} onDone={setActivePage} />
        </div>
    );
}
