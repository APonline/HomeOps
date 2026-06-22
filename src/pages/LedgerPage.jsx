import { useCallback, useEffect, useState } from "react";
import Modal from "../components/Modal";
import { useHomeOps } from "../context/HomeOpsContext";
import {
    createLedgerEntry,
    createReceipt,
    getLedgerEntries,
    money,
    nullableNumber,
    todayIso,
} from "../lib/homeopsApi";

const defaultForm = {
    title: "",
    vendor: "",
    date: todayIso(),
    total: "",
    category: "Home Supplies",
    entry_type: "purchase",
    notes: "",
};

export default function LedgerPage({ refreshToken, refreshEverything, receiptMode = false }) {
    const { apiContext } = useHomeOps();
    const [entries, setEntries] = useState([]);
    const [periods, setPeriods] = useState([]);
    const [form, setForm] = useState(defaultForm);
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [activeModal, setActiveModal] = useState(null);

    const loadEntries = useCallback(async () => {
        setLoading(true);
        setError("");

        try {
            const json = await getLedgerEntries(apiContext);
            setEntries(json.entries || []);
            setPeriods(json.periods || []);
        } catch (err) {
            setError(err.message || "Could not load records.");
        } finally {
            setLoading(false);
        }
    }, [apiContext]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        loadEntries();
    }, [loadEntries, refreshToken]);

    async function submit(event) {
        event.preventDefault();
        setSaving(true);
        setError("");

        try {
            if (receiptMode) {
                await createReceipt({
                    vendor: form.vendor || form.title,
                    date: form.date,
                    total: nullableNumber(form.total),
                    category: form.category || "Uncategorized Spending",
                    notes: form.notes || null,
                }, apiContext);
            } else {
                await createLedgerEntry({
                    title: form.title || form.vendor,
                    vendor: form.vendor || null,
                    date: form.date,
                    total: nullableNumber(form.total),
                    category: form.category || "Uncategorized Spending",
                    entry_type: form.entry_type,
                    notes: form.notes || null,
                }, apiContext);
            }

            setForm(defaultForm);
            setActiveModal(null);
            refreshEverything?.();
            await loadEntries();
        } catch (err) {
            setError(err.message || "Could not save record.");
        } finally {
            setSaving(false);
        }
    }

    const pageTitle = receiptMode ? "Receipts" : "Ledger";
    const pageNote = receiptMode
        ? "Manual receipt capture now. Photo/OCR comes next."
        : "Money events: purchases, bills, financing payments, income, and weird chaos.";
    const actionLabel = receiptMode ? "+ Receipt" : "+ Ledger Entry";

    return (
        <>
            <header className="page-header">
                <div>
                    <h1>{pageTitle}</h1>
                    <p>{pageNote}</p>
                </div>
            </header>

            <section className="panel full-panel">
                <div className="panel-header">
                    <h2>{receiptMode ? "Current Month Receipts" : "Current Month Entries"}</h2>

                    <div className="panel-header__actions">
                        <span>{loading ? "loading" : `${entries.length} entries`}</span>
                        <button
                            className="page-primary-action page-primary-action--compact"
                            type="button"
                            onClick={() => {
                                setError("");
                                setActiveModal("entry");
                            }}
                        >
                            {actionLabel}
                        </button>
                    </div>
                </div>

                {error && <div className="form-error">{error}</div>}

                {periods.length > 0 && (
                    <div className="filter-strip">
                        {periods.map((period) => (
                            <span key={period.id}>
                                {period.name || period.title}: {money(period.amount)}
                            </span>
                        ))}
                    </div>
                )}

                {loading && <div className="empty-box">Loading records...</div>}
                {!loading && entries.length === 0 && <div className="empty-box">No records yet. Add one with {actionLabel}.</div>}

                <div className="record-list">
                    {entries.map((entry) => (
                        <article className="record-row" key={entry.id}>
                            <div>
                                <strong>{entry.title}</strong>
                                <p>{entry.entry_date} · {entry.vendor_name || "No vendor"} · {entry.category_name || "Uncategorized"}</p>
                                {entry.period_title && <small className="period-tag">{entry.period_title}</small>}
                            </div>
                            <b>{money(entry.total_amount)}</b>
                        </article>
                    ))}
                </div>
            </section>

            <Modal active={activeModal === "entry"} onClose={() => setActiveModal(null)} title={receiptMode ? "Add Receipt" : "Add Ledger Entry"}>
                <form className="form-grid" onSubmit={submit}>
                    {error && <div className="form-error">{error}</div>}

                    {!receiptMode && (
                        <label className="span-6">
                            <span>Title</span>
                            <input
                                value={form.title}
                                onChange={(event) => setForm({ ...form, title: event.target.value })}
                                placeholder="Balcony shelf / Home Depot"
                                required={!receiptMode}
                            />
                        </label>
                    )}

                    <label className={receiptMode ? "span-6" : "span-6"}>
                        <span>Vendor</span>
                        <input
                            value={form.vendor}
                            onChange={(event) => setForm({ ...form, vendor: event.target.value })}
                            placeholder="Home Depot"
                            required={receiptMode}
                        />
                    </label>

                    <label className="span-3">
                        <span>Date</span>
                        <input
                            type="date"
                            value={form.date}
                            onChange={(event) => setForm({ ...form, date: event.target.value })}
                            required
                        />
                    </label>

                    <label className="span-3">
                        <span>Total</span>
                        <input
                            type="number"
                            step="0.01"
                            value={form.total}
                            onChange={(event) => setForm({ ...form, total: event.target.value })}
                            placeholder="87.42"
                            required
                        />
                    </label>

                    {!receiptMode && (
                        <label className="span-4">
                            <span>Type</span>
                            <select
                                value={form.entry_type}
                                onChange={(event) => setForm({ ...form, entry_type: event.target.value })}
                            >
                                <option value="purchase">Purchase</option>
                                <option value="bill_payment">Bill Payment</option>
                                <option value="financing_payment">Financing Payment</option>
                                <option value="income">Income</option>
                                <option value="transfer">Transfer</option>
                                <option value="adjustment">Adjustment</option>
                            </select>
                        </label>
                    )}

                    <label className={receiptMode ? "span-12" : "span-8"}>
                        <span>Category</span>
                        <input
                            value={form.category}
                            onChange={(event) => setForm({ ...form, category: event.target.value })}
                            placeholder="Home Supplies"
                        />
                    </label>

                    <label className="span-12">
                        <span>Notes</span>
                        <textarea
                            value={form.notes}
                            onChange={(event) => setForm({ ...form, notes: event.target.value })}
                            placeholder="Why this exists / what period it belongs to..."
                        />
                    </label>

                    <button className="primary-action span-12" disabled={saving}>
                        {saving ? "Saving..." : receiptMode ? "Save Receipt" : "Save Entry"}
                    </button>
                </form>
            </Modal>
        </>
    );
}
