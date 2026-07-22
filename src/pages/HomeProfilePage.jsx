/* eslint-disable react-hooks/set-state-in-effect */
import { useCallback, useEffect, useMemo, useState } from "react";
import Modal from "../components/Modal";
import HomeOpsChoiceSelect from "../components/HomeOpsChoiceSelect";
import HomeOpsLoadingSkeleton, { HomeOpsLoadingPill } from "../components/HomeOpsLoadingSkeleton";
import { useHomeOps } from "../context/HomeOpsContext";
import {
    addAsset,
    addRoom,
    addTimelineEvent,
    createHome,
    deleteAsset,
    deleteRoom,
    deleteTimelineEvent,
    getCoreBills,
    getHome,
    money,
    nullableNumber,
    todayIso,
    updateAsset,
    updateHome,
    updateRoom,
    updateTimelineEvent,
} from "../lib/homeopsApi";
import "../styles/property-baseline-refactor.css";

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

const ROOM_TYPE_OPTIONS = [
    { value: "living", label: "Living room", description: "Main shared lounge or sitting space", group: "Everyday spaces", tone: "living" },
    { value: "family_room", label: "Family room", description: "Casual shared living space", group: "Everyday spaces", tone: "living" },
    { value: "kitchen", label: "Kitchen", description: "Cooking, food prep and core appliances", group: "Everyday spaces", tone: "utility" },
    { value: "dining", label: "Dining room", description: "Dedicated eating or entertaining space", group: "Everyday spaces", tone: "living" },
    { value: "den", label: "Den", description: "Flexible lounge, reading or media room", group: "Everyday spaces", tone: "living" },
    { value: "bedroom", label: "Bedroom", description: "Primary, guest or secondary bedroom", group: "Private spaces", tone: "rest" },
    { value: "bathroom", label: "Bathroom", description: "Full bathroom, ensuite or powder room", group: "Private spaces", tone: "water" },
    { value: "nursery", label: "Nursery", description: "Infant or child-focused room", group: "Private spaces", tone: "rest" },
    { value: "office", label: "Office", description: "Dedicated work-from-home space", group: "Work & hobby", tone: "work" },
    { value: "studio", label: "Studio", description: "Music, art, photo or creative workspace", group: "Work & hobby", tone: "work" },
    { value: "workshop", label: "Workshop", description: "Tools, fabrication or hands-on projects", group: "Work & hobby", tone: "work" },
    { value: "gym", label: "Home gym", description: "Exercise, weights or wellness equipment", group: "Work & hobby", tone: "work" },
    { value: "laundry", label: "Laundry", description: "Washer, dryer and garment care", group: "Utility & storage", tone: "utility" },
    { value: "utility", label: "Utility / mechanical room", description: "HVAC, water, electrical or service equipment", group: "Utility & storage", tone: "utility" },
    { value: "storage", label: "Storage room", description: "General household storage", group: "Utility & storage", tone: "utility" },
    { value: "closet", label: "Closet", description: "Walk-in, coat or general closet", group: "Utility & storage", tone: "utility" },
    { value: "pantry", label: "Pantry", description: "Food and kitchen supply storage", group: "Utility & storage", tone: "utility" },
    { value: "foyer", label: "Foyer / entry", description: "Main entrance and arrival area", group: "Circulation", tone: "other" },
    { value: "hallway", label: "Hallway / landing", description: "Connector space, stairs or landing", group: "Circulation", tone: "other" },
    { value: "basement", label: "Basement", description: "Finished or unfinished lower level", group: "Utility & storage", tone: "utility" },
    { value: "garage", label: "Garage", description: "Vehicle, tools and larger storage", group: "Exterior & access", tone: "outdoor" },
    { value: "exterior", label: "Exterior area", description: "General outside or shared exterior space", group: "Exterior & access", tone: "outdoor" },
    { value: "balcony", label: "Balcony", description: "Condo or upper-level outdoor space", group: "Exterior & access", tone: "outdoor" },
    { value: "patio", label: "Patio / deck", description: "Ground-level entertaining space", group: "Exterior & access", tone: "outdoor" },
    { value: "yard", label: "Yard / garden", description: "Front, back or side outdoor area", group: "Exterior & access", tone: "outdoor" },
    { value: "other", label: "Other room type", description: "A space that does not fit the prepared list", group: "Other", tone: "other" },
];

