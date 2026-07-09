function statusClass(status) {
    const normalized = String(status || "").toLowerCase();

    if (normalized.includes("paid")) return "paid";
    if (normalized.includes("skipped")) return "future";
    if (normalized.includes("due") || normalized.includes("expected")) return "due";
    if (normalized.includes("need")) return "need";
    if (normalized.includes("future")) return "future";

    return "";
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
    const hasActions = Boolean(onMarkPaid || onMarkUnpaid || onSkipBill || onEditMonth || onEditBill || onDeleteBill);

    return (
        <div className="table-wrap">
            <table className="responsive-table bills-table">
                <thead>
                    <tr>
                        <th>Bill schedule</th>
                        <th>This month</th>
                        <th>Status</th>
                        <th className="right">Amount</th>
                        {hasActions ? <th className="right">Action</th> : null}
                    </tr>
                </thead>

                <tbody>
                    {bills.map((bill) => {
                        const status = String(bill.status || "").toLowerCase();
                        const isPaid = status === "paid" || status.includes("paid");
                        const isSkipped = status.includes("skipped");
                        const isSaving = savingId === bill.id;

                        return (
                            <tr key={bill.id}>
                                <td data-label="Bill schedule" className="primary-cell">
                                    <button
                                        type="button"
                                        className="table-link-action"
                                        onClick={() => onEditBill?.(bill)}
                                    >
                                        {bill.payee || bill.name}
                                    </button>
                                    {bill.is_core_bill ? <span className="core-bill-badge">Core</span> : null}
                                    <small className="bill-subline">
                                        {(bill.frequency || "monthly").replace("_", " ")}
                                        {bill.due_day ? ` · default due day ${bill.due_day}` : ""}
                                    </small>
                                </td>

                                <td data-label="This month">
                                    {bill.due || bill.due_date || "TBD"}
                                    {bill.instance_id ? <small className="bill-subline">monthly instance ready</small> : null}
                                </td>

                                <td data-label="Status">
                                    <span className={`status ${statusClass(bill.status)}`}>
                                        {bill.status || "Tracked"}
                                    </span>
                                </td>

                                <td data-label="Amount" className="right amount-cell">
                                    {money(bill.amount ?? bill.expected_amount)}
                                </td>

                                {hasActions ? (
                                    <td data-label="Action" className="right action-cell">
                                        <div className="bill-actions">
                                            <button
                                                className="mini-button"
                                                type="button"
                                                disabled={isSaving}
                                                onClick={() => onEditMonth?.(bill)}
                                            >
                                                This month
                                            </button>

                                            <button
                                                className="mini-button"
                                                type="button"
                                                disabled={isSaving}
                                                onClick={() => onEditBill?.(bill)}
                                            >
                                                Schedule
                                            </button>

                                            {!isPaid && !isSkipped && onMarkPaid ? (
                                                <button
                                                    className="mini-button"
                                                    type="button"
                                                    disabled={isSaving}
                                                    onClick={() => onMarkPaid(bill)}
                                                >
                                                    {isSaving ? "Saving..." : "Mark paid"}
                                                </button>
                                            ) : null}

                                            {isPaid && onMarkUnpaid ? (
                                                <button
                                                    className="mini-button"
                                                    type="button"
                                                    disabled={isSaving}
                                                    onClick={() => onMarkUnpaid(bill)}
                                                >
                                                    Mark unpaid
                                                </button>
                                            ) : null}

                                            {!isPaid && !isSkipped && onSkipBill ? (
                                                <button
                                                    className="mini-button"
                                                    type="button"
                                                    disabled={isSaving}
                                                    onClick={() => onSkipBill(bill)}
                                                >
                                                    Skip
                                                </button>
                                            ) : null}

                                            {onDeleteBill ? (
                                                <button
                                                    className="mini-button mini-button--danger"
                                                    type="button"
                                                    disabled={isSaving}
                                                    onClick={() => onDeleteBill(bill)}
                                                >
                                                    Delete
                                                </button>
                                            ) : null}
                                        </div>
                                    </td>
                                ) : null}
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
