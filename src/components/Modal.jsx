import { useEffect } from "react";
import { createPortal } from "react-dom";

export default function Modal({ active, title, intro, children, onClose, size = "default" }) {
    useEffect(() => {
        if (!active) return undefined;

        const originalOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";

        function handleKeyDown(event) {
            if (event.key === "Escape") onClose?.();
        }

        window.addEventListener("keydown", handleKeyDown);

        return () => {
            document.body.style.overflow = originalOverflow;
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [active, onClose]);

    if (!active) return null;

    return createPortal(
        <div className="modal-backdrop" onClick={onClose} role="presentation">
            <section
                className={`modal-card modal-card--${size}`}
                onClick={(event) => event.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-label={title}
            >
                <button className="modal-close" type="button" onClick={onClose} aria-label="Close modal">×</button>
                <h2>{title}</h2>
                {intro && <p className="modal-intro">{intro}</p>}
                {children}
            </section>
        </div>,
        document.body,
    );
}
