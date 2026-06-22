import iconLogo from "../assets/brand/homeops-icon-256.png";

export default function HomeOpsDataLoader({ active = false, label = "Updating HomeOps" }) {
    if (!active) return null;

    return (
        <div className="v0-data-loader" role="status" aria-live="polite" aria-label={label}>
            <div className="v0-data-loader__card">
                <div className="v0-data-loader__mark" aria-hidden="true">
                    <span className="v0-data-loader__gear v0-data-loader__gear--one" />
                    <span className="v0-data-loader__gear v0-data-loader__gear--two" />
                    <img src={iconLogo} alt="" />
                </div>
                <div className="v0-data-loader__copy">
                    <span>HomeOps</span>
                    <strong>{label}</strong>
                </div>
            </div>
        </div>
    );
}
