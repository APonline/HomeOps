import { useCallback, useEffect, useMemo, useState } from "react";
import HomeOpsLoadingSkeleton from "../components/HomeOpsLoadingSkeleton";
import { useHomeOps } from "../context/HomeOpsContext";
import { closeMonth, getMonthClose, money, reopenMonth } from "../lib/homeopsApi";

function Metric({ label, value, detail }) {
    return (
        <article className="month-close-metric">
            <span>{label}</span>
            <strong>{value}</strong>
            <small>{detail}</small>
        </article>
    );
}

export default function MonthClosePage({ refreshToken, refreshEverything, goToPage }) {
    const { apiContext } = useHomeOps();
    const [data, setData] = useState(null);
    const [note, setNote] = useState("");
    const [confirmUnpaid, setConfirmUnpaid] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");

    const load = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const json = await getMonthClose(apiContext);
            setData(json);
            setNote(json.closeout?.closing_note || "");
            setConfirmUnpaid(Boolean(json.closeout?.confirmed_unpaid));
        } catch (err) {
            setError(err.message || "Could not prepare the monthly closeout.");
        } finally {
            setLoading(false);
        }
    }, [apiContext]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        load();
    }, [load, refreshToken]);

    const completeCount = useMemo(() => (data?.checklist || []).filter((item) => item.complete).length, [data]);
    const checklistCount = data?.checklist?.length || 0;
    const isClosed = data?.closeout?.status === "closed";
    const unpaidCount = Number(data?.summary?.bills?.unpaid_count || 0);

    async function finishClose(event) {
        event.preventDefault();
        setSaving(true);
        setError("");
        setMessage("");
        try {
            const json = await closeMonth({
                closing_note: note.trim() || null,
                confirmed_unpaid: confirmUnpaid,
            }, apiContext);
            setData(json);
            setMessage(json.message || "Month closed.");
            refreshEverything?.();
        } catch (err) {
            setError(err.message || "Could not close this month.");
        } finally {
            setSaving(false);
        }
    }

    async function reopen() {
        if (!window.confirm(`Reopen ${data?.period?.label || "this month"} for changes?`)) return;
        setSaving(true);
        setError("");
        setMessage("");
        try {
            const json = await reopenMonth(apiContext);
            setData(json);
            setMessage(json.message || "Month reopened.");
            refreshEverything?.();
        } catch (err) {
            setError(err.message || "Could not reopen this month.");
        } finally {
            setSaving(false);
        }
    }

    return (
        <>
            <header className="page-header month-close-header">
                <div>
                    <span className="v0-eyebrow">Monthly operating review</span>
                    <h1>{data?.period?.label || "Month Close"}</h1>
                    <p>Review the month, explain anything unusual, and preserve a trustworthy snapshot.</p>
                </div>
                {isClosed && <span className="month-close-state is-closed">Closed {data?.closeout?.closed_at ? `· ${String(data.closeout.closed_at).slice(0, 10)}` : ""}</span>}
            </header>

            {error && <div className="form-error">{error}</div>}
            {message && <div className="form-success">{message}</div>}
            {loading && <HomeOpsLoadingSkeleton rows={6} label="Preparing monthly closeout" />}

            {!loading && data && (
                <div className="month-close-layout">
                    <section className="panel month-close-summary">
                        <div className="panel-header">
                            <div>
                                <h2>Month at a glance</h2>
                                <p>{completeCount} of {checklistCount} review checks are clear.</p>
                            </div>
                            <span className={`month-close-readiness ${data.ready_to_close ? "is-ready" : "needs-review"}`}>
                                {data.ready_to_close ? "Ready to close" : "Review needed"}
                            </span>
                        </div>

                        <div className="month-close-metrics">
                            <Metric label="Bills paid" value={money(data.summary.bills.paid)} detail={`${data.summary.bills.paid_count}/${data.summary.bills.count} complete`} />
                            <Metric label="Still due" value={money(Math.max(data.summary.bills.expected - data.summary.bills.paid, 0))} detail={`${unpaidCount} open bills`} />
                            <Metric label="Outgoing cash" value={money(data.summary.cash.outgoing)} detail={`${data.summary.cash.transactions} transactions`} />
                            <Metric label="Net cash" value={money(data.summary.cash.net)} detail={`${money(data.summary.cash.incoming)} incoming`} />
                            <Metric label="Receipt records" value={String(data.summary.receipts.count)} detail={`${data.summary.receipts.scanned} scanned · ${data.summary.receipts.with_proof} with proof`} />
                            <Metric label="Planned cushion" value={data.summary.budget.planned_cushion === null ? "—" : money(data.summary.budget.planned_cushion)} detail={data.summary.budget.monthly_take_home ? "after spend and savings" : "Budget Lens not configured"} />
                        </div>
                    </section>

                    <section className="panel month-close-checklist">
                        <div className="panel-header"><h2>Closeout checklist</h2></div>
                        <div className="month-close-checks">
                            {data.checklist.map((item) => (
                                <article key={item.key} className={item.complete ? "is-complete" : "needs-action"}>
                                    <span className="month-close-check-icon">{item.complete ? "✓" : "!"}</span>
                                    <div><strong>{item.label}</strong><p>{item.detail}</p></div>
                                    {!item.complete && item.key === "bills" && <button type="button" onClick={() => goToPage?.("bills")}>Review bills</button>}
                                    {!item.complete && (item.key === "receipts" || item.key === "links") && <button type="button" onClick={() => goToPage?.("receipts")}>Review receipts</button>}
                                    {!item.complete && item.key === "budget" && <button type="button" onClick={() => goToPage?.("dashboard")}>Set budget</button>}
                                </article>
                            ))}
                        </div>
                    </section>

                    {data.unpaid_bills?.length > 0 && (
                        <section className="panel month-close-unpaid">
                            <div className="panel-header"><h2>Open bills</h2><span>{data.unpaid_bills.length}</span></div>
                            <div className="record-list">
                                {data.unpaid_bills.map((bill) => (
                                    <article className="record-row" key={bill.id}>
                                        <div><strong>{bill.name}</strong><p>Due {bill.due_date || "date not set"} · {bill.status}</p></div>
                                        <b>{money(bill.amount)}</b>
                                    </article>
                                ))}
                            </div>
                        </section>
                    )}

                    {data.summary.spending_periods?.length > 0 && (
                        <section className="panel month-close-periods">
                            <div className="panel-header"><h2>Context for this month</h2></div>
                            <div className="filter-strip">
                                {data.summary.spending_periods.map((period) => <span key={period.id}>{period.title} · {period.period_type}</span>)}
                            </div>
                        </section>
                    )}

                    <section className="panel month-close-finish">
                        <div className="panel-header">
                            <div><h2>{isClosed ? "Closed snapshot" : "Close this month"}</h2><p>{isClosed ? "The stored snapshot remains unchanged until you close it again." : "Your note becomes part of the permanent month history."}</p></div>
                        </div>
                        <form onSubmit={finishClose}>
                            <label>
                                <span>Month note</span>
                                <textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="What happened this month? Repairs, moving costs, travel, savings progress, or anything future-you should understand." disabled={isClosed} />
                            </label>
                            {unpaidCount > 0 && !isClosed && (
                                <label className="month-close-confirm">
                                    <input type="checkbox" checked={confirmUnpaid} onChange={(event) => setConfirmUnpaid(event.target.checked)} />
                                    <span>I reviewed the {unpaidCount} open bill{unpaidCount === 1 ? "" : "s"} and intentionally want them left open.</span>
                                </label>
                            )}
                            <div className="month-close-actions">
                                {isClosed ? (
                                    <button className="secondary-action" type="button" onClick={reopen} disabled={saving}>{saving ? "Reopening…" : "Reopen month"}</button>
                                ) : (
                                    <button className="primary-action" type="submit" disabled={saving || (unpaidCount > 0 && !confirmUnpaid)}>{saving ? "Closing…" : `Close ${data.period.label}`}</button>
                                )}
                            </div>
                        </form>
                    </section>
                </div>
            )}
        </>
    );
}
