import { useCallback, useEffect, useState } from "react";
import BillsTable from "../components/BillsTable";
import Modal from "../components/Modal";
import {
    HOMEOPS_MONTH,
    createBill,
    getBills,
    markBillPaid,
    money,
    nullableNumber,
    todayIso,
} from "../lib/homeopsApi";

const defaultBillForm = {
    payee: "",
    amount: "",
    due_day: "",
    frequency: "monthly",
    notes: "",
};

export default function BillsPage({ refreshToken, refreshEverything }) {
    const [bills, setBills] = useState([]);
    const [loading, setLoading] = useState(true);
    const [savingId, setSavingId] = useState(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [activeModal, setActiveModal] = useState(null);
    const [form, setForm] = useState(defaultBillForm);

    const loadBills = useCallback(async () => {
        setLoading(true);
        setError("");

        try {
            const json = await getBills(HOMEOPS_MONTH);
            setBills(json.bills || []);
        } catch (err) {
            setError(err.message || "Could not load bills.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        loadBills();
    }, [loadBills, refreshToken]);

    async function handleMarkPaid(bill) {
        const amount = window.prompt(
            `Amount paid for ${bill.payee || bill.name}?`,
            bill.amount ?? bill.expected_amount ?? ""
        );

        if (amount === null) return;

        setSavingId(bill.id);
        setError("");

        try {
            await markBillPaid(bill.id, {
                month: HOMEOPS_MONTH,
                amount: Number(amount || 0),
                paid_at: todayIso(),
            });

            refreshEverything?.();
            await loadBills();
        } catch (err) {
            setError(err.message || "Could not mark bill paid.");
        } finally {
            setSavingId(null);
        }
    }

    async function handleCreateBill(event) {
        event.preventDefault();
        setSaving(true);
        setError("");

        try {
            await createBill({
                payee: form.payee,
                amount: nullableNumber(form.amount),
                due_day: nullableNumber(form.due_day),
                frequency: form.frequency,
                notes: form.notes || null,
            });

            setForm(defaultBillForm);
            setActiveModal(null);
            refreshEverything?.();
            await loadBills();
        } catch (err) {
            setError(err.message || "Could not save bill.");
        } finally {
            setSaving(false);
        }
    }

    return (
        <>
            <header className="page-header">
                <div>
                    <h1>Bills</h1>
                    <p>Who needs money, what is due, and what got cleared this month.</p>
                </div>
            </header>

            <section className="panel full-panel">
                <div className="panel-header">
                    <h2>This Month</h2>

                    <div className="panel-header__actions">
                        <span>{loading ? "loading" : `${bills.length} tracked`}</span>
                        <button
                            className="page-primary-action page-primary-action--compact"
                            type="button"
                            onClick={() => {
                                setError("");
                                setActiveModal("bill");
                            }}
                        >
                            + Bill
                        </button>
                    </div>
                </div>

                {error && <div className="form-error">{error}</div>}
                {loading && <div className="empty-box">Loading bills...</div>}
                {!loading && bills.length === 0 && <div className="empty-box">No bills yet. Add one with + Bill.</div>}

                {bills.length > 0 && (
                    <BillsTable
                        bills={bills}
                        money={money}
                        onMarkPaid={handleMarkPaid}
                        savingId={savingId}
                    />
                )}
            </section>

            <Modal active={activeModal === "bill"} onClose={() => setActiveModal(null)} title="Add Bill">
                <form className="form-grid" onSubmit={handleCreateBill}>
                    {error && <div className="form-error">{error}</div>}

                    <label className="span-6">
                        <span>Payee</span>
                        <input
                            value={form.payee}
                            onChange={(event) => setForm({ ...form, payee: event.target.value })}
                            placeholder="HOA / Condo Fees"
                            required
                        />
                    </label>

                    <label className="span-3">
                        <span>Amount</span>
                        <input
                            value={form.amount}
                            onChange={(event) => setForm({ ...form, amount: event.target.value })}
                            type="number"
                            step="0.01"
                            placeholder="727"
                        />
                    </label>

                    <label className="span-3">
                        <span>Due Day</span>
                        <input
                            value={form.due_day}
                            onChange={(event) => setForm({ ...form, due_day: event.target.value })}
                            type="number"
                            min="1"
                            max="31"
                            placeholder="1"
                        />
                    </label>

                    <label className="span-12">
                        <span>Frequency</span>
                        <select
                            value={form.frequency}
                            onChange={(event) => setForm({ ...form, frequency: event.target.value })}
                        >
                            <option value="monthly">Monthly</option>
                            <option value="quarterly">Quarterly</option>
                            <option value="annual">Annual</option>
                            <option value="once">One-time</option>
                        </select>
                    </label>

                    <label className="span-12">
                        <span>Notes</span>
                        <textarea
                            value={form.notes}
                            onChange={(event) => setForm({ ...form, notes: event.target.value })}
                            placeholder="Account note, payment method, context..."
                        />
                    </label>

                    <button className="primary-action span-12" disabled={saving}>
                        {saving ? "Saving..." : "Save Bill"}
                    </button>
                </form>
            </Modal>
        </>
    );
}
