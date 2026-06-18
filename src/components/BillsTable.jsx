function statusClass(status) {
    const normalized = String(status || "").toLowerCase();

    if (normalized.includes("paid")) return "paid";
    if (normalized.includes("due") || normalized.includes("expected")) return "due";
    if (normalized.includes("need")) return "need";
    if (normalized.includes("future")) return "future";

    return "";
}

export default function BillsTable({ bills = [], money, onMarkPaid, savingId = null }) {
    return (
        <div className="table-wrap">
            <table className="responsive-table bills-table">
                <thead>
                    <tr>
                        <th>Payee</th>
                        <th>Due</th>
                        <th>Status</th>
                        <th className="right">Amount</th>
                        {onMarkPaid ? <th className="right">Action</th> : null}
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
                                    {bill.payee || bill.name}
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

                                {onMarkPaid ? (
                                    <td data-label="Action" className="right action-cell">
                                        {isPaid ? (
                                            <span className="muted">done</span>
                                        ) : (
                                            <button
                                                className="mini-button"
                                                disabled={isSaving}
                                                onClick={() => onMarkPaid(bill)}
                                            >
                                                {isSaving ? "Saving..." : "Mark paid"}
                                            </button>
                                        )}
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
