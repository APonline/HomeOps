import { useCallback, useEffect, useState } from "react";
import Modal from "../components/Modal";
import { useHomeOps } from "../context/HomeOpsContext";
import {
    completeMaintenanceItem,
    createMaintenanceItem,
    getMaintenanceItems,
    money,
    nullableNumber,
    todayIso,
} from "../lib/homeopsApi";

const defaultForm = {
    name: "",
    location_label: "",
    frequency_count: "",
    frequency_unit: "months",
    next_due_date: "",
    estimated_cost: "",
    priority: "normal",
    instructions: "",
    notes: "",
};

export default function MaintenancePage({ refreshToken, refreshEverything }) {
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
            const json = await getMaintenanceItems(apiContext);
            setItems(json.items || []);
        } catch (err) {
            setError(err.message || "Could not load maintenance.");
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
            await createMaintenanceItem({
                name: form.name,
                location_label: form.location_label || null,
                frequency_count: nullableNumber(form.frequency_count),
                frequency_unit: form.frequency_unit,
                next_due_date: form.next_due_date || null,
                estimated_cost: nullableNumber(form.estimated_cost),
                priority: form.priority,
                instructions: form.instructions || null,
                notes: form.notes || null,
            }, apiContext);

            setForm(defaultForm);
            setActiveModal(null);
            refreshEverything?.();
            await loadItems();
        } catch (err) {
            setError(err.message || "Could not save maintenance item.");
        } finally {
            setSaving(false);
        }
    }

    async function complete(item) {
        setError("");

        try {
            await completeMaintenanceItem(item.id, {
                completed_date: todayIso(),
                cost_amount: item.estimated_cost || null,
                notes: "Completed from HomeOps MVP.",
            }, apiContext);

            refreshEverything?.();
            await loadItems();
        } catch (err) {
            setError(err.message || "Could not complete item.");
        }
    }

    return (
        <>
            <header className="page-header">
                <div>
                    <h1>Maintenance</h1>
                    <p>Filters, smoke detectors, HVAC stuff, warranties, and “don’t forget this or future you suffers.”</p>
                </div>
            </header>

            <section className="panel full-panel">
                <div className="panel-header">
                    <h2>Tracked</h2>

                    <div className="panel-header__actions">
                        <span>{loading ? "loading" : `${items.length} active`}</span>
                        <button
                            className="page-primary-action page-primary-action--compact"
                            type="button"
                            onClick={() => {
                                setError("");
                                setActiveModal("maintenance");
                            }}
                        >
                            + Maintenance
                        </button>
                    </div>
                </div>

                {error && <div className="form-error">{error}</div>}
                {loading && <div className="empty-box">Loading maintenance...</div>}
                {!loading && items.length === 0 && <div className="empty-box">No maintenance items yet. Add one with + Maintenance.</div>}

                <div className="record-list">
                    {items.map((item) => (
                        <article className="record-row" key={item.id}>
                            <div>
                                <strong>{item.name}</strong>
                                <p>{item.location_label || "Maintenance"} · next due {item.next_due_date || "TBD"}</p>
                                <small className={item.priority === "high" || item.priority === "urgent" ? "priority high" : "priority"}>{item.priority}</small>
                            </div>
                            <div className="list-actions">
                                {item.estimated_cost ? <b>{money(item.estimated_cost)}</b> : null}
                                <button className="mini-button" onClick={() => complete(item)}>Done</button>
                            </div>
                        </article>
                    ))}
                </div>
            </section>

            <Modal active={activeModal === "maintenance"} onClose={() => setActiveModal(null)} title="Add Maintenance">
                <form className="form-grid" onSubmit={submit}>
                    {error && <div className="form-error">{error}</div>}

                    <label className="span-6"><span>Name</span><input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Replace air filter" required /></label>
                    <label className="span-6"><span>Location</span><input value={form.location_label} onChange={(event) => setForm({ ...form, location_label: event.target.value })} placeholder="Furnace / HVAC" /></label>
                    <label className="span-3"><span>Every</span><input value={form.frequency_count} onChange={(event) => setForm({ ...form, frequency_count: event.target.value })} type="number" placeholder="3" /></label>
                    <label className="span-3"><span>Unit</span><select value={form.frequency_unit} onChange={(event) => setForm({ ...form, frequency_unit: event.target.value })}><option value="days">Days</option><option value="weeks">Weeks</option><option value="months">Months</option><option value="years">Years</option><option value="as_needed">As needed</option></select></label>
                    <label className="span-3"><span>Next Due</span><input type="date" value={form.next_due_date} onChange={(event) => setForm({ ...form, next_due_date: event.target.value })} /></label>
                    <label className="span-3"><span>Cost</span><input value={form.estimated_cost} onChange={(event) => setForm({ ...form, estimated_cost: event.target.value })} type="number" step="0.01" placeholder="25" /></label>
                    <label className="span-12"><span>Priority</span><select value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value })}><option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option><option value="urgent">Urgent</option></select></label>
                    <label className="span-12"><span>Notes / Instructions</span><textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} placeholder="Filter size, where it goes, what to buy..." /></label>
                    <button className="primary-action span-12" disabled={saving}>{saving ? "Saving..." : "Save Maintenance"}</button>
                </form>
            </Modal>
        </>
    );
}
