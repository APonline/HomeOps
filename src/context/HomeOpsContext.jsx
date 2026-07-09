/* eslint-disable react-hooks/set-state-in-effect, react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { HOMEOPS_DEFAULT_DAY, getHomes, monthFromParts, todayIso } from "../lib/homeopsApi";

const STORAGE_KEY = "homeops.v0.context";
const DEMO_CONTEXT_RESET_KEY = "homeops.v0.context.demoDateResetAt";

const defaultContext = {
    homeId: null,
    selectedHome: null,
    homes: [],
    selectedYear: Number(HOMEOPS_DEFAULT_DAY.slice(0, 4)),
    selectedMonth: Number(HOMEOPS_DEFAULT_DAY.slice(5, 7)),
    selectedDay: HOMEOPS_DEFAULT_DAY,
    viewMode: "month",
    loadingHomes: true,
    homesError: "",
};

const HomeOpsContext = createContext(null);

function readStoredContext() {
    try {
        const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "{}") || {};
        const hasStaleDemoDate = /^2026-06-\d{2}$/.test(String(stored.selectedDay || ""));
        const alreadyReset = window.localStorage.getItem(DEMO_CONTEXT_RESET_KEY);

        if (hasStaleDemoDate && !alreadyReset) {
            const today = todayIso();
            const nextStored = {
                ...stored,
                selectedYear: Number(today.slice(0, 4)),
                selectedMonth: Number(today.slice(5, 7)),
                selectedDay: today,
            };

            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextStored));
            window.localStorage.setItem(DEMO_CONTEXT_RESET_KEY, today);

            return nextStored;
        }

        return stored;
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
    const initialYear = Number(stored.selectedYear || initialDay.slice(0, 4));
    const initialMonth = Number(stored.selectedMonth || initialDay.slice(5, 7));

    const [homes, setHomes] = useState([]);
    const [selectedHome, setSelectedHome] = useState(null);
    const [requestedHomeId, setRequestedHomeId] = useState(stored.homeId || null);
    const [selectedYear, setSelectedYear] = useState(initialYear);
    const [selectedMonth, setSelectedMonth] = useState(initialMonth);
    const [selectedDay, setSelectedDay] = useState(stored.selectedDay || initialDay);
    const [viewMode, setViewMode] = useState(stored.viewMode || "month");
    const [loadingHomes, setLoadingHomes] = useState(true);
    const [homesError, setHomesError] = useState("");

    const homeId = selectedHome?.id || null;

    const reloadHomes = useCallback(async (preferredHomeId = null) => {
        setLoadingHomes(true);
        setHomesError("");

        const nextRequestedHomeId = preferredHomeId || selectedHome?.id || requestedHomeId || null;

        try {
            const json = await getHomes({
                homeId: nextRequestedHomeId,
                selectedYear,
                selectedMonth,
                selectedDay,
                viewMode,
            });

            const loadedHomes = json.homes || [];
            const selected = json.selected_home?.home
                || loadedHomes.find((home) => String(home.id) === String(nextRequestedHomeId))
                || loadedHomes[0]
                || null;

            setHomes(loadedHomes);
            setSelectedHome(selected);
            setRequestedHomeId(selected?.id || null);
        } catch (error) {
            setHomes([]);
            setSelectedHome(null);
            setRequestedHomeId(null);
            setHomesError(error.message || "Home Identity is not available yet.");
        } finally {
            setLoadingHomes(false);
        }
    }, [requestedHomeId, selectedDay, selectedHome?.id, selectedMonth, selectedYear, viewMode]);

    useEffect(() => {
        reloadHomes();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        writeStoredContext({
            homeId: selectedHome?.id || null,
            selectedYear,
            selectedMonth,
            selectedDay,
            viewMode,
        });
    }, [selectedDay, selectedHome?.id, selectedMonth, selectedYear, viewMode]);

    const chooseHome = useCallback((nextHomeId) => {
        const nextHome = homes.find((home) => String(home.id) === String(nextHomeId)) || null;
        setSelectedHome(nextHome);
        setRequestedHomeId(nextHome?.id || null);
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
        homeId,
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
        homeId,
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
