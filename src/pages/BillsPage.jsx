import { useCallback, useEffect, useState } from "react";
import BillsTable from "../components/BillsTable";
import Modal from "../components/Modal";
import {
    HOMEOPS_MONTH,
    createBill,
    deleteBill,
    getBills,
    markBillPaid,
    updateBill,
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
    const [editingBill, setEditingBill] = useState(null);
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

    function resetBillModal() {
        setForm(defaultBillForm);
        setEditingBill(null);
        setActiveModal(null);
    }

    function openCreateBillModal() {
        setError("");
        setEditingBill(null);
        setForm(defaultBillForm);
        setActiveModal("bill");
    }

    function dueDayFromBill(bill) {
        if (bill.due_day) return bill.due_day;
        if (!bill.due_date) return "";

        const date = new Date(`${bill.due_date}T00:00:00`);
        if (Number.isNaN(date.getTime())) return "";

        return String(date.getDate());
    }

    function handleEditBill(bill) {
        setError("");
        setEditingBill(bill);
        setForm({
            payee: bill.payee || bill.name || "",
            amount: bill.expected_amount ?? bill.amount ?? "",
            due_day: dueDayFromBill(bill),
            frequency: bill.frequency || "monthly",
            notes: bill.notes || "",
        });
        setActiveModal("bill");
    }

    async function handleSaveBill(event) {
        event.preventDefault();
        setSaving(true);
        setError("");

        const payload = {
            payee: form.payee,
            amount: nullableNumber(form.amount),
            due_day: nullableNumber(form.due_day),
            frequency: form.frequency,
            notes: form.notes || null,
        };

        try {
            if (editingBill) {
                await updateBill(editingBill.id, payload);
            } else {
                await createBill(payload);
            }

            resetBillModal();
            refreshEverything?.();
            await loadBills();
        } catch (err) {
            setError(err.message || "Could not save bill.");
        } finally {
            setSaving(false);
        }
    }

    async function handleDeleteBill(bill) {
        const label = bill.payee || bill.name || "this bill";
        const confirmed = window.confirm(`Delete ${label}? This removes its bill schedule and monthly instances.`);

        if (!confirmed) return;

        setSavingId(bill.id);
        setError("");

        try {
            await deleteBill(bill.id);
            refreshEverything?.();
            await loadBills();
        } catch (err) {
            setError(err.message || "Could not delete bill.");
        } finally {
            setSavingId(null);
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
                            onClick={openCreateBillModal}
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
                        onEditBill={handleEditBill}
                        onDeleteBill={handleDeleteBill}
                        savingId={savingId}
                    />
                )}
            </section>

            <Modal
                active={activeModal === "bill"}
                onClose={resetBillModal}
                title={editingBill ? "Edit Bill" : "Add Bill"}
            >
                <form className="form-grid" onSubmit={handleSaveBill}>
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
                        {saving ? "Saving..." : editingBill ? "Save Changes" : "Save Bill"}
                    </button>
                </form>
            </Modal>
        </>
    );
}
