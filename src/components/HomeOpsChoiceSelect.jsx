import { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import "../styles/homeops-choice-select.css";

function ChevronIcon({ open }) {
    return (
        <svg className={open ? "is-open" : ""} viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="m7 10 5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

function SearchIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.8" />
            <path d="m16 16 4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
    );
}

function CheckIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="m6.5 12.5 3.5 3.5 7.5-8" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

function readableValue(value) {
    return String(value || "")
        .replace(/_/g, " ")
        .replace(/\b\w/g, (character) => character.toUpperCase());
}

function buildGroups(options) {
    const groups = [];
    const groupMap = new Map();

    options.forEach((option) => {
        const groupName = option.group || "Other";
        if (!groupMap.has(groupName)) {
            const group = { name: groupName, options: [] };
            groupMap.set(groupName, group);
            groups.push(group);
        }
        groupMap.get(groupName).options.push(option);
    });

    return groups;
}

export default function HomeOpsChoiceSelect({
    className = "",
    label,
    optional = false,
    value,
    onChange,
    options,
    placeholder = "Choose an option",
    searchPlaceholder = "Search options",
    emptyText = "No matching options",
}) {
    const triggerRef = useRef(null);
    const menuRef = useRef(null);
    const searchRef = useRef(null);
    const listboxId = useId();
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [position, setPosition] = useState(null);

    const selectedOption = useMemo(() => {
        const matched = options.find((option) => String(option.value) === String(value));
        if (matched) return matched;
        if (!value) return null;

        return {
            value,
            label: readableValue(value),
            description: "Saved custom value",
            group: "Current",
            tone: "other",
        };
    }, [options, value]);

    const visibleOptions = useMemo(() => {
        const source = selectedOption && !options.some((option) => String(option.value) === String(selectedOption.value))
            ? [selectedOption, ...options]
            : options;
        const normalizedQuery = query.trim().toLowerCase();

        if (!normalizedQuery) return source;

        return source.filter((option) => [
            option.label,
            option.description,
            option.group,
            option.value,
            ...(option.keywords || []),
        ].filter(Boolean).join(" ").toLowerCase().includes(normalizedQuery));
    }, [options, query, selectedOption]);

    const groups = useMemo(() => buildGroups(visibleOptions), [visibleOptions]);

    function updatePosition() {
        const trigger = triggerRef.current;
        if (!trigger) return;

        const rect = trigger.getBoundingClientRect();
        const viewportPadding = 12;
        const gap = 8;
        const spaceBelow = window.innerHeight - rect.bottom - viewportPadding;
        const spaceAbove = rect.top - viewportPadding;
        const placement = spaceBelow >= 280 || spaceBelow >= spaceAbove ? "bottom" : "top";
        const availableHeight = placement === "bottom" ? spaceBelow : spaceAbove;
        const maxHeight = Math.max(190, Math.min(430, availableHeight));
        const width = Math.min(Math.max(rect.width, 360), window.innerWidth - (viewportPadding * 2));
        const left = Math.min(
            Math.max(viewportPadding, rect.left),
            window.innerWidth - width - viewportPadding,
        );

        setPosition({
            left,
            width,
            maxHeight,
            placement,
            top: placement === "bottom" ? rect.bottom + gap : undefined,
            bottom: placement === "top" ? window.innerHeight - rect.top + gap : undefined,
        });
    }

    function closeMenu({ returnFocus = false } = {}) {
        setOpen(false);
        setQuery("");
        if (returnFocus) {
            window.requestAnimationFrame(() => triggerRef.current?.focus());
        }
    }

    function openMenu() {
        setOpen(true);
        setQuery("");
        window.requestAnimationFrame(() => {
            updatePosition();
            searchRef.current?.focus();
        });
    }

    useEffect(() => {
        if (!open) return undefined;

        function handlePointerDown(event) {
            if (triggerRef.current?.contains(event.target) || menuRef.current?.contains(event.target)) return;
            closeMenu();
        }

        function handleKeyDown(event) {
            if (event.key === "Escape") {
                event.preventDefault();
                closeMenu({ returnFocus: true });
            }
        }

        function handleViewportChange() {
            updatePosition();
        }

        document.addEventListener("pointerdown", handlePointerDown);
        document.addEventListener("keydown", handleKeyDown);
        window.addEventListener("resize", handleViewportChange);
        window.addEventListener("scroll", handleViewportChange, true);

        return () => {
            document.removeEventListener("pointerdown", handlePointerDown);
            document.removeEventListener("keydown", handleKeyDown);
            window.removeEventListener("resize", handleViewportChange);
            window.removeEventListener("scroll", handleViewportChange, true);
        };
    }, [open]);

    function handleTriggerKeyDown(event) {
        if (["ArrowDown", "Enter", " "].includes(event.key)) {
            event.preventDefault();
            if (!open) openMenu();
        }
    }

    function chooseOption(option) {
        onChange(option.value);
        closeMenu({ returnFocus: true });
    }

    return (
        <div className={`homeops-choice-field ${className}`.trim()}>
            <span className="homeops-choice-field__label">
                {label}
                {optional && <small className="homeops-field-optional">Optional</small>}
            </span>

            <button
                ref={triggerRef}
                className={`homeops-choice-trigger ${open ? "is-open" : ""} ${selectedOption ? "has-value" : ""}`}
                type="button"
                aria-haspopup="listbox"
                aria-expanded={open}
                aria-controls={listboxId}
                onClick={() => (open ? closeMenu() : openMenu())}
                onKeyDown={handleTriggerKeyDown}
            >
                <span className="homeops-choice-trigger__accent" data-tone={selectedOption?.tone || "neutral"} aria-hidden="true" />
                <span className="homeops-choice-trigger__copy">
                    <strong>{selectedOption?.label || placeholder}</strong>
                    <small>{selectedOption?.description || "Select from the prepared HomeOps list"}</small>
                </span>
                <ChevronIcon open={open} />
            </button>

            {open && position && createPortal(
                <div
                    ref={menuRef}
                    id={listboxId}
                    className={`homeops-choice-menu is-${position.placement}`}
                    role="listbox"
                    aria-label={label}
                    style={{
                        left: position.left,
                        top: position.top,
                        bottom: position.bottom,
                        width: position.width,
                        maxHeight: position.maxHeight,
                    }}
                >
                    <div className="homeops-choice-menu__search">
                        <SearchIcon />
                        <input
                            ref={searchRef}
                            type="search"
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            placeholder={searchPlaceholder}
                            aria-label={searchPlaceholder}
                        />
                    </div>

                    <div className="homeops-choice-menu__list">
                        {groups.map((group) => (
                            <section key={group.name} className="homeops-choice-menu__group">
                                <span className="homeops-choice-menu__group-label">{group.name}</span>
                                {group.options.map((option) => {
                                    const selected = String(option.value) === String(value);
                                    return (
                                        <button
                                            key={`${group.name}-${option.value}`}
                                            type="button"
                                            role="option"
                                            aria-selected={selected}
                                            className={selected ? "is-selected" : ""}
                                            onClick={() => chooseOption(option)}
                                        >
                                            <span className="homeops-choice-option__accent" data-tone={option.tone || "other"} aria-hidden="true" />
                                            <span className="homeops-choice-option__copy">
                                                <strong>{option.label}</strong>
                                                {option.description && <small>{option.description}</small>}
                                            </span>
                                            {selected && <CheckIcon />}
                                        </button>
                                    );
                                })}
                            </section>
                        ))}

                        {!groups.length && (
                            <div className="homeops-choice-menu__empty">{emptyText}</div>
                        )}
                    </div>
                </div>,
                document.body,
            )}
        </div>
    );
}
