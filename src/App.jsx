import { useEffect, useState } from "react";
import AppShell from "./components/AppShell";
import WelcomeLoader from "./components/WelcomeLoader";
import Dashboard from "./pages/Dashboard";
import BillsPage from "./pages/BillsPage";
import LedgerPage from "./pages/LedgerPage";
import SpendingPeriodsPage from "./pages/SpendingPeriodsPage";
import MaintenancePage from "./pages/MaintenancePage";
import WishlistPage from "./pages/WishlistPage";
import ComingSoonPage from "./pages/ComingSoonPage";

import "./styles/index.scss";

export default function App() {
    const [activePage, setActivePage] = useState("dashboard");
    const [refreshToken, setRefreshToken] = useState(0);
    const [showLoader, setShowLoader] = useState(true);
    const [loaderExiting, setLoaderExiting] = useState(false);

    useEffect(() => {
        const exitTimer = window.setTimeout(() => {
            setLoaderExiting(true);
        }, 4500);

        const removeTimer = window.setTimeout(() => {
            setShowLoader(false);
        }, 5000);

        return () => {
            window.clearTimeout(exitTimer);
            window.clearTimeout(removeTimer);
        };
    }, []);

    function refreshEverything() {
        setRefreshToken((value) => value + 1);
    }

    const pageProps = {
        refreshToken,
        refreshEverything,
        goToPage: setActivePage,
    };

    const pages = {
        dashboard: <Dashboard {...pageProps} />,
        bills: <BillsPage {...pageProps} />,
        ledger: <LedgerPage {...pageProps} />,
        receipts: <LedgerPage {...pageProps} receiptMode />,
        maintenance: <MaintenancePage {...pageProps} />,
        wishlist: <WishlistPage {...pageProps} />,
        periods: <SpendingPeriodsPage {...pageProps} />,
        financing: (
            <ComingSoonPage
                title="Financing"
                note="Mortgage, LOC, credit cards, payoff experiments. This is V1/V2 so MVP stays clean."
            />
        ),
        accounts: (
            <ComingSoonPage
                title="Accounts"
                note="Login URLs, account numbers, password-vault references. No raw password storage."
            />
        ),
        documents: (
            <ComingSoonPage
                title="Documents"
                note="Mortgage docs, condo rules, warranties, manuals, proof of residency."
            />
        ),
        reports: (
            <ComingSoonPage
                title="Reports"
                note="Historical spend, month-over-month, fixed vs chaos, category breakdowns."
            />
        ),
    };

    return (
        <>
            <AppShell activePage={activePage} onPageChange={setActivePage} setActivePage={setActivePage}>
                {pages[activePage] || pages.dashboard}
            </AppShell>

            {showLoader && <WelcomeLoader exiting={loaderExiting} />}
        </>
    );
}
