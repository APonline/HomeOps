import { useCallback, useEffect, useState } from "react";
import MetricCard from "../components/MetricCard";
import { useHomeOps } from "../context/HomeOpsContext";
import { getReports, money } from "../lib/homeopsApi";

function BarList({ rows, empty }) {
    const max = Math.max(1, ...rows.map((row) => Number(row.amount || 0)));
    return rows.length ? <div className="report-bars">{rows.map((row) => <div className="report-bar" key={row.name}><div className="report-bar__label"><span>{row.name}</span><b>{money(row.amount)}</b></div><div className="report-bar__track"><span style={{ width: `${Math.max(3, (Number(row.amount || 0) / max) * 100)}%` }} /></div><small>{row.count} entries</small></div>)}</div> : <div className="empty-box">{empty}</div>;
}

export default function ReportsPage({ refreshToken }) {
    const { apiContext } = useHomeOps(); const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(true); const [error, setError] = useState("");
    const load = useCallback(async () => { setLoading(true); setError(""); try { setReport(await getReports(apiContext)); } catch (err) { setError(err.message || "Could not build reports."); } finally { setLoading(false); } }, [apiContext]);
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        load();
    }, [load, refreshToken]);
    const summary = report?.summary || {};
    return <>
        <header className="page-header"><div><h1>Reports</h1><p>Actual cash movement, bill pressure, discretionary spend, categories, vendors, and a 12-month trend.</p></div><button className="page-primary-action" onClick={load}>Refresh</button></header>
        {error && <div className="form-error">{error}</div>}{loading && <div className="empty-box">Building report...</div>}
        {!loading && report && <>
            <div className="metric-grid"><MetricCard label="Outgoing" value={money(summary.outgoing || 0)} note="selected period" /><MetricCard label="Incoming" value={money(summary.incoming || 0)} note="selected period" /><MetricCard label="Net Cash Flow" value={money(summary.net_cash_flow || 0)} note={`${summary.transaction_count || 0} entries`} /><MetricCard label="Plan Remaining" value={money(summary.remaining_after_plan || 0)} note="income − savings − spend" /></div>
            <div className="report-summary-strip"><span><b>{money(summary.actual_bills || 0)}</b> paid bills</span><span><b>{money(summary.expected_bills || 0)}</b> expected bills</span><span><b>{money(summary.non_bill_spend || 0)}</b> non-bill spend</span><span><b>{money(summary.planned_savings || 0)}</b> savings plan</span></div>
            <div className="dashboard-grid report-grid"><section className="panel"><div className="panel-header"><h2>By Category</h2></div><BarList rows={report.categories || []} empty="No categorized outgoing spend." /></section><section className="panel"><div className="panel-header"><h2>Top Vendors</h2></div><BarList rows={report.vendors || []} empty="No vendor spend yet." /></section></div>
            <section className="panel full-panel"><div className="panel-header"><h2>12-Month Cash Trend</h2></div><div className="trend-table"><div className="trend-table__head"><span>Month</span><span>Outgoing</span><span>Incoming</span><span>Net</span></div>{(report.monthly_trend || []).map((month) => <div className="trend-table__row" key={month.month}><span>{month.label}</span><b>{money(month.outgoing)}</b><b>{money(month.incoming)}</b><b>{money(month.incoming - month.outgoing)}</b></div>)}</div></section>
        </>}
    </>;
}
