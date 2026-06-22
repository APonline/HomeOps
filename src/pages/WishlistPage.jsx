import { useCallback, useEffect, useState } from "react";
import Modal from "../components/Modal";
import { useHomeOps } from "../context/HomeOpsContext";
import {
    createWishlistItem,
    getWishlistItems,
    markWishlistPurchased,
    money,
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
};

export default function WishlistPage({ refreshToken, refreshEverything }) {
    const { apiContext } = useHomeOps();
    const [items, setItems] = useState([]);
    const [form, setForm] = useState(defaultForm);
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [activeModal, setActiveModal] = useState(null);

    const loadItems = useCallback(async () => {
        setLoading(true);
        setError("");

        try {
            const json = await getWishlistItems(apiContext);
            setItems(json.items || []);
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
            await createWishlistItem({
                title: form.title,
                item_type: form.item_type,
                room_label: form.room_label || null,
                priority: form.priority,
                estimated_cost: nullableNumber(form.estimated_cost),
                target_date: form.target_date || null,
                product_url: form.product_url || null,
                notes: form.notes || null,
            }, apiContext);

            setForm(defaultForm);
            setActiveModal(null);
            refreshEverything?.();
            await loadItems();
        } catch (err) {
            setError(err.message || "Could not save item.");
        } finally {
            setSaving(false);
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
            </header>

            <section className="panel full-panel">
                <div className="panel-header">
                    <h2>Tracked</h2>

                    <div className="panel-header__actions">
                        <span>{loading ? "loading" : `${items.length} open`}</span>
                        <button
                            className="page-primary-action page-primary-action--compact"
                            type="button"
                            onClick={() => {
                                setError("");
                                setActiveModal("item");
                            }}
                        >
                            + Item
                        </button>
                    </div>
                </div>

                {error && <div className="form-error">{error}</div>}
                {loading && <div className="empty-box">Loading needs/wants...</div>}
                {!loading && items.length === 0 && <div className="empty-box">No needs/wants yet. Add one with + Item.</div>}

                <div className="record-list">
                    {items.map((item) => (
                        <article className="record-row" key={item.id}>
                            <div>
                                <strong>{item.title}</strong>
                                <p>{item.item_type} · {item.room_label || "No room"} · {item.status}</p>
                                {item.product_url && <small className="url-text">{item.product_url}</small>}
                            </div>
                            <div className="list-actions">
                                <span className={item.priority === "high" || item.priority === "urgent" ? "priority high" : "priority"}>{item.priority}</span>
                                {item.estimated_cost ? <b>{money(item.estimated_cost)}</b> : null}
                                <button className="mini-button" onClick={() => purchased(item)}>Purchased</button>
                            </div>
                        </article>
                    ))}
                </div>
            </section>

            <Modal active={activeModal === "item"} onClose={() => setActiveModal(null)} title="Add Need / Want">
                <form className="form-grid" onSubmit={submit}>
                    {error && <div className="form-error">{error}</div>}

                    <label className="span-6"><span>Title</span><input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Air filters" required /></label>
                    <label className="span-3"><span>Type</span><select value={form.item_type} onChange={(event) => setForm({ ...form, item_type: event.target.value })}><option value="need">Need</option><option value="want">Want</option></select></label>
                    <label className="span-3"><span>Priority</span><select value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value })}><option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option><option value="urgent">Urgent</option></select></label>
                    <label className="span-4"><span>Room</span><input value={form.room_label} onChange={(event) => setForm({ ...form, room_label: event.target.value })} placeholder="Furnace / Balcony / Living" /></label>
                    <label className="span-4"><span>Estimated Cost</span><input value={form.estimated_cost} onChange={(event) => setForm({ ...form, estimated_cost: event.target.value })} type="number" step="0.01" placeholder="25" /></label>
                    <label className="span-4"><span>Target Date</span><input value={form.target_date} onChange={(event) => setForm({ ...form, target_date: event.target.value })} type="date" /></label>
                    <label className="span-12"><span>Link</span><input value={form.product_url} onChange={(event) => setForm({ ...form, product_url: event.target.value })} placeholder="https://..." /></label>
                    <label className="span-12"><span>Notes</span><textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></label>
                    <button className="primary-action span-12" disabled={saving}>{saving ? "Saving..." : "Save Item"}</button>
                </form>
            </Modal>
        </>
    );
}
