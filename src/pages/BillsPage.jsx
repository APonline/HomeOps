import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import BillsTable from "../components/BillsTable";
import Modal from "../components/Modal";
import { useHomeOps } from "../context/HomeOpsContext";
import {
    createBill,
    deleteBill,
    getBills,
    markBillPaid,
    markBillUnpaid,
    skipBillForMonth,
    updateBill,
    updateBillInstance,
    money,
    nullableNumber,
    todayIso,
} from "../lib/homeopsApi";

const defaultBillForm = {
    payee: "",
    amount: "",
    due_day: "",
    bill_type: "recurring",
    frequency: "monthly",
    notes: "",
};

const defaultMonthForm = {
    amount: "",
    due_day: "",
};

function billTypeFromBill(bill) {
    const explicitType = String(bill?.bill_type || "").toLowerCase().replace(/-/g, "_");

    if (["core", "recurring", "one_time"].includes(explicitType)) {
        return explicitType;
    }

    if (bill?.is_core_bill) return "core";
    if (String(bill?.frequency || "").toLowerCase() === "once") return "one_time";

    return "recurring";
}

function selectedMonthDate(monthStart, day) {
    const month = String(monthStart || todayIso()).slice(0, 7);
    const [yearValue, monthValue] = month.split("-").map(Number);
    const maxDay = new Date(yearValue, monthValue, 0).getDate();
    const parsedDay = Number(day || 1);
    const safeDay = String(Math.min(Math.max(parsedDay, 1), maxDay)).padStart(2, "0");

    return `${month}-${safeDay}`;
}

function monthLabel(monthStart) {
    const date = new Date(`${String(monthStart || todayIso()).slice(0, 10)}T00:00:00`);

    if (Number.isNaN(date.getTime())) return "the selected month";

    return date.toLocaleDateString("en-CA", {
        month: "long",
        year: "numeric",
    });
}

function billSummary(bills) {
    return bills.reduce((summary, bill) => {
        const status = String(bill.status || "").toLowerCase();
        const amount = Number(bill.amount ?? bill.expected_amount ?? 0);

        summary.expected += amount;

        if (status.includes("paid")) {
            summary.paid += amount;
            summary.paidCount += 1;
        } else if (status.includes("skipped")) {
            summary.skippedCount += 1;
        } else {
            summary.due += amount;
            summary.dueCount += 1;
        }

        return summary;
    }, {
        expected: 0,
        paid: 0,
        due: 0,
        paidCount: 0,
        dueCount: 0,
        skippedCount: 0,
    });
}

function dueDayFromBill(bill) {
    if (bill?.due_day) return String(bill.due_day);
    if (!bill?.due_date) return "";

    const date = new Date(`${bill.due_date}T00:00:00`);
    if (Number.isNaN(date.getTime())) return "";

    return String(date.getDate());
}

function InfoIcon(props) {
    return (
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
            <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="2" />
            <path d="M12 11.3v5.2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M12 7.6h.01" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </svg>
    );
}

function BillsLoadingSkeleton() {
    return (
        <div className="bills-loading-skeleton" aria-label="Loading bills" aria-busy="true">
            <div className="bills-loading-skeleton__controls">
                <span className="bills-loading-skeleton__line is-copy" />
                <span className="bills-loading-skeleton__field" />
                <span className="bills-loading-skeleton__field" />
            </div>

            <div className="bills-loading-skeleton__legend">
                <span className="bills-loading-skeleton__chip" />
                <span className="bills-loading-skeleton__chip" />
                <span className="bills-loading-skeleton__chip" />
            </div>

            <div className="bills-loading-skeleton__heading">
                <span />
                <span />
                <span />
                <span />
            </div>

            <div className="bills-loading-skeleton__rows">
                {[0, 1, 2, 3].map((row) => (
                    <div className="bills-loading-skeleton__row" key={row}>
                        <div>
                            <span className="bills-loading-skeleton__line is-title" />
                            <span className="bills-loading-skeleton__line is-subtitle" />
                        </div>
                        <span className="bills-loading-skeleton__line is-date" />
                        <div className="bills-loading-skeleton__money">
                            <span className="bills-loading-skeleton__pill" />
                            <span className="bills-loading-skeleton__line is-amount" />
                        </div>
                        <span className="bills-loading-skeleton__button" />
                    </div>
                ))}
            </div>
        </div>
    );
}

