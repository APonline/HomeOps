import { useRef, useState } from "react";

export default function PeriodChart({
    days = [],
    variant = "month",
    ariaLabel = "Scrollable spending chart",
    emptyText = "No spending entered yet.",
    legend = [
        { className: "normal", label: "Normal spending" },
        { className: "marked", label: "Marked period" },
    ],
    hint = "Drag sideways or scroll to explore the month",
    onBarClick,
}) {
    const scrollerRef = useRef(null);
    const dragRef = useRef({
        active: false,
        startX: 0,
        scrollLeft: 0,
        dragged: false,
        chartIndex: null,
    });

    const [isDragging, setIsDragging] = useState(false);

    const chartDays = days.length ? days : [];
    const maxAmount = Math.max(...chartDays.map((day) => Number(day.amount || 0)), 1);

    if (!chartDays.length) {
        return <div className="empty-box">{emptyText}</div>;
    }

    function handlePointerDown(event) {
        if (!scrollerRef.current) return;
        if (event.button !== undefined && event.button !== 0) return;

        const barButton = event.target?.closest?.("button[data-chart-index]");

        dragRef.current = {
            active: true,
            startX: event.clientX,
            scrollLeft: scrollerRef.current.scrollLeft,
            dragged: false,
            chartIndex: barButton ? Number(barButton.dataset.chartIndex) : null,
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
        const wasDragged = dragRef.current.dragged;
        dragRef.current.active = false;
        setIsDragging(false);
        event.currentTarget.releasePointerCapture?.(event.pointerId);

        if (!wasDragged && onBarClick && Number.isFinite(dragRef.current.chartIndex)) {
            const day = chartDays[dragRef.current.chartIndex];
            if (day) onBarClick(day);
        }
    }

    function handleWheel(event) {
        if (!scrollerRef.current) return;

        const mostlyVertical = Math.abs(event.deltaY) > Math.abs(event.deltaX);

        if (mostlyVertical) {
            scrollerRef.current.scrollLeft += event.deltaY;
            event.preventDefault();
        }
    }

    function handleBarKeyDown(event, day) {
        if (!onBarClick) return;
        if (event.key !== "Enter" && event.key !== " ") return;

        event.preventDefault();
        onBarClick(day);
    }

    return (
        <div className={`chart-wrap chart-wrap--${variant}`}>
            <div
                ref={scrollerRef}
                className={isDragging ? "chart-scroller is-dragging" : "chart-scroller"}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={stopDragging}
                onPointerCancel={stopDragging}
                onWheel={handleWheel}
                role="region"
                aria-label={ariaLabel}
                tabIndex="0"
            >
                <div className={variant === "hourly" ? "bar-chart bar-chart--hourly" : "bar-chart"}>
                    {chartDays.map((day, index) => {
                        const amount = Number(day.amount || 0);
                        const height = amount > 0 ? Math.max((amount / maxAmount) * 190, 18) : 8;
                        const label = day.label ?? day.day;
                        const key = day.key ?? `${label}-${index}`;
                        const itemCount = Number(day.itemCount || day.count || 0);
                        const title = variant === "hourly"
                            ? `${label}: $${amount}${itemCount ? ` across ${itemCount} entries` : ""}`
                            : `Day ${label}: $${amount}`;

                        return (
                            <button
                                className={onBarClick ? "bar-column bar-column--clickable" : "bar-column"}
                                key={key}
                                type="button"
                                data-chart-index={index}
                                onKeyDown={(event) => handleBarKeyDown(event, day)}
                                title={onBarClick ? `${title}. Click to drill into this day.` : title}
                                disabled={!onBarClick}
                            >
                                <span className="day-label">{label}</span>
                                <span
                                    className={day.marked ? "bar marked" : "bar"}
                                    style={{ height: `${height}px` }}
                                    aria-hidden="true"
                                />
                            </button>
                        );
                    })}
                </div>

                {legend.length > 0 && (
                    <div className="chart-legend">
                        {legend.map((item) => (
                            <span key={item.label}><i className={`dot ${item.className}`} /> {item.label}</span>
                        ))}
                    </div>
                )}
            </div>

            {hint && <div className="chart-drag-hint">{hint}</div>}
        </div>
    );
}
