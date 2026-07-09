import { useMemo, useState } from "react";

const STORAGE_KEY = "homeops.budgetCompass.settings";

const defaultSettings = {
    monthlyIncome: "",
    savingsTarget: "",
    discretionaryCap: "",
    notes: "",
};

function readSettings() {
    try {
        return {
            ...defaultSettings,
            ...(JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "{}") || {}),
        };
    } catch {
        return defaultSettings;
    }
}

function writeSettings(settings) {
    try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
        // Local settings are a convenience layer. The dashboard still works if storage is blocked.
    }
}

function toNumber(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
}

function daysInMonth(year, month) {
    return new Date(Number(year), Number(month), 0).getDate();
}

function selectedDayOfMonth(selectedDay, selectedYear, selectedMonth) {
    const fallback = new Date().getDate();
    const parsedDay = Number(String(selectedDay || "").slice(8, 10));
    const parsedYear = Number(String(selectedDay || "").slice(0, 4));
    const parsedMonth = Number(String(selectedDay || "").slice(5, 7));

    if (parsedYear === Number(selectedYear) && parsedMonth === Number(selectedMonth) && parsedDay) {
        return parsedDay;
    }

    return Math.min(fallback, daysInMonth(selectedYear, selectedMonth));
}

function sumMonthlyVariableSpend(chartDays = []) {
    return chartDays.reduce((total, day) => total + Math.abs(Number(day?.amount || 0)), 0);
}

function ratio(value, max) {
    if (!max || max <= 0) return 0;
    return Math.min(Math.max((value / max) * 100, 0), 100);
}

function paceStatus({ hasIncomePlan, flexibleBudget, variableSpend, dailyAverage, allowedDaily }) {
    if (!hasIncomePlan) return { label: "Setup needed", tone: "neutral" };
    if (flexibleBudget > 0 && variableSpend > flexibleBudget) return { label: "Over flex", tone: "danger" };
    if (dailyAverage <= allowedDaily) return { label: "On pace", tone: "good" };
    return { label: "Watch pace", tone: "warning" };
}

function formatPlainNumber(value) {
    if (value === "" || value === null || value === undefined) return "";
    return String(value);
}

