import "../styles/homeops-loading-skeleton.css";

function skeletonRows(count) {
    return Array.from({ length: count }, (_, index) => index);
}

export function HomeOpsLoadingPill({ className = "", width = "74px", height = "24px", label = "Loading" }) {
    return (
        <span
            className={`homeops-loading-pill ${className}`.trim()}
            style={{ "--homeops-skeleton-width": width, "--homeops-skeleton-height": height }}
            role="status"
            aria-label={label}
        />
    );
}

export default function HomeOpsLoadingSkeleton({
    rows = 3,
    compact = false,
    className = "",
    label = "Loading items",
}) {
    return (
        <div
            className={`homeops-loading-list ${compact ? "is-compact" : ""} ${className}`.trim()}
            role="status"
            aria-busy="true"
            aria-label={label}
        >
            {skeletonRows(rows).map((row) => (
                <div className="homeops-loading-row" key={row}>
                    <span className="homeops-loading-row__icon" />
                    <span className="homeops-loading-row__copy">
                        <i className="homeops-loading-row__line is-title" />
                        <i className="homeops-loading-row__line is-subtitle" />
                    </span>
                    <span className="homeops-loading-row__meta">
                        <i className="homeops-loading-row__line is-meta" />
                        <i className="homeops-loading-row__line is-value" />
                    </span>
                    <span className="homeops-loading-row__action" />
                </div>
            ))}
        </div>
    );
}
