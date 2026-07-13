import { useEffect, useRef, useState } from "react";
import HomeOpsSidebar from "./HomeOpsSidebar";
import V0ContextBar from "./V0ContextBar";
import HomeOpsDataLoader from "./HomeOpsDataLoader";
import { useHomeOps } from "../context/HomeOpsContext";
import PropertySetupWizard from "./PropertySetupWizard";

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
        const timer = window.setTimeout(() => setTransitioning(false), 950);

        return () => window.clearTimeout(timer);
    }, [contentKey]);

    return (
        <div className="app-shell">
            <HomeOpsSidebar activePage={activePage} setActivePage={setActivePage} />
            <div className="app-main">
                <V0ContextBar onOpenHome={() => setActivePage("home")} />
                <HomeOpsDataLoader active={transitioning} label="Switching context" />
                <main className={`app-content-transition ${transitioning ? "is-loading-context" : ""}`} key={contentKey}>
                    {children}
                </main>
            </div>
            <PropertySetupWizard active={propertySetupOpen} onDone={setActivePage} />
        </div>
    );
}
