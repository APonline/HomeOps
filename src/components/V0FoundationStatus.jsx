import { useCallback, useEffect, useMemo, useState } from "react";
import { getV0Status } from "../lib/homeopsApi";

const statusLabels = {
    ready: "Ready",
    warning: "Review",
    blocked: "Blocked",
};

const groupLabels = {
    schema: "Data foundation",
    product: "Product readiness",
};

function groupChecks(checks = []) {
    return checks.reduce((groups, check) => {
        const [groupKey = "product"] = String(check.key || "product").split(".");
        if (!groups[groupKey]) groups[groupKey] = [];
        groups[groupKey].push(check);
        return groups;
    }, {});
}

export default function V0FoundationStatus({ apiContext, goToPage }) {
    const [status, setStatus] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const loadStatus = useCallback(async () => {
        setLoading(true);
        setError("");

        try {
            const json = await getV0Status(apiContext);
            setStatus(json || null);
        } catch (err) {
            setError(err.message || "Could not load V0 status.");
        } finally {
            setLoading(false);
        }
    }, [apiContext]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        loadStatus();
    }, [loadStatus]);

    const groupedChecks = useMemo(() => groupChecks(status?.checks || []), [status]);
    const total = status?.total_count || 0;
    const ready = status?.ready_count || 0;
    const percent = total ? Math.round((ready / total) * 100) : 0;
    const headline = status?.guidance?.headline || "Checking V0 foundation...";
    const body = status?.guidance?.body || "HomeOps is checking home identity, time lens, core bills, records, rooms/assets and module context.";

    return (
        <section className="v0-foundation-status panel">
            <div className="v0-foundation-status__header">
                <div>
                    <span className="v0-foundation-status__eyebrow">V0 Wrap-Up</span>
                    <h2>Foundation Status</h2>
                    <p>{headline}</p>
                </div>

                <div className={`v0-foundation-status__score ${status?.v1_ready ? "is-ready" : ""}`}>
                    <strong>{loading ? "…" : `${percent}%`}</strong>
                    <span>{status?.v1_ready ? "V1-ready" : "V0 check"}</span>
                </div>
            </div>

            {error && <div className="form-error">{error}</div>}
            {!error && <p className="v0-foundation-status__body">{body}</p>}

            <div className="v0-foundation-status__quick-grid">
                <article>
                    <span>Home</span>
                    <strong>{status?.home?.name || "No home loaded"}</strong>
                    <small>{status?.home?.city_region || "Property identity"}</small>
                </article>
                <article>
                    <span>Core bills</span>
                    <strong>{status?.counts?.core_bills ?? "—"}</strong>
                    <small>{status?.counts?.bill_instances_this_month ?? 0} month instances</small>
                </article>
                <article>
                    <span>Records</span>
                    <strong>{status?.counts?.ledger_entries_in_period ?? "—"}</strong>
                    <small>{status?.counts?.receipts_in_period ?? 0} receipts in context</small>
                </article>
                <article>
                    <span>Anchors</span>
                    <strong>{(status?.counts?.rooms || 0) + (status?.counts?.assets || 0)}</strong>
                    <small>rooms/assets</small>
                </article>
            </div>

            <div className="v0-foundation-status__groups">
                {Object.entries(groupedChecks).map(([groupKey, checks]) => (
                    <div className="v0-foundation-status__group" key={groupKey}>
                        <h3>{groupLabels[groupKey] || groupKey}</h3>
                        <div className="v0-foundation-status__checks">
                            {checks.map((check) => (
                                <div className={`v0-check-row is-${check.status}`} key={check.key}>
                                    <span>{check.label}</span>
                                    <em>{statusLabels[check.status] || check.status}</em>
                                    <small>{check.help}</small>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            <div className="v0-foundation-status__actions">
                <button type="button" className="ghost-action" onClick={() => goToPage?.("home")}>Property Profile</button>
                <button type="button" className="ghost-action" onClick={() => goToPage?.("bills")}>Bills Engine</button>
                <button type="button" className="ghost-action" onClick={() => goToPage?.("ledger")}>Ledger</button>
                <button type="button" className="ghost-action" onClick={loadStatus} disabled={loading}>{loading ? "Checking..." : "Refresh Check"}</button>
            </div>
        </section>
    );
}
