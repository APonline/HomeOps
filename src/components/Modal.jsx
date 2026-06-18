export default function Modal({ active, title, children, onClose }) {
    if (!active) return null;

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <section className="modal-card" onClick={(event) => event.stopPropagation()}>
                <button className="modal-close" type="button" onClick={onClose}>×</button>
                <h2>{title}</h2>
                {children}
            </section>
        </div>
    );
}
