import { useCallback, useEffect, useRef, useState } from "react";
import Modal from "../components/Modal";
import HomeOpsLoadingSkeleton, { HomeOpsLoadingPill } from "../components/HomeOpsLoadingSkeleton";
import { useHomeOps } from "../context/HomeOpsContext";
import {
    createDocument,
    deleteDocument,
    downloadDocumentFile,
    getDocuments,
    updateDocument,
} from "../lib/homeopsApi";

const MAX_FILE_SIZE = 20 * 1024 * 1024;
const DOCUMENT_TYPES = [
    "mortgage",
    "insurance",
    "condo",
    "tax",
    "warranty",
    "manual",
    "invoice",
    "receipt",
    "contract",
    "inspection",
    "utility",
    "identity",
    "other",
];
const blank = {
    title: "",
    document_type: "warranty",
    provider: "",
    document_date: "",
    expires_on: "",
    file_url: "",
    file_name: "",
    notes: "",
    is_favourite: false,
};

function DocumentIcon({ name }) {
    const paths = {
        documents: <><path d="M6 3h8l4 4v14H6z" /><path d="M14 3v5h5" /><path d="M9 13h6M9 17h5" /></>,
        favourite: <path d="m12 3 2.75 5.57 6.15.9-4.45 4.33 1.05 6.12L12 17.02l-5.5 2.9 1.05-6.12L3.1 9.47l6.15-.9z" />,
        expiring: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
        expired: <><path d="M12 9v4" /><path d="M12 17h.01" /><path d="M10.3 3.8 2.4 17.5A2 2 0 0 0 4.1 20h15.8a2 2 0 0 0 1.7-2.5L13.7 3.8a2 2 0 0 0-3.4 0Z" /></>,
        upload: <><path d="M12 16V4" /><path d="m7 9 5-5 5 5" /><path d="M5 15v5h14v-5" /></>,
        file: <><path d="M6 3h8l4 4v14H6z" /><path d="M14 3v5h5" /></>,
        link: <><path d="M10 13a5 5 0 0 0 7.1.1l2-2a5 5 0 0 0-7.1-7.1l-1.1 1.1" /><path d="M14 11a5 5 0 0 0-7.1-.1l-2 2A5 5 0 0 0 12 20l1.1-1.1" /></>,
    };

    return <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name] || paths.file}</svg>;
}

function DocumentMetric({ label, value, note, tone, icon }) {
    return <article className={`document-metric document-metric--${tone}`}>
        <div className="document-metric__icon"><DocumentIcon name={icon} /></div>
        <span>{label}</span>
        <strong>{value}</strong>
        <p>{note}</p>
    </article>;
}

