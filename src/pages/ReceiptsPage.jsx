import { useCallback, useEffect, useMemo, useState } from "react";
import Modal from "../components/Modal";
import MetricCard from "../components/MetricCard";
import { useHomeOps } from "../context/HomeOpsContext";
import {
    createReceipt,
    deleteReceipt,
    getReceipts,
    money,
    nullableNumber,
    todayIso,
    updateReceipt,
} from "../lib/homeopsApi";

const blank = {
    vendor: "",
    date: todayIso(),
    total: "",
    category: "Home Supplies",
    file_url: "",
    file_name: "",
    notes: "",
};

export default function ReceiptsPage({ refreshToken, refreshEverything }) {
    const { apiContext } = useHomeOps();
    const [receipts, setReceipts] = useState([]);
    const [summary, setSummary] = useState({ count: 0, total: 0, with_files: 0 });
    const [form, setForm] = useState(blank);
    const [editingId, setEditingId] = useState(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [search, setSearch] = useState("");

    const load = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const json = await getReceipts(apiContext);
            setReceipts(json.receipts || []);
            setSummary(json.summary || {});
        } catch (err) {
            setError(err.message || "Could not load receipts.");
        } finally {
            setLoading(false);
        }
    }, [apiContext]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        load();
    }, [load, refreshToken]);

    const filtered = useMemo(() => {
        const query = search.trim().toLowerCase();
        if (!query) return receipts;
        return receipts.filter((receipt) => [receipt.vendor, receipt.category, receipt.notes]
            .some((value) => String(value || "").toLowerCase().includes(query)));
    }, [receipts, search]);

    function openCreate() {
        setEditingId(null);
        setForm(blank);
        setError("");
        setModalOpen(true);
    }

    function openEdit(receipt) {
        setEditingId(receipt.id);
        setForm({
            vendor: receipt.vendor || "",
            date: receipt.receipt_date || receipt.date || todayIso(),
            total: receipt.total_amount ?? receipt.total ?? "",
            category: receipt.category || "",
            file_url: receipt.file_url || "",
            file_name: receipt.file_name || "",
            notes: receipt.notes || "",
        });
        setError("");
        setModalOpen(true);
    }

    async function submit(event) {
        event.preventDefault();
        setSaving(true);
        setError("");
        const payload = {
            ...form,
            total: nullableNumber(form.total),
            category: form.category || "Uncategorized Spending",
            file_url: form.file_url || null,
            file_name: form.file_name || null,
            notes: form.notes || null,
        };
        try {
            if (editingId) await updateReceipt(editingId, payload, apiContext);
            else await createReceipt(payload, apiContext);
            setModalOpen(false);
            refreshEverything?.();
            await load();
        } catch (err) {
            setError(err.message || "Could not save receipt.");
        } finally {
            setSaving(false);
        }
    }

    async function remove(receipt) {
        if (!window.confirm(`Delete the ${receipt.vendor} receipt and its linked ledger entry?`)) return;
        try {
            await deleteReceipt(receipt.id, apiContext);
            refreshEverything?.();
            await load();
        } catch (err) {
            setError(err.message || "Could not delete receipt.");
        }
    }

    return (
        <>
            <header className="page-header">
                <div><h1>Receipts</h1><p>A searchable proof-of-purchase register tied directly to the ledger.</p></div>
                <button className="page-primary-action" type="button" onClick={openCreate}>+ Receipt</button>
            </header>

            <div className="metric-grid">
                <MetricCard label="Receipts" value={summary.count || 0} note="in selected period" />
                <MetricCard label="Recorded Spend" value={money(summary.total || 0)} note="receipt-backed" />
                <MetricCard label="Files Linked" value={summary.with_files || 0} note="URLs or cloud files" />
            </div>

            <section className="panel full-panel">
                <div className="panel-header">
                    <h2>Receipt Register</h2>
                    <input className="compact-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search vendor, category, notes" />
                </div>
                {error && <div className="form-error">{error}</div>}
                {loading && <div className="empty-box">Loading receipts...</div>}
                {!loading && filtered.length === 0 && <div className="empty-box">No receipts in this period.</div>}
                <div className="record-list">
                    {filtered.map((receipt) => (
                        <article className="record-row" key={receipt.id}>
                            <div>
                                <strong>{receipt.vendor}</strong>
                                <p>{receipt.receipt_date} · {receipt.category || "Uncategorized"}</p>
                                {receipt.notes && <small>{receipt.notes}</small>}
                                {receipt.file_url && <a className="record-link" href={receipt.file_url} target="_blank" rel="noreferrer">Open linked file</a>}
                            </div>
                            <div className="list-actions">
                                <b>{money(receipt.total_amount)}</b>
                                <button className="mini-button" type="button" onClick={() => openEdit(receipt)}>Edit</button>
                                <button className="mini-button danger" type="button" onClick={() => remove(receipt)}>Delete</button>
                            </div>
                        </article>
                    ))}
                </div>
            </section>

            <Modal active={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? "Edit Receipt" : "Add Receipt"}>
                <form className="form-grid" onSubmit={submit}>
                    {error && <div className="form-error">{error}</div>}
                    <label className="span-6"><span>Vendor</span><input value={form.vendor} onChange={(e) => setForm({ ...form, vendor: e.target.value })} required /></label>
                    <label className="span-3"><span>Date</span><input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required /></label>
                    <label className="span-3"><span>Total</span><input type="number" step="0.01" value={form.total} onChange={(e) => setForm({ ...form, total: e.target.value })} required /></label>
                    <label className="span-6"><span>Category</span><input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></label>
                    <label className="span-6"><span>File name</span><input value={form.file_name} onChange={(e) => setForm({ ...form, file_name: e.target.value })} placeholder="Home Depot receipt.pdf" /></label>
                    <label className="span-12"><span>File URL</span><input value={form.file_url} onChange={(e) => setForm({ ...form, file_url: e.target.value })} placeholder="Drive, Dropbox, OneDrive, or hosted file URL" /></label>
                    <label className="span-12"><span>Notes</span><textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></label>
                    <button className="primary-action span-12" disabled={saving}>{saving ? "Saving..." : "Save Receipt"}</button>
                </form>
            </Modal>
        </>
    );
}
