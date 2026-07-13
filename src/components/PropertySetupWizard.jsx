/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useHomeOps } from "../context/HomeOpsContext";
import { createPropertySetup, monthFromParts, nullableNumber, todayIso } from "../lib/homeopsApi";
import homeOpsLogo from "../assets/brand/homeops-logo-horizontal-master-transparent.png";
import homeOpsLogoLime from "../assets/brand/homeops-logo-horizontal-lime-transparent.png";

const STEPS = [
    { key: "property", label: "Property", hint: "Name the place" },
    { key: "rooms", label: "Rooms", hint: "Choose useful locations" },
    { key: "costs", label: "Costs", hint: "Add one recurring bill" },
    { key: "upkeep", label: "Upkeep", hint: "Add one maintenance task" },
    { key: "finish", label: "Finish", hint: "Review and create" },
];


const CITY_REGION_OPTIONS = [
    "Toronto, ON",
    "North York, ON",
    "Scarborough, ON",
    "Etobicoke, ON",
    "Pickering, ON",
    "Ajax, ON",
    "Whitby, ON",
    "Oshawa, ON",
    "Mississauga, ON",
    "Brampton, ON",
    "Markham, ON",
    "Vaughan, ON",
    "Richmond Hill, ON",
    "Oakville, ON",
    "Burlington, ON",
    "Hamilton, ON",
    "Ottawa, ON",
    "Kitchener-Waterloo, ON",
    "London, ON",
    "Montreal, QC",
    "Quebec City, QC",
    "Halifax, NS",
    "Winnipeg, MB",
    "Calgary, AB",
    "Edmonton, AB",
    "Vancouver, BC",
    "Victoria, BC",
    "Other / not listed",
];

const ROOM_TEMPLATES = [
    { client_key: "living", name: "Living room", room_type: "living", selected: true },
    { client_key: "kitchen", name: "Kitchen", room_type: "kitchen", selected: true },
    { client_key: "primary-bedroom", name: "Primary bedroom", room_type: "bedroom", selected: false },
    { client_key: "bathroom", name: "Bathroom", room_type: "bathroom", selected: false },
    { client_key: "office", name: "Office / studio", room_type: "office", selected: false },
    { client_key: "utility", name: "Utility room", room_type: "utility", selected: false },
    { client_key: "laundry", name: "Laundry", room_type: "laundry", selected: false },
    { client_key: "exterior", name: "Balcony / exterior", room_type: "exterior", selected: false },
];

const BILL_TEMPLATES = [
    { client_key: "housing", source_key: "mortgage", payee: "Mortgage", selected: true, amount: "", due_day: "1", frequency: "monthly", notes: "" },
    { client_key: "hoa", source_key: "hoa_fee", payee: "Condo / HOA fees", selected: false, amount: "", due_day: "1", frequency: "monthly", notes: "" },
    { client_key: "property-tax", source_key: "property_tax", payee: "Property tax", selected: false, amount: "", due_day: "1", frequency: "monthly", notes: "" },
    { client_key: "insurance", source_key: "insurance", payee: "Home insurance", selected: false, amount: "", due_day: "1", frequency: "monthly", notes: "" },
    { client_key: "utilities", source_key: "utilities", payee: "Utilities", selected: false, amount: "", due_day: "1", frequency: "monthly", notes: "" },
    { client_key: "internet", source_key: "internet", payee: "Internet", selected: false, amount: "", due_day: "1", frequency: "monthly", notes: "" },
];

function addDaysIso(days) {
    const date = new Date(`${todayIso()}T12:00:00`);
    date.setDate(date.getDate() + days);
    return date.toISOString().slice(0, 10);
}

function addMonthsIso(months) {
    const date = new Date(`${todayIso()}T12:00:00`);
    date.setMonth(date.getMonth() + months);
    return date.toISOString().slice(0, 10);
}

