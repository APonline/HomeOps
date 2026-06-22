import { useMemo, useState } from "react";
import Modal from "./Modal";
import { useHomeOps } from "../context/HomeOpsContext";
import { todayIso } from "../lib/homeopsApi";

const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
];

const shortMonthNames = monthNames.map((month) => month.slice(0, 3));

function formatIsoDate(date) {
    return date.toISOString().slice(0, 10);
}

function addDays(isoDate, amount) {
    const date = new Date(`${isoDate}T12:00:00`);
    date.setDate(date.getDate() + amount);
    return formatIsoDate(date);
}

function compactDayLabel(isoDate) {
    if (!isoDate) return "Today";

    const date = new Date(`${isoDate}T12:00:00`);
    if (Number.isNaN(date.getTime())) return isoDate;

    return date.toLocaleDateString("en-CA", {
        weekday: "short",
        month: "short",
        day: "numeric",
    });
}

function modeLabel(viewMode) {
    if (viewMode === "day") return "Day";
    if (viewMode === "year") return "Year";
    if (viewMode === "all-time") return "History";
    return "Month";
}


function ClockIcon(props) {
    return (
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
            <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="2" />
            <path d="M12 7v5l3.2 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

function HomeIcon(props) {
    return (
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
            <path d="M4 11.5 12 4l8 7.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M6.5 10.5V20h11v-9.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M10 20v-5h4v5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

export default function V0ContextBar({ onOpenHome }) {
    const [timeLensOpen, setTimeLensOpen] = useState(false);
    const {
        homes,
        selectedHome,
        selectedYear,
        selectedMonth,
        selectedDay,
        viewMode,
        loadingHomes,
        chooseHome,
        setSelectedYear,
        setSelectedMonth,
        setSelectedDay,
        setViewMode,
    } = useHomeOps();

    const contextLabel = useMemo(() => {
        if (viewMode === "day") return compactDayLabel(selectedDay);
        if (viewMode === "month") return `${monthNames[selectedMonth - 1] || "Month"} ${selectedYear}`;
        if (viewMode === "year") return `${selectedYear}`;
        return "All time";
    }, [selectedDay, selectedMonth, selectedYear, viewMode]);

    function goToday() {
        const today = todayIso();
        setSelectedDay(today);
        setViewMode("day");
    }

    function switchView(nextViewMode) {
        if (nextViewMode === "day" && !selectedDay) {
            setSelectedDay(todayIso());
        }

        setViewMode(nextViewMode);
    }

    function stepMonth(amount) {
        let nextMonth = Number(selectedMonth) + amount;
        let nextYear = Number(selectedYear);

        if (nextMonth < 1) {
            nextMonth = 12;
            nextYear -= 1;
        }

        if (nextMonth > 12) {
            nextMonth = 1;
            nextYear += 1;
        }

        setSelectedYear(nextYear);
        setSelectedMonth(nextMonth);
    }

    function stepPeriod(amount) {
        if (viewMode === "day") {
            setSelectedDay(addDays(selectedDay || todayIso(), amount));
            return;
        }

        if (viewMode === "year") {
            setSelectedYear(Number(selectedYear) + amount);
            return;
        }

        if (viewMode === "all-time") return;

        stepMonth(amount);
    }

    const previousLabel = viewMode === "day"
        ? compactDayLabel(addDays(selectedDay || todayIso(), -1))
        : viewMode === "year"
            ? String(Number(selectedYear) - 1)
            : viewMode === "all-time"
                ? ""
                : `${shortMonthNames[((selectedMonth + 10) % 12)]} ${selectedMonth === 1 ? Number(selectedYear) - 1 : selectedYear}`;

    const nextLabel = viewMode === "day"
        ? compactDayLabel(addDays(selectedDay || todayIso(), 1))
        : viewMode === "year"
            ? String(Number(selectedYear) + 1)
            : viewMode === "all-time"
                ? ""
                : `${shortMonthNames[(selectedMonth % 12)]} ${selectedMonth === 12 ? Number(selectedYear) + 1 : selectedYear}`;

    return (
        <>
            <section className="v0-context-strip" aria-label="HomeOps context">
                <button className="v0-context-strip__home" type="button" onClick={onOpenHome} title="Open Home Settings">
                    <strong>{selectedHome?.name || (loadingHomes ? "Loading home…" : "Create your first home")}</strong>
                </button>

                <div className="v0-context-strip__right">
                    <div className={`v0-context-period-controls ${viewMode === "all-time" ? "is-static" : ""}`}>
                        <button
                            className="v0-context-step-button"
                            type="button"
                            onClick={() => stepPeriod(-1)}
                            disabled={viewMode === "all-time"}
                            aria-label={`Previous ${modeLabel(viewMode).toLowerCase()}`}
                            title={previousLabel ? `Previous: ${previousLabel}` : "Previous period"}
                        >
                            ‹
                        </button>
                        <button className="v0-context-strip__period" type="button" onClick={() => setTimeLensOpen(true)}>
                            <span>{modeLabel(viewMode)}</span>
                            <strong>{contextLabel}</strong>
                        </button>
                        <button
                            className="v0-context-step-button"
                            type="button"
                            onClick={() => stepPeriod(1)}
                            disabled={viewMode === "all-time"}
                            aria-label={`Next ${modeLabel(viewMode).toLowerCase()}`}
                            title={nextLabel ? `Next: ${nextLabel}` : "Next period"}
                        >
                            ›
                        </button>
                    </div>
                    <button className="v0-clock-button" type="button" onClick={() => setTimeLensOpen(true)} aria-label="Open Time Lens" title="Open Time Lens">
                        <ClockIcon />
                    </button>
                    <button className="v0-home-icon-button" type="button" onClick={onOpenHome} aria-label="Open Home Settings" title="Open Home Settings">
                        <HomeIcon />
                    </button>
                </div>
            </section>

            <Modal
                active={timeLensOpen}
                onClose={() => setTimeLensOpen(false)}
                title="Time Lens"
                intro="Choose whether the app should show today, the current month, the year, or the full property history. Every module inherits this context."
                size="wide"
            >
                <div className="v0-time-lens-modal">
                    <div className="v0-view-pills" aria-label="Time lens view mode">
                        <button type="button" className={viewMode === "day" ? "active" : ""} onClick={goToday}>Today</button>
                        <button type="button" className={viewMode === "month" ? "active" : ""} onClick={() => switchView("month")}>Month</button>
                        <button type="button" className={viewMode === "year" ? "active" : ""} onClick={() => switchView("year")}>Year</button>
                        <button type="button" className={viewMode === "all-time" ? "active" : ""} onClick={() => switchView("all-time")}>All Time</button>
                    </div>

                    <div className={`v0-period-stepper ${viewMode === "all-time" ? "is-static" : ""}`}>
                        <button type="button" onClick={() => stepPeriod(-1)} disabled={viewMode === "all-time"} aria-label="Previous period">
                            <span>‹</span>
                            <small>{previousLabel}</small>
                        </button>
                        <div>
                            <span>{modeLabel(viewMode)}</span>
                            <strong>{contextLabel}</strong>
                        </div>
                        <button type="button" onClick={() => stepPeriod(1)} disabled={viewMode === "all-time"} aria-label="Next period">
                            <small>{nextLabel}</small>
                            <span>›</span>
                        </button>
                    </div>

                    <div className="v0-context-bar__jump">
                        {homes.length > 1 && (
                            <label>
                                <span>Home</span>
                                <select
                                    value={selectedHome?.id || ""}
                                    onChange={(event) => chooseHome(event.target.value)}
                                    disabled={loadingHomes}
                                >
                                    {homes.map((home) => (
                                        <option value={home.id} key={home.id}>{home.name}</option>
                                    ))}
                                </select>
                            </label>
                        )}

                        {viewMode === "month" && (
                            <label>
                                <span>Month</span>
                                <select value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)}>
                                    {monthNames.map((month, index) => (
                                        <option value={index + 1} key={month}>{month}</option>
                                    ))}
                                </select>
                            </label>
                        )}

                        {(viewMode === "month" || viewMode === "year") && (
                            <label className="v0-year-field">
                                <span>Year</span>
                                <input
                                    type="number"
                                    min="2000"
                                    max="2100"
                                    value={selectedYear}
                                    onChange={(event) => setSelectedYear(event.target.value)}
                                />
                            </label>
                        )}

                        {viewMode === "day" && (
                            <label>
                                <span>Jump to day</span>
                                <input type="date" value={selectedDay} onChange={(event) => setSelectedDay(event.target.value)} />
                            </label>
                        )}

                        <button className="v0-home-settings" type="button" onClick={onOpenHome}>
                            <HomeIcon />
                            Home Settings
                        </button>
                    </div>

                    <button className="primary-action" type="button" onClick={() => setTimeLensOpen(false)}>
                        Apply Context
                    </button>
                </div>
            </Modal>
        </>
    );
}
