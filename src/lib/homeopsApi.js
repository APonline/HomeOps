export const HOMEOPS_MONTH = "2026-06-01";
export const HOMEOPS_DEFAULT_DAY = "2026-06-21";

const API_BASE_URL = (import.meta.env.VITE_HOMEOPS_API_BASE_URL || "").replace(/\/$/, "");

function apiUrl(path) {
    const cleanPath = path.startsWith("/") ? path : `/${path}`;
    return `${API_BASE_URL}${cleanPath}`;
}

export function money(value) {
    if (value === null || value === undefined || value === "") return "—";

    return Number(value).toLocaleString("en-CA", {
        style: "currency",
        currency: "CAD",
        maximumFractionDigits: 0,
    });
}

export function todayIso() {
    return new Date().toISOString().slice(0, 10);
}

export function nullableNumber(value) {
    if (value === "" || value === null || value === undefined) return null;
    return Number(value);
}

export function monthFromParts(year, month) {
    const y = Number(year || 2026);
    const m = String(Number(month || 6)).padStart(2, "0");
    return `${y}-${m}-01`;
}

export function contextParams(context = {}) {
    const selectedYear = context.selectedYear || context.year || 2026;
    const selectedMonth = context.selectedMonth || context.month || 6;
    const selectedDay = context.selectedDay || context.day || HOMEOPS_DEFAULT_DAY;
    const viewMode = context.viewMode || context.view_mode || "month";

    return {
        home_id: context.homeId || context.home_id || context.selectedHome?.id || "",
        view_mode: viewMode,
        year: selectedYear,
        selected_month: selectedMonth,
        selected_day: selectedDay,
        month: context.monthStart || monthFromParts(selectedYear, selectedMonth),
        date_from: context.dateFrom || context.date_from || "",
        date_to: context.dateTo || context.date_to || "",
    };
}

export function withContextQuery(path, context = {}, extraParams = {}) {
    const params = new URLSearchParams();

    Object.entries({ ...contextParams(context), ...extraParams }).forEach(([key, value]) => {
        if (value !== "" && value !== null && value !== undefined) {
            params.set(key, value);
        }
    });

    const separator = path.includes("?") ? "&" : "?";
    const query = params.toString();

    return query ? `${path}${separator}${query}` : path;
}

export function withHomePayload(payload = {}, context = {}) {
    const homeId = context.homeId || context.home_id || context.selectedHome?.id;

    if (!homeId) return payload;

    return {
        ...payload,
        home_id: homeId,
    };
}

async function parseResponse(response) {
    const raw = await response.text();

    let json;
    try {
        json = raw ? JSON.parse(raw) : null;
    } catch {
        json = { message: raw || "Invalid API response." };
    }

    if (!response.ok) {
        const validationMessage = json?.errors
            ? Object.values(json.errors).flat().join(" ")
            : json?.message;

        throw new Error(validationMessage || "HomeOps API request failed.");
    }

    return json;
}

export async function apiGet(url) {
    const response = await fetch(apiUrl(url), {
        headers: { Accept: "application/json" },
    });

    return parseResponse(response);
}

export async function apiPost(url, payload = {}) {
    const response = await fetch(apiUrl(url), {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
        },
        body: JSON.stringify(payload),
    });

    return parseResponse(response);
}

export async function apiPatch(url, payload = {}) {
    const response = await fetch(apiUrl(url), {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
        },
        body: JSON.stringify(payload),
    });

    return parseResponse(response);
}

export function getHomes(context = {}) {
    return apiGet(withContextQuery("/api/homeops/homes", context));
}

export function createHome(payload) {
    return apiPost("/api/homeops/homes", payload);
}

export function updateHome(homeId, payload) {
    return apiPatch(`/api/homeops/homes/${homeId}`, payload);
}

export function getHome(homeId) {
    return apiGet(`/api/homeops/homes/${homeId}`);
}

export function addRoom(homeId, payload) {
    return apiPost(`/api/homeops/homes/${homeId}/rooms`, payload);
}

export function addAsset(homeId, payload) {
    return apiPost(`/api/homeops/homes/${homeId}/assets`, payload);
}

export function addTimelineEvent(homeId, payload) {
    return apiPost(`/api/homeops/homes/${homeId}/timeline`, payload);
}

export function getDashboard(contextOrMonth = HOMEOPS_MONTH) {
    if (typeof contextOrMonth === "string") {
        return apiGet(`/api/homeops/dashboard?month=${encodeURIComponent(contextOrMonth)}`);
    }

    return apiGet(withContextQuery("/api/homeops/dashboard", contextOrMonth));
}

export function getBills(contextOrMonth = HOMEOPS_MONTH) {
    if (typeof contextOrMonth === "string") {
        return apiGet(`/api/homeops/bills?month=${encodeURIComponent(contextOrMonth)}`);
    }

    return apiGet(withContextQuery("/api/homeops/bills", contextOrMonth));
}

export function createBill(payload, context = {}) {
    return apiPost("/api/homeops/bills", withHomePayload(payload, context));
}

export function updateBill(billId, payload = {}, context = {}) {
    return apiPatch(`/api/homeops/bills/${billId}`, withHomePayload(payload, context));
}

export function deleteBill(billId, context = {}) {
    const response = fetch(apiUrl(withContextQuery(`/api/homeops/bills/${billId}`, context)), {
        method: "DELETE",
        headers: { Accept: "application/json" },
    });

    return response.then(parseResponse);
}

export function markBillPaid(billId, payload = {}, context = {}) {
    return apiPatch(`/api/homeops/bills/${billId}/mark-paid`, withHomePayload(payload, context));
}

export function getLedgerEntries(contextOrMonth = HOMEOPS_MONTH) {
    if (typeof contextOrMonth === "string") {
        return apiGet(`/api/homeops/ledger-entries?month=${encodeURIComponent(contextOrMonth)}`);
    }

    return apiGet(withContextQuery("/api/homeops/ledger-entries", contextOrMonth));
}

export function createLedgerEntry(payload, context = {}) {
    return apiPost("/api/homeops/ledger-entries", withHomePayload(payload, context));
}

export function createReceipt(payload, context = {}) {
    return apiPost("/api/homeops/receipts", withHomePayload(payload, context));
}

export function getSpendingPeriods(contextOrMonth = HOMEOPS_MONTH) {
    if (typeof contextOrMonth === "string") {
        return apiGet(`/api/homeops/spending-periods?month=${encodeURIComponent(contextOrMonth)}`);
    }

    return apiGet(withContextQuery("/api/homeops/spending-periods", contextOrMonth));
}

export function createSpendingPeriod(payload, context = {}) {
    return apiPost("/api/homeops/spending-periods", withHomePayload(payload, context));
}

export function getMaintenanceItems(context = {}) {
    return apiGet(withContextQuery("/api/homeops/maintenance-items", context));
}

export function createMaintenanceItem(payload, context = {}) {
    return apiPost("/api/homeops/maintenance-items", withHomePayload(payload, context));
}

export function completeMaintenanceItem(itemId, payload = {}, context = {}) {
    return apiPatch(`/api/homeops/maintenance-items/${itemId}/complete`, withHomePayload(payload, context));
}

export function getWishlistItems(context = {}) {
    return apiGet(withContextQuery("/api/homeops/wishlist-items", context));
}

export function createWishlistItem(payload, context = {}) {
    return apiPost("/api/homeops/wishlist-items", withHomePayload(payload, context));
}

export function markWishlistPurchased(itemId, payload = {}, context = {}) {
    return apiPatch(`/api/homeops/wishlist-items/${itemId}/purchased`, withHomePayload(payload, context));
}
