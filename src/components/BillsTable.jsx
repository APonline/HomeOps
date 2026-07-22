import { useEffect, useMemo, useRef, useState } from "react";

function statusClass(status) {
    const normalized = String(status || "").toLowerCase();

    if (normalized.includes("paid")) return "paid";
    if (normalized.includes("skipped")) return "future";
    if (normalized.includes("due") || normalized.includes("expected")) return "due";
    if (normalized.includes("need")) return "need";
    if (normalized.includes("future")) return "future";

    return "";
}

function formatFrequency(value) {
    return String(value || "monthly")
        .replace(/_/g, " ")
        .replace(/\b\w/g, (character) => character.toUpperCase());
}

function billType(bill) {
    const explicitType = String(
        bill.bill_type || bill.type || bill.category_type || ""
    ).toLowerCase().replace(/_/g, "-");
    const frequency = String(bill.frequency || "").toLowerCase();

    if (bill.is_core_bill || explicitType.includes("core")) {
        return "core";
    }

    if (
        explicitType.includes("one-time") ||
        explicitType.includes("one time") ||
        explicitType.includes("once") ||
        frequency.includes("once")
    ) {
        return "one-time";
    }

    return "recurring";
}

function MenuIcon({ name }) {
    if (name === "month") {
        return (
            <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M7 3v3M17 3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z" />
            </svg>
        );
    }

    if (name === "schedule") {
        return (
            <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 8v5l3 2M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z" />
            </svg>
        );
    }

    if (name === "paid") {
        return (
            <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="m5 12 4 4L19 6" />
            </svg>
        );
    }

    if (name === "unpaid") {
        return (
            <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M7 7h10v10H7zM5 5l14 14" />
            </svg>
        );
    }

    if (name === "skip") {
        return (
            <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="m6 7 6 5-6 5V7Zm7 0 6 5-6 5V7Z" />
            </svg>
        );
    }

    return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13M10 11v5M14 11v5" />
        </svg>
    );
}