const ASSET_TYPE_OPTIONS = [
    { value: "hvac", label: "HVAC system", description: "Whole-home heating and cooling system", group: "Climate & air", tone: "climate", keywords: ["heating", "cooling"] },
    { value: "furnace", label: "Furnace", description: "Gas, electric or oil forced-air heat", group: "Climate & air", tone: "climate" },
    { value: "air_conditioner", label: "Air conditioner", description: "Central or ductless cooling equipment", group: "Climate & air", tone: "climate" },
    { value: "heat_pump", label: "Heat pump", description: "Heating and cooling heat-pump system", group: "Climate & air", tone: "climate" },
    { value: "boiler", label: "Boiler", description: "Hydronic or radiant heating equipment", group: "Climate & air", tone: "climate" },
    { value: "thermostat", label: "Thermostat", description: "Climate controller or smart thermostat", group: "Climate & air", tone: "climate" },
    { value: "humidifier", label: "Humidifier / dehumidifier", description: "Whole-home humidity control", group: "Climate & air", tone: "climate" },
    { value: "air_purifier", label: "Air purifier", description: "Filtration, purification or ventilation unit", group: "Climate & air", tone: "climate" },
    { value: "water_heater", label: "Water heater", description: "Tank, tankless or heat-pump water heater", group: "Water & plumbing", tone: "water" },
    { value: "water_softener", label: "Water softener", description: "Whole-home water conditioning system", group: "Water & plumbing", tone: "water" },
    { value: "reverse_osmosis", label: "Reverse osmosis system", description: "Filtered drinking-water equipment", group: "Water & plumbing", tone: "water", keywords: ["ro"] },
    { value: "sump_pump", label: "Sump pump", description: "Basement drainage or flood-prevention pump", group: "Water & plumbing", tone: "water" },
    { value: "plumbing", label: "Plumbing system", description: "Main plumbing, pump or pressure equipment", group: "Water & plumbing", tone: "water" },
    { value: "well_system", label: "Well system", description: "Well pump, pressure tank and treatment", group: "Water & plumbing", tone: "water" },
    { value: "septic_system", label: "Septic system", description: "Private wastewater system", group: "Water & plumbing", tone: "water" },
    { value: "electrical_panel", label: "Electrical panel", description: "Breaker panel, fuse panel or subpanel", group: "Electrical & power", tone: "electrical" },
    { value: "generator", label: "Generator", description: "Portable or standby backup generator", group: "Electrical & power", tone: "electrical" },
    { value: "solar_panels", label: "Solar panels", description: "Solar array, inverter or battery system", group: "Electrical & power", tone: "electrical" },
    { value: "ev_charger", label: "EV charger", description: "Home electric-vehicle charging equipment", group: "Electrical & power", tone: "electrical" },
    { value: "smoke_detector", label: "Smoke detector", description: "Smoke alarm or connected detector", group: "Safety & security", tone: "safety" },
    { value: "carbon_monoxide_detector", label: "Carbon monoxide detector", description: "CO alarm or combined detector", group: "Safety & security", tone: "safety", keywords: ["co detector"] },
    { value: "fire_extinguisher", label: "Fire extinguisher", description: "Portable household fire extinguisher", group: "Safety & security", tone: "safety" },
    { value: "security_system", label: "Security system", description: "Alarm panel, sensors or monitoring hub", group: "Safety & security", tone: "safety" },
    { value: "security_camera", label: "Security camera", description: "Indoor, outdoor or doorbell camera", group: "Safety & security", tone: "safety" },
    { value: "smart_lock", label: "Smart lock", description: "Connected deadbolt or access-control lock", group: "Safety & security", tone: "safety" },
    { value: "appliance", label: "General appliance", description: "Use when a more specific appliance is not needed", group: "Appliances", tone: "appliance" },
    { value: "refrigerator", label: "Refrigerator", description: "Fridge, freezer or combination unit", group: "Appliances", tone: "appliance" },
    { value: "stove_oven", label: "Stove / oven", description: "Range, cooktop, wall oven or stove", group: "Appliances", tone: "appliance" },
    { value: "dishwasher", label: "Dishwasher", description: "Built-in or portable dishwasher", group: "Appliances", tone: "appliance" },
    { value: "microwave", label: "Microwave", description: "Countertop or built-in microwave", group: "Appliances", tone: "appliance" },
    { value: "range_hood", label: "Range hood", description: "Kitchen ventilation and exhaust unit", group: "Appliances", tone: "appliance" },
    { value: "washer", label: "Washer", description: "Clothes washing machine", group: "Appliances", tone: "appliance" },
    { value: "dryer", label: "Dryer", description: "Electric, gas or heat-pump dryer", group: "Appliances", tone: "appliance" },
    { value: "freezer", label: "Freezer", description: "Standalone chest or upright freezer", group: "Appliances", tone: "appliance" },
    { value: "roof", label: "Roof", description: "Roofing system, membrane or major roof area", group: "Structure & exterior", tone: "structure" },
    { value: "windows", label: "Windows", description: "Window set, glazing or major window unit", group: "Structure & exterior", tone: "structure" },
    { value: "doors", label: "Doors", description: "Exterior, patio or major interior doors", group: "Structure & exterior", tone: "structure" },
    { value: "garage_door", label: "Garage door", description: "Door, track and opener system", group: "Structure & exterior", tone: "structure" },
    { value: "fireplace", label: "Fireplace", description: "Gas, wood or electric fireplace", group: "Structure & exterior", tone: "structure" },
    { value: "irrigation", label: "Irrigation system", description: "Sprinklers, controls and outdoor watering", group: "Structure & exterior", tone: "outdoor" },
    { value: "pool", label: "Pool", description: "Pool shell, pump, filter and related equipment", group: "Structure & exterior", tone: "water" },
    { value: "hot_tub", label: "Hot tub / spa", description: "Spa shell, heater, pump and controls", group: "Structure & exterior", tone: "water" },
    { value: "internet_network", label: "Internet / network", description: "Router, modem, mesh or network cabinet", group: "Technology", tone: "tech" },
    { value: "smart_home_hub", label: "Smart-home hub", description: "Central automation bridge or controller", group: "Technology", tone: "tech" },
    { value: "television", label: "Television", description: "Primary TV or mounted display", group: "Technology", tone: "tech" },
    { value: "audio_system", label: "Audio system", description: "Receiver, speakers or whole-home audio", group: "Technology", tone: "tech" },
    { value: "computer", label: "Computer / workstation", description: "Important home computer or workstation", group: "Technology", tone: "tech" },
    { value: "barbecue", label: "Barbecue / grill", description: "Propane, natural-gas or electric grill", group: "Outdoor equipment", tone: "outdoor", keywords: ["bbq"] },
    { value: "lawn_mower", label: "Lawn mower", description: "Push, riding or robotic mower", group: "Outdoor equipment", tone: "outdoor" },
    { value: "snow_blower", label: "Snow blower", description: "Electric or gas snow-removal equipment", group: "Outdoor equipment", tone: "outdoor" },
    { value: "shed", label: "Shed", description: "Outdoor storage structure", group: "Outdoor equipment", tone: "outdoor" },
    { value: "exercise_equipment", label: "Exercise equipment", description: "Treadmill, bike, rack or major gym item", group: "Other important assets", tone: "work" },
    { value: "major_furniture", label: "Major furniture", description: "Important or high-value furniture item", group: "Other important assets", tone: "living" },
    { value: "general", label: "General home asset", description: "Important item without a narrower category", group: "Other important assets", tone: "other" },
    { value: "other", label: "Other asset type", description: "An asset that does not fit the prepared list", group: "Other important assets", tone: "other" },
];

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

