/* eslint-disable react-hooks/set-state-in-effect */
import { useCallback, useEffect, useMemo, useState } from "react";
import Modal from "../components/Modal";
import { useHomeOps } from "../context/HomeOpsContext";
import {
    addAsset,
    addRoom,
    addTimelineEvent,
    createHome,
    getCoreBills,
    getHome,
    money,
    nullableNumber,
    syncCoreBills,
    todayIso,
    updateHome,
} from "../lib/homeopsApi";

const defaultHomeForm = {
    name: "Toronto Townhouse",
    property_type: "townhouse",
    city_region: "Toronto, ON",
    purchase_date: "2026-06-05",
    purchase_price: "425000",
    square_footage: "700",
    mortgage_payment: "1985",
    hoa_fee: "727",
    property_tax: "220",
    insurance: "",
    utilities: "",
    internet: "",
    other_baseline_costs: "",
    occupancy_status: "owner_occupied",
    primary_use: "primary_residence",
    parking: "",
    locker: "",
    service_notes: "",
    is_primary: true,
};

const defaultRoomForm = { name: "", room_type: "", notes: "" };
const defaultAssetForm = { name: "", asset_type: "", room_id: "", brand: "", model: "", notes: "" };
const defaultTimelineForm = { event_type: "custom", title: "", event_date: todayIso(), description: "" };

function formFromHome(home) {
    if (!home) return defaultHomeForm;

    return {
        ...defaultHomeForm,
        name: home.name || "",
        property_type: home.property_type || "",
        city_region: home.city_region || "",
        purchase_date: home.purchase_date || "",
        purchase_price: home.purchase_price ?? "",
        square_footage: home.square_footage ?? "",
        mortgage_payment: home.mortgage_payment ?? "",
        hoa_fee: home.hoa_fee ?? "",
        property_tax: home.property_tax ?? "",
        insurance: home.insurance ?? "",
        utilities: home.utilities ?? "",
        internet: home.internet ?? "",
        other_baseline_costs: home.other_baseline_costs ?? "",
        occupancy_status: home.occupancy_status || "",
        primary_use: home.primary_use || "",
        parking: home.parking || "",
        locker: home.locker || "",
        service_notes: home.service_notes || "",
        is_primary: Boolean(home.is_primary),
    };
}

function homePayload(form) {
    return {
        name: form.name,
        property_type: form.property_type || null,
        city_region: form.city_region || null,
        purchase_date: form.purchase_date || null,
        purchase_price: nullableNumber(form.purchase_price),
        square_footage: nullableNumber(form.square_footage),
        mortgage_payment: nullableNumber(form.mortgage_payment),
        hoa_fee: nullableNumber(form.hoa_fee),
        property_tax: nullableNumber(form.property_tax),
        insurance: nullableNumber(form.insurance),
        utilities: nullableNumber(form.utilities),
        internet: nullableNumber(form.internet),
        other_baseline_costs: nullableNumber(form.other_baseline_costs),
        occupancy_status: form.occupancy_status || null,
        primary_use: form.primary_use || null,
        parking: form.parking || null,
        locker: form.locker || null,
        service_notes: form.service_notes || null,
        is_primary: form.is_primary,
    };
}

function responseHomeId(json) {
    return json?.home?.home?.id || json?.home?.id || json?.id || null;
}

function DetailItem({ label, value }) {
    return (
        <div className="v0-detail-item">
            <span>{label}</span>
            <strong>{value || "—"}</strong>
        </div>
    );
}

function MiniMetric({ label, value, note }) {
    return (
        <article className="v0-mini-metric">
            <span>{label}</span>
            <strong>{value}</strong>
            {note && <small>{note}</small>}
        </article>
    );
}


function PencilIcon(props) {
    return (
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
            <path d="M4 20h4.7L19 9.7a2.1 2.1 0 0 0 0-3l-1.7-1.7a2.1 2.1 0 0 0-3 0L4 15.3V20Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="m13.5 5.8 4.7 4.7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
    );
}

function PlusIcon(props) {
    return (
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
            <path d="M12 5v14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
            <path d="M5 12h14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
    );
}

function InfoIcon(props) {
    return (
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
            <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="2" />
            <path d="M12 11.3v5.2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M12 7.6h.01" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </svg>
    );
}