function confirmationCopy(type, bill, selectedMonth) {
    const name = bill?.payee || bill?.name || "This bill";

    if (type === "mark-unpaid") {
        return {
            title: "Mark as unpaid?",
            intro: `${name} will return to Due for ${selectedMonth}. Its linked payment transaction will be removed.`,
            confirmLabel: "Mark Unpaid",
            tone: "warning",
        };
    }

    if (type === "skip") {
        return {
            title: "Skip this month?",
            intro: `${name} will be skipped for ${selectedMonth}. The recurring schedule remains active for future months.`,
            confirmLabel: "Skip Month",
            tone: "warning",
        };
    }

    if (type === "delete") {
        return {
            title: "Delete bill schedule?",
            intro: `${name} will be removed from active bills. Open monthly instances will be deleted, while paid history is preserved for reports.`,
            confirmLabel: "Delete Bill",
            tone: "danger",
        };
    }

    return null;
}

export default function BillsPage({ refreshToken, refreshEverything }) {
    const { apiContext } = useHomeOps();
    const [bills, setBills] = useState([]);
    const [loading, setLoading] = useState(true);
    const [savingId, setSavingId] = useState(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const [activeModal, setActiveModal] = useState(null);
    const [editingBill, setEditingBill] = useState(null);
    const [form, setForm] = useState(defaultBillForm);
    const [actionModal, setActionModal] = useState(null);
    const [actionError, setActionError] = useState("");
    const [monthForm, setMonthForm] = useState(defaultMonthForm);
    const [stickySummaryVisible, setStickySummaryVisible] = useState(false);
    const stickySentinelRef = useRef(null);
    const stickyToolbarRef = useRef(null);

    const summary = billSummary(bills);
    const initialLoading = loading && bills.length === 0;
    const selectedMonth = useMemo(() => monthLabel(apiContext.monthStart), [apiContext.monthStart]);
    const actionCopy = actionModal
        ? confirmationCopy(actionModal.type, actionModal.bill, selectedMonth)
        : null;
    const editingPaidBill = String(editingBill?.status || "").toLowerCase().includes("paid");
    const editingPaidMonth = String(actionModal?.bill?.status || "").toLowerCase().includes("paid");

    const loadBills = useCallback(async () => {
        setLoading(true);
        setError("");

        try {
            const json = await getBills(apiContext);
            setBills(json.bills || []);
        } catch (err) {
            setError(err.message || "Could not load bills.");
        } finally {
            setLoading(false);
        }
    }, [apiContext]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        loadBills();
    }, [loadBills, refreshToken]);

    useEffect(() => {
        const sentinel = stickySentinelRef.current;
        const toolbar = stickyToolbarRef.current;

        if (!sentinel || !toolbar) return undefined;

        let frame = null;

        const updateStickyState = () => {
            if (frame !== null) return;

            frame = window.requestAnimationFrame(() => {
                frame = null;
                const stickyTop = Number.parseFloat(window.getComputedStyle(toolbar).top) || 0;
                const shouldShowCompactSummary = sentinel.getBoundingClientRect().top <= stickyTop + 1;

                setStickySummaryVisible((current) =>
                    current === shouldShowCompactSummary ? current : shouldShowCompactSummary
                );
            });
        };

        updateStickyState();
        window.addEventListener("scroll", updateStickyState, { passive: true });
        window.addEventListener("resize", updateStickyState);

        return () => {
            window.removeEventListener("scroll", updateStickyState);
            window.removeEventListener("resize", updateStickyState);
            if (frame !== null) window.cancelAnimationFrame(frame);
        };
    }, []);

    async function refreshAfterAction() {
        refreshEverything?.();
        await loadBills();
    }

    async function handleMarkPaid(bill) {
        setSavingId(bill.id);
        setError("");

        try {
            // Mark Paid is intentionally one click. The API uses this month's
            // expected amount, so users edit the monthly amount only when needed.
            await markBillPaid(bill.id, {
                month: apiContext.monthStart,
                paid_at: todayIso(),
            }, apiContext);

            await refreshAfterAction();
        } catch (err) {
            setError(err.message || "Could not mark bill paid.");
        } finally {
            setSavingId(null);
        }
    }

    function openConfirmation(type, bill) {
        setError("");
        setActionError("");
        setActionModal({ type, bill });
    }

    function handleMarkUnpaid(bill) {
        openConfirmation("mark-unpaid", bill);
    }

    function handleSkipBill(bill) {
        openConfirmation("skip", bill);
    }

    function handleDeleteBill(bill) {
        openConfirmation("delete", bill);
    }

    function handleEditMonth(bill) {
        if (!bill.instance_id) {
            setError("This bill is not available for the selected month yet. Refresh and try again.");
            return;
        }

        setError("");
        setActionError("");
        setMonthForm({
            amount: bill.amount ?? bill.expected_amount ?? "",
            due_day: dueDayFromBill(bill) || "1",
        });
        setActionModal({ type: "edit-month", bill });
    }

    function closeActionModal() {
        if (savingId !== null) return;

        setActionModal(null);
        setActionError("");
        setMonthForm(defaultMonthForm);
    }

    async function handleSaveMonth(event) {
        event.preventDefault();

        const bill = actionModal?.bill;
        if (!bill?.instance_id) return;

        const amount = nullableNumber(monthForm.amount);
        const dueDay = nullableNumber(monthForm.due_day);

        if (amount === null || Number.isNaN(amount) || amount < 0) {
            setActionError("Enter a valid expected amount.");
            return;
        }

        if (dueDay === null || Number.isNaN(dueDay) || dueDay < 1 || dueDay > 31) {
            setActionError("Enter a due day from 1 to 31.");
            return;
        }

        setSavingId(bill.id);
        setActionError("");

        try {
            await updateBillInstance(bill.instance_id, {
                expected_amount: amount,
                due_date: selectedMonthDate(apiContext.monthStart, dueDay),
            }, apiContext);

            setActionModal(null);
            setMonthForm(defaultMonthForm);
            await refreshAfterAction();
        } catch (err) {
            setActionError(err.message || "Could not update this month.");
        } finally {
            setSavingId(null);
        }
    }

    async function handleConfirmAction() {
        const bill = actionModal?.bill;
        const type = actionModal?.type;

        if (!bill || !type) return;

        setSavingId(bill.id);
        setActionError("");

        try {
            if (type === "mark-unpaid") {
                await markBillUnpaid(bill.id, {
                    month: apiContext.monthStart,
                }, apiContext);
            } else if (type === "skip") {
                await skipBillForMonth(bill.id, {
                    month: apiContext.monthStart,
                }, apiContext);
            } else if (type === "delete") {
                await deleteBill(bill.id, apiContext);
            }

            setActionModal(null);
            await refreshAfterAction();
        } catch (err) {
            setActionError(err.message || "Could not complete this action.");
        } finally {
            setSavingId(null);
        }
    }

    function resetBillModal() {
        if (saving) return;

        setForm(defaultBillForm);
        setEditingBill(null);
        setActiveModal(null);
    }

    function openCreateBillModal() {
        setError("");
        setNotice("");
        setEditingBill(null);
        setForm(defaultBillForm);
        setActiveModal("bill");
    }

    function handleEditBill(bill) {
        setError("");
        setNotice("");
        setEditingBill(bill);
        setForm({
            payee: bill.payee || bill.name || "",
            amount: bill.expected_amount ?? bill.amount ?? "",
            due_day: dueDayFromBill(bill),
            bill_type: billTypeFromBill(bill),
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
            bill_type: form.bill_type,
            frequency: form.frequency,
            notes: form.notes || null,
        };

        try {
            if (editingBill) {
                await updateBill(editingBill.id, payload, apiContext);
            } else {
                await createBill(payload, apiContext);
            }

            const wasEditing = Boolean(editingBill);
            const wasPaid = String(editingBill?.status || "").toLowerCase().includes("paid");
            const savedName = form.payee.trim() || "Bill";

            setForm(defaultBillForm);
            setEditingBill(null);
            setActiveModal(null);
            setNotice(
                wasEditing
                    ? wasPaid
                        ? `${savedName} schedule updated. ${selectedMonth} is already paid, so use Edit this month to correct its recorded amount.`
                        : `${savedName} schedule updated.`
                    : `${savedName} added.`
            );
            await refreshAfterAction();
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
                <button className="page-primary-action" type="button" onClick={openCreateBillModal}>+ Bill</button>
            </header>

            <section className="panel full-panel bills-page-panel">
                <div className="bills-sticky-sentinel" ref={stickySentinelRef} aria-hidden="true" />

                <div
                    className={`bills-sticky-toolbar ${stickySummaryVisible ? "is-stuck" : ""}`}
                    ref={stickyToolbarRef}
                >
                    <div className="bills-sticky-toolbar__heading">
                        <h2>This Month</h2>
                        <small>{selectedMonth}</small>
                    </div>

                    <div className="bills-sticky-toolbar__summary" aria-label="Current bill summary">
                        <span className="is-expected">
                            <small>Expected</small>
                            <strong>{initialLoading ? "—" : money(summary.expected)}</strong>
                        </span>
                        <span className="is-paid">
                            <small>Paid</small>
                            <strong>{initialLoading ? "—" : money(summary.paid)}</strong>
                        </span>
                        <span className="is-due">
                            <small>Due</small>
                            <strong>{initialLoading ? "—" : money(summary.due)}</strong>
                        </span>
                        <span className="is-open">
                            <small>Open</small>
                            <strong>{initialLoading ? "—" : summary.dueCount}</strong>
                        </span>
                    </div>

                    <div className="panel-header__actions bills-sticky-toolbar__actions">
                        {initialLoading ? (
                            <span className="bill-tracked-skeleton" aria-label="Loading bill count" />
                        ) : (
                            <span>{bills.length} tracked</span>
                        )}
                        <button
                            className="v0-info-button"
                            type="button"
                            onClick={() => setActiveModal("bill-help")}
                            aria-label="About recurring bill schedules"
                            title="About recurring bill schedules"
                        >
                            <InfoIcon />
                        </button>
                        <button
                            className="page-primary-action page-primary-action--compact page-primary-action--icon"
                            type="button"
                            onClick={openCreateBillModal}
                            aria-label="Add bill"
                            title="Add bill"
                        >
                        +
                        </button>
                    </div>
                </div>

                <div className={`bill-engine-summary ${initialLoading ? "is-loading" : ""}`} aria-busy={initialLoading}>
                    <div className="bill-engine-summary__card is-expected">
                        <span>Expected this month</span>
                        <strong>{initialLoading ? <i className="bill-summary-value-skeleton" /> : money(summary.expected)}</strong>
                    </div>

                    <div className="bill-engine-summary__card is-paid">
                        <span>Paid</span>
                        <strong>{initialLoading ? <i className="bill-summary-value-skeleton" /> : money(summary.paid)}</strong>
                    </div>

                    <div className="bill-engine-summary__card is-due">
                        <span>Still due</span>
                        <strong>{initialLoading ? <i className="bill-summary-value-skeleton" /> : money(summary.due)}</strong>
                    </div>

                    <div className="bill-engine-summary__card is-open">
                        <span>Open items</span>
                        <strong>{initialLoading ? <i className="bill-summary-value-skeleton is-count" /> : summary.dueCount}</strong>
                    </div>
                </div>

                {error && <div className="form-error">{error}</div>}
                {notice && <div className="form-success bill-save-notice">{notice}</div>}
                {initialLoading && <BillsLoadingSkeleton />}
                {!loading && bills.length === 0 && <div className="empty-box">No bills yet. Add one with + Bill.</div>}

                {bills.length > 0 && (
                    <BillsTable
                        bills={bills}
                        money={money}
                        onMarkPaid={handleMarkPaid}
                        onMarkUnpaid={handleMarkUnpaid}
                        onSkipBill={handleSkipBill}
                        onEditMonth={handleEditMonth}
                        onEditBill={handleEditBill}
                        onDeleteBill={handleDeleteBill}
                        savingId={savingId}
                    />
                )}
            </section>

            <Modal
                active={activeModal === "bill-help"}
                onClose={() => setActiveModal(null)}
                title="How monthly bills work"
                intro="Bills are recurring schedules, not single payment records."
            >
                <div className="v0-info-modal-copy">
                    <p>HomeOps creates a separate monthly instance for the selected month, so marking July paid does not mark August paid.</p>
                </div>
            </Modal>

            <Modal
                active={activeModal === "bill"}
                onClose={resetBillModal}
                title={editingBill ? "Edit Bill Schedule" : "Add Bill Schedule"}
                intro={editingBill
                    ? editingPaidBill
                        ? "Updates the recurring schedule and future unpaid months. This paid month stays as recorded; use Edit this month to correct it."
                        : "Updates the recurring schedule and the selected unpaid month."
                    : "Choose what kind of bill this is and how often it repeats."}
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
                        <span>Default Amount</span>
                        <input
                            value={form.amount}
                            onChange={(event) => setForm({ ...form, amount: event.target.value })}
                            type="number"
                            step="0.01"
                            placeholder="727"
                        />
                    </label>

                    <label className="span-3">
                        <span>Default Due Day</span>
                        <input
                            value={form.due_day}
                            onChange={(event) => setForm({ ...form, due_day: event.target.value })}
                            type="number"
                            min="1"
                            max="31"
                            placeholder="1"
                        />
                    </label>

                    <label className="span-6">
                        <span>Bill Type</span>
                        <select
                            value={form.bill_type}
                            onChange={(event) => setForm({ ...form, bill_type: event.target.value })}
                        >
                            <option value="core">Core obligation</option>
                            <option value="recurring">Recurring household</option>
                            <option value="one_time">One-time / irregular</option>
                        </select>
                        <small className="bill-field-help">Controls the colour and grouping.</small>
                    </label>

                    <label className="span-6">
                        <span>Frequency</span>
                        <select
                            value={form.frequency}
                            onChange={(event) => setForm({ ...form, frequency: event.target.value })}
                        >
                            <option value="weekly">Weekly</option>
                            <option value="biweekly">Every 2 weeks</option>
                            <option value="monthly">Monthly</option>
                            <option value="quarterly">Quarterly</option>
                            <option value="semiannual">Twice yearly</option>
                            <option value="annual">Annual</option>
                            <option value="once">One-time</option>
                        </select>
                        <small className="bill-field-help">Controls when monthly instances are created.</small>
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
                        {saving ? "Saving..." : editingBill ? "Save Schedule" : "Save Bill Schedule"}
                    </button>
                </form>
            </Modal>

            <Modal
                active={actionModal?.type === "edit-month"}
                onClose={closeActionModal}
                title="Edit This Month"
                intro={editingPaidMonth
                    ? `Correct the recorded payment for ${selectedMonth}. The linked transaction will be updated too.`
                    : `Change only the ${selectedMonth} instance. The recurring schedule remains unchanged.`}
                size="compact"
            >
                <form className="form-grid bill-month-form" onSubmit={handleSaveMonth}>
                    {actionError && <div className="form-error span-12">{actionError}</div>}

                    <div className="bill-action-summary span-12">
                        <span>{actionModal?.bill?.payee || actionModal?.bill?.name}</span>
                        <strong>{money(actionModal?.bill?.amount ?? actionModal?.bill?.expected_amount)}</strong>
                    </div>

                    <label className="span-6">
                        <span>Expected Amount</span>
                        <input
                            value={monthForm.amount}
                            onChange={(event) => setMonthForm({ ...monthForm, amount: event.target.value })}
                            type="number"
                            min="0"
                            step="0.01"
                            inputMode="decimal"
                            required
                            autoFocus
                        />
                    </label>

                    <label className="span-6">
                        <span>Due Day</span>
                        <input
                            value={monthForm.due_day}
                            onChange={(event) => setMonthForm({ ...monthForm, due_day: event.target.value })}
                            type="number"
                            min="1"
                            max="31"
                            inputMode="numeric"
                            required
                        />
                    </label>

                    <div className="bill-action-modal__actions span-12">
                        <button
                            className="bill-action-button bill-action-button--secondary"
                            type="button"
                            onClick={closeActionModal}
                            disabled={savingId !== null}
                        >
                            Cancel
                        </button>
                        <button
                            className="bill-action-button bill-action-button--primary"
                            type="submit"
                            disabled={savingId !== null}
                        >
                            {savingId !== null ? "Saving..." : "Save This Month"}
                        </button>
                    </div>
                </form>
            </Modal>

            <Modal
                active={Boolean(actionCopy)}
                onClose={closeActionModal}
                title={actionCopy?.title || "Confirm action"}
                intro={actionCopy?.intro}
                size="compact"
            >
                <div className="bill-action-confirmation">
                    {actionError && <div className="form-error">{actionError}</div>}

                    <div className="bill-action-summary">
                        <span>{actionModal?.bill?.payee || actionModal?.bill?.name}</span>
                        <strong>{money(actionModal?.bill?.amount ?? actionModal?.bill?.expected_amount)}</strong>
                        <small>{actionModal?.bill?.due || actionModal?.bill?.due_date || selectedMonth}</small>
                    </div>

                    <div className="bill-action-modal__actions">
                        <button
                            className="bill-action-button bill-action-button--secondary"
                            type="button"
                            onClick={closeActionModal}
                            disabled={savingId !== null}
                        >
                            Cancel
                        </button>
                        <button
                            className={`bill-action-button bill-action-button--${actionCopy?.tone || "primary"}`}
                            type="button"
                            onClick={handleConfirmAction}
                            disabled={savingId !== null}
                        >
                            {savingId !== null ? "Working..." : actionCopy?.confirmLabel}
                        </button>
                    </div>
                </div>
            </Modal>
        </>
    );
}
