const API_BASE_URL = (import.meta.env.VITE_HOMEOPS_API_BASE_URL || "").replace(/\/$/, "");

export const HOMEOPS_AUTH_STORAGE_KEY = "homeops.v1.authToken";

export function getStoredAuthToken() {
    try {
        return window.localStorage.getItem(HOMEOPS_AUTH_STORAGE_KEY) || "";
    } catch {
        return "";
    }
}

export function setStoredAuthToken(token) {
    try {
        if (token) {
            window.localStorage.setItem(HOMEOPS_AUTH_STORAGE_KEY, token);
        } else {
            window.localStorage.removeItem(HOMEOPS_AUTH_STORAGE_KEY);
        }
    } catch {
        // Locked-down browsers can reject localStorage. Auth still works for the current render pass.
    }
}

function authHeaders(extra = {}) {
    const token = getStoredAuthToken();

    return {
        ...extra,
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
}


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
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

export function monthStartIso(dateIso = todayIso()) {
    const value = /^\d{4}-\d{2}-\d{2}$/.test(String(dateIso)) ? String(dateIso) : todayIso();

    return `${value.slice(0, 7)}-01`;
}

export const HOMEOPS_DEFAULT_DAY = todayIso();
export const HOMEOPS_MONTH = monthStartIso(HOMEOPS_DEFAULT_DAY);

export function nullableNumber(value) {
    if (value === "" || value === null || value === undefined) return null;
    return Number(value);
}

export function monthFromParts(year, month) {
    const fallbackToday = todayIso();
    const y = Number(year || fallbackToday.slice(0, 4));
    const m = String(Number(month || fallbackToday.slice(5, 7))).padStart(2, "0");
    return `${y}-${m}-01`;
}

export function contextParams(context = {}) {
    const selectedDay = context.selectedDay || context.day || HOMEOPS_DEFAULT_DAY;
    const selectedYear = context.selectedYear || context.year || Number(selectedDay.slice(0, 4));
    const selectedMonth = context.selectedMonth || context.month || Number(selectedDay.slice(5, 7));
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

    if (response.status === 401) {
        setStoredAuthToken("");
        if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("homeops:unauthorized"));
        }
    }

    if (!response.ok) {
        const validationMessage = json?.errors
            ? Object.values(json.errors).flat().join(" ")
            : json?.message;
        const containsDatabaseDetails = /SQLSTATE\[|Connection:\s|Database:\s|\bselect\s+.+\s+from\s+/i.test(validationMessage || "");

        if (containsDatabaseDetails && typeof console !== "undefined") {
            console.error("HomeOps API database error", {
                status: response.status,
                detail: validationMessage,
            });
        }

        throw new Error(
            containsDatabaseDetails
                ? "This section could not be loaded. Please try again."
                : (validationMessage || "HomeOps API request failed.")
        );
    }

    return json;
}

export async function apiGet(url) {
    const response = await fetch(apiUrl(url), {
        headers: authHeaders(),
    });

    return parseResponse(response);
}

export async function apiPost(url, payload = {}) {
    const response = await fetch(apiUrl(url), {
        method: "POST",
        headers: authHeaders({
            "Content-Type": "application/json",
        }),
        body: JSON.stringify(payload),
    });

    return parseResponse(response);
}

export async function apiPatch(url, payload = {}) {
    const response = await fetch(apiUrl(url), {
        method: "PATCH",
        headers: authHeaders({
            "Content-Type": "application/json",
        }),
        body: JSON.stringify(payload),
    });

    return parseResponse(response);
}


