import { useEffect, useState } from "react";
import AppShell from "./components/AppShell";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { HomeOpsProvider } from "./context/HomeOpsContext";
import WelcomeLoader from "./components/WelcomeLoader";
import Dashboard from "./pages/Dashboard";
import BillsPage from "./pages/BillsPage";
import LedgerPage from "./pages/LedgerPage";
import SpendingPeriodsPage from "./pages/SpendingPeriodsPage";
import MaintenancePage from "./pages/MaintenancePage";
import WishlistPage from "./pages/WishlistPage";
import AccountAccessPage from "./pages/AccountAccessPage";
import HomeProfilePage from "./pages/HomeProfilePage";
import LoginPage from "./pages/LoginPage";
import ReceiptsPage from "./pages/ReceiptsPage";
import FinancingPage from "./pages/FinancingPage";
import DocumentsPage from "./pages/DocumentsPage";
import ReportsPage from "./pages/ReportsPage";
import MonthClosePage from "./pages/MonthClosePage";

import "./styles/index.scss";

const HOMEOPS_PAGES = new Set([
    "dashboard", "home", "bills", "ledger", "receipts", "maintenance",
    "wishlist", "periods", "financing", "accounts", "documents", "reports", "closeout",
]);

function pageFromHash() {
    if (typeof window === "undefined") return "dashboard";
    const page = window.location.hash.replace(/^#\/?/, "").trim();
    return HOMEOPS_PAGES.has(page) ? page : "dashboard";
}

function HomeOpsApp() {
    const { loading, isAuthenticated } = useAuth();
    const [activePage, setActivePage] = useState(pageFromHash);
    const [refreshToken, setRefreshToken] = useState(0);
    const [showLoader, setShowLoader] = useState(true);
    const [loaderExiting, setLoaderExiting] = useState(false);

    useEffect(() => {
        const onHashChange = () => setActivePage(pageFromHash());
        window.addEventListener("hashchange", onHashChange);
        return () => window.removeEventListener("hashchange", onHashChange);
    }, []);

    useEffect(() => {
        const nextHash = `#/${activePage}`;
        if (window.location.hash !== nextHash) window.history.replaceState(null, "", nextHash);
    }, [activePage]);

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

    if (loading && !isAuthenticated) {
        return <WelcomeLoader exiting={false} />;
    }

    if (!isAuthenticated) {
        return <LoginPage />;
    }

    const pageProps = {
        refreshToken,
        refreshEverything,
        goToPage: setActivePage,
    };

    const pages = {
        dashboard: <Dashboard {...pageProps} />,
        home: <HomeProfilePage {...pageProps} />,
        bills: <BillsPage {...pageProps} />,
        ledger: <LedgerPage {...pageProps} />,
        receipts: <ReceiptsPage {...pageProps} />,
        maintenance: <MaintenancePage {...pageProps} />,
        wishlist: <WishlistPage {...pageProps} />,
        periods: <SpendingPeriodsPage {...pageProps} />,
        financing: <FinancingPage {...pageProps} />,
        accounts: <AccountAccessPage {...pageProps} />,
        documents: <DocumentsPage {...pageProps} />,
        reports: <ReportsPage {...pageProps} />,
        closeout: <MonthClosePage {...pageProps} />,
    };

    return (
        <HomeOpsProvider>
            <AppShell activePage={activePage} onPageChange={setActivePage} setActivePage={setActivePage}>
                {pages[activePage] || pages.dashboard}
            </AppShell>

            {showLoader && <WelcomeLoader exiting={loaderExiting} />}
        </HomeOpsProvider>
    );
}

export default function App() {
    return (
        <AuthProvider>
            <HomeOpsApp />
        </AuthProvider>
    );
}