export default function BudgetCompass({ data, selectedYear, selectedMonth, selectedDay, viewMode, money, goToPage }) {
    const [settings, setSettings] = useState(readSettings);
    const [draft, setDraft] = useState(settings);
    const [editing, setEditing] = useState(false);

    const model = useMemo(() => {
        const monthDays = daysInMonth(selectedYear, selectedMonth);
        const dayNumber = selectedDayOfMonth(selectedDay, selectedYear, selectedMonth);
        const daysElapsed = Math.max(Math.min(dayNumber, monthDays), 1);
        const daysRemaining = Math.max(monthDays - dayNumber + 1, 1);

        const fixedBills = Number(data?.metrics?.expectedBills || 0);
        const paidBills = Number(data?.metrics?.paidThisMonth || 0);
        const stillDue = Number(data?.metrics?.stillDue || 0);
        const markedSpending = Number(data?.metrics?.markedSpending || 0);
        const variableSpend = sumMonthlyVariableSpend(data?.chartDays || []);

        const monthlyIncome = toNumber(settings.monthlyIncome);
        const savingsTarget = toNumber(settings.savingsTarget);
        const manualFlexCap = toNumber(settings.discretionaryCap);
        const flexibleBudget = manualFlexCap > 0
            ? manualFlexCap
            : Math.max(monthlyIncome - fixedBills - savingsTarget, 0);

        const hasIncomePlan = monthlyIncome > 0 || manualFlexCap > 0;
        const dailyAverage = variableSpend / daysElapsed;
        const allowedDaily = flexibleBudget > 0 ? flexibleBudget / monthDays : 0;
        const safeDailyRemaining = flexibleBudget > 0 ? Math.max((flexibleBudget - variableSpend) / daysRemaining, 0) : 0;
        const accountedTotal = fixedBills + variableSpend + savingsTarget;
        const cushion = monthlyIncome > 0 ? monthlyIncome - accountedTotal : null;
        const status = paceStatus({ hasIncomePlan, flexibleBudget, variableSpend, dailyAverage, allowedDaily });

        return {
            monthDays,
            daysElapsed,
            daysRemaining,
            fixedBills,
            paidBills,
            stillDue,
            markedSpending,
            variableSpend,
            monthlyIncome,
            savingsTarget,
            flexibleBudget,
            dailyAverage,
            allowedDaily,
            safeDailyRemaining,
            accountedTotal,
            cushion,
            status,
            hasIncomePlan,
        };
    }, [data, selectedDay, selectedMonth, selectedYear, settings]);

    function saveSettings(event) {
        event.preventDefault();
        const nextSettings = {
            monthlyIncome: formatPlainNumber(draft.monthlyIncome),
            savingsTarget: formatPlainNumber(draft.savingsTarget),
            discretionaryCap: formatPlainNumber(draft.discretionaryCap),
            notes: draft.notes || "",
        };

        setSettings(nextSettings);
        writeSettings(nextSettings);
        setEditing(false);
    }

    function cancelSettings() {
        setDraft(settings);
        setEditing(false);
    }

    const setupHint = model.hasIncomePlan
        ? "Local planning lens. Does not change ledger records."
        : "Add income or a flex cap to turn this into a daily spending guide.";

    return (
        <section className={`budget-compass panel ${viewMode === "day" ? "is-day-view" : ""}`}>
            <div className="panel-header budget-compass__header">
                <div>
                    <span className="v0-eyebrow">Budget Lens</span>
                    <h2>Daily spending clarity</h2>
                    <p>{setupHint}</p>
                </div>

                <button className="ghost-action" type="button" onClick={() => setEditing((value) => !value)}>
                    {editing ? "Close" : "Adjust assumptions"}
                </button>
            </div>

            <div className="budget-compass__body">
                <article className={`budget-compass__status ${model.status.tone}`}>
                    <span>Month pace</span>
                    <strong>{model.status.label}</strong>
                    <p>
                        {money(model.dailyAverage)} avg/day spent · {model.hasIncomePlan ? `${money(model.safeDailyRemaining)} safe/day left` : "budget not set"}
                    </p>
                </article>

                <div className="budget-compass__cards">
                    <article>
                        <span>Fixed obligations</span>
                        <strong>{money(model.fixedBills)}</strong>
                        <small>{money(model.stillDue)} still due</small>
                    </article>
                    <article>
                        <span>Variable spend</span>
                        <strong>{money(model.variableSpend)}</strong>
                        <small>{money(model.markedSpending)} period-linked</small>
                    </article>
                    <article>
                        <span>Daily flex target</span>
                        <strong>{model.hasIncomePlan ? money(model.allowedDaily) : "Set it"}</strong>
                        <small>{model.daysRemaining} days incl. selected day</small>
                    </article>
                    <article>
                        <span>Unaccounted cushion</span>
                        <strong>{model.cushion === null ? "—" : money(model.cushion)}</strong>
                        <small>{model.cushion !== null && model.cushion < 0 ? "tight / over plan" : "after bills, spend, savings"}</small>
                    </article>
                </div>
            </div>

            <div className="budget-compass__bars" aria-label="Budget breakdown">
                <div>
                    <span>Paid bills</span>
                    <strong>{money(model.paidBills)}</strong>
                    <i><b style={{ width: `${ratio(model.paidBills, Math.max(model.fixedBills, 1))}%` }} /></i>
                </div>
                <div>
                    <span>Variable spend pace</span>
                    <strong>{model.hasIncomePlan ? `${Math.round(ratio(model.variableSpend, model.flexibleBudget))}%` : money(model.variableSpend)}</strong>
                    <i><b style={{ width: `${ratio(model.variableSpend, Math.max(model.flexibleBudget, model.variableSpend, 1))}%` }} /></i>
                </div>
                <div>
                    <span>Accounted total</span>
                    <strong>{money(model.accountedTotal)}</strong>
                    <i><b style={{ width: `${ratio(model.accountedTotal, Math.max(model.monthlyIncome, model.accountedTotal, 1))}%` }} /></i>
                </div>
            </div>

            {editing && (
                <form className="budget-compass__settings" onSubmit={saveSettings}>
                    <label>
                        <span>Monthly take-home</span>
                        <input
                            type="number"
                            min="0"
                            step="1"
                            value={draft.monthlyIncome}
                            onChange={(event) => setDraft({ ...draft, monthlyIncome: event.target.value })}
                            placeholder="5555"
                        />
                    </label>
                    <label>
                        <span>Savings target</span>
                        <input
                            type="number"
                            min="0"
                            step="1"
                            value={draft.savingsTarget}
                            onChange={(event) => setDraft({ ...draft, savingsTarget: event.target.value })}
                            placeholder="1000"
                        />
                    </label>
                    <label>
                        <span>Optional flex cap</span>
                        <input
                            type="number"
                            min="0"
                            step="1"
                            value={draft.discretionaryCap}
                            onChange={(event) => setDraft({ ...draft, discretionaryCap: event.target.value })}
                            placeholder="leave blank to auto-calc"
                        />
                    </label>
                    <label className="budget-compass__notes">
                        <span>Note</span>
                        <input
                            value={draft.notes}
                            onChange={(event) => setDraft({ ...draft, notes: event.target.value })}
                            placeholder="Mortgage + HOA + food stingy mode, etc."
                        />
                    </label>
                    <div className="budget-compass__settings-actions">
                        <button className="secondary-action" type="button" onClick={cancelSettings}>Cancel</button>
                        <button className="primary-action" type="submit">Save lens</button>
                    </div>
                </form>
            )}

            <div className="budget-compass__actions">
                <button type="button" onClick={() => goToPage?.("bills")}>Review bills</button>
                <button type="button" onClick={() => goToPage?.("ledger")}>Add ledger item</button>
                <button type="button" onClick={() => goToPage?.("periods")}>Explain a spike</button>
            </div>
        </section>
    );
}
