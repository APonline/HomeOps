import { useCallback, useEffect, useMemo, useState } from "react";
import Modal from "../components/Modal";
import { useHomeOps } from "../context/HomeOpsContext";
import {
    completeMaintenanceItem,
    createMaintenanceItem,
    getHomeRooms,
    getMaintenanceItems,
    money,
    nullableNumber,
    restockMaintenanceItem,
    todayIso,
    updateMaintenanceItem,
} from "../lib/homeopsApi";

const defaultForm = {
    name: "",
    location_choice: "",
    location_label: "",
    frequency_count: "",
    frequency_unit: "months",
    next_due_date: "",
    estimated_cost: "",
    priority: "normal",
    instructions: "",
    notes: "",
    tracks_inventory: false,
    quantity_on_hand: "",
    units_per_service: "1",
    pack_quantity: "",
    restock_cost: "",
    inventory_unit: "",
};

const defaultRestockForm = {
    item: null,
    quantity: "1",
    cost_amount: "",
    restocked_date: todayIso(),
    notes: "",
};

function formatDate(value) {
    if (!value) return "TBD";

    const date = new Date(`${value}T12:00:00`);
    if (Number.isNaN(date.getTime())) return value;

    return date.toLocaleDateString("en-CA", {
        year: "numeric",
        month: "short",
        day: "numeric",
    });
}

function stockLabel(item) {
    const unit = item.inventory_unit || "item";
    const quantity = Number(item.quantity_on_hand || 0);
    const services = Number(item.stock_services_remaining || 0);
    const unitLabel = quantity === 1 ? unit : `${unit}s`;
    const coverage = services === 1 ? "1 service covered" : `${services} services covered`;

    return `${quantity} ${unitLabel} on hand · ${coverage}`;
}

function priorityLabel(value) {
    const label = String(value || "normal");
    return `${label.charAt(0).toUpperCase()}${label.slice(1)}`;
}

function maintenanceItemToForm(item) {
    const hasRoom = item.room_id !== null && item.room_id !== undefined;
    const hasCustomLocation = Boolean(item.location_label);

    return {
        name: item.name || "",
        location_choice: hasRoom ? `room:${item.room_id}` : (hasCustomLocation ? "custom" : ""),
        location_label: item.location_label || "",
        frequency_count: item.frequency_count === null || item.frequency_count === undefined ? "" : String(item.frequency_count),
        frequency_unit: item.frequency_unit || "months",
        next_due_date: item.next_due_date || "",
        estimated_cost: item.estimated_cost === null || item.estimated_cost === undefined ? "" : String(item.estimated_cost),
        priority: item.priority || "normal",
        instructions: item.instructions || "",
        notes: item.notes || "",
        tracks_inventory: Boolean(item.tracks_inventory),
        quantity_on_hand: item.quantity_on_hand === null || item.quantity_on_hand === undefined ? "" : String(item.quantity_on_hand),
        units_per_service: item.units_per_service === null || item.units_per_service === undefined ? "1" : String(item.units_per_service),
        pack_quantity: item.pack_quantity === null || item.pack_quantity === undefined ? "" : String(item.pack_quantity),
        restock_cost: item.restock_cost === null || item.restock_cost === undefined ? "" : String(item.restock_cost),
        inventory_unit: item.inventory_unit || "",
    };
}