function ChevronIcon({ open }) {
    return (
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={open ? "is-open" : ""}>
            <path d="m7 10 5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

const hubInfo = {
    page: {
        title: "Property Hub",
        intro: "This is the one place that defines the home itself. The dashboard and modules should feel like they belong to this property, not just to random app records.",
        bullets: [
            "Property identity gives every bill, receipt, repair and period a property anchor.",
            "Monthly baseline costs create the normal ownership cost floor.",
            "Rooms, assets and timeline events are optional context you can add later.",
        ],
    },
    costs: {
        title: "Monthly baseline",
        intro: "Baseline is the recurring cost of owning the place before one-off spending starts. It is the number HomeOps can compare against actual monthly chaos.",
        bullets: ["Mortgage", "HOA / condo fees", "Property tax", "Insurance, utilities, internet and other fixed costs"],
    },
    snapshot: {
        title: "Property snapshot",
        intro: "Snapshot is the small set of factual details that makes the home real: type, location, close date, size, parking, locker and notes.",
        bullets: ["Keep this lightweight.", "Edit only when something materially changes.", "Use notes for condo rules, service switches, HVAC quirks or parking details."],
    },
    structure: {
        title: "Optional context",
        intro: "Rooms, assets and timeline events are extra structure. They should help explain records, not become a huge onboarding chore.",
        bullets: [
            "Rooms answer where a purchase or project happened.",
            "Assets track important systems like HVAC, fridge, stove or router.",
            "Timeline events explain abnormal months like closing, move-in, paint weekend or AC repair.",
        ],
    },
};

function InfoButton({ label, onClick }) {
    return (
        <button className="v0-info-button" type="button" onClick={onClick} aria-label={label} title={label}>
            <InfoIcon />
        </button>
    );
}

function HubAccordion({ id, title, subtitle, open, onToggle, onInfo, children }) {
    return (
        <section className={`v0-hub-accordion panel ${open ? "is-open" : ""}`}>
            <button className="v0-hub-accordion__header" type="button" onClick={() => onToggle(id)} aria-expanded={open}>
                <span>
                    <strong>{title}</strong>
                    {subtitle && <small>{subtitle}</small>}
                </span>
                <span className="v0-hub-accordion__tools">
                    <InfoButton label={`About ${title}`} onClick={(event) => { event.stopPropagation(); onInfo(id); }} />
                    <span className="v0-hub-chevron"><ChevronIcon open={open} /></span>
                </span>
            </button>
            {open && <div className="v0-hub-accordion__body">{children}</div>}
        </section>
    );
}

export default function HomeProfilePage({ refreshEverything }) {
    const { selectedHome, homeId, reloadHomes, apiContext, openPropertySetup } = useHomeOps();
    const [profile, setProfile] = useState({ home: selectedHome, rooms: [], assets: [], timeline: [] });
    const [form, setForm] = useState(formFromHome(selectedHome));
    const [roomForm, setRoomForm] = useState(defaultRoomForm);
    const [assetForm, setAssetForm] = useState(defaultAssetForm);
    const [timelineForm, setTimelineForm] = useState(defaultTimelineForm);
    const [activeModal, setActiveModal] = useState(null);
    const [infoModal, setInfoModal] = useState(null);
    const [openSections, setOpenSections] = useState({ costs: true, snapshot: false, structure: false });
    const [coreBills, setCoreBills] = useState([]);
    const [coreBillsError, setCoreBillsError] = useState("");
    const [syncingCoreBills, setSyncingCoreBills] = useState(false);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const loadProfile = useCallback(async () => {
        if (!homeId) {
            setProfile({ home: null, rooms: [], assets: [], timeline: [] });
            setForm(defaultHomeForm);
            return;
        }

        setLoading(true);
        setError("");

        try {
            const json = await getHome(homeId);
            setProfile(json);
            setForm(formFromHome(json.home));
        } catch (err) {
            setProfile({ home: null, rooms: [], assets: [], timeline: [] });
            setForm(defaultHomeForm);
            setError(err.message === "Home not found." ? "This browser had an old property selected. Create or select a valid property to continue." : (err.message || "Could not load Property Hub."));
        } finally {
            setLoading(false);
        }
    }, [homeId]);

    const loadCoreBills = useCallback(async () => {
        if (!homeId) {
            setCoreBills([]);
            setCoreBillsError("");
            return;
        }

        try {
            const json = await getCoreBills(homeId, apiContext);
            setCoreBills(json.items || []);
            setCoreBillsError("");
        } catch (err) {
            setCoreBills([]);
            setCoreBillsError(err.message || "Core bill sync is not available yet.");
        }
    }, [apiContext, homeId]);

    useEffect(() => {
        loadProfile();
    }, [loadProfile]);

    useEffect(() => {
        loadCoreBills();
    }, [loadCoreBills]);

    const home = profile.home || selectedHome;
    const baseline = Number(home?.baseline_monthly_cost ?? 0);
    const rooms = profile.rooms || [];
    const assets = profile.assets || [];
    const timeline = profile.timeline || [];
    const hasHome = Boolean(home?.id);

    const monthlyItems = useMemo(() => ([
        [home?.occupancy_status === "tenant" ? "Rent" : "Mortgage", home?.mortgage_payment],
        ["HOA / Condo", home?.hoa_fee],
        ["Property Tax", home?.property_tax],
        ["Insurance", home?.insurance],
        ["Utilities", home?.utilities],
        ["Internet", home?.internet],
    ]), [home]);

    const missingCoreBillCount = coreBills.filter((item) => item.action === "create").length;
    const linkedCoreBillCount = coreBills.filter((item) => item.linked).length;

    const currentInfo = infoModal ? hubInfo[infoModal] : null;

    function toggleSection(sectionId) {
        setOpenSections((current) => ({ ...current, [sectionId]: !current[sectionId] }));
    }

    function openHomeModal() {
        setError("");
        setForm(formFromHome(home));
        setActiveModal("home");
    }

    async function saveHome(event) {
        event.preventDefault();
        setSaving(true);
        setError("");

        try {
            const existingHomeId = home?.id || null;
            let nextHomeId = existingHomeId;

            if (existingHomeId) {
                const json = await updateHome(existingHomeId, homePayload(form));
                nextHomeId = responseHomeId(json) || existingHomeId;
            } else {
                const json = await createHome(homePayload(form));
                nextHomeId = responseHomeId(json);
            }

            await reloadHomes(nextHomeId);
            if (nextHomeId) {
                const json = await getHome(nextHomeId);
                setProfile(json);
                setForm(formFromHome(json.home));
            }

            setActiveModal(null);
            refreshEverything?.();
        } catch (err) {
            setError(err.message || "Could not save home.");
        } finally {
            setSaving(false);
        }
    }

    async function syncBaselineBills() {
        if (!homeId) return;

        setSyncingCoreBills(true);
        setCoreBillsError("");
        setError("");

        try {
            await syncCoreBills(homeId, apiContext);
            await loadCoreBills();
            refreshEverything?.();
        } catch (err) {
            setCoreBillsError(err.message || "Could not sync core bills from baseline.");
        } finally {
            setSyncingCoreBills(false);
        }
    }

    async function saveRoom(event) {
        event.preventDefault();
        if (!homeId) return;

        setSaving(true);
        setError("");

        try {
            await addRoom(homeId, roomForm);
            setRoomForm(defaultRoomForm);
            setActiveModal(null);
            await loadProfile();
        } catch (err) {
            setError(err.message || "Could not add room.");
        } finally {
            setSaving(false);
        }
    }

    async function saveAsset(event) {
        event.preventDefault();
        if (!homeId) return;

        setSaving(true);
        setError("");

        try {
            await addAsset(homeId, {
                ...assetForm,
                room_id: assetForm.room_id ? Number(assetForm.room_id) : null,
            });
            setAssetForm(defaultAssetForm);
            setActiveModal(null);
            await loadProfile();
        } catch (err) {
            setError(err.message || "Could not add asset.");
        } finally {
            setSaving(false);
        }
    }

    async function saveTimelineEvent(event) {
        event.preventDefault();
        if (!homeId) return;

        setSaving(true);
        setError("");

        try {
            await addTimelineEvent(homeId, timelineForm);
            setTimelineForm(defaultTimelineForm);
            setActiveModal(null);
            await loadProfile();
        } catch (err) {
            setError(err.message || "Could not add timeline event.");
        } finally {
            setSaving(false);
        }
    }

    return (
        <>
            <header className="page-header page-header--with-actions v0-property-header">
                <div>
                    <div className="v0-title-with-info">
                        <h1>Property Hub</h1>
                        <InfoButton label="About Property Hub" onClick={() => setInfoModal("page")} />
                    </div>
                    <p>{home?.name ? `${home.name} is the property anchor for the rest of HomeOps.` : "Create the property anchor first."}</p>
                    {error && <div className="form-error">{error}</div>}
                </div>
                {hasHome && <button className="page-primary-action page-primary-action--compact" type="button" onClick={openPropertySetup}>+ New property</button>}
            </header>

            {!hasHome && (
                <section className="v0-create-home-card panel">
                    <div>
                        <span className="v0-eyebrow">Start here</span>
                        <strong>Create your first property</strong>
                        <p>HomeOps needs one property anchor before bills, ledger entries, receipts, maintenance and periods can feel like they belong somewhere.</p>
                    </div>
                    <button type="button" onClick={openPropertySetup}>Set up Property</button>
                </section>
            )}

            {hasHome && (
                <>
                    <section className="v0-property-hero panel">
                        <div className="v0-property-hero__main">
                            <span className="v0-eyebrow">Primary home</span>
                            <strong>{home?.name || "Unnamed home"}</strong>
                            <p>{home?.property_type || "property"} · {home?.city_region || "location TBD"} · baseline {money(baseline)}/mo</p>
                        </div>
                        <div className="v0-profile-hero__stack" aria-label="Optional property structure counts">
                            <div className="v0-profile-stat"><b>{rooms.length}</b><span>Rooms</span></div>
                            <div className="v0-profile-stat"><b>{assets.length}</b><span>Assets</span></div>
                            <div className="v0-profile-stat"><b>{timeline.length}</b><span>Events</span></div>
                        </div>
                        <div className="v0-property-hero__actions">
                            <button className="v0-icon-action" type="button" onClick={openHomeModal} aria-label="Edit home details" title="Edit home details"><PencilIcon /></button>
                        </div>
                    </section>

                    <div className="v0-hub-sections">
                        <HubAccordion
                            id="costs"
                            title="Monthly baseline"
                            subtitle="The normal recurring ownership cost floor."
                            open={openSections.costs}
                            onToggle={toggleSection}
                            onInfo={setInfoModal}
                        >
                            <section className="v0-baseline-grid">
                                <MiniMetric label="Monthly Baseline" value={money(baseline)} note="Mortgage, condo, tax, insurance and utilities." />
                                <MiniMetric label="Mortgage" value={home?.mortgage_payment ? money(home.mortgage_payment) : "—"} note="Main monthly ownership cost." />
                                <MiniMetric label="HOA / Condo" value={home?.hoa_fee ? money(home.hoa_fee) : "—"} note="Recurring building/community cost." />
                                <MiniMetric label="Property Tax" value={home?.property_tax ? money(home.property_tax) : "—"} note="Monthly tax estimate." />
                            </section>

                            <div className="v0-baseline-list">
                                <h3>Cost breakdown</h3>
                                {monthlyItems.map(([label, value]) => (
                                    <div key={label}>
                                        <span>{label}</span>
                                        <strong>{value ? money(value) : "—"}</strong>
                                    </div>
                                ))}
                            </div>

                            <div className="v0-core-bill-sync">
                                <div className="v0-core-bill-sync__header">
                                    <div>
                                        <h3>Core ownership bills</h3>
                                        <p>Turn baseline costs into recurring bill records so each selected month gets its own paid/unpaid state.</p>
                                    </div>
                                    <button className="primary-action" type="button" onClick={syncBaselineBills} disabled={syncingCoreBills || !hasHome}>
                                        {syncingCoreBills ? "Syncing..." : missingCoreBillCount > 0 ? `Create ${missingCoreBillCount} missing` : "Sync core bills"}
                                    </button>
                                </div>

                                {coreBillsError && <div className="form-error">{coreBillsError}</div>}

                                <div className="v0-core-bill-list">
                                    {(coreBills.length ? coreBills : monthlyItems.map(([label, value]) => ({ label, amount: value, action: value ? "create" : "empty" }))).map((item) => (
                                        <div className={`v0-core-bill-row is-${item.action}`} key={item.key || item.label}>
                                            <span>{item.label}</span>
                                            <strong>{item.amount ? money(item.amount) : "—"}</strong>
                                            <em>{item.linked ? "Linked to Bills" : item.action === "create" ? "Ready to create" : "No baseline amount"}</em>
                                        </div>
                                    ))}
                                </div>

                                <p className="v0-core-bill-sync__note">
                                    Linked: {linkedCoreBillCount} · Missing: {missingCoreBillCount}. Editing paid state still happens on the Bills page.
                                </p>
                            </div>
                        </HubAccordion>

                        <HubAccordion
                            id="snapshot"
                            title="Property snapshot"
                            subtitle="The key facts that make the dashboard belong to a real home."
                            open={openSections.snapshot}
                            onToggle={toggleSection}
                            onInfo={setInfoModal}
                        >
                            <div className="v0-panel-action-row">
                                <button className="ghost-action v0-icon-action v0-icon-action--small" type="button" onClick={openHomeModal} disabled={loading} aria-label="Edit property snapshot" title="Edit property snapshot"><PencilIcon /></button>
                            </div>
                            <div className="v0-detail-grid">
                                <DetailItem label="Property type" value={home?.property_type} />
                                <DetailItem label="City / region" value={home?.city_region} />
                                <DetailItem label="Purchase date" value={home?.purchase_date} />
                                <DetailItem label="Purchase price" value={home?.purchase_price ? money(home.purchase_price) : "—"} />
                                <DetailItem label="Square feet" value={home?.square_footage} />
                                <DetailItem label="Occupancy" value={home?.occupancy_status} />
                                <DetailItem label="Parking" value={home?.parking} />
                                <DetailItem label="Locker" value={home?.locker} />
                            </div>

                            {home?.service_notes && (
                                <div className="v0-service-notes">
                                    <span>Service / condo notes</span>
                                    <p>{home.service_notes}</p>
                                </div>
                            )}
                        </HubAccordion>

                        <HubAccordion
                            id="structure"
                            title="Optional context"
                            subtitle="Rooms, assets and timeline only when they explain records."
                            open={openSections.structure}
                            onToggle={toggleSection}
                            onInfo={setInfoModal}
                        >
                            <div className="v0-structure-grid v0-structure-grid--rows">
                                <article className="v0-structure-card v0-structure-row">
                                    <button className="v0-structure-add" type="button" onClick={() => setActiveModal("room")} aria-label="Add room" title="Add room"><PlusIcon /></button>
                                    <div className="v0-structure-row__heading">
                                        <span>{rooms.length} saved</span>
                                        <h3>Rooms</h3>
                                    </div>
                                    <p className="v0-structure-row__description">Simple locations for spending and projects: living room, kitchen, studio, bedroom, bathroom, balcony.</p>
                                    <div className="v0-structure-row__content">
                                        {rooms.length > 0 ? (
                                            <div className="v0-chip-list">{rooms.map((room) => <span key={room.id}>{room.name}</span>)}</div>
                                        ) : (
                                            <span className="v0-structure-row__empty">No rooms saved yet.</span>
                                        )}
                                    </div>
                                </article>

                                <article className="v0-structure-card v0-structure-row">
                                    <button className="v0-structure-add" type="button" onClick={() => setActiveModal("asset")} aria-label="Add asset" title="Add asset"><PlusIcon /></button>
                                    <div className="v0-structure-row__heading">
                                        <span>{assets.length} saved</span>
                                        <h3>Assets</h3>
                                    </div>
                                    <p className="v0-structure-row__description">Track systems or items with repair, warranty, document or receipt history.</p>
                                    <div className="v0-structure-row__content">
                                        {assets.length > 0 ? (
                                            <div className="record-list compact-record-list v0-structure-row__records">
                                                {assets.slice(0, 4).map((asset) => (
                                                    <article className="record-row" key={asset.id}>
                                                        <div><strong>{asset.name}</strong><p>{asset.asset_type || "asset"}{asset.room?.name ? ` · ${asset.room.name}` : ""}</p></div>
                                                    </article>
                                                ))}
                                            </div>
                                        ) : (
                                            <span className="v0-structure-row__empty">No assets saved yet.</span>
                                        )}
                                    </div>
                                </article>

                                <article className="v0-structure-card v0-structure-row">
                                    <button className="v0-structure-add" type="button" onClick={() => setActiveModal("event")} aria-label="Add timeline event" title="Add timeline event"><PlusIcon /></button>
                                    <div className="v0-structure-row__heading">
                                        <span>{timeline.length} saved</span>
                                        <h3>Timeline</h3>
                                    </div>
                                    <p className="v0-structure-row__description">Explain abnormal months with closing, move-in, paint weekend, AC repair, setup or upgrade events.</p>
                                    <div className="v0-structure-row__content">
                                        {timeline.length > 0 ? (
                                            <div className="record-list compact-record-list v0-structure-row__records">
                                                {timeline.slice(0, 4).map((event) => (
                                                    <article className="record-row" key={event.id}>
                                                        <div><strong>{event.title}</strong><p>{event.event_date} · {event.event_type}</p></div>
                                                    </article>
                                                ))}
                                            </div>
                                        ) : (
                                            <span className="v0-structure-row__empty">No timeline events saved yet.</span>
                                        )}
                                    </div>
                                </article>
                            </div>
                        </HubAccordion>
                    </div>
                </>
            )}

            <Modal
                active={Boolean(infoModal)}
                onClose={() => setInfoModal(null)}
                title={currentInfo?.title || "Property Hub"}
                intro={currentInfo?.intro || ""}
            >
                {currentInfo && (
                    <div className="v0-info-modal-copy">
                        {currentInfo.bullets.map((item) => <p key={item}>{item}</p>)}
                    </div>
                )}
            </Modal>

            <Modal
                active={activeModal === "home"}
                onClose={() => setActiveModal(null)}
                title={hasHome ? "Edit Property" : "Create Property"}
                intro="Add the property details and baseline monthly costs HomeOps uses across bills, reports, and planning."
                size="wide"
            >
                <form className="form-grid" onSubmit={saveHome}>
                    <label className="span-6"><span>Home name</span><input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></label>
                    <label className="span-3"><span>Property type</span><input value={form.property_type} onChange={(event) => setForm({ ...form, property_type: event.target.value })} placeholder="townhouse" /></label>
                    <label className="span-3"><span>City / region</span><input value={form.city_region} onChange={(event) => setForm({ ...form, city_region: event.target.value })} placeholder="Toronto, ON" /></label>
                    <label className="span-3"><span>Purchase date</span><input type="date" value={form.purchase_date} onChange={(event) => setForm({ ...form, purchase_date: event.target.value })} /></label>
                    <label className="span-3"><span>Purchase price</span><input type="number" value={form.purchase_price} onChange={(event) => setForm({ ...form, purchase_price: event.target.value })} /></label>
                    <label className="span-3"><span>Sq ft</span><input type="number" value={form.square_footage} onChange={(event) => setForm({ ...form, square_footage: event.target.value })} /></label>
                    <label className="span-3"><span>Occupancy</span><input value={form.occupancy_status} onChange={(event) => setForm({ ...form, occupancy_status: event.target.value })} placeholder="owner_occupied" /></label>

                    <div className="form-section-label span-12">Monthly baseline</div>
                    <label className="span-3"><span>Mortgage</span><input type="number" value={form.mortgage_payment} onChange={(event) => setForm({ ...form, mortgage_payment: event.target.value })} /></label>
                    <label className="span-3"><span>HOA / condo</span><input type="number" value={form.hoa_fee} onChange={(event) => setForm({ ...form, hoa_fee: event.target.value })} /></label>
                    <label className="span-3"><span>Property tax</span><input type="number" value={form.property_tax} onChange={(event) => setForm({ ...form, property_tax: event.target.value })} /></label>
                    <label className="span-3"><span>Insurance</span><input type="number" value={form.insurance} onChange={(event) => setForm({ ...form, insurance: event.target.value })} /></label>
                    <label className="span-3"><span>Utilities</span><input type="number" value={form.utilities} onChange={(event) => setForm({ ...form, utilities: event.target.value })} /></label>
                    <label className="span-3"><span>Internet</span><input type="number" value={form.internet} onChange={(event) => setForm({ ...form, internet: event.target.value })} /></label>
                    <label className="span-6"><span>Other baseline</span><input type="number" value={form.other_baseline_costs} onChange={(event) => setForm({ ...form, other_baseline_costs: event.target.value })} /></label>

                    <div className="form-section-label span-12">Operational notes</div>
                    <label className="span-6"><span>Parking</span><input value={form.parking} onChange={(event) => setForm({ ...form, parking: event.target.value })} /></label>
                    <label className="span-6"><span>Locker</span><input value={form.locker} onChange={(event) => setForm({ ...form, locker: event.target.value })} /></label>
                    <label className="span-12"><span>Service / condo notes</span><textarea value={form.service_notes} onChange={(event) => setForm({ ...form, service_notes: event.target.value })} placeholder="Rules, service switches, HVAC notes, parking/locker quirks..." /></label>

                    {error && <div className="form-error span-12">{error}</div>}
                    <button className="primary-action span-12" disabled={saving}>{saving ? "Saving..." : hasHome ? "Save Property" : "Create Property"}</button>
                </form>
            </Modal>

            <Modal active={activeModal === "room"} onClose={() => setActiveModal(null)} title="Add Room" intro="Rooms are the physical spaces you can attach purchases, projects and maintenance context to.">
                <form className="form-grid" onSubmit={saveRoom}>
                    <label className="span-6"><span>Room name</span><input value={roomForm.name} onChange={(event) => setRoomForm({ ...roomForm, name: event.target.value })} placeholder="Office / studio" required /></label>
                    <label className="span-6"><span>Room type</span><input value={roomForm.room_type} onChange={(event) => setRoomForm({ ...roomForm, room_type: event.target.value })} placeholder="office" /></label>
                    <label className="span-12"><span>Notes</span><textarea value={roomForm.notes} onChange={(event) => setRoomForm({ ...roomForm, notes: event.target.value })} /></label>
                    <button className="primary-action span-12" disabled={saving}>{saving ? "Saving..." : "Save Room"}</button>
                </form>
            </Modal>

            <Modal active={activeModal === "asset"} onClose={() => setActiveModal(null)} title="Add Asset" intro="Assets are the systems or important things that deserve maintenance, warranty, document or receipt history.">
                <form className="form-grid" onSubmit={saveAsset}>
                    <label className="span-6"><span>Asset name</span><input value={assetForm.name} onChange={(event) => setAssetForm({ ...assetForm, name: event.target.value })} placeholder="HVAC" required /></label>
                    <label className="span-6"><span>Type</span><input value={assetForm.asset_type} onChange={(event) => setAssetForm({ ...assetForm, asset_type: event.target.value })} placeholder="hvac" /></label>
                    <label className="span-12"><span>Room</span><select value={assetForm.room_id} onChange={(event) => setAssetForm({ ...assetForm, room_id: event.target.value })}><option value="">Whole home / unassigned</option>{rooms.map((room) => <option key={room.id} value={room.id}>{room.name}</option>)}</select></label>
                    <label className="span-6"><span>Brand</span><input value={assetForm.brand} onChange={(event) => setAssetForm({ ...assetForm, brand: event.target.value })} /></label>
                    <label className="span-6"><span>Model</span><input value={assetForm.model} onChange={(event) => setAssetForm({ ...assetForm, model: event.target.value })} /></label>
                    <label className="span-12"><span>Notes</span><textarea value={assetForm.notes} onChange={(event) => setAssetForm({ ...assetForm, notes: event.target.value })} /></label>
                    <button className="primary-action span-12" disabled={saving}>{saving ? "Saving..." : "Save Asset"}</button>
                </form>
            </Modal>

            <Modal active={activeModal === "event"} onClose={() => setActiveModal(null)} title="Add Timeline Event" intro="Timeline events explain the story behind spikes: closing, move-in, repairs, upgrades, setup weekends.">
                <form className="form-grid" onSubmit={saveTimelineEvent}>
                    <label className="span-6"><span>Title</span><input value={timelineForm.title} onChange={(event) => setTimelineForm({ ...timelineForm, title: event.target.value })} placeholder="AC repair window" required /></label>
                    <label className="span-3"><span>Type</span><select value={timelineForm.event_type} onChange={(event) => setTimelineForm({ ...timelineForm, event_type: event.target.value })}><option value="purchase">Purchase</option><option value="keys">Keys</option><option value="move_in">Move-in</option><option value="setup">Setup</option><option value="repair">Repair</option><option value="upgrade">Upgrade</option><option value="review">Review</option><option value="custom">Custom</option></select></label>
                    <label className="span-3"><span>Date</span><input type="date" value={timelineForm.event_date} onChange={(event) => setTimelineForm({ ...timelineForm, event_date: event.target.value })} required /></label>
                    <label className="span-12"><span>Description</span><textarea value={timelineForm.description} onChange={(event) => setTimelineForm({ ...timelineForm, description: event.target.value })} /></label>
                    <button className="primary-action span-12" disabled={saving}>{saving ? "Saving..." : "Save Event"}</button>
                </form>
            </Modal>
        </>
    );
}