const MAINTENANCE_TEMPLATES = [
    {
        client_key: "smoke-alarms",
        name: "Test smoke / CO alarms",
        selected: false,
        frequency_count: "6",
        frequency_unit: "months",
        next_due_date: addMonthsIso(6),
        room_key: "",
        priority: "normal",
        tracks_inventory: false,
        quantity_on_hand: "",
        units_per_service: "1",
        pack_quantity: "",
        restock_cost: "",
        inventory_unit: "battery",
        notes: "",
    },
    {
        client_key: "air-filter",
        name: "Replace HVAC filter",
        selected: false,
        frequency_count: "90",
        frequency_unit: "days",
        next_due_date: addDaysIso(90),
        room_key: "utility",
        priority: "normal",
        tracks_inventory: false,
        quantity_on_hand: "",
        units_per_service: "1",
        pack_quantity: "",
        restock_cost: "",
        inventory_unit: "filter",
        notes: "",
    },
    {
        client_key: "dryer-vent",
        name: "Clean dryer vent",
        selected: false,
        frequency_count: "12",
        frequency_unit: "months",
        next_due_date: addMonthsIso(12),
        room_key: "laundry",
        priority: "normal",
        tracks_inventory: false,
        quantity_on_hand: "",
        units_per_service: "1",
        pack_quantity: "",
        restock_cost: "",
        inventory_unit: "item",
        notes: "",
    },
    {
        client_key: "water-heater",
        name: "Check water heater",
        selected: false,
        frequency_count: "12",
        frequency_unit: "months",
        next_due_date: addMonthsIso(12),
        room_key: "utility",
        priority: "normal",
        tracks_inventory: false,
        quantity_on_hand: "",
        units_per_service: "1",
        pack_quantity: "",
        restock_cost: "",
        inventory_unit: "item",
        notes: "",
    },
];

function makeInitialDraft(isFirstProperty) {
    return {
        step: 0,
        home: {
            name: "",
            property_type: "",
            city_region: "",
            purchase_date: "",
            purchase_price: "",
            square_footage: "",
            occupancy_status: "owner_occupied",
            primary_use: isFirstProperty ? "primary_residence" : "secondary_residence",
            is_primary: isFirstProperty,
        },
        rooms: ROOM_TEMPLATES.map((room) => ({ ...room })),
        bills: BILL_TEMPLATES.map((bill) => ({ ...bill })),
        maintenance: MAINTENANCE_TEMPLATES.map((item) => ({ ...item })),
    };
}

function draftStorageKey(userId) {
    return `homeops.propertySetupDraft.${userId || "anonymous"}`;
}

function readDraft(userId, isFirstProperty) {
    try {
        const raw = window.localStorage.getItem(draftStorageKey(userId));
        if (!raw) return makeInitialDraft(isFirstProperty);

        const parsed = JSON.parse(raw);
        return {
            ...makeInitialDraft(isFirstProperty),
            ...parsed,
            home: { ...makeInitialDraft(isFirstProperty).home, ...(parsed.home || {}) },
            rooms: Array.isArray(parsed.rooms) ? parsed.rooms : makeInitialDraft(isFirstProperty).rooms,
            bills: Array.isArray(parsed.bills) ? parsed.bills : makeInitialDraft(isFirstProperty).bills,
            maintenance: Array.isArray(parsed.maintenance) ? parsed.maintenance : makeInitialDraft(isFirstProperty).maintenance,
        };
    } catch {
        return makeInitialDraft(isFirstProperty);
    }
}

function writeDraft(userId, draft) {
    try {
        window.localStorage.setItem(draftStorageKey(userId), JSON.stringify(draft));
    } catch {
        // The wizard still works in-memory when storage is unavailable.
    }
}

function clearDraft(userId) {
    try {
        window.localStorage.removeItem(draftStorageKey(userId));
    } catch {
        // Nothing else to do.
    }
}

function selectedItems(items) {
    return items.filter((item) => item.selected);
}

function monthlyEquivalent(amount, frequency) {
    const value = Number(amount || 0);
    const multipliers = {
        weekly: 52 / 12,
        biweekly: 26 / 12,
        monthly: 1,
        quarterly: 1 / 3,
        semiannual: 1 / 6,
        annual: 1 / 12,
        once: 0,
    };

    return value * (multipliers[frequency] ?? 1);
}

function formatMoney(value) {
    const number = Number(value || 0);
    return new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(number);
}

function propertyTypeLabel(value) {
    const labels = {
        townhouse: "Townhouse",
        condo: "Condo",
        apartment: "Apartment",
        detached: "Detached house",
        semi_detached: "Semi-detached",
        cottage: "Cottage",
        rental: "Rental property",
        other: "Other",
    };
    return labels[value] || value || "Property";
}

function StepHeader({ eyebrow, title, copy }) {
    return (
        <header className="property-setup-step__header">
            <span>{eyebrow}</span>
            <h1>{title}</h1>
            <p>{copy}</p>
        </header>
    );
}

