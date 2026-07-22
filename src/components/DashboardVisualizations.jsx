function formatCompactCurrency(value = 0) {
    const amount = Number(value || 0);

    return new Intl.NumberFormat("en-CA", {
        style: "currency",
        currency: "CAD",
        maximumFractionDigits: amount >= 1000 ? 0 : 2,
        notation: amount >= 10000 ? "compact" : "standard",
    }).format(amount);
}

function buildAreaPath(points, width, height, padding) {
    if (!points.length) return "";

    const usableWidth = width - padding * 2;
    const usableHeight = height - padding * 2;
    const maxValue = Math.max(...points.map((point) => Number(point.amount || 0)), 1);

    const coordinates = points.map((point, index) => {
        const x = padding + ((usableWidth / Math.max(points.length - 1, 1)) * index);
        const y = height - padding - ((Number(point.amount || 0) / maxValue) * usableHeight);
        return { x, y };
    });

    const line = coordinates
        .map((point, index) => `${index === 0 ? "M" : "L"}${point.x.toFixed(2)},${point.y.toFixed(2)}`)
        .join(" ");

    const area = `${line} L${coordinates[coordinates.length - 1].x.toFixed(2)},${(height - padding).toFixed(2)} L${coordinates[0].x.toFixed(2)},${(height - padding).toFixed(2)} Z`;

    return { line, area, coordinates, maxValue };
}

function buildDonutSegments(segments) {
    const cleaned = segments.filter((segment) => Number(segment.value || 0) > 0);
    const total = cleaned.reduce((sum, segment) => sum + Number(segment.value || 0), 0);

    if (!total) {
        return { total: 0, segments: [] };
    }

    const radius = 42;
    const circumference = 2 * Math.PI * radius;
    let offset = 0;

    return {
        total,
        radius,
        circumference,
        segments: cleaned.map((segment) => {
            const fraction = Number(segment.value || 0) / total;
            const dash = fraction * circumference;
            const current = {
                ...segment,
                fraction,
                dash,
                dashArray: `${dash} ${circumference - dash}`,
                dashOffset: -offset,
            };
            offset += dash;
            return current;
        }),
    };
}

function emptyCard(copy) {
    return <div className="platform-visual-empty">{copy}</div>;
}

