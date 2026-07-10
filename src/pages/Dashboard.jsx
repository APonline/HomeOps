import { useCallback, useEffect, useMemo, useState } from "react";
import MetricCard from "../components/MetricCard";
import PeriodChart from "../components/PeriodChart";
import DashboardBillsList from "../components/DashboardBillsList";
import BudgetCompass from "../components/BudgetCompass";
import Modal from "../components/Modal";
import { useHomeOps } from "../context/HomeOpsContext";
import {
    createBill,
    createReceipt,
    createSpendingPeriod,
    getDashboard,
    money,
    nullableNumber,
    todayIso,
} from "../lib/homeopsApi";

const demoData = {
    monthLabel: "June 2026 Command Center",
    metrics: {
        expectedBills: 3482,
        paidThisMonth: 2755,
        stillDue: 727,
        markedSpending: 1243,
    },
    bills: [
        { id: 1, payee: "HOA / Condo Fees", due: "Jun 17", status: "Paid", amount: 727 },
        { id: 2, payee: "Mortgage Payment", due: "Jun 1", status: "Due", amount: 1985 },
        { id: 3, payee: "Home Insurance", due: "TBD", status: "Need amount", amount: null },
        { id: 4, payee: "Internet", due: "TBD", status: "Need amount", amount: null },
        { id: 5, payee: "Phone", due: "TBD", status: "Need amount", amount: null },
        { id: 6, payee: "Water Heater Rental", due: "TBD", status: "Need amount", amount: null },
    ],
    periods: [
        { id: 1, name: "Moving Chaos", dates: "Jun 5–Jun 10", amount: 1243, description: "Moving/setup purchases so June spike makes sense visually.", tone: "red" },
        { id: 2, name: "Paint & Setup Weekend", dates: "Jun 6–Jun 9", amount: null, description: "Painting, tools, Home Depot/RONA/IKEA.", tone: "tan" },
    ],
    maintenance: [
        { id: 1, name: "Find HVAC filter size", category: "Furnace / HVAC", priority: "High", amount: null },
        { id: 2, name: "Replace air filter", category: "Every 3 months", priority: "Normal", amount: 25 },
    ],
    chartDays: [
        { day: 1, amount: 0, marked: false }, { day: 2, amount: 0, marked: false },
        { day: 3, amount: 0, marked: false }, { day: 4, amount: 0, marked: false },
        { day: 5, amount: 560, marked: true }, { day: 6, amount: 690, marked: true },
        { day: 7, amount: 590, marked: true }, { day: 8, amount: 500, marked: true },
        { day: 9, amount: 470, marked: true }, { day: 10, amount: 410, marked: true },
        { day: 11, amount: 225, marked: false }, { day: 12, amount: 160, marked: false },
        { day: 13, amount: 0, marked: false }, { day: 14, amount: 0, marked: false },
        { day: 15, amount: 0, marked: false }, { day: 16, amount: 0, marked: false },
        { day: 17, amount: 900, marked: false }, { day: 18, amount: 190, marked: false },
    ],
    recentLedger: [],
    paidBillCount: 1,
    unpaidBillCount: 5,
    annual: { status: "Foundation", spend_total: 0, major_period_count: 2 },
    today: { spent_total: 0, due_bill_count: 0, maintenance_due_count: 1 },
    home: { name: "Toronto Townhouse", city_region: "Toronto, ON" },
};

const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
];

const defaultBillForm = { payee: "", amount: "", due_day: "", frequency: "monthly", notes: "" };
const defaultReceiptForm = { vendor: "", date: todayIso(), total: "", category: "Home Supplies", notes: "" };
const defaultPeriodForm = { title: "", period_type: "custom", start_date: "", end_date: "", notes: "" };

function formatDayTitle(isoDate) {
    if (!isoDate) return "Today";

    const date = new Date(`${isoDate}T12:00:00`);
    if (Number.isNaN(date.getTime())) return isoDate;

    return date.toLocaleDateString("en-CA", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
    });
}