export async function apiDelete(url) {
    const response = await fetch(apiUrl(url), {
        method: "DELETE",
        headers: authHeaders(),
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

export function getHomeRooms(homeId) {
    return apiGet(`/api/homeops/homes/${homeId}/rooms`);
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

export function getCoreBills(homeId, context = {}) {
    return apiGet(withContextQuery(`/api/homeops/homes/${homeId}/core-bills`, context));
}

export function syncCoreBills(homeId, context = {}) {
    return apiPost(withContextQuery(`/api/homeops/homes/${homeId}/core-bills/sync`, context), withHomePayload({}, context));
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
    return apiPost("/api/homeops/bills", withHomePayload({
        ...payload,
        month: context.monthStart || payload.month,
    }, context));
}

export function updateBill(billId, payload = {}, context = {}) {
    return apiPatch(`/api/homeops/bills/${billId}`, withHomePayload({
        ...payload,
        month: context.monthStart || payload.month,
    }, context));
}

export function deleteBill(billId, context = {}) {
    return apiDelete(withContextQuery(`/api/homeops/bills/${billId}`, context));
}

export function markBillPaid(billId, payload = {}, context = {}) {
    return apiPatch(`/api/homeops/bills/${billId}/mark-paid`, withHomePayload(payload, context));
}

export function markBillUnpaid(billId, payload = {}, context = {}) {
    return apiPatch(`/api/homeops/bills/${billId}/mark-unpaid`, withHomePayload(payload, context));
}

export function skipBillForMonth(billId, payload = {}, context = {}) {
    return apiPatch(`/api/homeops/bills/${billId}/skip-month`, withHomePayload(payload, context));
}

export function updateBillInstance(instanceId, payload = {}, context = {}) {
    return apiPatch(`/api/homeops/bill-instances/${instanceId}`, withHomePayload(payload, context));
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

export function getReceipts(context = {}) {
    return apiGet(withContextQuery("/api/homeops/receipts", context));
}

export function updateReceipt(receiptId, payload, context = {}) {
    return apiPatch(`/api/homeops/receipts/${receiptId}`, withHomePayload(payload, context));
}

export function deleteReceipt(receiptId, context = {}) {
    return apiDelete(withContextQuery(`/api/homeops/receipts/${receiptId}`, context));
}

export function updateLedgerEntry(entryId, payload, context = {}) {
    return apiPatch(`/api/homeops/ledger-entries/${entryId}`, withHomePayload(payload, context));
}

export function deleteLedgerEntry(entryId, context = {}) {
    return apiDelete(withContextQuery(`/api/homeops/ledger-entries/${entryId}`, context));
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

export function updateSpendingPeriod(periodId, payload, context = {}) {
    return apiPatch(`/api/homeops/spending-periods/${periodId}`, withHomePayload(payload, context));
}

export function deleteSpendingPeriod(periodId, context = {}) {
    return apiDelete(withContextQuery(`/api/homeops/spending-periods/${periodId}`, context));
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

export function restockMaintenanceItem(itemId, payload = {}, context = {}) {
    return apiPatch(`/api/homeops/maintenance-items/${itemId}/restock`, withHomePayload(payload, context));
}

export function updateMaintenanceItem(itemId, payload, context = {}) {
    return apiPatch(`/api/homeops/maintenance-items/${itemId}`, withHomePayload(payload, context));
}

export function deleteMaintenanceItem(itemId, context = {}) {
    return apiDelete(withContextQuery(`/api/homeops/maintenance-items/${itemId}`, context));
}

export function getMaintenanceLogs(itemId, context = {}) {
    return apiGet(withContextQuery(`/api/homeops/maintenance-items/${itemId}/logs`, context));
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

export function updateWishlistItem(itemId, payload, context = {}) {
    return apiPatch(`/api/homeops/wishlist-items/${itemId}`, withHomePayload(payload, context));
}

export function deleteWishlistItem(itemId, context = {}) {
    return apiDelete(withContextQuery(`/api/homeops/wishlist-items/${itemId}`, context));
}

export function getFinancialAccounts(context = {}) {
    return apiGet(withContextQuery("/api/homeops/financial-accounts", context));
}

export function createFinancialAccount(payload, context = {}) {
    return apiPost("/api/homeops/financial-accounts", withHomePayload(payload, context));
}

export function updateFinancialAccount(accountId, payload, context = {}) {
    return apiPatch(`/api/homeops/financial-accounts/${accountId}`, withHomePayload(payload, context));
}

export function deleteFinancialAccount(accountId, context = {}) {
    return apiDelete(withContextQuery(`/api/homeops/financial-accounts/${accountId}`, context));
}

export function getDocuments(context = {}) {
    return apiGet(withContextQuery("/api/homeops/documents", context));
}

export function createDocument(payload, context = {}) {
    return apiPost("/api/homeops/documents", withHomePayload(payload, context));
}

export function updateDocument(documentId, payload, context = {}) {
    return apiPatch(`/api/homeops/documents/${documentId}`, withHomePayload(payload, context));
}

export function deleteDocument(documentId, context = {}) {
    return apiDelete(withContextQuery(`/api/homeops/documents/${documentId}`, context));
}

export function getReports(context = {}) {
    return apiGet(withContextQuery("/api/homeops/reports", context));
}

export function getV0Status(context = {}) {
    return apiGet(withContextQuery("/api/homeops/v0/status", context));
}

export function getBudgetProfile(context = {}) {
    return apiGet(withContextQuery("/api/homeops/budget-profile", context));
}

export function updateBudgetProfile(payload = {}, context = {}) {
    return apiPatch(withContextQuery("/api/homeops/budget-profile", context), withHomePayload(payload, context));
}


export async function loginHomeOps(payload) {
    return apiPost("/api/homeops/auth/login", payload);
}

export async function registerHomeOps(payload) {
    return apiPost("/api/homeops/auth/register", payload);
}

export async function getCurrentUser() {
    return apiGet("/api/homeops/auth/me");
}


export async function updateCurrentUser(payload) {
    return apiPatch("/api/homeops/auth/profile", payload);
}

export async function changeCurrentPassword(payload) {
    return apiPatch("/api/homeops/auth/password", payload);
}

export async function logoutHomeOps() {
    return apiPost("/api/homeops/auth/logout", {});
}
