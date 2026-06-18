const WalletIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 7.5A2.5 2.5 0 0 1 6.5 5H19v14H6.5A2.5 2.5 0 0 1 4 16.5v-9Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 8h15m-4 5h4" />
    </svg>
);

const CheckIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
        <circle cx="12" cy="12" r="8" />
        <path strokeLinecap="round" strokeLinejoin="round" d="m8.5 12.5 2.2 2.2 4.8-5.2" />
    </svg>
);

const ClockIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
        <circle cx="12" cy="12" r="8" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5V12l3 2" />
    </svg>
);

const TagIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M20 13.2 13.2 20a2.2 2.2 0 0 1-3.1 0L4 13.9V4h9.9L20 10.1a2.2 2.2 0 0 1 0 3.1Z" />
        <circle cx="9" cy="9" r="1.2" fill="currentColor" stroke="none" />
    </svg>
);

export function MetricCardsExample() {
    return (
        <div className="metric-grid">
            <article className="metric-card metric-card--expected">
                <span>Expected Bills</span>
                <strong>$2,712</strong>
                <p>This month</p>
                <div className="metric-card__icon"><WalletIcon /></div>
            </article>

            <article className="metric-card metric-card--paid">
                <span>Paid This Month</span>
                <strong>$727</strong>
                <p>1 bills paid</p>
                <div className="metric-card__icon"><CheckIcon /></div>
            </article>

            <article className="metric-card metric-card--due">
                <span>Still Due</span>
                <strong>$1,985</strong>
                <p>5 unpaid</p>
                <div className="metric-card__icon"><ClockIcon /></div>
            </article>

            <article className="metric-card metric-card--marked">
                <span>Marked Spending</span>
                <strong>$0</strong>
                <p>Period-linked spending</p>
                <div className="metric-card__icon"><TagIcon /></div>
            </article>
        </div>
    );
}