function BillActionMenu({
    bill,
    isOpen,
    isSaving,
    onToggle,
    onClose,
    onEditMonth,
    onEditBill,
    onMarkPaid,
    onMarkUnpaid,
    onSkipBill,
    onDeleteBill,
}) {
    const menuRef = useRef(null);
    const status = String(bill.status || "").toLowerCase();
    const isPaid = status === "paid" || status.includes("paid");
    const isSkipped = status.includes("skipped");

    useEffect(() => {
        if (!isOpen) return undefined;

        function handlePointerDown(event) {
            if (!menuRef.current?.contains(event.target)) {
                onClose();
            }
        }

        function handleKeyDown(event) {
            if (event.key === "Escape") {
                onClose();
            }
        }

        document.addEventListener("pointerdown", handlePointerDown);
        document.addEventListener("keydown", handleKeyDown);

        return () => {
            document.removeEventListener("pointerdown", handlePointerDown);
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [isOpen, onClose]);

    function runAction(callback) {
        onClose();
        callback?.(bill);
    }

    return (
        <div className="bill-action-menu" ref={menuRef}>
            <button
                className="bill-action-trigger"
                type="button"
                aria-haspopup="menu"
                aria-expanded={isOpen}
                disabled={isSaving}
                onClick={onToggle}
            >
                <span>{isSaving ? "Saving…" : "Actions"}</span>
                <svg className="bill-action-trigger__dots" viewBox="0 0 24 24" aria-hidden="true">
                    <circle cx="5" cy="12" r="1.4" />
                    <circle cx="12" cy="12" r="1.4" />
                    <circle cx="19" cy="12" r="1.4" />
                </svg>
            </button>

            {isOpen ? (
                <div className="bill-action-dropdown" role="menu">
                    {onEditMonth ? (
                        <button type="button" role="menuitem" onClick={() => runAction(onEditMonth)}>
                            <span className="bill-action-dropdown__icon"><MenuIcon name="month" /></span>
                            <span>
                                <strong>Edit this month</strong>
                                <small>Change this instance only</small>
                            </span>
                        </button>
                    ) : null}

                    {onEditBill ? (
                        <button type="button" role="menuitem" onClick={() => runAction(onEditBill)}>
                            <span className="bill-action-dropdown__icon"><MenuIcon name="schedule" /></span>
                            <span>
                                <strong>Edit schedule</strong>
                                <small>Update future occurrences</small>
                            </span>
                        </button>
                    ) : null}

                    {!isPaid && !isSkipped && onMarkPaid ? (
                        <button type="button" role="menuitem" onClick={() => runAction(onMarkPaid)}>
                            <span className="bill-action-dropdown__icon is-success"><MenuIcon name="paid" /></span>
                            <span>
                                <strong>Mark paid</strong>
                                <small>Clear it for this month</small>
                            </span>
                        </button>
                    ) : null}

                    {isPaid && onMarkUnpaid ? (
                        <button type="button" role="menuitem" onClick={() => runAction(onMarkUnpaid)}>
                            <span className="bill-action-dropdown__icon"><MenuIcon name="unpaid" /></span>
                            <span>
                                <strong>Mark unpaid</strong>
                                <small>Reopen this month</small>
                            </span>
                        </button>
                    ) : null}

                    {!isPaid && !isSkipped && onSkipBill ? (
                        <button type="button" role="menuitem" onClick={() => runAction(onSkipBill)}>
                            <span className="bill-action-dropdown__icon"><MenuIcon name="skip" /></span>
                            <span>
                                <strong>Skip this month</strong>
                                <small>Keep the recurring schedule</small>
                            </span>
                        </button>
                    ) : null}

                    {onDeleteBill ? (
                        <>
                            <div className="bill-action-dropdown__divider" />
                            <button
                                className="is-danger"
                                type="button"
                                role="menuitem"
                                onClick={() => runAction(onDeleteBill)}
                            >
                                <span className="bill-action-dropdown__icon is-danger"><MenuIcon name="delete" /></span>
                                <span>
                                    <strong>Delete bill</strong>
                                    <small>Remove schedule and instances</small>
                                </span>
                            </button>
                        </>
                    ) : null}
                </div>
            ) : null}
        </div>
    );
}

const BILL_TYPE_META = {
    core: {
        label: "Core obligations",
        singular: "Core obligation",
    },
    recurring: {
        label: "Recurring household",
        singular: "Recurring household",
    },
    "one-time": {
        label: "One-time / irregular",
        singular: "One-time / irregular",
    },
};

const BILL_TYPE_ORDER = ["core", "recurring", "one-time"];

function billDueSortValue(bill) {
    if (bill.due_date) {
        const parsed = Date.parse(`${bill.due_date}T00:00:00`);
        if (!Number.isNaN(parsed)) return parsed;
    }

    if (bill.due_day) {
        return Number(bill.due_day);
    }

    return Number.MAX_SAFE_INTEGER;
}

function sortBills(items, sortBy) {
    return [...items].sort((left, right) => {
        if (sortBy === "name") {
            return String(left.payee || left.name || "")
                .localeCompare(String(right.payee || right.name || ""), undefined, { sensitivity: "base" });
        }

        if (sortBy === "amount-high") {
            return Number(right.amount ?? right.expected_amount ?? 0)
                - Number(left.amount ?? left.expected_amount ?? 0);
        }

        if (sortBy === "amount-low") {
            return Number(left.amount ?? left.expected_amount ?? 0)
                - Number(right.amount ?? right.expected_amount ?? 0);
        }

        const dueDifference = billDueSortValue(left) - billDueSortValue(right);
        if (dueDifference !== 0) return dueDifference;

        return String(left.payee || left.name || "")
            .localeCompare(String(right.payee || right.name || ""), undefined, { sensitivity: "base" });
    });
}

export default function BillsTable({
    bills = [],
    money,
    onMarkPaid,
    onMarkUnpaid,
    onSkipBill,
    onEditMonth,
    onEditBill,
    onDeleteBill,
    savingId = null,
}) {
    const [openMenuId, setOpenMenuId] = useState(null);
    const [filterType, setFilterType] = useState("all");
    const [sortBy, setSortBy] = useState("due");
    const hasActions = Boolean(onMarkPaid || onMarkUnpaid || onSkipBill || onEditMonth || onEditBill || onDeleteBill);

    const typeCounts = useMemo(() => bills.reduce((counts, bill) => {
        const type = billType(bill);
        counts[type] = (counts[type] || 0) + 1;
        return counts;
    }, {
        core: 0,
        recurring: 0,
        "one-time": 0,
    }), [bills]);

    const groups = useMemo(() => BILL_TYPE_ORDER
        .filter((type) => filterType === "all" || type === filterType)
        .map((type) => ({
            type,
            ...BILL_TYPE_META[type],
            bills: sortBills(bills.filter((bill) => billType(bill) === type), sortBy),
        }))
        .filter((group) => group.bills.length > 0), [bills, filterType, sortBy]);

    function renderBill(bill) {
        const type = billType(bill);
        const isSaving = savingId === bill.id;
        const frequency = formatFrequency(bill.frequency || "monthly");

        return (
            <article
                className={`bill-card-row is-${type}`}
                key={bill.id}
                role="listitem"
            >
                <div className="bill-card-row__identity">
                    <button
                        type="button"
                        className="bill-card-row__title"
                        onClick={() => onEditBill?.(bill)}
                    >
                        {bill.payee || bill.name}
                    </button>

                    <p>
                        {frequency}
                        {bill.due_day
                            ? ` · default due day ${bill.due_day}`
                            : ""}
                    </p>
                </div>

                <div className="bill-card-row__details">
                    <div className="bill-card-row__month">
                        <span className="bill-card-row__mobile-label">
                            This month
                        </span>

                        <strong>
                            {bill.due || bill.due_date || "TBD"}
                        </strong>

                        {!bill.instance_id && (
                            <small className="bill-card-row__notice">
                                Not available yet
                            </small>
                        )}
                    </div>

                    <div className="bill-card-row__financial">
                        <span className="bill-card-row__mobile-label">
                            Status &amp; amount
                        </span>

                        <div className="bill-card-row__financial-value">
                            <span
                                className={`status ${statusClass(
                                    bill.status
                                )}`}
                            >
                                {bill.status || "Tracked"}
                            </span>

                            <strong className="bill-card-row__amount">
                                {money(
                                    bill.amount ??
                                    bill.expected_amount
                                )}
                            </strong>
                        </div>
                    </div>
                </div>

                {hasActions ? (
                    <div className="bill-card-row__actions">
                        <BillActionMenu
                            bill={bill}
                            isOpen={openMenuId === bill.id}
                            isSaving={isSaving}
                            onToggle={() =>
                                setOpenMenuId((current) =>
                                    current === bill.id
                                        ? null
                                        : bill.id
                                )
                            }
                            onClose={() => setOpenMenuId(null)}
                            onEditMonth={onEditMonth}
                            onEditBill={onEditBill}
                            onMarkPaid={onMarkPaid}
                            onMarkUnpaid={onMarkUnpaid}
                            onSkipBill={onSkipBill}
                            onDeleteBill={onDeleteBill}
                        />
                    </div>
                ) : null}
            </article>
        );
    }

    return (
        <div className="bills-list-shell">
            <div className="bill-list-controls">
                <div className="bill-list-controls__copy">
                    <span>Bill view</span>
                    <strong>{bills.length} schedules</strong>
                </div>

                <label>
                    <span>Filter</span>
                    <select value={filterType} onChange={(event) => setFilterType(event.target.value)}>
                        <option value="all">All bill types</option>
                        <option value="core">Core obligations</option>
                        <option value="recurring">Recurring household</option>
                        <option value="one-time">One-time / irregular</option>
                    </select>
                </label>

                <label>
                    <span>Sort by</span>
                    <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
                        <option value="due">Due date</option>
                        <option value="name">Name</option>
                        <option value="amount-high">Amount: high to low</option>
                        <option value="amount-low">Amount: low to high</option>
                    </select>
                </label>
            </div>

            <div className="bill-type-legend" aria-label="Bill type legend">
                <span className="bill-type-legend__title">Bill types</span>
                <div className="bill-type-legend__items">
                    {BILL_TYPE_ORDER.map((type) => (
                        <button
                            className={`bill-type-legend__item is-${type} ${filterType === type ? "is-active" : ""}`}
                            key={type}
                            type="button"
                            onClick={() => setFilterType((current) => current === type ? "all" : type)}
                            aria-pressed={filterType === type}
                        >
                            <i aria-hidden="true" />
                            <span>{BILL_TYPE_META[type].singular}</span>
                            <strong>{typeCounts[type]}</strong>
                        </button>
                    ))}
                </div>
            </div>

            <div className="bills-list-head" aria-hidden="true">
                <span>Bill schedule</span>
                <span>This month</span>
                <span>Status &amp; amount</span>
                {hasActions ? <span>Actions</span> : null}
            </div>

            <div className="bill-type-groups">
                {groups.map((group) => (
                    <section className={`bill-type-group is-${group.type}`} key={group.type}>
                        <header className="bill-type-group__header">
                            <div>
                                <i aria-hidden="true" />
                                <strong>{group.label}</strong>
                            </div>
                            <span>{group.bills.length}</span>
                        </header>

                        <div className="bills-card-list" role="list" aria-label={group.label}>
                            {group.bills.map(renderBill)}
                        </div>
                    </section>
                ))}

                {groups.length === 0 && (
                    <div className="empty-box">
                        No bills match this filter.
                    </div>
                )}
            </div>
        </div>
    );
}
