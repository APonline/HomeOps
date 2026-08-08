/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useMemo, useRef, useState } from "react";
import Modal from "./Modal";
import {
    cancelReceiptScan,
    commitReceiptScan,
    getHomeAssets,
    getHomeRooms,
    nullableNumber,
    scanReceipt,
    todayIso,
} from "../lib/homeopsApi";

const blankReview = {
    vendor: "",
    date: todayIso(),
    subtotal: "",
    tax: "",
    tip: "",
    total: "",
    currency: "CAD",
    payment_method: "",
    category: "Uncategorized Spending",
    receipt_number: "",
    notes: "",
    room_id: "",
    asset_id: "",
    line_items: [],
    confirm_duplicate: false,
};

function numberValue(value) {
    return value === null || value === undefined ? "" : String(value);
}

function reviewFromExtraction(extracted = {}) {
    return {
        vendor: extracted.vendor || "",
        date: extracted.receipt_date || todayIso(),
        subtotal: numberValue(extracted.subtotal),
        tax: numberValue(extracted.tax),
        tip: numberValue(extracted.tip),
        total: numberValue(extracted.total),
        currency: extracted.currency || "CAD",
        payment_method: extracted.payment_method || "",
        category: extracted.category || "Uncategorized Spending",
        receipt_number: extracted.receipt_number || "",
        notes: extracted.notes || "",
        room_id: "",
        asset_id: "",
        line_items: Array.isArray(extracted.line_items) ? extracted.line_items.map((item) => ({
            description: item.description || "",
            quantity: numberValue(item.quantity),
            unit_price: numberValue(item.unit_price),
            line_total: numberValue(item.line_total),
            category_hint: item.category_hint || "",
        })) : [],
        confirm_duplicate: false,
    };
}

async function normalizeReceiptImage(file) {
    const directTypes = ["image/jpeg", "image/png", "image/webp"];
    if (directTypes.includes(file.type) && file.size <= 8 * 1024 * 1024) return file;

    const objectUrl = URL.createObjectURL(file);
    try {
        const image = new Image();
        image.decoding = "async";
        image.src = objectUrl;
        await image.decode();

        const maxEdge = 2400;
        const scale = Math.min(maxEdge / Math.max(image.naturalWidth, image.naturalHeight), 1);
        const width = Math.max(1, Math.round(image.naturalWidth * scale));
        const height = Math.max(1, Math.round(image.naturalHeight * scale));
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext("2d", { alpha: false });
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, width, height);
        context.drawImage(image, 0, 0, width, height);

        const blob = await new Promise((resolve, reject) => {
            canvas.toBlob((result) => result ? resolve(result) : reject(new Error("Could not prepare this image.")), "image/jpeg", 0.9);
        });

        const baseName = file.name.replace(/\.[^.]+$/, "") || "receipt";
        return new File([blob], `${baseName}.jpg`, { type: "image/jpeg", lastModified: Date.now() });
    } finally {
        URL.revokeObjectURL(objectUrl);
    }
}

function prefersCameraCapture() {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
    return window.matchMedia("(hover: none) and (pointer: coarse)").matches;
}

function confidenceLabel(value) {
    const percent = Math.round(Number(value || 0) * 100);
    if (percent >= 85) return { percent, label: "High confidence", tone: "good" };
    if (percent >= 60) return { percent, label: "Review recommended", tone: "warning" };
    return { percent, label: "Manual review needed", tone: "danger" };
}

