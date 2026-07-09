import { useRef, useState } from "react";

function statusClass(status) {
    const normalized = String(status || "").toLowerCase();

    if (normalized.includes("paid")) return "paid";
    if (normalized.includes("due") || normalized.includes("expected")) return "due";
    if (normalized.includes("need")) return "need";
    if (normalized.includes("future")) return "future";

    return "";
}

function formatTypeLabel(value) {
    return String(value || "recurring")
        .replace(/_/g, " ")
        .replace(/\b\w/g, (char) => char.toUpperCase());
}

function typeClass(value) {
    const normalized = String(value || "recurring").toLowerCase();

    if (normalized.includes("monthly")) return "monthly";
    if (normalized.includes("annual") || normalized.includes("year")) return "annual";
    if (normalized.includes("quarter")) return "quarterly";
    if (normalized.includes("one-time") || normalized.includes("onetime") || normalized.includes("once")) return "one-time";
    if (normalized.includes("weekly")) return "weekly";

    return "recurring";
}

export default function DashboardBillsList({ bills = [], money, onOpenBills }) {
    const scrollerRef = useRef(null);
    const dragRef = useRef({
        active: false,
        startX: 0,
        startY: 0,
        scrollLeft: 0,
        scrollTop: 0,
    });

    const [isDragging, setIsDragging] = useState(false);

    if (!bills.length) {
        return (
            <div className="empty-box">
                No bills yet. Add one from the dashboard.
            </div>
        );
    }

    function handlePointerDown(event) {
        if (!scrollerRef.current) return;
        if (event.button !== undefined && event.button !== 0) return;

        dragRef.current = {
            active: true,
            startX: event.clientX,
            startY: event.clientY,
            scrollLeft: scrollerRef.current.scrollLeft,
            scrollTop: scrollerRef.current.scrollTop,
        };

        setIsDragging(true);
        event.currentTarget.setPointerCapture?.(event.pointerId);
    }

    function handlePointerMove(event) {
        if (!dragRef.current.active || !scrollerRef.current) return;

        const diffX = event.clientX - dragRef.current.startX;
        const diffY = event.clientY - dragRef.current.startY;

        scrollerRef.current.scrollLeft = dragRef.current.scrollLeft - diffX;
        scrollerRef.current.scrollTop = dragRef.current.scrollTop - diffY;
    }

    function stopDragging(event) {
        dragRef.current.active = false;
        setIsDragging(false);
        event.currentTarget.releasePointerCapture?.(event.pointerId);
    }

    return (
        <div className="dashboard-bills">
            <div
                ref={scrollerRef}
                className={isDragging ? "dashboard-bills__table-scroll is-dragging" : "dashboard-bills__table-scroll"}
                role="region"
                aria-label="This month's bills"
                tabIndex="0"
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={stopDragging}
                onPointerCancel={stopDragging}
            >
                <div className="dashboard-bill-table">
                    <div className="dashboard-bill-table__head" aria-hidden="true">
                        <span>Item</span>
                        <span className="bill-type-col">Type</span>
                        <span>Due</span>
                        <span>Amount</span>
                        <span>Status</span>
                    </div>

                    <div className="dashboard-bill-table__body" role="list">
                        {bills.map((bill) => {
                            const amount = bill.amount ?? bill.expected_amount;
                            const status = bill.status || "Tracked";
                            const billType =
                                bill.type ||
                                bill.bill_type ||
                                bill.frequency ||
                                "recurring";

                            return (
                                <article
                                    className="dashboard-bill-record"
                                    key={bill.id}
                                    role="listitem"
                                >
                                    <div className="dashboard-bill-record__item">
                                        <strong>{bill.payee || bill.name}</strong>
                                        <span>{bill.is_core_bill ? "Core ownership bill" : bill.notes || "Tracked bill"}</span>
                                    </div>

                                    <span className={`bill-type bill-type-col ${typeClass(billType)}`}>
                                        {formatTypeLabel(billType)}
                                    </span>

                                    <span className="bill-due">
                                        {bill.due || bill.due_date || "TBD"}
                                    </span>

                                    <strong className="bill-amount">
                                        {money(amount)}
                                    </strong>

                                    <span className={`status ${statusClass(status)}`}>
                                        {status}
                                    </span>
                                </article>
                            );
                        })}
                    </div>
                </div>
            </div>

            <div className="dashboard-bills__footer">
                <span>Drag or scroll for the full month</span>
                <button className="mini-button" type="button" onClick={onOpenBills}>
                    Open Bills
                </button>
            </div>
        </div>
    );
}