function commandTitle(viewMode, selectedYear, selectedMonth, selectedDay) {
    if (viewMode === "day") return formatDayTitle(selectedDay);
    if (viewMode === "year") return `${selectedYear} Year View`;
    if (viewMode === "all-time") return "Ownership History";

    return `${monthNames[selectedMonth - 1] || "Month"} ${selectedYear}`;
}

function commandKicker(viewMode) {
    if (viewMode === "day") return "Daily Ops";
    if (viewMode === "year") return "Annual Command";
    if (viewMode === "all-time") return "All-Time Context";

    return "Monthly Command";
}

function commandDescription(viewMode) {
    if (viewMode === "day") return "Purchases by hour, bills due today, maintenance due and context for the selected day.";
    if (viewMode === "year") return "Annual ownership health, obligations, abnormal months and major context.";
    if (viewMode === "all-time") return "The long-term operating story of this property.";

    return "Payables, cleared bills, marked spending and context for the selected month.";
}

function hasUsefulLiveData(json) {
    if (!json) return false;

    return Number(json.expected_bills_total || 0) > 0 ||
        Number(json.paid_total || 0) > 0 ||
        Number(json.still_due_total || 0) > 0 ||
        Number(json.marked_spending_total || 0) > 0 ||
        (json.bills || []).length > 0 ||
        (json.recent_ledger || []).length > 0 ||
        (json.active_spending_periods || []).length > 0 ||
        (json.maintenance_due || []).length > 0;
}

function normalizeDashboardPayload(json) {
    return {
        monthLabel: `${json.month_label || "Selected Period"} Command Center`,
        metrics: {
            expectedBills: Number(json.expected_bills_total || 0),
            paidThisMonth: Number(json.paid_total || 0),
            stillDue: Number(json.still_due_total || 0),
            markedSpending: Number(json.marked_spending_total || 0),
        },
        bills: json.bills || [],
        periods: json.active_spending_periods || [],
        maintenance: json.maintenance_due || [],
        chartDays: (json.chart_days || []).filter((day) => day.day <= 31),
        paidBillCount: Number(json.paid_bill_count || 0),
        unpaidBillCount: Number(json.unpaid_bill_count || 0),
        recentLedger: json.recent_ledger || [],
        categoryTotals: json.category_totals || [],
        annual: json.annual || {},
        today: json.today || {},
        home: json.home || null,
    };
}

function blankDashboardData() {
    return {
        monthLabel: "Selected Period Command Center",
        metrics: {
            expectedBills: 0,
            paidThisMonth: 0,
            stillDue: 0,
            markedSpending: 0,
        },
        bills: [],
        periods: [],
        maintenance: [],
        chartDays: [],
        recentLedger: [],
        categoryTotals: [],
        paidBillCount: 0,
        unpaidBillCount: 0,
        annual: { status: "Live", spend_total: 0, major_period_count: 0 },
        today: { spent_total: 0, due_bill_count: 0, maintenance_due_count: 0 },
        home: null,
    };
}

function readEntryAmount(entry) {
    const amount = entry.amount ?? entry.total ?? entry.value ?? entry.line_total ?? entry.price ?? entry.debit ?? 0;
    return Math.abs(Number(amount || 0));
}

function readEntryDateTime(entry) {
    return entry.datetime ||
        entry.date_time ||
        entry.purchased_at ||
        entry.transaction_at ||
        entry.created_at ||
        entry.entry_date ||
        entry.date ||
        entry.transaction_date ||
        "";
}

function formatHourLabel(hour) {
    if (hour === 0) return "12a";
    if (hour < 12) return `${hour}a`;
    if (hour === 12) return "12p";
    return `${hour - 12}p`;
}

function buildHourlyActivity(recentLedger = [], selectedDay = todayIso()) {
    const bars = Array.from({ length: 24 }, (_, hour) => ({
        key: `hour-${hour}`,
        day: formatHourLabel(hour),
        label: formatHourLabel(hour),
        hour,
        amount: 0,
        itemCount: 0,
        marked: hour >= 18 && hour <= 22,
    }));

    recentLedger.forEach((entry) => {
        const rawDate = String(readEntryDateTime(entry) || "");
        if (!rawDate) return;

        const datePart = rawDate.slice(0, 10);
        if (datePart !== selectedDay) return;

        const parsed = new Date(rawDate.includes("T") ? rawDate : rawDate.replace(" ", "T"));
        const hour = Number.isNaN(parsed.getTime()) ? 12 : parsed.getHours();
        const amount = readEntryAmount(entry);

        bars[hour].amount += amount;
        bars[hour].itemCount += amount > 0 ? 1 : 0;
    });

    return bars;
}

