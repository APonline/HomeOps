import { useCallback, useEffect, useState } from "react";
import Modal from "../components/Modal";
import MetricCard from "../components/MetricCard";
import { useHomeOps } from "../context/HomeOpsContext";
import { createDocument, deleteDocument, getDocuments, updateDocument } from "../lib/homeopsApi";

const blank = { title: "", document_type: "warranty", provider: "", document_date: "", expires_on: "", file_url: "", file_name: "", notes: "", is_favourite: false };

export default function DocumentsPage({ refreshToken, refreshEverything }) {
    const { apiContext } = useHomeOps();
    const [documents, setDocuments] = useState([]); const [summary, setSummary] = useState({});
    const [form, setForm] = useState(blank); const [editingId, setEditingId] = useState(null);
    const [open, setOpen] = useState(false); const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false); const [error, setError] = useState("");

    const load = useCallback(async () => {
        setLoading(true); setError("");
        try { const json = await getDocuments(apiContext); setDocuments(json.documents || []); setSummary(json.summary || {}); }
        catch (err) { setError(err.message || "Could not load documents."); }
        finally { setLoading(false); }
    }, [apiContext]);
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        load();
    }, [load, refreshToken]);

    function edit(document = null) {
        setEditingId(document?.id || null); setForm(document ? { ...blank, ...document, is_favourite: Boolean(document.is_favourite) } : blank); setError(""); setOpen(true);
    }
    async function submit(event) {
        event.preventDefault(); setSaving(true); setError("");
        const payload = { ...form, provider: form.provider || null, document_date: form.document_date || null, expires_on: form.expires_on || null, file_url: form.file_url || null, file_name: form.file_name || null, notes: form.notes || null };
        try { if (editingId) await updateDocument(editingId, payload, apiContext); else await createDocument(payload, apiContext); setOpen(false); refreshEverything?.(); await load(); }
        catch (err) { setError(err.message || "Could not save document."); }
        finally { setSaving(false); }
    }
    async function remove(document) {
        if (!window.confirm(`Delete ${document.title}?`)) return;
        try { await deleteDocument(document.id, apiContext); refreshEverything?.(); await load(); }
        catch (err) { setError(err.message || "Could not delete document."); }
    }

    return <>
        <header className="page-header"><div><h1>Documents</h1><p>One index for warranties, condo rules, insurance, manuals, tax, financing, and repair paperwork.</p></div><button className="page-primary-action" onClick={() => edit()}>+ Document</button></header>
        <div className="metric-grid"><MetricCard label="Documents" value={summary.count || 0} note="property records" /><MetricCard label="Favourites" value={summary.favourites || 0} note="quick-access items" /><MetricCard label="Expiring Soon" value={summary.expiring_soon || 0} note="within 60 days" /><MetricCard label="Expired" value={summary.expired || 0} note="needs review" /></div>
        <section className="panel full-panel">
            <div className="panel-header"><h2>Document Index</h2><span>{loading ? "loading" : `${documents.length} records`}</span></div>
            {error && <div className="form-error">{error}</div>}
            {loading && <div className="empty-box">Loading documents...</div>}
            {!loading && documents.length === 0 && <div className="empty-box">Add a document record and link it to wherever the file is stored.</div>}
            <div className="record-list">{documents.map((document) => <article className={`record-row ${document.is_expired ? "is-alert" : ""}`} key={document.id}>
                <div><strong>{document.is_favourite ? "★ " : ""}{document.title}</strong><p>{document.document_type} · {document.provider || "No provider"}{document.document_date ? ` · ${document.document_date}` : ""}</p>{document.expires_on && <small className={document.is_expired || document.expires_soon ? "warning-text" : ""}>{document.is_expired ? "Expired" : "Expires"} {document.expires_on}</small>}{document.notes && <small>{document.notes}</small>}{document.file_url && <a className="record-link" href={document.file_url} target="_blank" rel="noreferrer">Open {document.file_name || "document"}</a>}</div>
                <div className="list-actions"><button className="mini-button" onClick={() => edit(document)}>Edit</button><button className="mini-button danger" onClick={() => remove(document)}>Delete</button></div>
            </article>)}</div>
        </section>
        <Modal active={open} onClose={() => setOpen(false)} title={editingId ? "Edit Document" : "Add Document"} size="wide">
            <form className="form-grid" onSubmit={submit}>{error && <div className="form-error">{error}</div>}
                <label className="span-6"><span>Title</span><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required /></label>
                <label className="span-3"><span>Type</span><select value={form.document_type} onChange={(e) => setForm({ ...form, document_type: e.target.value })}>{["mortgage","insurance","condo","tax","warranty","manual","invoice","receipt","contract","inspection","utility","identity","other"].map((type) => <option key={type} value={type}>{type}</option>)}</select></label>
                <label className="span-3"><span>Provider</span><input value={form.provider} onChange={(e) => setForm({ ...form, provider: e.target.value })} /></label>
                <label className="span-3"><span>Document Date</span><input type="date" value={form.document_date || ""} onChange={(e) => setForm({ ...form, document_date: e.target.value })} /></label>
                <label className="span-3"><span>Expires</span><input type="date" value={form.expires_on || ""} onChange={(e) => setForm({ ...form, expires_on: e.target.value })} /></label>
                <label className="span-6"><span>File Name</span><input value={form.file_name || ""} onChange={(e) => setForm({ ...form, file_name: e.target.value })} /></label>
                <label className="span-12"><span>File URL</span><input value={form.file_url || ""} onChange={(e) => setForm({ ...form, file_url: e.target.value })} placeholder="Link to Drive, Dropbox, OneDrive, or hosted file" /></label>
                <label className="span-12 checkbox-row"><input type="checkbox" checked={Boolean(form.is_favourite)} onChange={(e) => setForm({ ...form, is_favourite: e.target.checked })} /><span>Favourite / quick access</span></label>
                <label className="span-12"><span>Notes</span><textarea value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></label>
                <button className="primary-action span-12" disabled={saving}>{saving ? "Saving..." : "Save Document"}</button>
            </form>
        </Modal>
    </>;
}
