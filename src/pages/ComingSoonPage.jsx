export default function ComingSoonPage({ title, note }) {
    return (
        <>
            <header className="page-header">
                <div>
                    <h1>{title}</h1>
                    <p>{note}</p>
                </div>
            </header>

            <section className="panel full-panel">
                <div className="empty-box">
                    Not in MVP Attempt 1. The slot exists, but we are not burning the night turning V2 dreams into spaghetti.
                </div>
            </section>
        </>
    );
}