function selectBillsForView(data, demo, viewMode, isDemoMode = false) {
    const source = data.bills.length ? data.bills : (isDemoMode ? demo.bills : []);

    if (viewMode !== "day") return source;

    return source.filter((bill) => {
        const due = String(bill.due || bill.due_date || "").toLowerCase();
        return due.includes("today") || due.match(/\b\d{1,2}\b/) || source.length <= 2;
    });
}

function resolveChartDate(day, selectedYear, selectedMonth) {
    const directDate = day?.date || day?.entry_date || day?.selected_day || day?.iso_date;
    if (directDate && /^\d{4}-\d{2}-\d{2}/.test(String(directDate))) {
        return String(directDate).slice(0, 10);
    }

    const rawDay = day?.date_day ?? day?.day ?? day?.label;
    const match = String(rawDay ?? "").match(/\d{1,2}/);
    const dayNumber = match ? Number(match[0]) : NaN;

    if (!Number.isFinite(dayNumber) || dayNumber < 1 || dayNumber > 31) {
        return "";
    }

    return `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-${String(dayNumber).padStart(2, "0")}`;
}

export default function Dashboard({ refreshToken, refreshEverything, goToPage }) {
    const { apiContext, selectedHome, viewMode, selectedYear, selectedMonth, selectedDay, setSelectedDay, setViewMode } = useHomeOps();
    const [activeModal, setActiveModal] = useState(null);
    const [data, setData] = useState(blankDashboardData);
    const [apiStatus, setApiStatus] = useState("loading");
    const [dashboardLoading, setDashboardLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState("");

    const [billForm, setBillForm] = useState(defaultBillForm);
    const [receiptForm, setReceiptForm] = useState(defaultReceiptForm);
    const [periodForm, setPeriodForm] = useState(defaultPeriodForm);

    const loadDashboard = useCallback(async () => {
        setDashboardLoading(true);
        setApiStatus("loading");

        try {
            const json = await getDashboard(apiContext);
            const normalized = normalizeDashboardPayload(json || {});

            setData(normalized);
            setApiStatus(hasUsefulLiveData(json) ? "live" : "empty");
        } catch {
            setData(demoData);
            setApiStatus("demo");
        } finally {
            setDashboardLoading(false);
        }
    }, [apiContext]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        loadDashboard();
    }, [loadDashboard, refreshToken]);

    async function submit(event, callback, payload, resetForm) {
        event.preventDefault();
        setSaving(true);
        setFormError("");

        try {
            await callback(payload, apiContext);
            resetForm();
            setActiveModal(null);
            refreshEverything?.();
            await loadDashboard();
        } catch (error) {
            setFormError(error.message || "Save failed.");
        } finally {
            setSaving(false);
        }
    }

    const title = commandTitle(viewMode, selectedYear, selectedMonth, selectedDay);
    const kicker = commandKicker(viewMode);
    const displayData = dashboardLoading ? blankDashboardData() : data;
    const dailyChart = useMemo(() => buildHourlyActivity(displayData.recentLedger, selectedDay), [displayData.recentLedger, selectedDay]);
    const isDemoMode = apiStatus === "demo";
    const chartData = viewMode === "day"
        ? dailyChart
        : (displayData.chartDays.length ? displayData.chartDays : (isDemoMode ? demoData.chartDays : []));
    const chartTitle = viewMode === "day" ? "Purchase Activity By Hour" : "Spending With Period Markups";
    const chartButton = viewMode === "day" ? "selected day" : "Marked periods";
    const chartLegend = viewMode === "day"
        ? [
            { className: "normal", label: "Purchase / ledger activity" },
            { className: "marked", label: "Evening window" },
        ]
        : undefined;
    const billsForView = selectBillsForView(displayData, demoData, viewMode, isDemoMode);

    function drillIntoDay(day) {
        if (viewMode === "day" || viewMode === "all-time") return;

        const isoDay = resolveChartDate(day, selectedYear, selectedMonth);
        if (!isoDay) return;

        setSelectedDay(isoDay);
        setViewMode("day");
    }

    return (
        <>
            <header className="topbar v0-command-header">
                <div>
                    <span className="v0-eyebrow">{kicker}</span>
                    <h1>{title}</h1>
                    <p>{commandDescription(viewMode)}</p>
                    <span className={`api-pill ${apiStatus}`}>
                        {apiStatus === "live" ? "Live API data" : apiStatus === "empty" ? "Live API empty" : apiStatus === "loading" ? "Loading context" : "Demo data fallback"}
                    </span>
                </div>


            </header>

            <section className={`v0-dashboard-body ${dashboardLoading ? "is-loading" : ""}`} aria-busy={dashboardLoading ? "true" : "false"}>
                <section className="v0-dashboard-hierarchy">
                    <article className="v0-hierarchy-card">
                        <span>Annual Health</span>
                        <strong>{displayData.annual?.status || "Foundation"}</strong>
                        <p>{selectedYear} · YTD spend {money(displayData.annual?.spend_total || 0)}</p>
                    </article>
                    <article className="v0-hierarchy-card">
                        <span>{viewMode === "day" ? "Selected Day" : "Monthly Detail"}</span>
                        <strong>{title}</strong>
                        <p>{kicker} · {viewMode === "month" ? `Month ${selectedMonth}` : viewMode}</p>
                    </article>
                    <article className="v0-hierarchy-card">
                        <span>Today Snapshot</span>
                        <strong>{selectedDay}</strong>
                        <p>{money(displayData.today?.spent_total || 0)} spent · {displayData.today?.maintenance_due_count || 0} maintenance due</p>
                    </article>
                    <article className="v0-hierarchy-card">
                        <span>Home</span>
                        <strong>{selectedHome?.name || displayData.home?.name || "Default Home"}</strong>
                        <p>{displayData.home?.city_region || selectedHome?.city_region || "Home context active"}</p>
                    </article>
                </section>

                <section className="metric-grid">
                    <MetricCard label="Expected Bills" value={money(displayData.metrics.expectedBills)} note={viewMode === "day" ? "Selected context" : "This month"} />
                    <MetricCard label="Paid This Month" value={money(displayData.metrics.paidThisMonth)} note={`${displayData.paidBillCount ?? 0} bills paid`} />
                    <MetricCard label="Still Due" value={money(displayData.metrics.stillDue)} note={`${displayData.unpaidBillCount ?? 0} unpaid`} />
                    <MetricCard label={viewMode === "day" ? "Spent Today" : "Marked Spending"} value={money(viewMode === "day" ? displayData.today?.spent_total || 0 : displayData.metrics.markedSpending)} note={viewMode === "day" ? "Day activity" : "Period-linked spending"} />
                </section>

                <BudgetCompass
                    data={displayData}
                    selectedYear={selectedYear}
                    selectedMonth={selectedMonth}
                    selectedDay={selectedDay}
                    viewMode={viewMode}
                    money={money}
                    goToPage={goToPage}
                    apiContext={apiContext}
                />


                <main className="dashboard-grid dashboard-grid--balanced">
                    <section className="panel chart-panel chart-panel--full">
                        <div className="panel-header">
                            <h2>{chartTitle}</h2>
                            <span>{chartButton}</span>
                        </div>

                        <PeriodChart
                            days={chartData}
                            variant={viewMode === "day" ? "hourly" : "month"}
                            ariaLabel={viewMode === "day" ? "Hourly purchase activity chart" : "Scrollable monthly spending chart"}
                            emptyText={viewMode === "day" ? "No purchases logged for this day yet." : "No spending entered yet."}
                            legend={chartLegend}
                            hint={viewMode === "day" ? "Hourly view prevents month data from pretending it is daily data" : "Click a day to drill into that day view."}
                            onBarClick={viewMode === "day" ? undefined : drillIntoDay}
                        />
                    </section>

                    <section className="panel bills-panel bills-panel--full">
                        <div className="panel-header">
                            <h2>{viewMode === "day" ? "Bills In This Context" : "This Month’s Bills"}</h2>
                            <button className="ghost-action" onClick={() => goToPage?.("bills")}>
                                {billsForView.length} tracked
                            </button>
                        </div>

                        <DashboardBillsList
                            bills={billsForView}
                            money={money}
                            onOpenBills={() => goToPage?.("bills")}
                        />
                    </section>

                    <section className="panel periods-panel">
                        <div className="panel-header">
                            <h2>{viewMode === "day" ? "Context Active Today" : "Active Periods"}</h2>
                            <button className="ghost-action" onClick={() => goToPage?.("periods")}>
                                visual filters
                            </button>
                        </div>

                        <div className="period-list">
                            {(displayData.periods.length ? displayData.periods : (isDemoMode ? demoData.periods : [])).map((period) => (
                                <article className={`period-card ${period.tone || "red"}`} key={period.id}>
                                    <strong>{period.name || period.title}</strong>
                                    <p>
                                        {period.dates}
                                        {period.amount ? ` · ${money(period.amount)} linked` : ""}
                                    </p>
                                    {period.description && <small>{period.description}</small>}
                                </article>
                            ))}
                        </div>
                    </section>

                    <section className="panel maintenance-panel">
                        <div className="panel-header">
                            <h2>{viewMode === "day" ? "Maintenance Today" : "Maintenance Coming Up"}</h2>
                            <button className="ghost-action" onClick={() => goToPage?.("maintenance")}>
                                {viewMode === "day" ? "selected day" : "next 30 days"}
                            </button>
                        </div>

                        <div className="maintenance-list">
                            {(displayData.maintenance.length ? displayData.maintenance : (isDemoMode ? demoData.maintenance : [])).map((item) => (
                                <article className="maintenance-item" key={item.id}>
                                    <div>
                                        <strong>{item.name}</strong>
                                        <p>{item.category}</p>
                                    </div>

                                    <div className="maintenance-side">
                                        {item.amount ? <strong>{money(item.amount)}</strong> : null}
                                        <span
                                            className={
                                                String(item.priority).toLowerCase() === "high" ||
                                                String(item.priority).toLowerCase() === "urgent"
                                                    ? "priority high"
                                                    : "priority"
                                            }
                                        >
                                            {item.priority}
                                        </span>
                                    </div>
                                </article>
                            ))}
                        </div>
                    </section>
                </main>
            </section>

            <Modal active={activeModal === "bill"} onClose={() => setActiveModal(null)} title="Add Bill">
                <form
                    className="form-grid"
                    onSubmit={(event) =>
                        submit(
                            event,
                            createBill,
                            {
                                payee: billForm.payee,
                                amount: nullableNumber(billForm.amount),
                                due_day: nullableNumber(billForm.due_day),
                                frequency: billForm.frequency,
                                notes: billForm.notes || null,
                            },
                            () => setBillForm(defaultBillForm)
                        )
                    }
                >
                    {formError && <div className="form-error">{formError}</div>}

                    <label className="span-6"><span>Payee</span><input value={billForm.payee} onChange={(e) => setBillForm({ ...billForm, payee: e.target.value })} placeholder="HOA / Condo Fees" required /></label>
                    <label className="span-3"><span>Amount</span><input value={billForm.amount} onChange={(e) => setBillForm({ ...billForm, amount: e.target.value })} type="number" placeholder="727" /></label>
                    <label className="span-3"><span>Due Day</span><input value={billForm.due_day} onChange={(e) => setBillForm({ ...billForm, due_day: e.target.value })} type="number" min="1" max="31" placeholder="1" /></label>
                    <label className="span-12"><span>Frequency</span><select value={billForm.frequency} onChange={(e) => setBillForm({ ...billForm, frequency: e.target.value })}><option value="monthly">Monthly</option><option value="quarterly">Quarterly</option><option value="annual">Annual</option><option value="once">One-time</option></select></label>
                    <label className="span-12"><span>Notes</span><textarea value={billForm.notes} onChange={(e) => setBillForm({ ...billForm, notes: e.target.value })} /></label>
                    <button className="primary-action span-12" disabled={saving}>{saving ? "Saving..." : "Save Bill"}</button>
                </form>
            </Modal>

            <Modal active={activeModal === "receipt"} onClose={() => setActiveModal(null)} title="Add Receipt">
                <form
                    className="form-grid"
                    onSubmit={(event) =>
                        submit(
                            event,
                            createReceipt,
                            {
                                vendor: receiptForm.vendor,
                                date: receiptForm.date,
                                total: nullableNumber(receiptForm.total),
                                category: receiptForm.category || "Uncategorized Spending",
                                notes: receiptForm.notes || null,
                            },
                            () => setReceiptForm(defaultReceiptForm)
                        )
                    }
                >
                    {formError && <div className="form-error">{formError}</div>}

                    <label className="span-6"><span>Vendor</span><input value={receiptForm.vendor} onChange={(e) => setReceiptForm({ ...receiptForm, vendor: e.target.value })} placeholder="Home Depot" required /></label>
                    <label className="span-3"><span>Date</span><input value={receiptForm.date} onChange={(e) => setReceiptForm({ ...receiptForm, date: e.target.value })} type="date" required /></label>
                    <label className="span-3"><span>Total</span><input value={receiptForm.total} onChange={(e) => setReceiptForm({ ...receiptForm, total: e.target.value })} type="number" step="0.01" placeholder="87.42" required /></label>
                    <label className="span-12"><span>Category</span><input value={receiptForm.category} onChange={(e) => setReceiptForm({ ...receiptForm, category: e.target.value })} placeholder="Home Supplies" /></label>
                    <label className="span-12"><span>Notes</span><textarea value={receiptForm.notes} onChange={(e) => setReceiptForm({ ...receiptForm, notes: e.target.value })} /></label>
                    <button className="primary-action span-12" disabled={saving}>{saving ? "Saving..." : "Save Receipt"}</button>
                </form>
            </Modal>

            <Modal active={activeModal === "period"} onClose={() => setActiveModal(null)} title="Mark Spending Period">
                <form
                    className="form-grid"
                    onSubmit={(event) =>
                        submit(
                            event,
                            createSpendingPeriod,
                            {
                                title: periodForm.title,
                                period_type: periodForm.period_type,
                                start_date: periodForm.start_date,
                                end_date: periodForm.end_date,
                                notes: periodForm.notes || null,
                            },
                            () => setPeriodForm(defaultPeriodForm)
                        )
                    }
                >
                    {formError && <div className="form-error">{formError}</div>}

                    <label className="span-6"><span>Name</span><input value={periodForm.title} onChange={(e) => setPeriodForm({ ...periodForm, title: e.target.value })} placeholder="Moving Chaos" required /></label>
                    <label className="span-6"><span>Type</span><select value={periodForm.period_type} onChange={(e) => setPeriodForm({ ...periodForm, period_type: e.target.value })}><option value="move">Move</option><option value="renovation">Renovation</option><option value="repair">Repair</option><option value="project">Project</option><option value="custom">Custom</option></select></label>
                    <label className="span-6"><span>Start</span><input value={periodForm.start_date} onChange={(e) => setPeriodForm({ ...periodForm, start_date: e.target.value })} type="date" required /></label>
                    <label className="span-6"><span>End</span><input value={periodForm.end_date} onChange={(e) => setPeriodForm({ ...periodForm, end_date: e.target.value })} type="date" required /></label>
                    <label className="span-12"><span>Notes</span><textarea value={periodForm.notes} onChange={(e) => setPeriodForm({ ...periodForm, notes: e.target.value })} placeholder="Moving, setup, paint, tools, IKEA, RONA, Home Depot..." /></label>
                    <button className="primary-action span-12" disabled={saving}>{saving ? "Saving..." : "Save Period"}</button>
                </form>
            </Modal>
        </>
    );
}
