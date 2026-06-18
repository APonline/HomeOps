import { useRef, useState } from "react";

export default function PeriodChart({ days = [] }) {
    const scrollerRef = useRef(null);
    const dragRef = useRef({
        active: false,
        startX: 0,
        scrollLeft: 0,
        dragged: false,
    });

    const [isDragging, setIsDragging] = useState(false);

    const chartDays = days.length ? days : [];
    const maxAmount = Math.max(...chartDays.map((day) => Number(day.amount || 0)), 1);

    if (!chartDays.length) {
        return <div className="empty-box">No spending entered yet.</div>;
    }

    function handlePointerDown(event) {
        if (!scrollerRef.current) return;
        if (event.button !== undefined && event.button !== 0) return;

        dragRef.current = {
            active: true,
            startX: event.clientX,
            scrollLeft: scrollerRef.current.scrollLeft,
            dragged: false,
        };

        setIsDragging(true);
        event.currentTarget.setPointerCapture?.(event.pointerId);
    }

    function handlePointerMove(event) {
        if (!dragRef.current.active || !scrollerRef.current) return;

        const diff = event.clientX - dragRef.current.startX;

        if (Math.abs(diff) > 4) {
            dragRef.current.dragged = true;
        }

        scrollerRef.current.scrollLeft = dragRef.current.scrollLeft - diff;
    }

    function stopDragging(event) {
        dragRef.current.active = false;
        setIsDragging(false);
        event.currentTarget.releasePointerCapture?.(event.pointerId);
    }

    function handleWheel(event) {
        if (!scrollerRef.current) return;

        const mostlyVertical = Math.abs(event.deltaY) > Math.abs(event.deltaX);

        if (mostlyVertical) {
            scrollerRef.current.scrollLeft += event.deltaY;
            event.preventDefault();
        }
    }

    return (
        <div className="chart-wrap">
            <div
                ref={scrollerRef}
                className={isDragging ? "chart-scroller is-dragging" : "chart-scroller"}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={stopDragging}
                onPointerCancel={stopDragging}
                onWheel={handleWheel}
                role="region"
                aria-label="Scrollable spending chart"
                tabIndex="0"
            >
                <div className="bar-chart">
                    {chartDays.map((day) => {
                        const amount = Number(day.amount || 0);
                        const height = amount > 0 ? Math.max((amount / maxAmount) * 190, 18) : 8;

                        return (
                            <div className="bar-column" key={day.day}>
                                <span className="day-label">{day.day}</span>
                                <div
                                    className={day.marked ? "bar marked" : "bar"}
                                    style={{ height: `${height}px` }}
                                    title={`Day ${day.day}: $${amount}`}
                                />
                            </div>
                        );
                    })}
                </div>

                <div className="chart-legend">
                    <span><i className="dot normal" /> Normal spending</span>
                    <span><i className="dot marked" /> Marked period</span>
                </div>
            </div>

            <div className="chart-drag-hint">Drag sideways or scroll to explore the month</div>
        </div>
    );
}
