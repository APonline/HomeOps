function statusClass(status) {
    const normalized = String(status || "").toLowerCase();

    if (normalized.includes("paid")) return "paid";
    if (normalized.includes("due") || normalized.includes("expected")) return "due";
    if (normalized.includes("need")) return "need";
    if (normalized.includes("future")) return "future";

    return "";
}

export default function BillsTable({
    bills = [],
    money,
    onMarkPaid,
    onEditBill,
    onDeleteBill,
    savingId = null,
}) {
    const hasActions = Boolean(onMarkPaid || onEditBill || onDeleteBill);

    return (
        <div className="table-wrap">
            <table className="responsive-table bills-table">
                <thead>
                    <tr>
                        <th>Payee</th>
                        <th>Due</th>
                        <th>Status</th>
                        <th className="right">Amount</th>
                        {hasActions ? <th className="right">Action</th> : null}
                    </tr>
                </thead>

                <tbody>
                    {bills.map((bill) => {
                        const status = String(bill.status || "").toLowerCase();
                        const isPaid = status === "paid" || status.includes("paid");
                        const isSaving = savingId === bill.id;

                        return (
                            <tr key={bill.id}>
                                <td data-label="Payee" className="primary-cell">
                                    <button
                                        type="button"
                                        className="table-link-action"
                                        onClick={() => onEditBill?.(bill)}
                                    >
                                        {bill.payee || bill.name}
                                    </button>
                                </td>

                                <td data-label="Due">
                                    {bill.due || bill.due_date || "TBD"}
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
                                                onClick={() => onEditBill?.(bill)}
                                            >
                                                Edit
                                            </button>

                                            {!isPaid && onMarkPaid ? (
                                                <button
                                                    className="mini-button"
                                                    type="button"
                                                    disabled={isSaving}
                                                    onClick={() => onMarkPaid(bill)}
                                                >
                                                    {isSaving ? "Saving..." : "Mark paid"}
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
