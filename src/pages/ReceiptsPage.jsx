import { useCallback, useEffect, useMemo, useState } from "react";
import Modal from "../components/Modal";
import MetricCard from "../components/MetricCard";
import ReceiptScannerModal from "../components/ReceiptScannerModal";
import { useHomeOps } from "../context/HomeOpsContext";
import {
    createReceipt,
    deleteReceipt,
    downloadReceiptFile,
    getReceipts,
    money,
    nullableNumber,
    todayIso,
    updateReceipt,
} from "../lib/homeopsApi";

const blank = {
    vendor: "",
    date: todayIso(),
    subtotal: "",
    tax: "",
    tip: "",
    total: "",
    currency: "CAD",
    payment_method: "",
    category: "Home Supplies",
    file_url: "",
    file_name: "",
    notes: "",
    line_items: [],
};

function formNumber(value) {
    return value === null || value === undefined ? "" : String(value);
}

export default function ReceiptsPage({ refreshToken, refreshEverything }) {
    const { apiContext } = useHomeOps();
    const [receipts, setReceipts] = useState([]);
    const [summary, setSummary] = useState({ count: 0, total: 0, with_files: 0, scanned: 0, items: 0 });
    const [form, setForm] = useState(blank);
    const [editingId, setEditingId] = useState(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [scannerOpen, setScannerOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [openingFileId, setOpeningFileId] = useState(null);
    const [expandedId, setExpandedId] = useState(null);
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
        return receipts.filter((receipt) => [
            receipt.vendor,
            receipt.category,
            receipt.notes,
            receipt.payment_method,
            ...(receipt.line_items || []).map((item) => item.description),
        ].some((value) => String(value || "").toLowerCase().includes(query)));
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
            subtotal: formNumber(receipt.subtotal),
            tax: formNumber(receipt.tax),
            tip: formNumber(receipt.tip),
            total: formNumber(receipt.total_amount ?? receipt.total),
            currency: receipt.currency || "CAD",
            payment_method: receipt.payment_method || "",
            category: receipt.category || "",
            file_url: receipt.file_url || "",
            file_name: receipt.file_name || "",
            notes: receipt.notes || "",
            line_items: (receipt.line_items || []).map((item) => ({
                description: item.description || "",
                quantity: formNumber(item.quantity),
                unit_price: formNumber(item.unit_price),
                line_total: formNumber(item.line_total),
                category_hint: item.category_hint || "",
            })),
        });
        setError("");
        setModalOpen(true);
    }

    function updateLineItem(index, field, value) {
        setForm((current) => ({
            ...current,
            line_items: current.line_items.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item),
        }));
    }

    async function submit(event) {
        event.preventDefault();
        setSaving(true);
        setError("");
        const payload = {
            ...form,
            subtotal: nullableNumber(form.subtotal),
            tax: nullableNumber(form.tax),
            tip: nullableNumber(form.tip),
            total: nullableNumber(form.total),
            currency: form.currency || "CAD",
            payment_method: form.payment_method || null,
            category: form.category || "Uncategorized Spending",
            file_url: form.file_url || null,
            file_name: form.file_name || null,
            notes: form.notes || null,
            line_items: form.line_items
                .filter((item) => item.description.trim())
                .map((item) => ({
                    description: item.description.trim(),
                    quantity: nullableNumber(item.quantity),
                    unit_price: nullableNumber(item.unit_price),
                    line_total: nullableNumber(item.line_total),
                    category_hint: item.category_hint.trim() || null,
                })),
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
        if (!window.confirm(`Delete the ${receipt.vendor} receipt, stored image, and linked transaction?`)) return;
        try {
            await deleteReceipt(receipt.id, apiContext);
            refreshEverything?.();
            await load();
        } catch (err) {
            setError(err.message || "Could not delete receipt.");
        }
    }

    async function openStoredFile(receipt) {
        const previewWindow = window.open("", "_blank");
        setOpeningFileId(receipt.id);
        setError("");
        try {
            const result = await downloadReceiptFile(receipt.id, apiContext);
            const url = URL.createObjectURL(result.blob);
            if (previewWindow) previewWindow.location = url;
            else window.location.assign(url);
            window.setTimeout(() => URL.revokeObjectURL(url), 60000);
        } catch (err) {
            previewWindow?.close();
            setError(err.message || "Could not open the stored receipt.");
        } finally {
            setOpeningFileId(null);
        }
    }

    async function scannerSaved() {
        refreshEverything?.();
        await load();
    }

    return (
        <>
            <header className="page-header receipts-page-header">
                <div><h1>Receipts</h1><p>Photograph proof of purchase, verify the extracted data, and log the matching transaction.</p></div>
                <div className="page-header__button-group">
                    <button className="secondary-action" type="button" onClick={openCreate}>Manual Entry</button>
                    <button className="page-primary-action receipt-scan-primary" type="button" onClick={() => setScannerOpen(true)}>⌁ Scan Receipt</button>
                </div>
            </header>

            <div className="metric-grid receipt-metric-grid">
                <MetricCard label="Receipts" value={summary.count || 0} note="in selected period" />
                <MetricCard label="Recorded Spend" value={money(summary.total || 0)} note="receipt-backed" />
                <MetricCard label="Scanned" value={summary.scanned || 0} note="camera or image capture" />
                <MetricCard label="Items Captured" value={summary.items || 0} note={`${summary.with_files || 0} files stored`} />
            </div>

            <section className="panel full-panel receipts-register-panel">
                <div className="panel-header">
                    <div><h2>Receipt Register</h2><p className="panel-header__description">Search vendors and item descriptions, reopen the original image, or correct extracted values.</p></div>
                    <div className="panel-header__actions panel-header__actions--with-search">
                        <span>{loading ? "loading" : `${filtered.length} shown`}</span>
                        <input className="compact-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search vendor, item, category" />
                        <button className="page-primary-action page-primary-action--compact page-primary-action--icon" type="button" onClick={() => setScannerOpen(true)} aria-label="Scan receipt" title="Scan receipt">⌁</button>
                    </div>
                </div>
                {error && <div className="form-error">{error}</div>}
                {loading && <div className="empty-box">Loading receipts...</div>}
                {!loading && filtered.length === 0 && (
                    <div className="receipts-empty-state">
                        <span>⌁</span>
                        <strong>No receipts in this period</strong>
                        <p>Take a photo and HomeOps will build the receipt record and transaction together.</p>
                        <button className="page-primary-action" type="button" onClick={() => setScannerOpen(true)}>Scan First Receipt</button>
                    </div>
                )}
                <div className="record-list receipt-record-list">
                    {filtered.map((receipt) => {
                        const expanded = expandedId === receipt.id;
                        return (
                            <article className={`record-row receipt-record ${expanded ? "is-expanded" : ""}`} key={receipt.id}>
                                <div className="receipt-record__main">
                                    <div className={`receipt-record__source receipt-record__source--${receipt.capture_source || "manual"}`}>{receipt.capture_source === "scan" ? "⌁" : "R"}</div>
                                    <div className="receipt-record__content">
                                        <div className="receipt-record__title-row">
                                            <strong>{receipt.vendor}</strong>
                                            {receipt.capture_source === "scan" && <span className="receipt-record__tag">Scanned</span>}
                                            {receipt.item_count > 0 && <span className="receipt-record__tag receipt-record__tag--items">{receipt.item_count} items</span>}
                                        </div>
                                        <p>{receipt.receipt_date} · {receipt.category || "Uncategorized"}{receipt.payment_method ? ` · ${receipt.payment_method}` : ""}</p>
                                        {receipt.notes && <small>{receipt.notes}</small>}
                                        {(receipt.has_upload || receipt.file_url || receipt.item_count > 0) && (
                                            <div className="receipt-record__links">
                                                {receipt.has_upload && <button type="button" onClick={() => openStoredFile(receipt)} disabled={openingFileId === receipt.id}>{openingFileId === receipt.id ? "Opening…" : "View image"}</button>}
                                                {receipt.file_url && <a href={receipt.file_url} target="_blank" rel="noreferrer">Open linked file</a>}
                                                {receipt.item_count > 0 && <button type="button" onClick={() => setExpandedId(expanded ? null : receipt.id)}>{expanded ? "Hide items" : "Show items"}</button>}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="receipt-record__amount">
                                    <b>{money(receipt.total_amount)}</b>
                                    {receipt.tax !== null && <small>{money(receipt.tax)} tax</small>}
                                    <div className="list-actions">
                                        <button className="mini-button" type="button" onClick={() => openEdit(receipt)}>Edit</button>
                                        <button className="mini-button danger" type="button" onClick={() => remove(receipt)}>Delete</button>
                                    </div>
                                </div>
                                {expanded && (
                                    <div className="receipt-record__items">
                                        {(receipt.line_items || []).map((item, index) => (
                                            <div key={item.id || `${receipt.id}-${index}`}>
                                                <span>{item.description}</span>
                                                <small>{item.quantity ? `${item.quantity} × ${item.unit_price !== null ? money(item.unit_price) : "—"}` : item.category_hint || ""}</small>
                                                <strong>{item.line_total !== null ? money(item.line_total) : "—"}</strong>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </article>
                        );
                    })}
                </div>
            </section>

            <ReceiptScannerModal active={scannerOpen} onClose={() => setScannerOpen(false)} apiContext={apiContext} onSaved={scannerSaved} />

            <Modal active={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? "Edit Receipt" : "Manual Receipt"} size="wide">
                <form className="form-grid" onSubmit={submit}>
                    {error && <div className="form-error">{error}</div>}
                    <label className="span-6"><span>Vendor</span><input value={form.vendor} onChange={(e) => setForm({ ...form, vendor: e.target.value })} required /></label>
                    <label className="span-3"><span>Date</span><input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required /></label>
                    <label className="span-3"><span>Total</span><input type="number" min="0" step="0.01" value={form.total} onChange={(e) => setForm({ ...form, total: e.target.value })} required /></label>
                    <label className="span-3"><span>Subtotal</span><input type="number" min="0" step="0.01" value={form.subtotal} onChange={(e) => setForm({ ...form, subtotal: e.target.value })} /></label>
                    <label className="span-3"><span>Tax</span><input type="number" min="0" step="0.01" value={form.tax} onChange={(e) => setForm({ ...form, tax: e.target.value })} /></label>
                    <label className="span-3"><span>Tip</span><input type="number" min="0" step="0.01" value={form.tip} onChange={(e) => setForm({ ...form, tip: e.target.value })} /></label>
                    <label className="span-3"><span>Currency</span><input maxLength="3" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })} /></label>
                    <label className="span-6"><span>Category</span><input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></label>
                    <label className="span-6"><span>Payment method</span><input value={form.payment_method} onChange={(e) => setForm({ ...form, payment_method: e.target.value })} /></label>
                    <label className="span-6"><span>File name</span><input value={form.file_name} onChange={(e) => setForm({ ...form, file_name: e.target.value })} placeholder="Home Depot receipt.pdf" /></label>
                    <label className="span-6"><span>External file URL</span><input value={form.file_url} onChange={(e) => setForm({ ...form, file_url: e.target.value })} placeholder="Drive, Dropbox, OneDrive…" /></label>

                    {editingId && (
                        <div className="receipt-line-items span-12">
                            <div className="receipt-line-items__header">
                                <div><strong>Line items</strong><p>Correct, add, or remove captured items.</p></div>
                                <button className="mini-button" type="button" onClick={() => setForm({ ...form, line_items: [...form.line_items, { description: "", quantity: "", unit_price: "", line_total: "", category_hint: "" }] })}>+ Item</button>
                            </div>
                            {form.line_items.map((item, index) => (
                                <div className="receipt-line-item" key={`${index}-${item.description}`}>
                                    <input className="receipt-line-item__description" value={item.description} onChange={(e) => updateLineItem(index, "description", e.target.value)} placeholder="Item description" />
                                    <input type="number" min="0" step="0.001" value={item.quantity} onChange={(e) => updateLineItem(index, "quantity", e.target.value)} placeholder="Qty" />
                                    <input type="number" min="0" step="0.01" value={item.unit_price} onChange={(e) => updateLineItem(index, "unit_price", e.target.value)} placeholder="Each" />
                                    <input type="number" min="0" step="0.01" value={item.line_total} onChange={(e) => updateLineItem(index, "line_total", e.target.value)} placeholder="Total" />
                                    <button className="mini-button danger" type="button" onClick={() => setForm({ ...form, line_items: form.line_items.filter((_, itemIndex) => itemIndex !== index) })}>×</button>
                                </div>
                            ))}
                        </div>
                    )}

                    <label className="span-12"><span>Notes</span><textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></label>
                    <button className="primary-action span-12" disabled={saving}>{saving ? "Saving..." : "Save Receipt"}</button>
                </form>
            </Modal>
        </>
    );
}
