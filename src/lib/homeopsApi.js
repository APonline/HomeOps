export const HOMEOPS_MONTH = "2026-06-01";

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

async function parseResponse(response) {
    const raw = await response.text();

    let json = null;
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

export function getDashboard(month = HOMEOPS_MONTH) {
    return apiGet(`/api/homeops/dashboard?month=${encodeURIComponent(month)}`);
}

export function getBills(month = HOMEOPS_MONTH) {
    return apiGet(`/api/homeops/bills?month=${encodeURIComponent(month)}`);
}

export function createBill(payload) {
    return apiPost("/api/homeops/bills", payload);
}

export function updateBill(billId, payload = {}) {
    return apiPatch(`/api/homeops/bills/${billId}`, payload);
}

export function deleteBill(billId) {
    const response = fetch(apiUrl(`/api/homeops/bills/${billId}`), {
        method: "DELETE",
        headers: { Accept: "application/json" },
    });

    return response.then(parseResponse);
}

export function markBillPaid(billId, payload = {}) {
    return apiPatch(`/api/homeops/bills/${billId}/mark-paid`, payload);
}

export function getLedgerEntries(month = HOMEOPS_MONTH) {
    return apiGet(`/api/homeops/ledger-entries?month=${encodeURIComponent(month)}`);
}

export function createLedgerEntry(payload) {
    return apiPost("/api/homeops/ledger-entries", payload);
}

export function createReceipt(payload) {
    return apiPost("/api/homeops/receipts", payload);
}

export function getSpendingPeriods(month = HOMEOPS_MONTH) {
    return apiGet(`/api/homeops/spending-periods?month=${encodeURIComponent(month)}`);
}

export function createSpendingPeriod(payload) {
    return apiPost("/api/homeops/spending-periods", payload);
}

export function getMaintenanceItems() {
    return apiGet("/api/homeops/maintenance-items");
}

export function createMaintenanceItem(payload) {
    return apiPost("/api/homeops/maintenance-items", payload);
}

export function completeMaintenanceItem(itemId, payload = {}) {
    return apiPatch(`/api/homeops/maintenance-items/${itemId}/complete`, payload);
}

export function getWishlistItems() {
    return apiGet("/api/homeops/wishlist-items");
}

export function createWishlistItem(payload) {
    return apiPost("/api/homeops/wishlist-items", payload);
}

export function markWishlistPurchased(itemId, payload = {}) {
    return apiPatch(`/api/homeops/wishlist-items/${itemId}/purchased`, payload);
}
