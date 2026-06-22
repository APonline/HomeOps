/* eslint-disable react-hooks/preserve-manual-memoization, react-hooks/set-state-in-effect, react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getHomes, monthFromParts, todayIso } from "../lib/homeopsApi";

const STORAGE_KEY = "homeops.v0.context";

const defaultContext = {
    homeId: null,
    selectedHome: null,
    homes: [],
    selectedYear: 2026,
    selectedMonth: 6,
    selectedDay: "2026-06-21",
    viewMode: "month",
    loadingHomes: true,
    homesError: "",
};

const HomeOpsContext = createContext(null);

function readStoredContext() {
    try {
        return JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "{}") || {};
    } catch {
        return {};
    }
}

function writeStoredContext(value) {
    try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    } catch {
        // localStorage can fail in private / locked-down contexts. App state still works.
    }
}

export function HomeOpsProvider({ children }) {
    const stored = typeof window !== "undefined" ? readStoredContext() : {};
    const initialDay = stored.selectedDay || todayIso();

    const [homes, setHomes] = useState([]);
    const [selectedHome, setSelectedHome] = useState(null);
    const [selectedYear, setSelectedYear] = useState(Number(stored.selectedYear || initialDay.slice(0, 4) || 2026));
    const [selectedMonth, setSelectedMonth] = useState(Number(stored.selectedMonth || initialDay.slice(5, 7) || 6));
    const [selectedDay, setSelectedDay] = useState(stored.selectedDay || initialDay);
    const [viewMode, setViewMode] = useState(stored.viewMode || "month");
    const [loadingHomes, setLoadingHomes] = useState(true);
    const [homesError, setHomesError] = useState("");

    const homeId = selectedHome?.id || stored.homeId || null;

    const reloadHomes = useCallback(async () => {
        setLoadingHomes(true);
        setHomesError("");

        try {
            const json = await getHomes({
                homeId,
                selectedYear,
                selectedMonth,
                selectedDay,
                viewMode,
            });

            const loadedHomes = json.homes || [];
            const selected = json.selected_home?.home || loadedHomes.find((home) => home.id === homeId) || loadedHomes[0] || null;

            setHomes(loadedHomes);
            setSelectedHome(selected);
        } catch (error) {
            setHomesError(error.message || "Home Identity is not available yet.");
        } finally {
            setLoadingHomes(false);
        }
    }, [homeId, selectedDay, selectedMonth, selectedYear, viewMode]);

    useEffect(() => {
        reloadHomes();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        writeStoredContext({
            homeId: selectedHome?.id || homeId,
            selectedYear,
            selectedMonth,
            selectedDay,
            viewMode,
        });
    }, [homeId, selectedDay, selectedHome?.id, selectedMonth, selectedYear, viewMode]);

    const chooseHome = useCallback((nextHomeId) => {
        const nextHome = homes.find((home) => String(home.id) === String(nextHomeId)) || null;
        setSelectedHome(nextHome);
    }, [homes]);

    const updateSelectedMonth = useCallback((nextMonth) => {
        const month = Math.min(Math.max(Number(nextMonth), 1), 12);
        const day = String(selectedDay || `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-01`).slice(8, 10) || "01";
        const nextDay = `${selectedYear}-${String(month).padStart(2, "0")}-${day}`;

        setSelectedMonth(month);
        setSelectedDay(nextDay);
    }, [selectedDay, selectedMonth, selectedYear]);

    const updateSelectedYear = useCallback((nextYear) => {
        const year = Number(nextYear || selectedYear);
        const nextDay = `${year}-${String(selectedMonth).padStart(2, "0")}-${String(selectedDay).slice(8, 10) || "01"}`;

        setSelectedYear(year);
        setSelectedDay(nextDay);
    }, [selectedDay, selectedMonth, selectedYear]);

    const updateSelectedDay = useCallback((nextDay) => {
        if (!nextDay) return;

        setSelectedDay(nextDay);
        setSelectedYear(Number(nextDay.slice(0, 4)));
        setSelectedMonth(Number(nextDay.slice(5, 7)));
    }, []);

    const apiContext = useMemo(() => ({
        homeId: selectedHome?.id || homeId,
        selectedHome,
        selectedYear,
        selectedMonth,
        selectedDay,
        viewMode,
        monthStart: monthFromParts(selectedYear, selectedMonth),
    }), [homeId, selectedDay, selectedHome, selectedMonth, selectedYear, viewMode]);

    const value = useMemo(() => ({
        ...defaultContext,
        homes,
        selectedHome,
        homeId: selectedHome?.id || homeId,
        selectedYear,
        selectedMonth,
        selectedDay,
        viewMode,
        loadingHomes,
        homesError,
        apiContext,
        reloadHomes,
        chooseHome,
        setViewMode,
        setSelectedYear: updateSelectedYear,
        setSelectedMonth: updateSelectedMonth,
        setSelectedDay: updateSelectedDay,
    }), [apiContext, chooseHome, homeId, homes, homesError, loadingHomes, reloadHomes, selectedDay, selectedHome, selectedMonth, selectedYear, updateSelectedDay, updateSelectedMonth, updateSelectedYear, viewMode]);

    return (
        <HomeOpsContext.Provider value={value}>
            {children}
        </HomeOpsContext.Provider>
    );
}

export function useHomeOps() {
    const context = useContext(HomeOpsContext);

    if (!context) {
        throw new Error("useHomeOps must be used inside HomeOpsProvider.");
    }

    return context;
}
