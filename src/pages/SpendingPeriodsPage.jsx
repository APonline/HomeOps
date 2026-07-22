import { useCallback, useEffect, useState } from "react";
import Modal from "../components/Modal";
import HomeOpsLoadingSkeleton, { HomeOpsLoadingPill } from "../components/HomeOpsLoadingSkeleton";
import { useHomeOps } from "../context/HomeOpsContext";
import { resolveSpendingPeriodTone } from "../lib/spendingPeriodTones";
import "../styles/spending-period-tones.css";
import {
    createSpendingPeriod,
    deleteSpendingPeriod,
    getSpendingPeriods,
    money,
    updateSpendingPeriod,
} from "../lib/homeopsApi";

const defaultForm = {
    title: "",
    period_type: "custom",
    start_date: "",
    end_date: "",
    notes: "",
};

function formFromPeriod(period) {
    if (!period) return defaultForm;

    return {
        title: period.title || period.name || "",
        period_type: period.period_type || "custom",
        start_date: period.start_date || "",
        end_date: period.end_date || "",
        notes: period.notes || period.description || "",
    };
}

function readableType(value) {
    return String(value || "Custom")
        .replace(/_/g, " ")
        .replace(/\b\w/g, (character) => character.toUpperCase());
}

export default function SpendingPeriodsPage({ refreshToken, refreshEverything }) {
    const { apiContext } = useHomeOps();
    const [periods, setPeriods] = useState([]);
    const [form, setForm] = useState(defaultForm);
    const [editingPeriod, setEditingPeriod] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [activeModal, setActiveModal] = useState(null);

    const loadPeriods = useCallback(async () => {
        setLoading(true);
        setError("");

        try {
            const json = await getSpendingPeriods(apiContext);
            setPeriods(json.periods || []);
        } catch (err) {
            setError(err.message || "Could not load periods.");
        } finally {
            setLoading(false);
        }
    }, [apiContext]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        loadPeriods();
    }, [loadPeriods, refreshToken]);

    function openCreate() {
        setError("");
        setEditingPeriod(null);
        setForm(defaultForm);
        setActiveModal("period");
    }

    function openEdit(period) {
        setError("");
        setEditingPeriod(period);
        setForm(formFromPeriod(period));
        setActiveModal("period");
    }

    function closePeriodModal() {
        setActiveModal(null);
        setEditingPeriod(null);
        setDeleteTarget(null);
        setForm(defaultForm);
        setError("");
    }

    async function submit(event) {
        event.preventDefault();
        setSaving(true);
        setError("");

        try {
            const payload = {
                ...form,
                notes: form.notes || null,
            };

            if (editingPeriod) {
                await updateSpendingPeriod(editingPeriod.id, payload, apiContext);
            } else {
                await createSpendingPeriod(payload, apiContext);
            }

            closePeriodModal();
            refreshEverything?.();
            await loadPeriods();
        } catch (err) {
            setError(err.message || "Could not save period.");
        } finally {
            setSaving(false);
        }
    }

    function requestDelete(period) {
        setError("");
        setDeleteTarget(period);
        setActiveModal("delete-period");
    }

    async function confirmDelete() {
        if (!deleteTarget?.id) return;

        setSaving(true);
        setError("");

        try {
            await deleteSpendingPeriod(deleteTarget.id, apiContext);
            closePeriodModal();
            refreshEverything?.();
            await loadPeriods();
        } catch (err) {
            setError(err.message || "Could not delete spending period.");
        } finally {
            setSaving(false);
        }
    }

    return (
        <>
            <header className="page-header">
                <div>
                    <h1>Spending Periods</h1>
                    <p>Mark unusual date ranges so spending spikes have a reason instead of looking like a failure.</p>
                </div>
                <button className="page-primary-action" type="button" onClick={openCreate}>+ Period</button>
            </header>

            <section className="panel full-panel spending-periods-panel">
                <div className="panel-header">
                    <div>
                        <h2>Tracked Periods</h2>
                        <p className="spending-periods-panel__intro">Periods link transactions that fall inside their start and end dates.</p>
                    </div>

                    <div className="panel-header__actions">
                        {loading ? <HomeOpsLoadingPill label="Loading period count" /> : <span>{`${periods.length} ${periods.length === 1 ? "period" : "periods"}`}</span>}
                        <button
                            className="page-primary-action page-primary-action--compact page-primary-action--icon"
                            type="button"
                            onClick={openCreate}
                            aria-label="Add spending period"
                            title="Add spending period"
                        >
                        +
                        </button>
                    </div>
                </div>

                {error && activeModal === null && <div className="form-error">{error}</div>}
                {loading && <HomeOpsLoadingSkeleton rows={3} label="Loading spending periods" />}
                {!loading && periods.length === 0 && <div className="empty-box">No spending periods yet. Add one with + Period.</div>}

                <div className="period-list wide spending-period-list">
                    {periods.map((period, index) => {
                        const tone = resolveSpendingPeriodTone({
                            ...period,
                            period_id: period.id,
                        }, index);

                        return (
                            <article
                                className={`period-card spending-period-card ${tone} tone-${tone}`}
                                data-period-tone={tone}
                                key={period.id}
                            >
                                <div className="spending-period-card__heading">
                                    <div className="spending-period-card__identity">
                                        <i
                                            className={`spending-period-card__tone tone-${tone}`}
                                            aria-hidden="true"
                                        />
                                        <div>
                                            <strong>{period.name || period.title}</strong>
                                            <span className="spending-period-card__type">
                                                {readableType(period.period_type)}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="spending-period-card__actions">
                                        <button
                                            className="mini-button"
                                            type="button"
                                            onClick={() => openEdit(period)}
                                        >
                                            Edit
                                        </button>

                                        <button
                                            className="mini-button mini-button--danger"
                                            type="button"
                                            onClick={() => requestDelete(period)}
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>

                                <p className="spending-period-card__date">
                                    {period.dates}
                                </p>

                                <p className="spending-period-card__summary">
                                    <span>{money(period.amount)} linked</span>
                                    <span>{period.entry_count || 0} entries</span>
                                    {period.timing_label && <span>{period.timing_label}</span>}
                                </p>

                                {period.description && <small>{period.description}</small>}
                            </article>
                        );
                    })}
                </div>
            </section>

            <Modal
                active={activeModal === "period"}
                onClose={closePeriodModal}
                title={editingPeriod ? "Edit Spending Period" : "Add Spending Period"}
                intro="Use a date range for move-in, renovations, repairs or another temporary change in spending."
            >
                <form className="form-grid" onSubmit={submit}>
                    {error && <div className="form-error">{error}</div>}

                    <label className="span-6">
                        <span>Name</span>
                        <input
                            value={form.title}
                            onChange={(event) => setForm({ ...form, title: event.target.value })}
                            placeholder="Moving into home"
                            required
                        />
                    </label>

                    <label className="span-6">
                        <span>Type</span>
                        <select
                            value={form.period_type}
                            onChange={(event) => setForm({ ...form, period_type: event.target.value })}
                        >
                            <option value="move">Move</option>
                            <option value="renovation">Renovation</option>
                            <option value="repair">Repair</option>
                            <option value="project">Project</option>
                            <option value="emergency">Emergency</option>
                            <option value="travel">Travel</option>
                            <option value="custom">Custom</option>
                        </select>
                    </label>

                    <label className="span-6">
                        <span>Start</span>
                        <input
                            type="date"
                            value={form.start_date}
                            onChange={(event) => setForm({ ...form, start_date: event.target.value })}
                            required
                        />
                    </label>

                    <label className="span-6">
                        <span>End</span>
                        <input
                            type="date"
                            value={form.end_date}
                            onChange={(event) => setForm({ ...form, end_date: event.target.value })}
                            required
                        />
                    </label>

                    <label className="span-12">
                        <span>Notes</span>
                        <textarea
                            value={form.notes}
                            onChange={(event) => setForm({ ...form, notes: event.target.value })}
                            placeholder="Moving, setup, paint, tools..."
                        />
                    </label>

                    <div className="v0-context-form-actions span-12">
                        {editingPeriod && (
                            <button className="bill-action-button bill-action-button--danger" type="button" onClick={() => requestDelete(editingPeriod)}>
                                Delete period
                            </button>
                        )}
                        <button className="primary-action" disabled={saving}>
                            {saving ? "Saving..." : editingPeriod ? "Save Changes" : "Save Period"}
                        </button>
                    </div>
                </form>
            </Modal>

            <Modal
                active={activeModal === "delete-period"}
                onClose={() => {
                    setActiveModal(editingPeriod ? "period" : null);
                    setDeleteTarget(null);
                    setError("");
                }}
                title="Delete spending period?"
                intro="The linked transactions are kept. Only the date-range context is removed."
                size="compact"
            >
                <div className="bill-action-confirmation">
                    <div className="bill-action-summary">
                        <span>{deleteTarget?.title || deleteTarget?.name || "Selected period"}</span>
                        <small>This action cannot be undone.</small>
                    </div>
                    {error && <div className="form-error">{error}</div>}
                    <div className="bill-action-modal__actions">
                        <button
                            className="bill-action-button bill-action-button--secondary"
                            type="button"
                            onClick={() => {
                                setActiveModal(editingPeriod ? "period" : null);
                                setDeleteTarget(null);
                                setError("");
                            }}
                        >
                            Cancel
                        </button>
                        <button className="bill-action-button bill-action-button--danger" type="button" onClick={confirmDelete} disabled={saving}>
                            {saving ? "Deleting..." : "Delete period"}
                        </button>
                    </div>
                </div>
            </Modal>
        </>
    );
}