function titleCase(value) {
    return String(value || "")
        .replace(/[_-]+/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function titleFromFilename(filename) {
    return titleCase(String(filename || "").replace(/\.[^.]+$/, ""));
}

function inferDocumentType(filename) {
    const value = String(filename || "").toLowerCase();
    const matches = [
        ["mortgage", ["mortgage", "loan"]],
        ["insurance", ["insurance", "policy", "coverage"]],
        ["condo", ["condo", "status certificate", "bylaw", "declaration", "rules"]],
        ["tax", ["tax", "assessment", "mpac"]],
        ["warranty", ["warranty", "guarantee"]],
        ["manual", ["manual", "guide", "instructions"]],
        ["invoice", ["invoice"]],
        ["receipt", ["receipt"]],
        ["contract", ["contract", "agreement"]],
        ["inspection", ["inspection", "report"]],
        ["utility", ["hydro", "water", "gas", "utility"]],
        ["identity", ["passport", "licence", "license", "identity", "id card"]],
    ];

    return matches.find(([, keywords]) => keywords.some((keyword) => value.includes(keyword)))?.[0] || "other";
}

function fileDate(file) {
    if (!file?.lastModified) return "";
    const date = new Date(file.lastModified);
    if (Number.isNaN(date.getTime())) return "";

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function formatBytes(bytes) {
    const amount = Number(bytes || 0);
    if (!amount) return "";
    if (amount < 1024) return `${amount} B`;
    if (amount < 1024 * 1024) return `${(amount / 1024).toFixed(1)} KB`;
    return `${(amount / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(value) {
    if (!value) return "";
    const date = new Date(`${String(value).slice(0, 10)}T12:00:00`);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" });
}

function documentFormData(form, selectedFile, removeUploadedFile) {
    const payload = new FormData();

    Object.entries({
        ...form,
        provider: form.provider || "",
        document_date: form.document_date || "",
        expires_on: form.expires_on || "",
        file_url: form.file_url || "",
        file_name: form.file_name || "",
        notes: form.notes || "",
        is_favourite: form.is_favourite ? "1" : "0",
    }).forEach(([key, value]) => payload.append(key, value));

    if (selectedFile) payload.append("document_file", selectedFile);
    if (removeUploadedFile) payload.append("remove_uploaded_file", "1");

    return payload;
}

export default function DocumentsPage({ refreshToken, refreshEverything }) {
    const { apiContext } = useHomeOps();
    const fileInputRef = useRef(null);
    const [documents, setDocuments] = useState([]);
    const [summary, setSummary] = useState({});
    const [form, setForm] = useState(blank);
    const [editingId, setEditingId] = useState(null);
    const [selectedFile, setSelectedFile] = useState(null);
    const [removeUploadedFile, setRemoveUploadedFile] = useState(false);
    const [dragging, setDragging] = useState(false);
    const [autoFilled, setAutoFilled] = useState(false);
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [openingId, setOpeningId] = useState(null);
    const [error, setError] = useState("");

    const load = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const json = await getDocuments(apiContext);
            setDocuments(json.documents || []);
            setSummary(json.summary || {});
        } catch (err) {
            setError(err.message || "Could not load documents.");
        } finally {
            setLoading(false);
        }
    }, [apiContext]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        load();
    }, [load, refreshToken]);

    function edit(document = null) {
        setEditingId(document?.id || null);
        setForm(document ? { ...blank, ...document, is_favourite: Boolean(document.is_favourite) } : blank);
        setSelectedFile(null);
        setRemoveUploadedFile(false);
        setAutoFilled(false);
        setDragging(false);
        setError("");
        setOpen(true);
    }

    function closeModal() {
        if (saving) return;
        setOpen(false);
        setSelectedFile(null);
        setDragging(false);
    }

    function chooseFile(file) {
        if (!file) return;
        if (file.size > MAX_FILE_SIZE) {
            setError("That file is larger than 20 MB. Choose a smaller file.");
            return;
        }

        const inferredType = inferDocumentType(file.name);
        setSelectedFile(file);
        setRemoveUploadedFile(false);
        setAutoFilled(true);
        setError("");
        setForm((current) => ({
            ...current,
            title: current.title || titleFromFilename(file.name),
            document_type: current.document_type === blank.document_type && !editingId ? inferredType : current.document_type,
            document_date: current.document_date || fileDate(file),
            file_name: file.name,
        }));
    }

    function handleDrop(event) {
        event.preventDefault();
        setDragging(false);
        chooseFile(event.dataTransfer.files?.[0]);
    }

    async function submit(event) {
        event.preventDefault();
        setSaving(true);
        setError("");

        const needsMultipart = Boolean(selectedFile || removeUploadedFile);
        const payload = needsMultipart
            ? documentFormData(form, selectedFile, removeUploadedFile)
            : {
                ...form,
                provider: form.provider || null,
                document_date: form.document_date || null,
                expires_on: form.expires_on || null,
                file_url: form.file_url || null,
                file_name: form.file_name || null,
                notes: form.notes || null,
            };

        try {
            if (editingId) await updateDocument(editingId, payload, apiContext);
            else await createDocument(payload, apiContext);
            setOpen(false);
            setSelectedFile(null);
            refreshEverything?.();
            await load();
        } catch (err) {
            setError(err.message || "Could not save document.");
        } finally {
            setSaving(false);
        }
    }

    async function remove(document) {
        if (!window.confirm(`Delete ${document.title}?`)) return;
        try {
            await deleteDocument(document.id, apiContext);
            refreshEverything?.();
            await load();
        } catch (err) {
            setError(err.message || "Could not delete document.");
        }
    }

    async function openUploadedFile(document) {
        const previewWindow = window.open("about:blank", "_blank");
        if (previewWindow) previewWindow.opener = null;
        setOpeningId(document.id);
        setError("");

        try {
            const file = await downloadDocumentFile(document.id, apiContext);
            const objectUrl = URL.createObjectURL(file.blob);

            if (previewWindow) {
                previewWindow.location.href = objectUrl;
            } else {
                const link = window.document.createElement("a");
                link.href = objectUrl;
                link.download = file.filename || document.file_name || document.title;
                link.click();
            }

            window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);
        } catch (err) {
            previewWindow?.close();
            setError(err.message || "Could not open the uploaded file.");
        } finally {
            setOpeningId(null);
        }
    }

    const editingDocument = documents.find((document) => document.id === editingId);
    const existingUpload = Boolean(editingDocument?.has_upload && !removeUploadedFile);
    const activeFileName = selectedFile?.name || (existingUpload ? editingDocument.file_name : "");
    const activeFileMeta = selectedFile
        ? [selectedFile.type || "File", formatBytes(selectedFile.size)].filter(Boolean).join(" · ")
        : existingUpload
            ? [editingDocument.mime_type || "Stored file", formatBytes(editingDocument.file_size)].filter(Boolean).join(" · ")
            : "";

    return <>
        <header className="page-header">
            <div>
                <h1>Documents</h1>
                <p>Keep warranties, condo records, insurance, manuals, tax documents, and repair paperwork together.</p>
            </div>
            <button className="page-primary-action" onClick={() => edit()}>+ Document</button>
        </header>

        <div className="document-metric-grid">
            <DocumentMetric label="Documents" value={summary.count || 0} note="property records" tone="blue" icon="documents" />
            <DocumentMetric label="Favourites" value={summary.favourites || 0} note="quick-access items" tone="violet" icon="favourite" />
            <DocumentMetric label="Expiring Soon" value={summary.expiring_soon || 0} note="within 60 days" tone="amber" icon="expiring" />
            <DocumentMetric label="Expired" value={summary.expired || 0} note="needs review" tone="red" icon="expired" />
        </div>

        <section className="panel full-panel documents-panel">
            <div className="panel-header">
                <div>
                    <h2>Document Index</h2>
                    <p className="panel-header__description">Uploaded files stay attached to this property; external links remain optional.</p>
                </div>
                <div className="panel-header__actions">
                    {loading ? <HomeOpsLoadingPill width="76px" height="38px" label="Loading document count" /> : <span className="record-count-pill">{`${documents.length} ${documents.length === 1 ? "record" : "records"}`}</span>}
                    <button className="page-primary-action page-primary-action--compact page-primary-action--icon" type="button" onClick={() => edit()} aria-label="Add document" title="Add document">+</button>
                </div>
            </div>

            {error && !open && <div className="form-error documents-page-error">{error}</div>}
            {loading && <HomeOpsLoadingSkeleton rows={3} label="Loading documents" />}
            {!loading && documents.length === 0 && <div className="documents-empty-state">
                <div className="documents-empty-state__icon"><DocumentIcon name="upload" /></div>
                <strong>Your property files can live here</strong>
                <p>Upload the actual document or save an external Drive, Dropbox, or OneDrive link.</p>
                <button className="mini-button documents-empty-state__action" type="button" onClick={() => edit()}>Add first document</button>
            </div>}

            {!loading && documents.length > 0 && <div className="record-list document-record-list">
                {documents.map((document) => <article className={`record-row document-record ${document.is_expired ? "is-alert" : ""}`} key={document.id}>
                    <div className="document-record__main">
                        <div className={`document-record__type document-record__type--${document.document_type}`}><DocumentIcon name="file" /></div>
                        <div className="document-record__content">
                            <div className="document-record__title-row">
                                <strong>{document.title}</strong>
                                {document.is_favourite && <span className="document-tag document-tag--favourite">★ Favourite</span>}
                                {document.is_expired && <span className="document-tag document-tag--expired">Expired</span>}
                                {!document.is_expired && document.expires_soon && <span className="document-tag document-tag--expiring">Expiring soon</span>}
                            </div>
                            <p>{titleCase(document.document_type)}{document.provider ? ` · ${document.provider}` : ""}{document.document_date ? ` · ${formatDate(document.document_date)}` : ""}</p>
                            <div className="document-record__file-line">
                                {document.has_upload && <span><DocumentIcon name="upload" />{document.file_name || "Uploaded file"}{document.file_size ? ` · ${formatBytes(document.file_size)}` : ""}</span>}
                                {document.file_url && <span><DocumentIcon name="link" />External link</span>}
                                {document.expires_on && <span className={document.is_expired || document.expires_soon ? "warning-text" : ""}>{document.is_expired ? "Expired" : "Expires"} {formatDate(document.expires_on)}</span>}
                            </div>
                            {document.notes && <small className="document-record__notes">{document.notes}</small>}
                        </div>
                    </div>
                    <div className="list-actions document-record__actions">
                        {document.has_upload && <button className="mini-button" type="button" disabled={openingId === document.id} onClick={() => openUploadedFile(document)}>{openingId === document.id ? "Opening…" : "Open file"}</button>}
                        {document.file_url && <a className="mini-button" href={document.file_url} target="_blank" rel="noreferrer">Open link</a>}
                        <button className="mini-button" type="button" onClick={() => edit(document)}>Edit</button>
                        <button className="mini-button danger" type="button" onClick={() => remove(document)}>Delete</button>
                    </div>
                </article>)}
            </div>}
        </section>

        <Modal active={open} onClose={closeModal} title={editingId ? "Edit Document" : "Add Document"} intro="Upload the file itself, add an external link, or keep both. File details help prefill the record." size="wide">
            <form className="form-grid document-form" onSubmit={submit}>
                {error && <div className="form-error">{error}</div>}

                <div className="span-12 document-upload-field">
                    <span className="document-form-label">Document file</span>
                    {!activeFileName && <button
                        className={`document-upload-zone ${dragging ? "is-dragging" : ""}`}
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        onDragEnter={(event) => { event.preventDefault(); setDragging(true); }}
                        onDragOver={(event) => event.preventDefault()}
                        onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setDragging(false); }}
                        onDrop={handleDrop}
                    >
                        <span className="document-upload-zone__icon"><DocumentIcon name="upload" /></span>
                        <strong>Drop a file here or browse</strong>
                        <small>PDF, images, Office files, text, and spreadsheets · up to 20 MB</small>
                    </button>}
                    {activeFileName && <div className="document-selected-file">
                        <div className="document-selected-file__icon"><DocumentIcon name="file" /></div>
                        <div>
                            <strong>{activeFileName}</strong>
                            <small>{activeFileMeta || "Ready to save"}</small>
                        </div>
                        <div className="document-selected-file__actions">
                            <button className="mini-button" type="button" onClick={() => fileInputRef.current?.click()}>Replace</button>
                            <button className="mini-button danger" type="button" onClick={() => {
                                if (selectedFile) {
                                    setSelectedFile(null);
                                    setAutoFilled(false);
                                    setRemoveUploadedFile(false);
                                    setForm((current) => ({
                                        ...current,
                                        file_name: editingDocument?.file_name || (current.file_url ? current.file_name : ""),
                                    }));
                                    return;
                                }

                                if (existingUpload) {
                                    setRemoveUploadedFile(true);
                                } else {
                                    setForm((current) => ({ ...current, file_name: "" }));
                                }
                            }}>Remove</button>
                        </div>
                    </div>}
                    {removeUploadedFile && !selectedFile && <div className="document-file-removal-note">The stored file will be removed when you save. <button type="button" onClick={() => setRemoveUploadedFile(false)}>Undo</button></div>}
                    {autoFilled && <div className="document-autofill-note">File name, title, date, and likely type were filled where possible. Review them before saving.</div>}
                    <input
                        ref={fileInputRef}
                        className="document-file-input"
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png,.webp,.heic,.doc,.docx,.xls,.xlsx,.csv,.txt,.rtf,.odt,.ods"
                        onChange={(event) => {
                            chooseFile(event.target.files?.[0]);
                            event.target.value = "";
                        }}
                    />
                </div>

                <label className="span-6"><span>Title</span><input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="e.g. Dishwasher warranty" required /></label>
                <label className="span-3"><span>Type</span><select value={form.document_type} onChange={(event) => setForm({ ...form, document_type: event.target.value })}>{DOCUMENT_TYPES.map((type) => <option key={type} value={type}>{titleCase(type)}</option>)}</select></label>
                <label className="span-3"><span>Provider</span><input value={form.provider || ""} onChange={(event) => setForm({ ...form, provider: event.target.value })} placeholder="Company or issuer" /></label>
                <label className="span-3"><span>Document Date</span><input type="date" value={form.document_date || ""} onChange={(event) => setForm({ ...form, document_date: event.target.value })} /></label>
                <label className="span-3"><span>Expires</span><input type="date" value={form.expires_on || ""} onChange={(event) => setForm({ ...form, expires_on: event.target.value })} /></label>
                <label className="span-6"><span>External URL <em>optional</em></span><input type="url" value={form.file_url || ""} onChange={(event) => setForm({ ...form, file_url: event.target.value })} placeholder="Drive, Dropbox, OneDrive, or another hosted file" /></label>
                {!selectedFile && !existingUpload && form.file_url && <label className="span-6 document-link-label"><span>Link label <em>optional</em></span><input value={form.file_name || ""} onChange={(event) => setForm({ ...form, file_name: event.target.value })} placeholder="Name shown for the external file" /></label>}
                <label className="span-12 checkbox-row document-favourite-row"><input type="checkbox" checked={Boolean(form.is_favourite)} onChange={(event) => setForm({ ...form, is_favourite: event.target.checked })} /><span>Favourite / quick access</span></label>
                <label className="span-12"><span>Notes</span><textarea value={form.notes || ""} onChange={(event) => setForm({ ...form, notes: event.target.value })} placeholder="Coverage details, account numbers, renewal notes, or anything useful later" /></label>
                <button className="primary-action span-12" disabled={saving}>{saving ? (selectedFile ? "Uploading & saving…" : "Saving…") : (selectedFile ? "Upload & Save Document" : "Save Document")}</button>
            </form>
        </Modal>
    </>;
}
