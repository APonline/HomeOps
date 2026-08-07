import { useCallback, useEffect, useState } from "react";
import Modal from "../components/Modal";
import HomeOpsLoadingSkeleton, { HomeOpsLoadingPill } from "../components/HomeOpsLoadingSkeleton";
import { useHomeOps } from "../context/HomeOpsContext";
import {
    createWishlistItem,
    deleteWishlistItem,
    getWishlistItems,
    markWishlistPurchased,
    money,
    updateWishlistItem,
    nullableNumber,
} from "../lib/homeopsApi";

const defaultForm = {
    title: "",
    item_type: "need",
    room_label: "",
    priority: "normal",
    estimated_cost: "",
    target_date: "",
    product_url: "",
    notes: "",
    status: "idea",
};

export default function WishlistPage({ refreshToken, refreshEverything }) {
    const { apiContext } = useHomeOps();
    const [items, setItems] = useState([]);
    const [contextSummary, setContextSummary] = useState(null);
    const [form, setForm] = useState(defaultForm);
    const [saving, setSaving] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [deletingId, setDeletingId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [activeModal, setActiveModal] = useState(null);

    const loadItems = useCallback(async () => {
        setLoading(true);
        setError("");

        try {
            const json = await getWishlistItems(apiContext);
            setItems(json.items || []);
            setContextSummary(json.context || null);
        } catch (err) {
            setError(err.message || "Could not load needs/wants.");
        } finally {
            setLoading(false);
        }
    }, [apiContext]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        loadItems();
    }, [loadItems, refreshToken]);

    async function submit(event) {
        event.preventDefault();
        setSaving(true);
        setError("");

        try {
            const payload = {
                title: form.title,
                item_type: form.item_type,
                room_label: form.room_label || null,
                priority: form.priority,
                estimated_cost: nullableNumber(form.estimated_cost),
                target_date: form.target_date || null,
                product_url: form.product_url || null,
                notes: form.notes || null,
                status: form.status || "idea",
            };
            if (editingId) await updateWishlistItem(editingId, payload, apiContext);
            else await createWishlistItem(payload, apiContext);

            setForm(defaultForm);
            setEditingId(null);
            setActiveModal(null);
            refreshEverything?.();
            await loadItems();
        } catch (err) {
            setError(err.message || "Could not save item.");
        } finally {
            setSaving(false);
        }
    }

    function openCreate() {
        setEditingId(null);
        setForm(defaultForm);
        setError("");
        setActiveModal("item");
    }

    function openEdit(item) {
        setEditingId(item.id);
        setForm({
            title: item.title || "",
            item_type: item.item_type || "need",
            room_label: item.room_label || "",
            priority: item.priority || "normal",
            estimated_cost: item.estimated_cost ?? "",
            target_date: item.target_date || "",
            product_url: item.product_url || "",
            notes: item.notes || "",
            status: item.status || "idea",
        });
        setError("");
        setActiveModal("item");
    }

    async function remove(item) {
        if (!window.confirm(`Delete “${item.title}”?`)) return;
        setDeletingId(item.id);
        setError("");
        try {
            await deleteWishlistItem(item.id, apiContext);
            refreshEverything?.();
            await loadItems();
        } catch (err) {
            setError(err.message || "Could not delete item.");
        } finally {
            setDeletingId(null);
        }
    }

    async function purchased(item) {
        setError("");

        try {
            await markWishlistPurchased(item.id, {}, apiContext);
            refreshEverything?.();
            await loadItems();
        } catch (err) {
            setError(err.message || "Could not mark purchased.");
        }
    }

    return (
        <>
            <header className="page-header">
                <div>
                    <h1>Needs & Wants</h1>
                    <p>Separate survival stuff from dopamine stuff. Track cost, room, priority, and status.</p>
                </div>
                <button
                    className="page-primary-action"
                    type="button"
                    onClick={openCreate}
                >
                    + Item
                </button>
            </header>

            <section className="panel full-panel">
                <div className="panel-header">
                    <h2>Tracked</h2>

                    <div className="panel-header__actions">
                        {loading ? <HomeOpsLoadingPill label="Loading item count" /> : <span>{`${items.length} open`}</span>}
                        <button
                            className="page-primary-action page-primary-action--compact page-primary-action--icon"
                            type="button"
                            onClick={openCreate}
                            aria-label="Add item"
                            title="Add item"
                        >
                            +
                        </button>
                    </div>
                </div>

                {error && <div className="form-error">{error}</div>}

                {contextSummary && (
                    <div className="v0-context-strip">
                        <span>{contextSummary.targeted_in_period || 0} targeted in selected context</span>
                        <span>{contextSummary.past_target || 0} past target</span>
                        <span>{contextSummary.tracked || 0} tracked total</span>
                    </div>
                )}

                {loading && <HomeOpsLoadingSkeleton rows={3} label="Loading needs and wants" />}
                {!loading && items.length === 0 && <div className="empty-box">No needs/wants yet. Add one with + Item.</div>}

                <div className="record-list">
                    {items.map((item) => (
                        <article className="record-row" key={item.id}>
                            <div>
                                <strong>{item.title}</strong>
                                <p>{item.item_type} · {item.room_label || "No room"} · {item.status}</p>
                                {item.product_url && <small className="url-text">{item.product_url}</small>}
                                {item.timing_label && <small className="v0-record-context">{item.timing_label}</small>}
                            </div>
                            <div className="list-actions">
                                <span className={item.priority === "high" || item.priority === "urgent" ? "priority high" : "priority"}>{item.priority}</span>
                                {item.estimated_cost ? <b>{money(item.estimated_cost)}</b> : null}
                                <button className="mini-button" type="button" onClick={() => openEdit(item)}>Edit</button>
                                <button className="mini-button" type="button" onClick={() => purchased(item)}>Purchased</button>
                                <button className="mini-button danger" type="button" onClick={() => remove(item)} disabled={deletingId === item.id}>{deletingId === item.id ? "…" : "Delete"}</button>
                            </div>
                        </article>
                    ))}
                </div>
            </section>

            <Modal active={activeModal === "item"} onClose={() => setActiveModal(null)} title={editingId ? "Edit Need / Want" : "Add Need / Want"}>
                <form className="form-grid" onSubmit={submit}>
                    {error && <div className="form-error">{error}</div>}

                    <label className="span-6"><span>Title</span><input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Air filters" required /></label>
                    <label className="span-3"><span>Type</span><select value={form.item_type} onChange={(event) => setForm({ ...form, item_type: event.target.value })}><option value="need">Need</option><option value="want">Want</option></select></label>
                    <label className="span-3"><span>Priority</span><select value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value })}><option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option><option value="urgent">Urgent</option></select></label>
                    {editingId && <label className="span-3"><span>Status</span><select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}><option value="idea">Idea</option><option value="researching">Researching</option><option value="planned">Planned</option><option value="purchased">Purchased</option></select></label>}
                    <label className={editingId ? "span-3" : "span-4"}><span>Room</span><input value={form.room_label} onChange={(event) => setForm({ ...form, room_label: event.target.value })} placeholder="Furnace / Balcony / Living" /></label>
                    <label className={editingId ? "span-3" : "span-4"}><span>Estimated Cost</span><input value={form.estimated_cost} onChange={(event) => setForm({ ...form, estimated_cost: event.target.value })} type="number" step="0.01" placeholder="25" /></label>
                    <label className={editingId ? "span-3" : "span-4"}><span>Target Date</span><input value={form.target_date} onChange={(event) => setForm({ ...form, target_date: event.target.value })} type="date" /></label>
                    <label className="span-12"><span>Link</span><input value={form.product_url} onChange={(event) => setForm({ ...form, product_url: event.target.value })} placeholder="https://..." /></label>
                    <label className="span-12"><span>Notes</span><textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></label>
                    <button className="primary-action span-12" disabled={saving}>{saving ? "Saving..." : editingId ? "Update Item" : "Save Item"}</button>
                </form>
            </Modal>
        </>
    );
}
