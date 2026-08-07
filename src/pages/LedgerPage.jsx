import { useCallback, useEffect, useState } from "react";
import Modal from "../components/Modal";
import HomeOpsLoadingSkeleton, { HomeOpsLoadingPill } from "../components/HomeOpsLoadingSkeleton";
import { useHomeOps } from "../context/HomeOpsContext";
import {
    createLedgerEntry,
    deleteLedgerEntry,
    getLedgerEntries,
    money,
    nullableNumber,
    todayIso,
    updateLedgerEntry,
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

function formFromEntry(entry) {
    return {
        title: entry.title || "",
        vendor: entry.vendor_name || "",
        date: entry.entry_date || todayIso(),
        total: entry.total_amount === null || entry.total_amount === undefined ? "" : String(entry.total_amount),
        category: entry.category_name || "Uncategorized Spending",
        entry_type: entry.entry_type || "purchase",
        notes: entry.notes || "",
    };
}

export default function LedgerPage({ refreshToken, refreshEverything }) {
    const { apiContext } = useHomeOps();
    const [entries, setEntries] = useState([]);
    const [periods, setPeriods] = useState([]);
    const [form, setForm] = useState(defaultForm);
    const [editingId, setEditingId] = useState(null);
    const [saving, setSaving] = useState(false);
    const [deletingId, setDeletingId] = useState(null);
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

    function openCreate() {
        setError("");
        setEditingId(null);
        setForm({ ...defaultForm, date: apiContext.selectedDay || todayIso() });
        setActiveModal("entry");
    }

    function openEdit(entry) {
        setError("");
        setEditingId(entry.id);
        setForm(formFromEntry(entry));
        setActiveModal("entry");
    }

    async function submit(event) {
        event.preventDefault();
        setSaving(true);
        setError("");

        const payload = {
            title: form.title.trim() || form.vendor.trim(),
            vendor: form.vendor.trim() || null,
            date: form.date,
            total: nullableNumber(form.total),
            category: form.category.trim() || "Uncategorized Spending",
            entry_type: form.entry_type,
            notes: form.notes.trim() || null,
        };

        try {
            if (editingId) {
                await updateLedgerEntry(editingId, payload, apiContext);
            } else {
                await createLedgerEntry(payload, apiContext);
            }

            setForm(defaultForm);
            setEditingId(null);
            setActiveModal(null);
            refreshEverything?.();
            await loadEntries();
        } catch (err) {
            setError(err.message || "Could not save transaction.");
        } finally {
            setSaving(false);
        }
    }

    async function remove(entry) {
        const linkedBill = Boolean(entry.bill_instance_id);
        const message = linkedBill
            ? "This came from a bill. Reset or change the bill payment from Bills instead."
            : `Delete “${entry.title}”? A linked receipt will remain, but it will no longer point to this transaction.`;

        if (linkedBill) {
            setError(message);
            return;
        }
        if (!window.confirm(message)) return;

        setDeletingId(entry.id);
        setError("");
        try {
            await deleteLedgerEntry(entry.id, apiContext);
            refreshEverything?.();
            await loadEntries();
        } catch (err) {
            setError(err.message || "Could not delete transaction.");
        } finally {
            setDeletingId(null);
        }
    }

    return (
        <>
            <header className="page-header">
                <div>
                    <h1>Transactions</h1>
                    <p>Money coming in, going out, or moving between your accounts.</p>
                </div>
                <button className="page-primary-action" type="button" onClick={openCreate}>+ Transaction</button>
            </header>

            <section className="panel full-panel">
                <div className="panel-header">
                    <h2>Current Month Transactions</h2>
                    <div className="panel-header__actions">
                        {loading ? <HomeOpsLoadingPill label="Loading entry count" /> : <span>{`${entries.length} entries`}</span>}
                        <button
                            className="page-primary-action page-primary-action--compact page-primary-action--icon"
                            type="button"
                            onClick={openCreate}
                            aria-label="Add transaction"
                            title="Add transaction"
                        >+</button>
                    </div>
                </div>

                {error && <div className="form-error">{error}</div>}

                {periods.length > 0 && (
                    <div className="filter-strip">
                        {periods.map((period) => (
                            <span key={period.id}>{period.name || period.title}: {money(period.amount)}</span>
                        ))}
                    </div>
                )}

                {loading && <HomeOpsLoadingSkeleton rows={4} label="Loading transactions" />}
                {!loading && entries.length === 0 && <div className="empty-box">No transactions yet. Add the first one.</div>}

                <div className="record-list">
                    {entries.map((entry) => (
                        <article className="record-row" key={`${entry.id}-${entry.period_title || "none"}`}>
                            <div>
                                <strong>{entry.title}</strong>
                                <p>{entry.entry_date} · {entry.vendor_name || "No vendor"} · {entry.category_name || "Uncategorized"}</p>
                                {entry.period_title && <small className="period-tag">{entry.period_title}</small>}
                                {entry.notes && <small>{entry.notes}</small>}
                            </div>
                            <div className="record-row__actions">
                                <b>{entry.direction === "in" ? "+" : ""}{money(entry.total_amount)}</b>
                                <button className="mini-button" type="button" onClick={() => openEdit(entry)}>Edit</button>
                                <button className="mini-button danger" type="button" onClick={() => remove(entry)} disabled={deletingId === entry.id}>
                                    {deletingId === entry.id ? "…" : "Delete"}
                                </button>
                            </div>
                        </article>
                    ))}
                </div>
            </section>

            <Modal active={activeModal === "entry"} onClose={() => setActiveModal(null)} title={editingId ? "Edit Transaction" : "Add Transaction"}>
                <form className="form-grid" onSubmit={submit}>
                    {error && <div className="form-error">{error}</div>}

                    <label className="span-6">
                        <span>Title</span>
                        <input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Balcony shelf / Home Depot" required />
                    </label>
                    <label className="span-6">
                        <span>Vendor</span>
                        <input value={form.vendor} onChange={(event) => setForm({ ...form, vendor: event.target.value })} placeholder="Home Depot" />
                    </label>
                    <label className="span-3">
                        <span>Date</span>
                        <input type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} required />
                    </label>
                    <label className="span-3">
                        <span>Total</span>
                        <input type="number" min="0" step="0.01" value={form.total} onChange={(event) => setForm({ ...form, total: event.target.value })} placeholder="87.42" required />
                    </label>
                    <label className="span-3">
                        <span>Type</span>
                        <select value={form.entry_type} onChange={(event) => setForm({ ...form, entry_type: event.target.value })}>
                            <option value="purchase">Purchase</option>
                            <option value="bill_payment">Bill Payment</option>
                            <option value="financing_payment">Financing Payment</option>
                            <option value="income">Income</option>
                            <option value="transfer">Transfer</option>
                            <option value="adjustment">Adjustment</option>
                        </select>
                    </label>
                    <label className="span-3">
                        <span>Category</span>
                        <input value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} placeholder="Home Supplies" />
                    </label>
                    <label className="span-12">
                        <span>Notes</span>
                        <textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} placeholder="Why this exists / what period it belongs to..." />
                    </label>
                    <button className="primary-action span-12" disabled={saving}>{saving ? "Saving..." : editingId ? "Update Transaction" : "Save Transaction"}</button>
                </form>
            </Modal>
        </>
    );
}