export default function MaintenancePage({ refreshToken, refreshEverything }) {
    const { apiContext } = useHomeOps();
    const homeId = apiContext.homeId || apiContext.selectedHome?.id || null;
    const [items, setItems] = useState([]);
    const [rooms, setRooms] = useState([]);
    const [contextSummary, setContextSummary] = useState(null);
    const [form, setForm] = useState(defaultForm);
    const [restockForm, setRestockForm] = useState(defaultRestockForm);
    const [editingItem, setEditingItem] = useState(null);
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [activeModal, setActiveModal] = useState(null);

    const roomOptions = useMemo(
        () => rooms.map((room) => ({ value: `room:${room.id}`, label: room.name })),
        [rooms],
    );

    const loadItems = useCallback(async () => {
        setLoading(true);
        setError("");

        try {
            const [itemsJson, roomsJson] = await Promise.all([
                getMaintenanceItems(apiContext),
                homeId ? getHomeRooms(homeId) : Promise.resolve({ rooms: [] }),
            ]);

            setItems(itemsJson.items || []);
            setContextSummary(itemsJson.context || null);
            setRooms(roomsJson.rooms || []);
        } catch (err) {
            setError(err.message || "Could not load maintenance.");
        } finally {
            setLoading(false);
        }
    }, [apiContext, homeId]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        loadItems();
    }, [loadItems, refreshToken]);

    async function submit(event) {
        event.preventDefault();
        setSaving(true);
        setError("");

        const selectedRoomId = form.location_choice.startsWith("room:")
            ? Number(form.location_choice.slice(5))
            : null;
        const customLocation = form.location_choice === "custom" ? form.location_label : null;

        try {
            const payload = {
                name: form.name,
                room_id: selectedRoomId,
                location_label: customLocation || null,
                frequency_count: nullableNumber(form.frequency_count),
                frequency_unit: form.frequency_unit,
                next_due_date: form.next_due_date || null,
                estimated_cost: form.tracks_inventory ? null : nullableNumber(form.estimated_cost),
                priority: form.priority,
                instructions: form.instructions || null,
                notes: form.notes || null,
                tracks_inventory: form.tracks_inventory,
                quantity_on_hand: form.tracks_inventory ? nullableNumber(form.quantity_on_hand) || 0 : 0,
                units_per_service: form.tracks_inventory ? nullableNumber(form.units_per_service) || 1 : 1,
                pack_quantity: form.tracks_inventory ? nullableNumber(form.pack_quantity) : null,
                restock_cost: form.tracks_inventory ? nullableNumber(form.restock_cost) : null,
                inventory_unit: form.tracks_inventory ? form.inventory_unit || null : null,
            };

            if (editingItem) {
                await updateMaintenanceItem(editingItem.id, payload, apiContext);
            } else {
                await createMaintenanceItem(payload, apiContext);
            }

            setForm(defaultForm);
            setEditingItem(null);
            setActiveModal(null);
            refreshEverything?.();
            await loadItems();
        } catch (err) {
            setError(err.message || "Could not save maintenance item.");
        } finally {
            setSaving(false);
        }
    }

    function openAddMaintenance() {
        setError("");
        setEditingItem(null);
        setForm(defaultForm);
        setActiveModal("maintenance");
    }

    function openEditMaintenance(item) {
        setError("");
        setEditingItem(item);
        setForm(maintenanceItemToForm(item));
        setActiveModal("maintenance");
    }

    function closeMaintenanceModal() {
        setError("");
        setEditingItem(null);
        setForm(defaultForm);
        setActiveModal(null);
    }

    async function complete(item) {
        setError("");

        try {
            await completeMaintenanceItem(item.id, {
                completed_date: todayIso(),
                cost_amount: null,
                notes: "Maintenance completed.",
            }, apiContext);

            refreshEverything?.();
            await loadItems();
        } catch (err) {
            setError(err.message || "Could not complete item.");
        }
    }

    function openRestock(item) {
        setError("");
        setRestockForm({
            item,
            quantity: String(item.pack_quantity || 1),
            cost_amount: item.restock_cost === null || item.restock_cost === undefined
                ? ""
                : String(item.restock_cost),
            restocked_date: todayIso(),
            notes: "",
        });
        setActiveModal("restock");
    }

    async function submitRestock(event) {
        event.preventDefault();
        if (!restockForm.item) return;

        setSaving(true);
        setError("");

        try {
            await restockMaintenanceItem(restockForm.item.id, {
                quantity: nullableNumber(restockForm.quantity),
                cost_amount: nullableNumber(restockForm.cost_amount),
                restocked_date: restockForm.restocked_date || todayIso(),
                notes: restockForm.notes || null,
            }, apiContext);

            setRestockForm(defaultRestockForm);
            setActiveModal(null);
            refreshEverything?.();
            await loadItems();
        } catch (err) {
            setError(err.message || "Could not update stock.");
        } finally {
            setSaving(false);
        }
    }

    return (
        <>
            <header className="page-header">
                <div>
                    <h1>Maintenance</h1>
                    <p>Schedule recurring upkeep, track replacement stock, and know what is due next.</p>
                </div>
            </header>

            <section className="panel full-panel">
                <div className="panel-header">
                    <h2>Maintenance schedule</h2>

                    <div className="panel-header__actions">
                        <span>{loading ? "Loading" : `${items.length} active`}</span>
                        <button
                            className="page-primary-action page-primary-action--compact"
                            type="button"
                            onClick={openAddMaintenance}
                        >
                            + Maintenance
                        </button>
                    </div>
                </div>

                {error && <div className="form-error">{error}</div>}

                {contextSummary && (
                    <div className="v0-context-strip maintenance-summary-strip">
                        <span>{contextSummary.due_in_period || 0} due in view</span>
                        <span>{contextSummary.overdue || 0} overdue</span>
                        <span>{contextSummary.needs_restock || 0} need stock</span>
                    </div>
                )}

                {loading && <div className="empty-box">Loading maintenance...</div>}
                {!loading && items.length === 0 && <div className="empty-box">No maintenance items yet. Add your first recurring task.</div>}

                <div className="record-list maintenance-record-list">
                    {items.map((item) => {
                        const location = item.room_name || item.location_label || "Whole property";
                        const cost = item.tracks_inventory ? item.restock_cost : item.estimated_cost;

                        return (
                            <article className={`record-row maintenance-record ${item.needs_restock ? "needs-stock" : ""}`} key={item.id}>
                                <div>
                                    <strong>{item.name}</strong>
                                    <p>{location} · next due {formatDate(item.next_due_date)}</p>
                                    <div className="maintenance-record__meta">
                                        <small className={`priority priority--${item.priority || "normal"}`}>{priorityLabel(item.priority)}</small>
                                        {item.tracks_inventory && (
                                            <small className={item.needs_restock ? "stock-state stock-state--low" : "stock-state"}>
                                                {item.needs_restock ? "Restock before next service" : stockLabel(item)}
                                            </small>
                                        )}
                                        {!item.tracks_inventory && item.timing_label && <small className="v0-record-context">{item.timing_label}</small>}
                                    </div>
                                </div>
                                <div className="list-actions maintenance-record__actions">
                                    {cost ? (
                                        <span className="maintenance-cost">
                                            <small>{item.tracks_inventory ? "restock" : "estimate"}</small>
                                            <b>{money(cost)}</b>
                                        </span>
                                    ) : null}
                                    {item.tracks_inventory && <button className="mini-button" type="button" onClick={() => openRestock(item)}>+ Stock</button>}
                                    <button className="mini-button" type="button" onClick={() => openEditMaintenance(item)}>Edit</button>
                                    <button className="mini-button" type="button" onClick={() => complete(item)}>Done</button>
                                </div>
                            </article>
                        );
                    })}
                </div>
            </section>

            <Modal
                active={activeModal === "maintenance"}
                onClose={closeMaintenanceModal}
                title={editingItem ? "Edit Maintenance" : "Add Maintenance"}
                size="wide"
            >
                <form className="form-grid" onSubmit={submit}>
                    {error && <div className="form-error">{error}</div>}

                    <label className="span-6"><span>Name</span><input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Air filter" required /></label>
                    <label className="span-6">
                        <span>Location</span>
                        <select value={form.location_choice} onChange={(event) => setForm({ ...form, location_choice: event.target.value })}>
                            <option value="">Whole property</option>
                            {roomOptions.map((room) => <option value={room.value} key={room.value}>{room.label}</option>)}
                            <option value="custom">Other location...</option>
                        </select>
                    </label>
                    {form.location_choice === "custom" && (
                        <label className="span-12"><span>Other location</span><input value={form.location_label} onChange={(event) => setForm({ ...form, location_label: event.target.value })} placeholder="Furnace closet, exterior, shared area..." /></label>
                    )}
                    <label className="span-3"><span>Every</span><input value={form.frequency_count} onChange={(event) => setForm({ ...form, frequency_count: event.target.value })} type="number" min="1" placeholder="90" /></label>
                    <label className="span-3"><span>Unit</span><select value={form.frequency_unit} onChange={(event) => setForm({ ...form, frequency_unit: event.target.value })}><option value="days">Days</option><option value="weeks">Weeks</option><option value="months">Months</option><option value="years">Years</option><option value="as_needed">As needed</option></select></label>
                    <label className="span-3"><span>Next due</span><input type="date" value={form.next_due_date} onChange={(event) => setForm({ ...form, next_due_date: event.target.value })} /></label>
                    <label className="span-3"><span>Priority</span><select value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value })}><option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option><option value="urgent">Urgent</option></select></label>

                    <label className="span-12 maintenance-inventory-toggle">
                        <input
                            type="checkbox"
                            checked={form.tracks_inventory}
                            onChange={(event) => setForm({ ...form, tracks_inventory: event.target.checked })}
                        />
                        <span>
                            <b>Track replacement stock</b>
                            <small>For filters, batteries, salt bags, bulbs, and other supplies kept on hand.</small>
                        </span>
                    </label>

                    {form.tracks_inventory ? (
                        <>
                            <label className="span-3"><span>On hand now</span><input value={form.quantity_on_hand} onChange={(event) => setForm({ ...form, quantity_on_hand: event.target.value })} type="number" min="0" placeholder="2" /></label>
                            <label className="span-3"><span>Used each time</span><input value={form.units_per_service} onChange={(event) => setForm({ ...form, units_per_service: event.target.value })} type="number" min="1" placeholder="1" /></label>
                            <label className="span-3"><span>Pack size</span><input value={form.pack_quantity} onChange={(event) => setForm({ ...form, pack_quantity: event.target.value })} type="number" min="1" placeholder="2" /></label>
                            <label className="span-3"><span>Pack cost</span><input value={form.restock_cost} onChange={(event) => setForm({ ...form, restock_cost: event.target.value })} type="number" min="0" step="0.01" placeholder="5" /></label>
                            <label className="span-6"><span>Unit name</span><input value={form.inventory_unit} onChange={(event) => setForm({ ...form, inventory_unit: event.target.value })} placeholder="filter" /></label>
                            <div className="span-6 maintenance-inventory-note">Completing the task uses stock. Cost is recorded only when you replenish it.</div>
                        </>
                    ) : (
                        <label className="span-3"><span>Estimated service cost</span><input value={form.estimated_cost} onChange={(event) => setForm({ ...form, estimated_cost: event.target.value })} type="number" min="0" step="0.01" placeholder="0" /></label>
                    )}

                    <label className="span-12"><span>Notes / instructions</span><textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} placeholder="Filter size, model number, where it goes, what to buy..." /></label>
                    <button className="primary-action span-12" disabled={saving}>
                        {saving ? "Saving..." : editingItem ? "Save Changes" : "Save Maintenance"}
                    </button>
                </form>
            </Modal>

            <Modal active={activeModal === "restock"} onClose={() => setActiveModal(null)} title={`Add Stock${restockForm.item ? ` · ${restockForm.item.name}` : ""}`}>
                <form className="form-grid" onSubmit={submitRestock}>
                    {error && <div className="form-error">{error}</div>}
                    <label className="span-6"><span>Quantity added</span><input type="number" min="1" value={restockForm.quantity} onChange={(event) => setRestockForm({ ...restockForm, quantity: event.target.value })} required /></label>
                    <label className="span-6"><span>Purchase cost</span><input type="number" min="0" step="0.01" value={restockForm.cost_amount} onChange={(event) => setRestockForm({ ...restockForm, cost_amount: event.target.value })} placeholder="Optional" /></label>
                    <label className="span-6"><span>Date</span><input type="date" value={restockForm.restocked_date} onChange={(event) => setRestockForm({ ...restockForm, restocked_date: event.target.value })} /></label>
                    <label className="span-12"><span>Notes</span><textarea value={restockForm.notes} onChange={(event) => setRestockForm({ ...restockForm, notes: event.target.value })} placeholder="Brand, pack size, where it was purchased..." /></label>
                    <button className="primary-action span-12" disabled={saving}>{saving ? "Updating..." : "Add Stock"}</button>
                </form>
            </Modal>
        </>
    );
}
