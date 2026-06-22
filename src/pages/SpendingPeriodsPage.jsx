import { useCallback, useEffect, useState } from "react";
import Modal from "../components/Modal";
import { useHomeOps } from "../context/HomeOpsContext";
import {
    createSpendingPeriod,
    getSpendingPeriods,
    money,
} from "../lib/homeopsApi";

const defaultForm = {
    title: "",
    period_type: "custom",
    start_date: "",
    end_date: "",
    notes: "",
};

export default function SpendingPeriodsPage({ refreshToken, refreshEverything }) {
    const { apiContext } = useHomeOps();
    const [periods, setPeriods] = useState([]);
    const [form, setForm] = useState(defaultForm);
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

    async function submit(event) {
        event.preventDefault();
        setSaving(true);
        setError("");

        try {
            await createSpendingPeriod({
                ...form,
                notes: form.notes || null,
            }, apiContext);

            setForm(defaultForm);
            setActiveModal(null);
            refreshEverything?.();
            await loadPeriods();
        } catch (err) {
            setError(err.message || "Could not save period.");
        } finally {
            setSaving(false);
        }
    }

    return (
        <>
            <header className="page-header">
                <div>
                    <h1>Spending Periods</h1>
                    <p>Mark weird life ranges so spending spikes have a reason instead of looking like a failure.</p>
                </div>
            </header>

            <section className="panel full-panel">
                <div className="panel-header">
                    <h2>Tracked Periods</h2>

                    <div className="panel-header__actions">
                        <span>{loading ? "loading" : `${periods.length} active`}</span>
                        <button
                            className="page-primary-action page-primary-action--compact"
                            type="button"
                            onClick={() => {
                                setError("");
                                setActiveModal("period");
                            }}
                        >
                            + Period
                        </button>
                    </div>
                </div>

                {error && <div className="form-error">{error}</div>}
                {loading && <div className="empty-box">Loading periods...</div>}
                {!loading && periods.length === 0 && <div className="empty-box">No periods yet. Add one with + Period.</div>}

                <div className="period-list wide">
                    {periods.map((period) => (
                        <article className={`period-card ${period.tone || "red"}`} key={period.id}>
                            <strong>{period.name || period.title}</strong>
                            <p>{period.dates} · {money(period.amount)} linked · {period.entry_count || 0} entries</p>
                            {period.description && <small>{period.description}</small>}
                        </article>
                    ))}
                </div>
            </section>

            <Modal active={activeModal === "period"} onClose={() => setActiveModal(null)} title="Add Spending Period">
                <form className="form-grid" onSubmit={submit}>
                    {error && <div className="form-error">{error}</div>}

                    <label className="span-6">
                        <span>Name</span>
                        <input
                            value={form.title}
                            onChange={(event) => setForm({ ...form, title: event.target.value })}
                            placeholder="Moving Chaos"
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

                    <button className="primary-action span-12" disabled={saving}>
                        {saving ? "Saving..." : "Save Period"}
                    </button>
                </form>
            </Modal>
        </>
    );
}