function ToggleCard({ active, title, subtitle, onClick, children }) {
    return (
        <article className={`property-setup-choice ${active ? "is-selected" : ""}`}>
            <button className="property-setup-choice__toggle" type="button" onClick={onClick} aria-pressed={active}>
                <span className="property-setup-choice__check" aria-hidden="true">{active ? "✓" : "+"}</span>
                <span>
                    <strong>{title}</strong>
                    {subtitle && <small>{subtitle}</small>}
                </span>
            </button>
            {active && children ? <div className="property-setup-choice__fields">{children}</div> : null}
        </article>
    );
}

export default function PropertySetupWizard({ active, onDone }) {
    const { user, logout } = useAuth();
    const {
        homes,
        propertySetupForced,
        closePropertySetup,
        completePropertySetup,
    } = useHomeOps();
    const isFirstProperty = homes.length === 0;
    const [draft, setDraft] = useState(() => readDraft(user?.id, isFirstProperty));
    const [customRoomName, setCustomRoomName] = useState("");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(null);
    const setupRef = useRef(null);
    const workspaceRef = useRef(null);

    useEffect(() => {
        if (!active) return;
        setDraft(readDraft(user?.id, isFirstProperty));
        setError("");
        setSuccess(null);
        // Rehydrate only when the wizard opens or the signed-in account changes.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [active, user?.id]);

    useEffect(() => {
        if (!active || success) return;
        writeDraft(user?.id, draft);
    }, [active, draft, success, user?.id]);

    useEffect(() => {
        if (!active) return undefined;
        document.body.classList.add("property-setup-open");
        return () => document.body.classList.remove("property-setup-open");
    }, [active]);

    const selectedRooms = useMemo(() => selectedItems(draft.rooms), [draft.rooms]);
    const selectedBills = useMemo(() => selectedItems(draft.bills), [draft.bills]);
    const selectedMaintenance = useMemo(() => selectedItems(draft.maintenance), [draft.maintenance]);
    const monthlyTotal = selectedBills.reduce((sum, item) => sum + monthlyEquivalent(item.amount, item.frequency), 0);
    const currentStep = Math.min(Math.max(Number(draft.step || 0), 0), STEPS.length - 1);

    useEffect(() => {
        if (!active || success) return undefined;

        const frame = window.requestAnimationFrame(() => {
            setupRef.current?.scrollTo({ top: 0, left: 0, behavior: "auto" });
            workspaceRef.current?.scrollTo({ top: 0, left: 0, behavior: "auto" });
        });

        return () => window.cancelAnimationFrame(frame);
    }, [active, currentStep, success]);

    if (!active) return null;

    function updateHome(field, value) {
        setDraft((current) => ({
            ...current,
            home: { ...current.home, [field]: value },
            bills: field === "occupancy_status"
                ? current.bills.map((bill) => bill.client_key === "housing"
                    ? { ...bill, payee: value === "tenant" ? "Rent" : "Mortgage", source_key: value === "tenant" ? "rent" : "mortgage" }
                    : bill)
                : current.bills,
        }));
    }

    function updateCollection(collection, key, patch) {
        setDraft((current) => ({
            ...current,
            [collection]: current[collection].map((item) => item.client_key === key ? { ...item, ...patch } : item),
        }));
    }

    function addCustomRoom() {
        const name = customRoomName.trim();
        if (!name) return;

        setDraft((current) => ({
            ...current,
            rooms: [
                ...current.rooms,
                {
                    client_key: `custom-room-${Date.now()}`,
                    name,
                    room_type: "other",
                    selected: true,
                },
            ],
        }));
        setCustomRoomName("");
    }

    function addCustomBill() {
        setDraft((current) => ({
            ...current,
            bills: [
                ...current.bills,
                {
                    client_key: `custom-bill-${Date.now()}`,
                    source_key: "other",
                    payee: "",
                    selected: true,
                    amount: "",
                    due_day: "1",
                    frequency: "monthly",
                    notes: "",
                    custom: true,
                },
            ],
        }));
    }

    function addCustomMaintenance() {
        setDraft((current) => ({
            ...current,
            maintenance: [
                ...current.maintenance,
                {
                    client_key: `custom-maintenance-${Date.now()}`,
                    name: "",
                    selected: true,
                    frequency_count: "3",
                    frequency_unit: "months",
                    next_due_date: addMonthsIso(3),
                    room_key: "",
                    priority: "normal",
                    tracks_inventory: false,
                    quantity_on_hand: "",
                    units_per_service: "1",
                    pack_quantity: "",
                    restock_cost: "",
                    inventory_unit: "item",
                    notes: "",
                    custom: true,
                },
            ],
        }));
    }

    function validateStep(step) {
        if (step === 0) {
            if (!draft.home.name.trim()) return "Give the property a name so you can recognize it everywhere in HomeOps.";
            if (!draft.home.property_type) return "Choose a property type.";
            return "";
        }

        if (step === 1) {
            if (selectedRooms.length < 2) return "Choose at least two rooms or areas. You can add the rest later.";
            return "";
        }

        if (step === 2) {
            if (selectedBills.length < 1) return "Add at least one recurring cost so the Bills screen has a useful starting point.";
            const invalid = selectedBills.find((bill) => !bill.payee.trim() || Number(bill.amount) <= 0 || Number(bill.due_day) < 1 || Number(bill.due_day) > 31);
            if (invalid) return "Each selected bill needs a name, an amount above $0, and a due day from 1 to 31.";
            return "";
        }

        if (step === 3) {
            if (selectedMaintenance.length < 1) return "Choose at least one upkeep task so Maintenance has something useful to track.";
            const invalid = selectedMaintenance.find((item) => !item.name.trim() || !item.next_due_date || (item.frequency_unit !== "as_needed" && Number(item.frequency_count) < 1));
            if (invalid) return "Each selected task needs a name, a next due date, and a valid interval.";
            return "";
        }

        return "";
    }

    function goNext() {
        const message = validateStep(currentStep);
        if (message) {
            setError(message);
            return;
        }

        setError("");
        setDraft((current) => ({ ...current, step: Math.min(currentStep + 1, STEPS.length - 1) }));
    }

    function goBack() {
        setError("");
        setDraft((current) => ({ ...current, step: Math.max(currentStep - 1, 0) }));
    }

    function resetWizard() {
        if (!window.confirm("Clear this setup draft and start again?")) return;
        const next = makeInitialDraft(isFirstProperty);
        clearDraft(user?.id);
        setDraft(next);
        setError("");
        setSuccess(null);
    }

    function buildPayload() {
        const home = { ...draft.home };
        const baseline = {
            mortgage_payment: null,
            hoa_fee: null,
            property_tax: null,
            insurance: null,
            utilities: null,
            internet: null,
            other_baseline_costs: null,
        };

        selectedBills.forEach((bill) => {
            const value = monthlyEquivalent(bill.amount, bill.frequency);
            if (bill.source_key === "mortgage" || bill.source_key === "rent") baseline.mortgage_payment = value;
            else if (Object.prototype.hasOwnProperty.call(baseline, bill.source_key)) baseline[bill.source_key] = value;
            else baseline.other_baseline_costs = Number(baseline.other_baseline_costs || 0) + value;
        });

        return {
            home: {
                ...home,
                ...baseline,
                purchase_price: nullableNumber(home.purchase_price),
                square_footage: nullableNumber(home.square_footage),
                currency: "CAD",
            },
            rooms: selectedRooms.map((room, index) => ({
                client_key: room.client_key,
                name: room.name,
                room_type: room.room_type || "other",
                sort_order: (index + 1) * 10,
            })),
            bills: selectedBills.map((bill) => ({
                client_key: bill.client_key,
                source_key: bill.source_key || "other",
                payee: bill.payee.trim(),
                amount: nullableNumber(bill.amount),
                due_day: Number(bill.due_day),
                frequency: bill.frequency || "monthly",
                month: monthFromParts(new Date().getFullYear(), new Date().getMonth() + 1),
                notes: bill.notes || null,
            })),
            maintenance: selectedMaintenance.map((item) => ({
                client_key: item.client_key,
                name: item.name.trim(),
                room_key: selectedRooms.some((room) => room.client_key === item.room_key) ? item.room_key : null,
                location_label: null,
                frequency_count: item.frequency_unit === "as_needed" ? null : nullableNumber(item.frequency_count),
                frequency_unit: item.frequency_unit,
                next_due_date: item.next_due_date || null,
                priority: item.priority || "normal",
                notes: item.notes || null,
                tracks_inventory: Boolean(item.tracks_inventory),
                quantity_on_hand: item.tracks_inventory ? nullableNumber(item.quantity_on_hand) || 0 : 0,
                units_per_service: item.tracks_inventory ? nullableNumber(item.units_per_service) || 1 : 1,
                pack_quantity: item.tracks_inventory ? nullableNumber(item.pack_quantity) : null,
                restock_cost: item.tracks_inventory ? nullableNumber(item.restock_cost) : null,
                inventory_unit: item.tracks_inventory ? item.inventory_unit || "item" : null,
            })),
        };
    }

    async function finishSetup() {
        const messages = [0, 1, 2, 3].map(validateStep).filter(Boolean);
        if (messages.length) {
            setError(messages[0]);
            return;
        }

        setSaving(true);
        setError("");

        try {
            const json = await createPropertySetup(buildPayload());
            const createdHome = json?.home?.home || json?.home || null;
            const createdHomeId = createdHome?.id || json?.id || null;

            if (!createdHomeId) throw new Error("The property was created, but HomeOps could not select it.");

            clearDraft(user?.id);
            await completePropertySetup(createdHomeId);
            setSuccess({
                home: createdHome,
                counts: json?.counts || {
                    rooms: selectedRooms.length,
                    bills: selectedBills.length,
                    maintenance: selectedMaintenance.length,
                },
            });
        } catch (err) {
            setError(err.message || "HomeOps could not finish this property setup.");
        } finally {
            setSaving(false);
        }
    }

    function openHomeOps() {
        setSuccess(null);
        closePropertySetup();
        onDone?.("dashboard");
    }

    const propertyName = draft.home.name.trim() || "your property";

    return (
        <div ref={setupRef} className="property-setup" role="dialog" aria-modal="true" aria-label="New property setup">
            <div className="property-setup__scene" />
            <aside className="property-setup__rail">
                <div className="property-setup__brand">
                    <img src={homeOpsLogo} alt="HomeOps" className="property-setup__logo property-setup__logo--default" />
                    <img src={homeOpsLogoLime} alt="HomeOps" className="property-setup__logo property-setup__logo--light" />
                    <p>Build a useful starting point. Add the rest when you actually need it.</p>
                </div>

                <nav className="property-setup-progress" aria-label="Setup progress">
                    {STEPS.map((step, index) => (
                        <button
                            key={step.key}
                            type="button"
                            className={`${index === currentStep ? "is-current" : ""} ${index < currentStep ? "is-complete" : ""}`}
                            onClick={() => index < currentStep && setDraft((current) => ({ ...current, step: index }))}
                            disabled={index > currentStep}
                        >
                            <span>{index < currentStep ? "✓" : index + 1}</span>
                            <span><strong>{step.label}</strong><small>{step.hint}</small></span>
                        </button>
                    ))}
                </nav>

                <div className="property-setup__rail-footer">
                    <span>Draft saves automatically</span>
                    <button type="button" onClick={resetWizard}>Start over</button>
                </div>
            </aside>

            <section ref={workspaceRef} className="property-setup__workspace">
                <div className="property-setup__topbar">
                    <div>
                        <span>New property setup</span>
                        <strong>{propertyName}</strong>
                    </div>
                    {propertySetupForced ? (
                        <button type="button" className="property-setup__text-action" onClick={logout}>Sign out</button>
                    ) : (
                        <button type="button" className="property-setup__close" onClick={closePropertySetup} aria-label="Close setup">×</button>
                    )}
                </div>

                <div className="property-setup__main">
                    {success ? (
                        <div className="property-setup-success">
                            <span className="property-setup-success__icon">✓</span>
                            <span className="property-setup-success__eyebrow">Property ready</span>
                            <h1>{success.home?.name || propertyName} is set up.</h1>
                            <p>You now have enough real structure to use HomeOps without landing in a wall of empty screens.</p>
                            <div className="property-setup-success__counts">
                                <div><strong>{success.counts.rooms}</strong><span>rooms</span></div>
                                <div><strong>{success.counts.bills}</strong><span>bills</span></div>
                                <div><strong>{success.counts.maintenance}</strong><span>upkeep task{success.counts.maintenance === 1 ? "" : "s"}</span></div>
                            </div>
                            <div className="property-setup-success__next">
                                <span>Later, when useful</span>
                                <p>Add financing, appliances, documents, receipts, projects, and more from the normal HomeOps screens.</p>
                            </div>
                            <button className="property-setup-primary" type="button" onClick={openHomeOps}>Open HomeOps</button>
                        </div>
                    ) : (
                        <>
                            {currentStep === 0 && (
                                <div className="property-setup-step">
                                    <StepHeader
                                        eyebrow="Step 1 of 5"
                                        title="Tell HomeOps which place this is."
                                        copy="Keep it simple. These basics create the property anchor that every bill, receipt, repair, and document can use."
                                    />
                                    <div className="property-setup-form-grid">
                                        <label className="property-setup-field property-setup-field--wide">
                                            <span>Property name</span>
                                            <input autoFocus value={draft.home.name} onChange={(event) => updateHome("name", event.target.value)} placeholder="Toronto Townhouse" />
                                            <small>Use the name you naturally call it.</small>
                                        </label>
                                        <label className="property-setup-field">
                                            <span>Property type</span>
                                            <select value={draft.home.property_type} onChange={(event) => updateHome("property_type", event.target.value)}>
                                                <option value="">Choose a type</option>
                                                <option value="townhouse">Townhouse</option>
                                                <option value="condo">Condo</option>
                                                <option value="apartment">Apartment</option>
                                                <option value="detached">Detached house</option>
                                                <option value="semi_detached">Semi-detached</option>
                                                <option value="cottage">Cottage</option>
                                                <option value="rental">Rental property</option>
                                                <option value="other">Other</option>
                                            </select>
                                        </label>
                                        <label className="property-setup-field">
                                            <span>City / region</span>
                                            <select value={draft.home.city_region} onChange={(event) => updateHome("city_region", event.target.value)}>
                                                <option value="">Choose a city / region</option>
                                                {CITY_REGION_OPTIONS.map((location) => <option key={location} value={location}>{location}</option>)}
                                            </select>
                                        </label>
                                        <label className="property-setup-field">
                                            <span>Living situation</span>
                                            <select value={draft.home.occupancy_status} onChange={(event) => updateHome("occupancy_status", event.target.value)}>
                                                <option value="owner_occupied">I own and live here</option>
                                                <option value="tenant">I rent and live here</option>
                                                <option value="rental_property">I rent it to someone</option>
                                                <option value="seasonal">Seasonal / occasional use</option>
                                                <option value="other">Other</option>
                                            </select>
                                        </label>
                                        <label className="property-setup-field">
                                            <span>{draft.home.occupancy_status === "tenant" ? "Move-in date" : "Closing / move-in date"}</span>
                                            <input type="date" value={draft.home.purchase_date} onChange={(event) => updateHome("purchase_date", event.target.value)} />
                                            <small>Optional. It can seed your property timeline.</small>
                                        </label>
                                        <details className="property-setup-more property-setup-field--wide">
                                            <summary>Optional property details</summary>
                                            <div className="property-setup-more__grid">
                                                <label className="property-setup-field"><span>Purchase price</span><input type="number" min="0" value={draft.home.purchase_price} onChange={(event) => updateHome("purchase_price", event.target.value)} /></label>
                                                <label className="property-setup-field"><span>Square feet</span><input type="number" min="0" value={draft.home.square_footage} onChange={(event) => updateHome("square_footage", event.target.value)} /></label>
                                                {!isFirstProperty && <label className="property-setup-check"><input type="checkbox" checked={Boolean(draft.home.is_primary)} onChange={(event) => updateHome("is_primary", event.target.checked)} /><span>Make this my primary property</span></label>}
                                            </div>
                                        </details>
                                    </div>
                                </div>
                            )}

                            {currentStep === 1 && (
                                <div className="property-setup-step">
                                    <StepHeader
                                        eyebrow="Step 2 of 5"
                                        title="Choose a few useful rooms."
                                        copy="Rooms make maintenance, purchases, and assets easier to place. Start with at least two; this is not a floor-plan exercise."
                                    />
                                    <div className="property-setup-countline"><strong>{selectedRooms.length}</strong><span>selected · minimum 2</span></div>
                                    <div className="property-setup-room-grid">
                                        {draft.rooms.map((room) => (
                                            <button
                                                className={`property-setup-room ${room.selected ? "is-selected" : ""}`}
                                                type="button"
                                                key={room.client_key}
                                                onClick={() => updateCollection("rooms", room.client_key, { selected: !room.selected })}
                                            >
                                                <span>{room.selected ? "✓" : "+"}</span>
                                                <strong>{room.name}</strong>
                                            </button>
                                        ))}
                                    </div>
                                    <div className="property-setup-inline-add">
                                        <input value={customRoomName} onChange={(event) => setCustomRoomName(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addCustomRoom(); } }} placeholder="Add another room or area" />
                                        <button type="button" onClick={addCustomRoom}>Add</button>
                                    </div>
                                </div>
                            )}

                            {currentStep === 2 && (
                                <div className="property-setup-step">
                                    <StepHeader
                                        eyebrow="Step 3 of 5"
                                        title="Add one recurring cost."
                                        copy="One real bill is enough to make the dashboard and Bills screen useful. Select more only when the amounts are easy to grab."
                                    />
                                    <div className="property-setup-list">
                                        {draft.bills.map((bill) => (
                                            <ToggleCard
                                                key={bill.client_key}
                                                active={bill.selected}
                                                title={bill.payee || "Custom bill"}
                                                subtitle={bill.selected && bill.amount ? `${formatMoney(bill.amount)} · ${bill.frequency}` : "Add this cost"}
                                                onClick={() => updateCollection("bills", bill.client_key, { selected: !bill.selected })}
                                            >
                                                <label className="property-setup-field property-setup-field--name"><span>Bill name</span><input value={bill.payee} onChange={(event) => updateCollection("bills", bill.client_key, { payee: event.target.value })} /></label>
                                                <label className="property-setup-field"><span>Amount</span><input type="number" min="0" step="0.01" value={bill.amount} onChange={(event) => updateCollection("bills", bill.client_key, { amount: event.target.value })} placeholder="0.00" /></label>
                                                <label className="property-setup-field property-setup-field--small"><span>Due day</span><input type="number" min="1" max="31" value={bill.due_day} onChange={(event) => updateCollection("bills", bill.client_key, { due_day: event.target.value })} /></label>
                                                <label className="property-setup-field"><span>Repeats</span><select value={bill.frequency} onChange={(event) => updateCollection("bills", bill.client_key, { frequency: event.target.value })}><option value="monthly">Monthly</option><option value="weekly">Weekly</option><option value="biweekly">Every 2 weeks</option><option value="quarterly">Quarterly</option><option value="semiannual">Twice yearly</option><option value="annual">Yearly</option></select></label>
                                            </ToggleCard>
                                        ))}
                                    </div>
                                    <button className="property-setup-add-more" type="button" onClick={addCustomBill}>+ Add another bill</button>
                                    <div className="property-setup-total"><span>Starter monthly baseline</span><strong>{formatMoney(monthlyTotal)}</strong></div>
                                </div>
                            )}

                            {currentStep === 3 && (
                                <div className="property-setup-step">
                                    <StepHeader
                                        eyebrow="Step 4 of 5"
                                        title="Give Maintenance one job."
                                        copy="Pick one task you genuinely want HomeOps to remember. Suggested dates and intervals are editable now or later."
                                    />
                                    <div className="property-setup-list">
                                        {draft.maintenance.map((item) => (
                                            <ToggleCard
                                                key={item.client_key}
                                                active={item.selected}
                                                title={item.name || "Custom maintenance task"}
                                                subtitle={item.selected ? `Next due ${item.next_due_date || "TBD"}` : "Track this task"}
                                                onClick={() => updateCollection("maintenance", item.client_key, { selected: !item.selected })}
                                            >
                                                <label className="property-setup-field property-setup-field--name"><span>Task</span><input value={item.name} onChange={(event) => updateCollection("maintenance", item.client_key, { name: event.target.value })} /></label>
                                                <label className="property-setup-field"><span>Location</span><select value={item.room_key} onChange={(event) => updateCollection("maintenance", item.client_key, { room_key: event.target.value })}><option value="">Whole property</option>{selectedRooms.map((room) => <option key={room.client_key} value={room.client_key}>{room.name}</option>)}</select></label>
                                                <label className="property-setup-field property-setup-field--small"><span>Every</span><input type="number" min="1" value={item.frequency_count} disabled={item.frequency_unit === "as_needed"} onChange={(event) => updateCollection("maintenance", item.client_key, { frequency_count: event.target.value })} /></label>
                                                <label className="property-setup-field"><span>Unit</span><select value={item.frequency_unit} onChange={(event) => updateCollection("maintenance", item.client_key, { frequency_unit: event.target.value })}><option value="days">Days</option><option value="weeks">Weeks</option><option value="months">Months</option><option value="years">Years</option><option value="as_needed">As needed</option></select></label>
                                                <label className="property-setup-field"><span>Next due</span><input type="date" value={item.next_due_date} onChange={(event) => updateCollection("maintenance", item.client_key, { next_due_date: event.target.value })} /></label>
                                                <details className="property-setup-supply">
                                                    <summary>Replacement supplies</summary>
                                                    <label className="property-setup-check"><input type="checkbox" checked={Boolean(item.tracks_inventory)} onChange={(event) => updateCollection("maintenance", item.client_key, { tracks_inventory: event.target.checked })} /><span>Track quantity on hand</span></label>
                                                    {item.tracks_inventory && (
                                                        <div className="property-setup-supply__grid">
                                                            <label className="property-setup-field"><span>On hand</span><input type="number" min="0" value={item.quantity_on_hand} onChange={(event) => updateCollection("maintenance", item.client_key, { quantity_on_hand: event.target.value })} /></label>
                                                            <label className="property-setup-field"><span>Used each time</span><input type="number" min="1" value={item.units_per_service} onChange={(event) => updateCollection("maintenance", item.client_key, { units_per_service: event.target.value })} /></label>
                                                            <label className="property-setup-field"><span>Pack size</span><input type="number" min="1" value={item.pack_quantity} onChange={(event) => updateCollection("maintenance", item.client_key, { pack_quantity: event.target.value })} /></label>
                                                            <label className="property-setup-field"><span>Pack cost</span><input type="number" min="0" step="0.01" value={item.restock_cost} onChange={(event) => updateCollection("maintenance", item.client_key, { restock_cost: event.target.value })} /></label>
                                                            <label className="property-setup-field"><span>Unit name</span><input value={item.inventory_unit} onChange={(event) => updateCollection("maintenance", item.client_key, { inventory_unit: event.target.value })} placeholder="filter" /></label>
                                                        </div>
                                                    )}
                                                </details>
                                            </ToggleCard>
                                        ))}
                                    </div>
                                    <button className="property-setup-add-more" type="button" onClick={addCustomMaintenance}>+ Add a custom task</button>
                                </div>
                            )}

                            {currentStep === 4 && (
                                <div className="property-setup-step">
                                    <StepHeader
                                        eyebrow="Step 5 of 5"
                                        title={`Create ${propertyName}.`}
                                        copy="This is intentionally a starting point, not a complete inventory of your life. Everything here stays editable after setup."
                                    />
                                    <div className="property-setup-review">
                                        <article className="property-setup-review__hero">
                                            <span>{propertyTypeLabel(draft.home.property_type)}</span>
                                            <h2>{propertyName}</h2>
                                            <p>{draft.home.city_region || "Location can be added later"}</p>
                                            <strong>{formatMoney(monthlyTotal)}<small> starter monthly cost</small></strong>
                                        </article>
                                        <div className="property-setup-review__counts">
                                            <div><strong>{selectedRooms.length}</strong><span>rooms</span></div>
                                            <div><strong>{selectedBills.length}</strong><span>bills</span></div>
                                            <div><strong>{selectedMaintenance.length}</strong><span>upkeep task{selectedMaintenance.length === 1 ? "" : "s"}</span></div>
                                        </div>
                                        <div className="property-setup-review__lists">
                                            <section><span>Rooms</span><p>{selectedRooms.map((room) => room.name).join(" · ")}</p></section>
                                            <section><span>Recurring costs</span><p>{selectedBills.map((bill) => `${bill.payee} ${formatMoney(bill.amount)}`).join(" · ")}</p></section>
                                            <section><span>Maintenance</span><p>{selectedMaintenance.map((item) => item.name).join(" · ")}</p></section>
                                        </div>
                                        <div className="property-setup-review__later">
                                            <strong>Not needed right now</strong>
                                            <p>Financing balances, appliances, warranties, documents, receipts, wants, and special spending periods can be added when they become relevant.</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {error && <div className="property-setup-error" role="alert">{error}</div>}

                            <footer className="property-setup__footer">
                                <button className="property-setup-secondary" type="button" onClick={goBack} disabled={currentStep === 0 || saving}>Back</button>
                                <span>{currentStep + 1} of {STEPS.length}</span>
                                {currentStep < STEPS.length - 1 ? (
                                    <button className="property-setup-primary" type="button" onClick={goNext}>Continue</button>
                                ) : (
                                    <button className="property-setup-primary" type="button" onClick={finishSetup} disabled={saving}>{saving ? "Creating property…" : "Create property"}</button>
                                )}
                            </footer>
                        </>
                    )}
                </div>
            </section>
        </div>
    );
}