export default function ReceiptScannerModal({ active, onClose, apiContext, onSaved }) {
    const cameraInput = useRef(null);
    const fileInput = useRef(null);
    const [stage, setStage] = useState("capture");
    const [file, setFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState("");
    const [scan, setScan] = useState(null);
    const [review, setReview] = useState(blankReview);
    const [duplicates, setDuplicates] = useState([]);
    const [warnings, setWarnings] = useState([]);
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);
    const [dragging, setDragging] = useState(false);
    const [rooms, setRooms] = useState([]);
    const [assets, setAssets] = useState([]);
    const [cameraPreferred, setCameraPreferred] = useState(prefersCameraCapture);

    const confidence = useMemo(() => confidenceLabel(scan?.confidence), [scan]);
    const exactDuplicate = duplicates.some((candidate) => candidate.match_type === "exact_file");

    useEffect(() => {
        if (typeof window === "undefined" || typeof window.matchMedia !== "function") return undefined;
        const media = window.matchMedia("(hover: none) and (pointer: coarse)");
        const update = () => setCameraPreferred(media.matches);
        update();
        media.addEventListener?.("change", update);
        return () => media.removeEventListener?.("change", update);
    }, []);

    useEffect(() => {
        if (!active || !apiContext?.homeId) return undefined;
        let current = true;
        Promise.all([getHomeRooms(apiContext.homeId), getHomeAssets(apiContext.homeId)])
            .then(([roomJson, assetJson]) => {
                if (!current) return;
                setRooms(roomJson.rooms || []);
                setAssets(assetJson.assets || []);
            })
            .catch(() => {
                if (!current) return;
                setRooms([]);
                setAssets([]);
            });
        return () => { current = false; };
    }, [active, apiContext?.homeId]);

    useEffect(() => {
        if (!file) {
            setPreviewUrl("");
            return undefined;
        }
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
        return () => URL.revokeObjectURL(url);
    }, [file]);

    useEffect(() => {
        if (active) return;
        setStage("capture");
        setFile(null);
        setScan(null);
        setReview(blankReview);
        setDuplicates([]);
        setWarnings([]);
        setError("");
        setBusy(false);
    }, [active]);

    async function chooseFile(candidate) {
        if (!candidate) return;
        if (!String(candidate.type || "").startsWith("image/")) {
            setError("Choose a photo or image of the receipt.");
            return;
        }

        setError("");
        setBusy(true);
        try {
            const normalized = await normalizeReceiptImage(candidate);
            setFile(normalized);
            setStage("capture");
        } catch (err) {
            setError(err.message || "This image could not be prepared. Try taking a new photo.");
        } finally {
            setBusy(false);
        }
    }

    async function resetCapture() {
        if (scan?.id) {
            try {
                await cancelReceiptScan(scan.id, apiContext);
            } catch {
                // Temporary scans also expire server-side; resetting should remain usable offline.
            }
        }
        setScan(null);
        setReview(blankReview);
        setDuplicates([]);
        setWarnings([]);
        setFile(null);
        setError("");
        setStage("capture");
        if (cameraInput.current) cameraInput.current.value = "";
        if (fileInput.current) fileInput.current.value = "";
    }

    async function analyze() {
        if (!file) return;
        setBusy(true);
        setError("");
        setStage("scanning");
        try {
            const json = await scanReceipt(file, apiContext);
            setScan(json.scan);
            setReview(reviewFromExtraction(json.extracted));
            setDuplicates(json.duplicate_candidates || []);
            setWarnings(json.warnings || []);
            setStage("review");
        } catch (err) {
            setError(err.message || "The receipt could not be scanned.");
            setStage("capture");
        } finally {
            setBusy(false);
        }
    }

    async function closeScanner() {
        if (scan?.id && stage !== "saved") {
            try {
                await cancelReceiptScan(scan.id, apiContext);
            } catch {
                // The scan expires automatically. Closing should never trap the user in the modal.
            }
        }
        onClose?.();
    }

    function updateLineItem(index, field, value) {
        setReview((current) => ({
            ...current,
            line_items: current.line_items.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item),
        }));
    }

    function addLineItem() {
        setReview((current) => ({
            ...current,
            line_items: [...current.line_items, { description: "", quantity: "", unit_price: "", line_total: "", category_hint: "" }],
        }));
    }

    function removeLineItem(index) {
        setReview((current) => ({
            ...current,
            line_items: current.line_items.filter((_, itemIndex) => itemIndex !== index),
        }));
    }

    async function save(event) {
        event.preventDefault();
        if (!scan?.id) return;
        setBusy(true);
        setError("");
        try {
            await commitReceiptScan(scan.id, {
                vendor: review.vendor.trim(),
                date: review.date,
                subtotal: nullableNumber(review.subtotal),
                tax: nullableNumber(review.tax),
                tip: nullableNumber(review.tip),
                total: nullableNumber(review.total),
                currency: review.currency || "CAD",
                payment_method: review.payment_method.trim() || null,
                category: review.category.trim() || "Uncategorized Spending",
                receipt_number: review.receipt_number.trim() || null,
                notes: review.notes.trim() || null,
                room_id: review.room_id ? Number(review.room_id) : null,
                asset_id: review.asset_id ? Number(review.asset_id) : null,
                confirm_duplicate: review.confirm_duplicate,
                line_items: review.line_items
                    .filter((item) => item.description.trim())
                    .map((item) => ({
                        description: item.description.trim(),
                        quantity: nullableNumber(item.quantity),
                        unit_price: nullableNumber(item.unit_price),
                        line_total: nullableNumber(item.line_total),
                        category_hint: item.category_hint.trim() || null,
                    })),
            }, apiContext);
            setStage("saved");
            await onSaved?.();
        } catch (err) {
            setError(err.message || "The verified receipt could not be saved.");
        } finally {
            setBusy(false);
        }
    }

    return (
        <Modal active={active} onClose={closeScanner} title="Scan a Receipt" size="wide" intro="Photograph it, review the extracted values, then save one verified receipt and linked transaction.">
            <div className={`receipt-scanner receipt-scanner--${stage}`}>
                {error && <div className="form-error">{error}</div>}

                {stage === "capture" && (
                    <>
                        <div
                            className={`receipt-capture-zone ${dragging ? "is-dragging" : ""} ${file ? "has-file" : ""}`}
                            onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
                            onDragLeave={() => setDragging(false)}
                            onDrop={(event) => {
                                event.preventDefault();
                                setDragging(false);
                                chooseFile(event.dataTransfer.files?.[0]);
                            }}
                        >
                            {previewUrl ? (
                                <img src={previewUrl} alt="Receipt ready to scan" />
                            ) : (
                                <div className="receipt-capture-zone__empty">
                                    <span className="receipt-capture-zone__icon">⌁</span>
                                    <strong>{cameraPreferred ? "Photograph the entire receipt" : "Upload a receipt image"}</strong>
                                    <p>{cameraPreferred
                                        ? "HomeOps will open your rear camera. Use even light, avoid glare, and keep the total visible."
                                        : "Drop a JPG, PNG, or WebP here, or choose a file from your computer."}</p>
                                </div>
                            )}
                        </div>

                        <div className={`receipt-capture-actions ${cameraPreferred ? "is-camera-device" : "is-upload-device"}`}>
                            <input ref={cameraInput} className="receipt-file-input" type="file" accept="image/*" capture="environment" onChange={(event) => chooseFile(event.target.files?.[0])} />
                            <input ref={fileInput} className="receipt-file-input" type="file" accept="image/*" onChange={(event) => chooseFile(event.target.files?.[0])} />
                            {cameraPreferred ? (
                                <>
                                    <button className="primary-action receipt-camera-action" type="button" onClick={() => cameraInput.current?.click()} disabled={busy}>Take Receipt Photo</button>
                                    <button className="secondary-action receipt-library-action" type="button" onClick={() => fileInput.current?.click()} disabled={busy}>Choose Existing Photo</button>
                                </>
                            ) : (
                                <button className="primary-action receipt-upload-action" type="button" onClick={() => fileInput.current?.click()} disabled={busy}>Upload Receipt Image</button>
                            )}
                            {file && <button className="receipt-scan-action" type="button" onClick={analyze} disabled={busy}>{busy ? "Preparing…" : "Extract Receipt Data"}</button>}
                            {!file && <small className="receipt-capture-actions__hint">{cameraPreferred ? "Uses the rear-facing camera when your browser supports it." : "You can also drag and drop the receipt image above."}</small>}
                        </div>
                    </>
                )}

                {stage === "scanning" && (
                    <div className="receipt-scanning-state">
                        {previewUrl && <img src={previewUrl} alt="Receipt being scanned" />}
                        <div className="receipt-scanning-state__copy">
                            <span className="receipt-scan-spinner" />
                            <strong>Reading the receipt</strong>
                            <p>Finding the vendor, date, totals, tax, payment method, and line items.</p>
                        </div>
                    </div>
                )}

                {stage === "review" && (
                    <form className="receipt-review" onSubmit={save}>
                        <aside className="receipt-review__preview">
                            {previewUrl && <img src={previewUrl} alt="Scanned receipt" />}
                            <div className={`receipt-confidence receipt-confidence--${confidence.tone}`}>
                                <span>{confidence.label}</span>
                                <strong>{confidence.percent}%</strong>
                                <small>{scan?.provider === "manual" ? "Manual entry mode" : scan?.provider}</small>
                            </div>
                            {warnings.map((warning) => <p className="receipt-scan-warning" key={warning}>{warning}</p>)}
                        </aside>

                        <div className="receipt-review__form form-grid">
                            <label className="span-6"><span>Vendor</span><input value={review.vendor} onChange={(e) => setReview({ ...review, vendor: e.target.value })} required /></label>
                            <label className="span-3"><span>Date</span><input type="date" value={review.date} onChange={(e) => setReview({ ...review, date: e.target.value })} required /></label>
                            <label className="span-3"><span>Total</span><input type="number" min="0" step="0.01" value={review.total} onChange={(e) => setReview({ ...review, total: e.target.value })} required /></label>
                            <label className="span-3"><span>Subtotal</span><input type="number" min="0" step="0.01" value={review.subtotal} onChange={(e) => setReview({ ...review, subtotal: e.target.value })} /></label>
                            <label className="span-3"><span>Tax</span><input type="number" min="0" step="0.01" value={review.tax} onChange={(e) => setReview({ ...review, tax: e.target.value })} /></label>
                            <label className="span-3"><span>Tip</span><input type="number" min="0" step="0.01" value={review.tip} onChange={(e) => setReview({ ...review, tip: e.target.value })} /></label>
                            <label className="span-3"><span>Currency</span><input maxLength="3" value={review.currency} onChange={(e) => setReview({ ...review, currency: e.target.value.toUpperCase() })} /></label>
                            <label className="span-6"><span>Category</span><input value={review.category} onChange={(e) => setReview({ ...review, category: e.target.value })} /></label>
                            <label className="span-3"><span>Payment</span><input value={review.payment_method} onChange={(e) => setReview({ ...review, payment_method: e.target.value })} placeholder="Visa, debit, cash…" /></label>
                            <label className="span-3"><span>Receipt #</span><input value={review.receipt_number} onChange={(e) => setReview({ ...review, receipt_number: e.target.value })} /></label>
                            <label className="span-6"><span>Room (optional)</span><select value={review.room_id} onChange={(e) => setReview({ ...review, room_id: e.target.value, asset_id: "" })}><option value="">Whole property / none</option>{rooms.map((room) => <option key={room.id} value={room.id}>{room.name}</option>)}</select></label>
                            <label className="span-6"><span>Asset (optional)</span><select value={review.asset_id} onChange={(e) => { const asset = assets.find((item) => String(item.id) === e.target.value); setReview({ ...review, asset_id: e.target.value, room_id: asset?.room_id ? String(asset.room_id) : review.room_id }); }}><option value="">No linked asset</option>{assets.filter((asset) => !review.room_id || String(asset.room_id || "") === String(review.room_id)).map((asset) => <option key={asset.id} value={asset.id}>{asset.name}{asset.room_name ? ` · ${asset.room_name}` : ""}</option>)}</select></label>

                            {duplicates.length > 0 && (
                                <div className="receipt-duplicate-alert span-12">
                                    <strong>{exactDuplicate ? "Exact receipt image already found" : "Possible duplicate found"}</strong>
                                    {duplicates.map((candidate) => <span key={candidate.id}>{candidate.vendor} · {candidate.date} · ${Number(candidate.total).toFixed(2)}</span>)}
                                    {exactDuplicate && (
                                        <label className="receipt-duplicate-confirm">
                                            <input type="checkbox" checked={review.confirm_duplicate} onChange={(event) => setReview({ ...review, confirm_duplicate: event.target.checked })} />
                                            <span>Save this as a separate record anyway</span>
                                        </label>
                                    )}
                                </div>
                            )}

                            <div className="receipt-line-items span-12">
                                <div className="receipt-line-items__header">
                                    <div><strong>Line items</strong><p>Optional, but useful for warranty, project, and spending history.</p></div>
                                    <button className="mini-button" type="button" onClick={addLineItem}>+ Item</button>
                                </div>
                                <div className="receipt-line-items__list">
                                    {review.line_items.length === 0 && <div className="receipt-line-items__empty">No itemized rows detected. The receipt can still be saved.</div>}
                                    {review.line_items.map((item, index) => (
                                        <div className="receipt-line-item" key={`${index}-${item.description}`}>
                                            <input className="receipt-line-item__description" value={item.description} onChange={(e) => updateLineItem(index, "description", e.target.value)} placeholder="Item description" />
                                            <input type="number" min="0" step="0.001" value={item.quantity} onChange={(e) => updateLineItem(index, "quantity", e.target.value)} placeholder="Qty" />
                                            <input type="number" min="0" step="0.01" value={item.unit_price} onChange={(e) => updateLineItem(index, "unit_price", e.target.value)} placeholder="Each" />
                                            <input type="number" min="0" step="0.01" value={item.line_total} onChange={(e) => updateLineItem(index, "line_total", e.target.value)} placeholder="Total" />
                                            <button className="mini-button danger" type="button" onClick={() => removeLineItem(index)} aria-label="Remove line item">×</button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <label className="span-12"><span>Notes</span><textarea value={review.notes} onChange={(e) => setReview({ ...review, notes: e.target.value })} placeholder="Warranty, return window, project, room, or anything worth remembering…" /></label>
                            <div className="receipt-review__actions span-12">
                                <button className="secondary-action" type="button" onClick={resetCapture} disabled={busy}>Use Another Image</button>
                                <button className="primary-action" disabled={busy || (exactDuplicate && !review.confirm_duplicate)}>{busy ? "Saving…" : "Verify & Log Receipt"}</button>
                            </div>
                        </div>
                    </form>
                )}

                {stage === "saved" && (
                    <div className="receipt-saved-state">
                        <span>✓</span>
                        <strong>Receipt logged</strong>
                        <p>The image, extracted details, line items, and linked transaction are now in HomeOps.</p>
                        <button className="primary-action" type="button" onClick={onClose}>Done</button>
                    </div>
                )}
            </div>
        </Modal>
    );
}
