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
                    This area is not available yet.
                </div>
            </section>
        </>
    );
}
