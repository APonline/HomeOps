import { useCallback, useEffect, useState } from "react";
import MetricCard from "../components/MetricCard";
import PeriodChart from "../components/PeriodChart";
import DashboardBillsList from "../components/DashboardBillsList";
import Modal from "../components/Modal";
import {
    HOMEOPS_MONTH,
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
    paidBillCount: 1,
    unpaidBillCount: 5,
};

const defaultBillForm = { payee: "", amount: "", due_day: "", frequency: "monthly", notes: "" };
const defaultReceiptForm = { vendor: "", date: todayIso(), total: "", category: "Home Supplies", notes: "" };
const defaultPeriodForm = { title: "", period_type: "custom", start_date: "", end_date: "", notes: "" };

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
        monthLabel: `${json.month_label || "June 2026"} Command Center`,
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
    };
}

export default function Dashboard({ refreshToken, refreshEverything, goToPage }) {
    const [activeModal, setActiveModal] = useState(null);
    const [data, setData] = useState(demoData);
    const [apiStatus, setApiStatus] = useState("demo");
    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState("");

    const [billForm, setBillForm] = useState(defaultBillForm);
    const [receiptForm, setReceiptForm] = useState(defaultReceiptForm);
    const [periodForm, setPeriodForm] = useState(defaultPeriodForm);

    const loadDashboard = useCallback(async () => {
        try {
            const json = await getDashboard(HOMEOPS_MONTH);

            if (!hasUsefulLiveData(json)) {
                setApiStatus("demo");
                return;
            }

            setData(normalizeDashboardPayload(json));
            setApiStatus("live");
        } catch {
            setApiStatus("demo");
        }
    }, []);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        loadDashboard();
    }, [loadDashboard, refreshToken]);

    async function submit(event, callback, payload, resetForm) {
        event.preventDefault();
        setSaving(true);
        setFormError("");

        try {
            await callback(payload);
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

    return (
        <>
            <header className="topbar">
                <div>
                    <h1>{data.monthLabel}</h1>
                    <p>What needs paying, what got paid, and why this month got weird.</p>
                    <span className={`api-pill ${apiStatus}`}>
                        {apiStatus === "live" ? "Live API data" : "Demo data fallback"}
                    </span>
                </div>

                <div className="top-actions">
                    <button onClick={() => { setFormError(""); setActiveModal("period"); }}>Mark Period</button>
                    <button onClick={() => { setFormError(""); setActiveModal("bill"); }}>Add Bill</button>
                    <button className="cream" onClick={() => { setFormError(""); setActiveModal("receipt"); }}>+ Receipt</button>
                </div>
            </header>

            <section className="metric-grid">
                <MetricCard label="Expected Bills" value={money(data.metrics.expectedBills)} note="This month" />
                <MetricCard label="Paid This Month" value={money(data.metrics.paidThisMonth)} note={`${data.paidBillCount ?? 0} bills paid`} />
                <MetricCard label="Still Due" value={money(data.metrics.stillDue)} note={`${data.unpaidBillCount ?? 0} unpaid`} />
                <MetricCard label="Marked Spending" value={money(data.metrics.markedSpending)} note="Period-linked spending" />
            </section>

            <main className="dashboard-grid dashboard-grid--balanced">
                <section className="panel chart-panel chart-panel--full">
                    <div className="panel-header">
                        <h2>Spending With Period Markups</h2>
                        <span>Marked periods</span>
                    </div>

                    <PeriodChart days={data.chartDays.length ? data.chartDays : demoData.chartDays} />
                </section>

                <section className="panel bills-panel bills-panel--full">
                    <div className="panel-header">
                        <h2>This Month’s Bills</h2>
                        <button className="ghost-action" onClick={() => goToPage?.("bills")}>
                            {data.bills.length} tracked
                        </button>
                    </div>

                    <DashboardBillsList
                        bills={data.bills.length ? data.bills : demoData.bills}
                        money={money}
                        onOpenBills={() => goToPage?.("bills")}
                    />
                </section>

                <section className="panel periods-panel">
                    <div className="panel-header">
                        <h2>Active Periods</h2>
                        <button className="ghost-action" onClick={() => goToPage?.("periods")}>
                            visual filters
                        </button>
                    </div>

                    <div className="period-list">
                        {(data.periods.length ? data.periods : demoData.periods).map((period) => (
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
                        <h2>Maintenance Coming Up</h2>
                        <button className="ghost-action" onClick={() => goToPage?.("maintenance")}>
                            next 30 days
                        </button>
                    </div>

                    <div className="maintenance-list">
                        {(data.maintenance.length ? data.maintenance : demoData.maintenance).map((item) => (
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