function DetailItem({ label, value, tone = "spec" }) {
    return (
        <div className={`v0-detail-item is-${tone}`}>
            <span>{label}</span>
            <strong>{value || "—"}</strong>
        </div>
    );
}

function readableValue(value) {
    return String(value || "")
        .replace(/_/g, " ")
        .replace(/\b\w/g, (character) => character.toUpperCase());
}

function readableDate(value) {
    if (!value) return "—";

    const parts = String(value).split("-").map(Number);
    if (parts.length !== 3 || parts.some((part) => !Number.isFinite(part))) {
        return value;
    }

    const [year, month, day] = parts;
    return new Intl.DateTimeFormat("en-CA", {
        year: "numeric",
        month: "short",
        day: "numeric",
    }).format(new Date(year, month - 1, day));
}

function readablePropertySize(value) {
    if (value === null || value === undefined || value === "") return "—";

    const numericValue = Number(value);
    const formattedValue = Number.isFinite(numericValue)
        ? new Intl.NumberFormat("en-CA", { maximumFractionDigits: 0 }).format(numericValue)
        : String(value);

    return `${formattedValue} sq ft`;
}

function MiniMetric({ label, value, note, tone = "baseline" }) {
    return (
        <article className={`v0-mini-metric is-${tone}`}>
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
            "Core bills create the normal ownership cost floor; the Property Hub interprets them instead of storing a second copy.",
            "Rooms, assets and property milestones are optional context you can add later.",
        ],
    },
    costs: {
        title: "Ownership baseline",
        intro: "Bills are the source of truth for recurring ownership costs. This section turns active Core obligations into higher-level property metrics.",
        bullets: [
            "Daily baseline spreads the annual ownership run rate across 365 days.",
            "Monthly baseline is the total of active Core bills.",
            "Annual baseline projects the current monthly total across twelve months.",
            "Amounts, frequency and payment status are edited only on the Bills page.",
        ],
    },
    snapshot: {
        title: "Property snapshot",
        intro: "Snapshot is the small set of factual details that makes the home real: type, location, close date, size, parking, locker and notes.",
        bullets: ["Keep this lightweight.", "Edit only when something materially changes.", "Use notes for condo rules, service switches, HVAC quirks or parking details."],
    },
    structure: {
        title: "Optional context",
        intro: "Rooms, assets and property milestones are extra structure. They should help explain records, not become a huge onboarding chore.",
        bullets: [
            "Rooms answer where a purchase or project happened.",
            "Assets track important systems like HVAC, fridge, stove or router.",
            "Property milestones are single-date facts such as closing, keys received or move-in day.",
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

function InlineInfoHint({ label, text, className = "" }) {
    return (
        <span
            className={`v0-inline-info-hint ${className}`.trim()}
            role="img"
            tabIndex={0}
            aria-label={`${label}: ${text}`}
            data-tooltip={text}
        >
            <InfoIcon />
        </span>
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

export default function HomeProfilePage({ refreshEverything, goToPage }) {
    const { selectedHome, homeId, reloadHomes, apiContext, openPropertySetup } = useHomeOps();
    const [profile, setProfile] = useState({ home: selectedHome, rooms: [], assets: [], timeline: [] });
    const [form, setForm] = useState(formFromHome(selectedHome));
    const [roomForm, setRoomForm] = useState(defaultRoomForm);
    const [assetForm, setAssetForm] = useState(defaultAssetForm);
    const [timelineForm, setTimelineForm] = useState(defaultTimelineForm);
    const [editingRoom, setEditingRoom] = useState(null);
    const [editingAsset, setEditingAsset] = useState(null);
    const [editingTimelineEvent, setEditingTimelineEvent] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [activeModal, setActiveModal] = useState(null);
    const [infoModal, setInfoModal] = useState(null);
    const [openSections, setOpenSections] = useState({ costs: true, snapshot: false, structure: false });
    const [coreBills, setCoreBills] = useState([]);
    const [coreBillsError, setCoreBillsError] = useState("");
    const [coreBillsLoading, setCoreBillsLoading] = useState(false);
    const [loading, setLoading] = useState(Boolean(homeId));
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const loadProfile = useCallback(async () => {
        if (!homeId) {
            setProfile({ home: null, rooms: [], assets: [], timeline: [] });
            setForm(defaultHomeForm);
            setLoading(false);
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
            setCoreBillsLoading(false);
            return;
        }

        setCoreBillsLoading(true);

        try {
            const json = await getCoreBills(homeId, apiContext);
            setCoreBills(json.items || []);
            setCoreBillsError("");
        } catch (err) {
            setCoreBills([]);
            setCoreBillsError(err.message || "Core bill metrics are not available yet.");
        } finally {
            setCoreBillsLoading(false);
        }
    }, [apiContext, homeId]);

    useEffect(() => {
        loadProfile();
    }, [loadProfile]);

    useEffect(() => {
        loadCoreBills();
    }, [loadCoreBills]);

    const home = profile.home || selectedHome;
    const rooms = profile.rooms || [];
    const assets = profile.assets || [];
    const timeline = profile.timeline || [];
    const hasHome = Boolean(home?.id);

    const linkedCoreBills = useMemo(
        () => coreBills.filter((item) => {
            const amount = Number(item.amount ?? item.bill?.amount ?? 0);
            const isLinked = Boolean(item.linked || item.bill_id || item.bill?.id);

            return isLinked && amount > 0;
        }),
        [coreBills],
    );

    const monthlyBaseline = useMemo(
        () => linkedCoreBills.reduce(
            (total, item) => total + Number(item.amount ?? item.bill?.amount ?? 0),
            0,
        ),
        [linkedCoreBills],
    );

    const annualBaseline = monthlyBaseline * 12;
    const dailyBaseline = annualBaseline / 365;

    const coreBillCount = linkedCoreBills.length;

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

    function openAddRoom() {
        setError("");
        setEditingRoom(null);
        setRoomForm(defaultRoomForm);
        setActiveModal("room");
    }

    function openEditRoom(room) {
        setError("");
        setEditingRoom(room);
        setRoomForm({
            name: room.name || "",
            room_type: room.room_type || "",
            notes: room.notes || "",
        });
        setActiveModal("room");
    }

    function openAddAsset() {
        setError("");
        setEditingAsset(null);
        setAssetForm(defaultAssetForm);
        setActiveModal("asset");
    }

    function openEditAsset(asset) {
        setError("");
        setEditingAsset(asset);
        setAssetForm({
            name: asset.name || "",
            asset_type: asset.asset_type || "",
            room_id: asset.room_id ? String(asset.room_id) : "",
            brand: asset.brand || "",
            model: asset.model || "",
            notes: asset.notes || "",
        });
        setActiveModal("asset");
    }

    function openAddTimelineEvent() {
        setError("");
        setEditingTimelineEvent(null);
        setTimelineForm(defaultTimelineForm);
        setActiveModal("event");
    }

    function openEditTimelineEvent(eventItem) {
        setError("");
        setEditingTimelineEvent(eventItem);
        setTimelineForm({
            event_type: eventItem.event_type || "custom",
            title: eventItem.title || "",
            event_date: eventItem.event_date || todayIso(),
            description: eventItem.description || "",
        });
        setActiveModal("event");
    }

    function requestDelete(kind, item) {
        setError("");
        setDeleteTarget({ kind, item });
        setActiveModal("delete-context");
    }

    function closeContextModal() {
        setActiveModal(null);
        setDeleteTarget(null);
        setEditingRoom(null);
        setEditingAsset(null);
        setEditingTimelineEvent(null);
        setRoomForm(defaultRoomForm);
        setAssetForm(defaultAssetForm);
        setTimelineForm(defaultTimelineForm);
    }

    async function saveRoom(event) {
        event.preventDefault();
        if (!homeId) return;

        setSaving(true);
        setError("");

        try {
            if (editingRoom) {
                await updateRoom(homeId, editingRoom.id, roomForm);
            } else {
                await addRoom(homeId, roomForm);
            }
            closeContextModal();
            refreshEverything?.();
            await loadProfile();
        } catch (err) {
            setError(err.message || "Could not save room.");
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
            const payload = {
                ...assetForm,
                room_id: assetForm.room_id ? Number(assetForm.room_id) : null,
            };

            if (editingAsset) {
                await updateAsset(homeId, editingAsset.id, payload);
            } else {
                await addAsset(homeId, payload);
            }

            closeContextModal();
            refreshEverything?.();
            await loadProfile();
        } catch (err) {
            setError(err.message || "Could not save asset.");
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
            if (editingTimelineEvent) {
                await updateTimelineEvent(homeId, editingTimelineEvent.id, timelineForm);
            } else {
                await addTimelineEvent(homeId, timelineForm);
            }
            closeContextModal();
            refreshEverything?.();
            await loadProfile();
        } catch (err) {
            setError(err.message || "Could not save property milestone.");
        } finally {
            setSaving(false);
        }
    }

    async function confirmContextDelete() {
        if (!homeId || !deleteTarget?.item?.id) return;

        setSaving(true);
        setError("");

        try {
            if (deleteTarget.kind === "room") {
                await deleteRoom(homeId, deleteTarget.item.id);
            } else if (deleteTarget.kind === "asset") {
                await deleteAsset(homeId, deleteTarget.item.id);
            } else if (deleteTarget.kind === "milestone") {
                await deleteTimelineEvent(homeId, deleteTarget.item.id);
            }

            closeContextModal();
            refreshEverything?.();
            await loadProfile();
        } catch (err) {
            setError(err.message || "Could not delete this item.");
        } finally {
            setSaving(false);
        }
    }

    const deleteLabel = deleteTarget?.kind === "room"
        ? "room"
        : deleteTarget?.kind === "asset"
            ? "asset"
            : "property milestone";

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
                        <p>HomeOps needs one property anchor before bills, transactions, receipts, maintenance and periods can feel like they belong somewhere.</p>
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
                            <p>
                                {coreBillsLoading
                                    ? <HomeOpsLoadingPill width="132px" height="16px" label="Loading monthly Core bill total" />
                                    : `${money(monthlyBaseline)}/mo in Core bills`}
                            </p>
                        </div>
                        <div className="v0-profile-hero__stack" aria-label="Optional property structure counts">
                            <div className="v0-profile-stat"><b>{loading ? <HomeOpsLoadingPill width="30px" height="18px" label="Loading room count" /> : rooms.length}</b><span>Rooms</span></div>
                            <div className="v0-profile-stat"><b>{loading ? <HomeOpsLoadingPill width="30px" height="18px" label="Loading asset count" /> : assets.length}</b><span>Assets</span></div>
                            <div className="v0-profile-stat"><b>{loading ? <HomeOpsLoadingPill width="30px" height="18px" label="Loading milestone count" /> : timeline.length}</b><span>Milestones</span></div>
                        </div>
                        <div className="v0-property-hero__actions">
                            <button className="v0-icon-action" type="button" onClick={openHomeModal} aria-label="Edit home details" title="Edit home details"><PencilIcon /></button>
                        </div>
                    </section>

                    <div className="v0-hub-sections">
                        <HubAccordion
                            id="costs"
                            title="Ownership baseline"
                            subtitle="Higher-level property metrics calculated from active bills. Change amounts, frequency and payment status on the Bills page."
                            open={openSections.costs}
                            onToggle={toggleSection}
                            onInfo={setInfoModal}
                        >
                            <section
                                className="v0-baseline-grid v0-baseline-grid--three"
                                aria-label="Ownership baseline metrics"
                            >
                                <MiniMetric
                                    tone="daily"
                                    label="Daily baseline"
                                    value={coreBillsLoading ? "—" : money(dailyBaseline)}
                                    note="Average recurring ownership cost per day."
                                />

                                <MiniMetric
                                    tone="monthly"
                                    label="Monthly baseline"
                                    value={coreBillsLoading ? "—" : money(monthlyBaseline)}
                                    note="Total of active Core obligations."
                                />

                                <MiniMetric
                                    tone="annual"
                                    label="Annual baseline"
                                    value={coreBillsLoading ? "—" : money(annualBaseline)}
                                    note="Current monthly baseline × 12."
                                />
                            </section>

                            <div className="v0-baseline-source v0-baseline-source--compact">
                                <strong>
                                    {coreBillsLoading
                                        ? "Loading…"
                                        : `${coreBillCount} active ${coreBillCount === 1 ? "bill" : "bills"}`}
                                </strong>

                                <button
                                    className="v0-baseline-source__link"
                                    type="button"
                                    onClick={() => goToPage?.("bills")}
                                >
                                    View bills
                                    <span aria-hidden="true">→</span>
                                </button>
                            </div>

                            {coreBillsError && (
                                <div className="form-error">
                                    {coreBillsError}
                                </div>
                            )}
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
                                <DetailItem label="Property type" value={readableValue(home?.property_type)} tone="spec" />
                                <DetailItem label="Property size" value={readablePropertySize(home?.square_footage)} tone="spec" />
                                <DetailItem label="Occupancy" value={readableValue(home?.occupancy_status)} tone="spec" />
                                <DetailItem label="City / region" value={home?.city_region} tone="location" />
                                <DetailItem label="Purchase date" value={readableDate(home?.purchase_date)} tone="purchase" />
                                <DetailItem label="Purchase price" value={home?.purchase_price ? money(home.purchase_price) : "—"} tone="purchase" />
                                <DetailItem label="Parking" value={home?.parking} tone="asset" />
                                <DetailItem label="Locker" value={home?.locker} tone="asset" />
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
                            subtitle="Rooms, assets and milestones only when they explain records."
                            open={openSections.structure}
                            onToggle={toggleSection}
                            onInfo={setInfoModal}
                        >
                            <div className="v0-structure-grid v0-structure-grid--rows">
                                <article className="v0-structure-card v0-structure-row v0-structure-row--standard">
                                    <button className="v0-structure-add" type="button" onClick={openAddRoom} aria-label="Add room" title="Add room"><PlusIcon /></button>
                                    <div className="v0-structure-row__heading">
                                        <span>{rooms.length} saved</span>
                                        <h3>Rooms</h3>
                                    </div>
                                    <p className="v0-structure-row__description">Simple locations for spending and projects: living room, kitchen, studio, bedroom, bathroom, balcony.</p>
                                    <div className="v0-structure-row__content">
                                        {loading ? (
                                            <HomeOpsLoadingSkeleton rows={2} compact label="Loading rooms" />
                                        ) : rooms.length > 0 ? (
                                            <div className="v0-context-item-grid v0-context-item-grid--rooms">
                                                {rooms.map((room) => (
                                                    <button
                                                        className="v0-context-item v0-context-item--room"
                                                        key={room.id}
                                                        type="button"
                                                        onClick={() => openEditRoom(room)}
                                                        aria-label={`Edit ${room.name}`}
                                                        title={`Edit ${room.name}`}
                                                    >
                                                        <span>{room.name}</span>
                                                        <PencilIcon />
                                                    </button>
                                                ))}
                                            </div>
                                        ) : (
                                            <span className="v0-structure-row__empty">No rooms saved yet.</span>
                                        )}
                                    </div>
                                </article>

                                <article className="v0-structure-card v0-structure-row v0-structure-row--assets">
                                    <button className="v0-structure-add" type="button" onClick={openAddAsset} aria-label="Add asset" title="Add asset"><PlusIcon /></button>
                                    <div className="v0-structure-row__heading">
                                        <span>{assets.length} saved</span>
                                        <h3>Assets</h3>
                                    </div>
                                    <p className="v0-structure-row__description">Track systems or items with repair, warranty, document or receipt history.</p>
                                    <div className="v0-structure-row__content">
                                        {loading ? (
                                            <HomeOpsLoadingSkeleton rows={2} compact label="Loading assets" />
                                        ) : assets.length > 0 ? (
                                            <div className="v0-context-item-grid v0-context-item-grid--assets">
                                                {assets.map((asset) => {
                                                    const roomName = rooms.find((room) => Number(room.id) === Number(asset.room_id))?.name;

                                                    return (
                                                        <button
                                                            className="v0-context-item v0-context-item--record"
                                                            key={asset.id}
                                                            type="button"
                                                            onClick={() => openEditAsset(asset)}
                                                            aria-label={`Edit ${asset.name}`}
                                                            title={`Edit ${asset.name}`}
                                                        >
                                                            <span>
                                                                <strong>{asset.name}</strong>
                                                                <small>{readableValue(asset.asset_type || "asset")}{roomName ? ` · ${roomName}` : ""}</small>
                                                            </span>
                                                            <PencilIcon />
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            <span className="v0-structure-row__empty">No assets saved yet.</span>
                                        )}
                                    </div>
                                </article>

                                <article className="v0-structure-card v0-structure-row v0-structure-row--standard">
                                    <button className="v0-structure-add" type="button" onClick={openAddTimelineEvent} aria-label="Add property milestone" title="Add property milestone"><PlusIcon /></button>
                                    <div className="v0-structure-row__heading">
                                        <span>{timeline.length} saved</span>
                                        <h3>Property milestones</h3>
                                    </div>
                                    <p className="v0-structure-row__description">Single-date moments that define the home: purchase closed, keys received, move-in day, major repair or upgrade.</p>
                                    <div className="v0-structure-row__content">
                                        {loading ? (
                                            <HomeOpsLoadingSkeleton rows={2} compact label="Loading property milestones" />
                                        ) : timeline.length > 0 ? (
                                            <div className="v0-context-item-grid v0-context-item-grid--milestones">
                                                {timeline.map((eventItem) => (
                                                    <button
                                                        className="v0-context-item v0-context-item--record"
                                                        key={eventItem.id}
                                                        type="button"
                                                        onClick={() => openEditTimelineEvent(eventItem)}
                                                        aria-label={`Edit ${eventItem.title}`}
                                                        title={`Edit ${eventItem.title}`}
                                                    >
                                                        <span>
                                                            <strong>{eventItem.title}</strong>
                                                            <small>{readableDate(eventItem.event_date)} · {readableValue(eventItem.event_type)}</small>
                                                        </span>
                                                        <PencilIcon />
                                                    </button>
                                                ))}
                                            </div>
                                        ) : (
                                            <span className="v0-structure-row__empty">No property milestones saved yet.</span>
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
                intro="Update the property facts and operational notes. Recurring ownership costs are managed on the Bills page."
                size="property"
            >
                <form className="form-grid" onSubmit={saveHome}>
                    <div className="form-section-label span-12">
                        Property identity
                    </div>

                    <label className="span-6">
                        <span>Home name</span>
                        <input
                            value={form.name}
                            onChange={(event) => setForm({
                                ...form,
                                name: event.target.value,
                            })}
                            required
                        />
                    </label>

                    <label className="span-3">
                        <span>Property type</span>
                        <select
                            value={form.property_type}
                            onChange={(event) => setForm({
                                ...form,
                                property_type: event.target.value,
                            })}
                        >
                            <option value="">Select type</option>
                            <option value="townhouse">Townhouse</option>
                            <option value="condo">Condo</option>
                            <option value="detached">Detached</option>
                            <option value="semi_detached">Semi-detached</option>
                            <option value="apartment">Apartment</option>
                            <option value="cottage">Cottage</option>
                            <option value="other">Other</option>
                        </select>
                    </label>

                    <label className="span-3">
                        <span>City / region</span>
                        <input
                            value={form.city_region}
                            onChange={(event) => setForm({
                                ...form,
                                city_region: event.target.value,
                            })}
                            placeholder="Toronto, ON"
                        />
                    </label>

                    <div className="form-section-label form-section-label--with-info span-12">
                        <span>Purchase and use</span>
                        <InlineInfoHint
                            label="About recurring ownership costs"
                            text="Mortgage, condo fees, taxes, insurance, utilities, internet and other recurring costs are managed on the Bills page. Property calculates its ownership metrics from those bills."
                        />
                    </div>

                    <label className="span-3">
                        <span>Purchase date</span>
                        <input
                            type="date"
                            value={form.purchase_date}
                            onChange={(event) => setForm({
                                ...form,
                                purchase_date: event.target.value,
                            })}
                        />
                    </label>

                    <label className="span-3">
                        <span>Purchase price</span>
                        <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={form.purchase_price}
                            onChange={(event) => setForm({
                                ...form,
                                purchase_price: event.target.value,
                            })}
                        />
                    </label>

                    <label className="span-3">
                        <span>Square feet</span>
                        <input
                            type="number"
                            min="0"
                            step="1"
                            value={form.square_footage}
                            onChange={(event) => setForm({
                                ...form,
                                square_footage: event.target.value,
                            })}
                        />
                    </label>

                    <label className="span-3">
                        <span>Occupancy</span>
                        <select
                            value={form.occupancy_status}
                            onChange={(event) => setForm({
                                ...form,
                                occupancy_status: event.target.value,
                            })}
                        >
                            <option value="">Select occupancy</option>
                            <option value="owner_occupied">Owner occupied</option>
                            <option value="tenant">Tenant occupied</option>
                            <option value="vacant">Vacant</option>
                            <option value="seasonal">Seasonal</option>
                        </select>
                    </label>


                    <div className="form-section-label span-12">
                        Operational details
                    </div>

                    <label className="span-6">
                        <span>Parking</span>
                        <input
                            value={form.parking}
                            onChange={(event) => setForm({
                                ...form,
                                parking: event.target.value,
                            })}
                        />
                    </label>

                    <label className="span-6">
                        <span>Locker</span>
                        <input
                            value={form.locker}
                            onChange={(event) => setForm({
                                ...form,
                                locker: event.target.value,
                            })}
                        />
                    </label>

                    <label className="span-12">
                        <span>Service / condo notes</span>
                        <textarea
                            value={form.service_notes}
                            onChange={(event) => setForm({
                                ...form,
                                service_notes: event.target.value,
                            })}
                            placeholder="Rules, service switches, HVAC notes, parking/locker quirks..."
                        />
                    </label>

                    {error && <div className="form-error span-12">{error}</div>}
                    <button className="primary-action span-12" disabled={saving}>{saving ? "Saving..." : hasHome ? "Save Property" : "Create Property"}</button>
                </form>
            </Modal>

            <Modal
                active={activeModal === "room"}
                onClose={closeContextModal}
                title={editingRoom ? "Edit Room" : "Add Room"}
                intro="Rooms are the physical spaces you can attach purchases, projects and maintenance context to."
            >
                <form className="form-grid" onSubmit={saveRoom}>
                    <label className="span-6"><span>Room name</span><input value={roomForm.name} onChange={(event) => setRoomForm({ ...roomForm, name: event.target.value })} placeholder="Office / studio" required /></label>
                    <HomeOpsChoiceSelect
                        className="span-6"
                        label="Room type"
                        value={roomForm.room_type}
                        onChange={(roomType) => setRoomForm({ ...roomForm, room_type: roomType })}
                        options={ROOM_TYPE_OPTIONS}
                        placeholder="Choose a room type"
                        searchPlaceholder="Search room types"
                    />
                    <label className="span-12"><span>Notes</span><textarea value={roomForm.notes} onChange={(event) => setRoomForm({ ...roomForm, notes: event.target.value })} /></label>
                    {error && <div className="form-error span-12">{error}</div>}
                    <div className="v0-context-form-actions span-12">
                        {editingRoom && (
                            <button className="bill-action-button bill-action-button--danger" type="button" onClick={() => requestDelete("room", editingRoom)}>
                                Delete room
                            </button>
                        )}
                        <button className="primary-action" disabled={saving}>
                            {saving ? "Saving..." : editingRoom ? "Save Changes" : "Save Room"}
                        </button>
                    </div>
                </form>
            </Modal>

            <Modal
                active={activeModal === "asset"}
                onClose={closeContextModal}
                title={editingAsset ? "Edit Asset" : "Add Asset"}
                intro="Assets are systems or important items that deserve maintenance, warranty, document or receipt history."
            >
                <form className="form-grid" onSubmit={saveAsset}>
                    <label className="span-6"><span>Asset name</span><input value={assetForm.name} onChange={(event) => setAssetForm({ ...assetForm, name: event.target.value })} placeholder="HVAC" required /></label>
                    <HomeOpsChoiceSelect
                        className="span-6"
                        label="Asset type"
                        value={assetForm.asset_type}
                        onChange={(assetType) => setAssetForm({ ...assetForm, asset_type: assetType })}
                        options={ASSET_TYPE_OPTIONS}
                        placeholder="Choose an asset type"
                        searchPlaceholder="Search home asset types"
                    />
                    <label className="span-12"><span>Room</span><select value={assetForm.room_id} onChange={(event) => setAssetForm({ ...assetForm, room_id: event.target.value })}><option value="">Whole home / unassigned</option>{rooms.map((room) => <option key={room.id} value={room.id}>{room.name}</option>)}</select></label>
                    <label className="span-6"><span>Brand <em className="homeops-field-optional">Optional</em></span><input value={assetForm.brand} onChange={(event) => setAssetForm({ ...assetForm, brand: event.target.value })} placeholder="e.g. Carrier" /></label>
                    <label className="span-6"><span>Model <em className="homeops-field-optional">Optional</em></span><input value={assetForm.model} onChange={(event) => setAssetForm({ ...assetForm, model: event.target.value })} placeholder="e.g. 59TP6" /></label>
                    <label className="span-12"><span>Notes</span><textarea value={assetForm.notes} onChange={(event) => setAssetForm({ ...assetForm, notes: event.target.value })} /></label>
                    {error && <div className="form-error span-12">{error}</div>}
                    <div className="v0-context-form-actions span-12">
                        {editingAsset && (
                            <button className="bill-action-button bill-action-button--danger" type="button" onClick={() => requestDelete("asset", editingAsset)}>
                                Delete asset
                            </button>
                        )}
                        <button className="primary-action" disabled={saving}>
                            {saving ? "Saving..." : editingAsset ? "Save Changes" : "Save Asset"}
                        </button>
                    </div>
                </form>
            </Modal>

            <Modal
                active={activeModal === "event"}
                onClose={closeContextModal}
                title={editingTimelineEvent ? "Edit Property Milestone" : "Add Property Milestone"}
                intro="Milestones are single-date facts. Use Spending Periods for a date range that explains unusual spending."
            >
                <form className="form-grid" onSubmit={saveTimelineEvent}>
                    <label className="span-6"><span>Title</span><input value={timelineForm.title} onChange={(event) => setTimelineForm({ ...timelineForm, title: event.target.value })} placeholder="Keys received" required /></label>
                    <label className="span-3"><span>Type</span><select value={timelineForm.event_type} onChange={(event) => setTimelineForm({ ...timelineForm, event_type: event.target.value })}><option value="purchase">Purchase</option><option value="keys">Keys</option><option value="move_in">Move-in</option><option value="setup">Setup</option><option value="repair">Repair</option><option value="upgrade">Upgrade</option><option value="review">Review</option><option value="custom">Custom</option></select></label>
                    <label className="span-3"><span>Date</span><input type="date" value={timelineForm.event_date} onChange={(event) => setTimelineForm({ ...timelineForm, event_date: event.target.value })} required /></label>
                    <label className="span-12"><span>Description</span><textarea value={timelineForm.description} onChange={(event) => setTimelineForm({ ...timelineForm, description: event.target.value })} /></label>
                    {error && <div className="form-error span-12">{error}</div>}
                    <div className="v0-context-form-actions span-12">
                        {editingTimelineEvent && (
                            <button className="bill-action-button bill-action-button--danger" type="button" onClick={() => requestDelete("milestone", editingTimelineEvent)}>
                                Delete milestone
                            </button>
                        )}
                        <button className="primary-action" disabled={saving}>
                            {saving ? "Saving..." : editingTimelineEvent ? "Save Changes" : "Save Milestone"}
                        </button>
                    </div>
                </form>
            </Modal>

            <Modal
                active={activeModal === "delete-context"}
                onClose={() => {
                    setActiveModal(deleteTarget?.kind === "milestone" ? "event" : deleteTarget?.kind);
                    setDeleteTarget(null);
                }}
                title={`Delete ${deleteLabel}?`}
                intro="This removes the item from the Property Hub. Existing linked records will be kept and safely unassigned."
                size="compact"
            >
                <div className="bill-action-confirmation">
                    <div className="bill-action-summary">
                        <span>{deleteTarget?.item?.name || deleteTarget?.item?.title || "Selected item"}</span>
                        <small>This action cannot be undone.</small>
                    </div>
                    {error && <div className="form-error">{error}</div>}
                    <div className="bill-action-modal__actions">
                        <button
                            className="bill-action-button bill-action-button--secondary"
                            type="button"
                            onClick={() => {
                                setActiveModal(deleteTarget?.kind === "milestone" ? "event" : deleteTarget?.kind);
                                setDeleteTarget(null);
                            }}
                        >
                            Cancel
                        </button>
                        <button className="bill-action-button bill-action-button--danger" type="button" onClick={confirmContextDelete} disabled={saving}>
                            {saving ? "Deleting..." : `Delete ${deleteLabel}`}
                        </button>
                    </div>
                </div>
            </Modal>
        </>
    );
}
