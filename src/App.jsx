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

import "./styles/index.scss";

function HomeOpsApp() {
    const { loading, isAuthenticated } = useAuth();
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