export default function DashboardVisualizations({
    trendSeries = [],
    categoryBreakdown = [],
    paidTotal = 0,
    outstandingTotal = 0,
    expectedTotal = 0,
    money,
    viewMode = "month",
}) {
    const series = trendSeries.filter((item) => Number(item.amount || 0) >= 0);
    const chart = buildAreaPath(series, 360, 180, 18);
    const totalTracked = series.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const peak = series.reduce((max, item) => Math.max(max, Number(item.amount || 0)), 0);
    const nonZeroPoints = series.filter((item) => Number(item.amount || 0) > 0).length;
    const trendLabel = viewMode === "day" ? "Hourly spend arc" : "Spend trajectory";
    const trendSubtitle = viewMode === "day"
        ? `${nonZeroPoints} active hours in the selected day`
        : `${nonZeroPoints} active points mapped in the selected period`;
    const labels = series.length
        ? [series[0], series[Math.floor((series.length - 1) / 2)], series[series.length - 1]]
        : [];

    const donut = buildDonutSegments([
        { label: "Paid", value: Number(paidTotal || 0), className: "paid" },
        { label: "Outstanding", value: Number(outstandingTotal || 0), className: "open" },
        { label: "Unscheduled", value: Math.max(Number(expectedTotal || 0) - Number(paidTotal || 0) - Number(outstandingTotal || 0), 0), className: "other" },
    ]);
    const paymentProgress = expectedTotal > 0 ? Math.round((Number(paidTotal || 0) / Number(expectedTotal || 1)) * 100) : 0;

    const breakdownTotal = categoryBreakdown.reduce((sum, item) => sum + Number(item.amount || 0), 0);

    return (
        <section className="platform-visual-grid" aria-label="Executive dashboard charts">
            <article className="panel platform-visual-card platform-visual-card--trend">
                <div className="platform-visual-card__head">
                    <div>
                        <span>Executive chart</span>
                        <h3>{trendLabel}</h3>
                    </div>
                    <strong>{money ? money(totalTracked) : formatCompactCurrency(totalTracked)}</strong>
                </div>

                <p className="platform-visual-card__summary">{trendSubtitle}</p>

                {series.length && chart ? (
                    <>
                        <div className="platform-trend-chart">
                            <svg viewBox="0 0 360 180" role="img" aria-label={trendLabel}>
                                <defs>
                                    <linearGradient id="homeopsTrendStroke" x1="0" y1="0" x2="1" y2="0">
                                        <stop offset="0%" stopColor="var(--platform-visual-chart-start)" />
                                        <stop offset="100%" stopColor="var(--platform-visual-chart-end)" />
                                    </linearGradient>
                                    <linearGradient id="homeopsTrendFill" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="var(--platform-visual-fill-strong)" />
                                        <stop offset="100%" stopColor="var(--platform-visual-fill-soft)" />
                                    </linearGradient>
                                </defs>

                                {[0.25, 0.5, 0.75].map((ratio) => (
                                    <line
                                        key={ratio}
                                        x1="18"
                                        y1={18 + (144 * ratio)}
                                        x2="342"
                                        y2={18 + (144 * ratio)}
                                        className="platform-trend-chart__grid"
                                    />
                                ))}

                                <path d={chart.area} className="platform-trend-chart__area" />
                                <path d={chart.line} className="platform-trend-chart__line" />
                                {chart.coordinates.map((point, index) => (
                                    <circle
                                        key={`${point.x}-${point.y}-${index}`}
                                        cx={point.x}
                                        cy={point.y}
                                        r={index === chart.coordinates.length - 1 ? 4.2 : 2.8}
                                        className={index === chart.coordinates.length - 1 ? "platform-trend-chart__point is-current" : "platform-trend-chart__point"}
                                    />
                                ))}
                            </svg>
                        </div>

                        <div className="platform-trend-chart__footer">
                            <div className="platform-trend-chart__meta">
                                <span>Peak point</span>
                                <strong>{money ? money(peak) : formatCompactCurrency(peak)}</strong>
                            </div>
                            <div className="platform-trend-chart__ticks">
                                {labels.map((item, index) => (
                                    <span key={`${item.label || item.day}-${index}`}>{item.label ?? item.day}</span>
                                ))}
                            </div>
                        </div>
                    </>
                ) : emptyCard("No chartable activity yet.")}
            </article>

            <article className="panel platform-visual-card platform-visual-card--donut">
                <div className="platform-visual-card__head">
                    <div>
                        <span>Collection view</span>
                        <h3>Payment mix</h3>
                    </div>
                    <strong>{expectedTotal ? `${paymentProgress}%` : "—"}</strong>
                </div>

                {donut.total ? (
                    <div className="platform-donut-wrap">
                        <div className="platform-donut-chart" aria-hidden="true">
                            <svg viewBox="0 0 120 120">
                                <circle className="platform-donut-chart__track" cx="60" cy="60" r={donut.radius} />
                                {donut.segments.map((segment) => (
                                    <circle
                                        key={segment.label}
                                        className={`platform-donut-chart__segment ${segment.className}`}
                                        cx="60"
                                        cy="60"
                                        r={donut.radius}
                                        strokeDasharray={segment.dashArray}
                                        strokeDashoffset={segment.dashOffset}
                                    />
                                ))}
                            </svg>
                            <div className="platform-donut-chart__center">
                                <strong>{money ? money(outstandingTotal) : formatCompactCurrency(outstandingTotal)}</strong>
                                <span>open</span>
                            </div>
                        </div>

                        <div className="platform-donut-legend">
                            {donut.segments.map((segment) => (
                                <div className="platform-donut-legend__row" key={segment.label}>
                                    <span>
                                        <i className={`platform-dot ${segment.className}`} />
                                        {segment.label}
                                    </span>
                                    <strong>{money ? money(segment.value) : formatCompactCurrency(segment.value)}</strong>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : emptyCard("Add bills or bill amounts to unlock the mix view.")}
            </article>

            <article className="panel platform-visual-card platform-visual-card--bars">
                <div className="platform-visual-card__head">
                    <div>
                        <span>Spending lens</span>
                        <h3>Category breakdown</h3>
                    </div>
                    <strong>{breakdownTotal ? (money ? money(breakdownTotal) : formatCompactCurrency(breakdownTotal)) : "—"}</strong>
                </div>

                {categoryBreakdown.length ? (
                    <div className="platform-breakdown-list">
                        {categoryBreakdown.map((item) => {
                            const percent = breakdownTotal > 0 ? Math.max((Number(item.amount || 0) / breakdownTotal) * 100, 4) : 0;
                            return (
                                <article className="platform-breakdown-row" key={item.label}>
                                    <div className="platform-breakdown-row__copy">
                                        <span>{item.label}</span>
                                        <strong>{money ? money(item.amount) : formatCompactCurrency(item.amount)}</strong>
                                    </div>
                                    <div className="platform-breakdown-row__bar">
                                        <i style={{ width: `${Math.min(percent, 100)}%` }} />
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                ) : emptyCard("Receipt categories will appear here as you log spending.")}
            </article>
        </section>
    );
}
