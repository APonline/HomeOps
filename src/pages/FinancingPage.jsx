import { useCallback, useEffect, useMemo, useState } from "react";
import Modal from "../components/Modal";
import MetricCard from "../components/MetricCard";
import { useHomeOps } from "../context/HomeOpsContext";
import {
    createFinancialAccount,
    deleteFinancialAccount,
    getFinancialAccounts,
    money,
    nullableNumber,
    updateFinancialAccount,
} from "../lib/homeopsApi";

const ACCOUNT_TYPES = [
    ["mortgage", "Mortgage"],
    ["line_of_credit", "Line of Credit"],
    ["credit_card", "Credit Card"],
    ["loan", "Loan"],
    ["savings", "Savings"],
    ["chequing", "Chequing"],
    ["investment", "Investment"],
    ["other", "Other Account"],
];

const INSTITUTIONS = [
    "BMO",
    "CIBC",
    "RBC",
    "Scotiabank",
    "TD",
    "National Bank",
    "Desjardins",
    "Tangerine",
    "Simplii Financial",
    "EQ Bank",
    "Wealthsimple",
    "Questrade",
    "Meridian Credit Union",
    "Alterna Savings",
    "First National",
    "MCAP",
    "RMG Mortgages",
    "Home Trust",
    "Manulife Bank",
    "Other / Private",
];

const blank = {
    name: "",
    account_type: "mortgage",
    institution: "",
    current_balance: "",
    credit_limit: "",
    interest_rate: "",
    minimum_payment: "",
    scheduled_payment: "",
    payment_day: "",
    opened_on: "",
    maturity_date: "",
    notes: "",
};

function accountTypeLabel(value) {
    return ACCOUNT_TYPES.find(([key]) => key === value)?.[1] || "Account";
}

function generatedAccountName(form) {
    const institution = String(form.institution || "").trim();
    const type = accountTypeLabel(form.account_type);
    return institution ? `${institution} ${type}` : type;
}

export default function FinancingPage({ refreshToken, refreshEverything }) {
    const { apiContext } = useHomeOps();
    const [accounts, setAccounts] = useState([]);
    const [summary, setSummary] = useState({});
    const [form, setForm] = useState(blank);
    const [editingId, setEditingId] = useState(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [schemaReady, setSchemaReady] = useState(true);
    const [error, setError] = useState("");

    const accountName = useMemo(() => generatedAccountName(form), [form]);
    const institutionOptions = useMemo(() => {
        const current = String(form.institution || "").trim();
        return current && !INSTITUTIONS.includes(current) ? [current, ...INSTITUTIONS] : INSTITUTIONS;
    }, [form.institution]);

    const load = useCallback(async () => {
        setLoading(true);
        setError("");

        try {
            const json = await getFinancialAccounts(apiContext);
            setAccounts(json.accounts || []);
            setSummary(json.summary || {});
            setSchemaReady(json.schema_ready !== false);

            if (json.schema_ready === false) {
                setError(json.message || "Financing setup is not ready on the API yet.");
            }
        } catch (err) {
            setSchemaReady(false);
            setError(err.message || "Could not load financing.");
        } finally {
            setLoading(false);
        }
    }, [apiContext]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        load();
    }, [load, refreshToken]);

    function edit(account = null) {
        setEditingId(account?.id || null);
        setForm(account ? {
            ...blank,
            ...account,
            current_balance: account.current_balance ?? "",
            credit_limit: account.credit_limit ?? "",
            interest_rate: account.interest_rate ?? "",
            minimum_payment: account.minimum_payment ?? "",
            scheduled_payment: account.scheduled_payment ?? "",
            payment_day: account.payment_day ?? "",
            opened_on: account.opened_on || "",
            maturity_date: account.maturity_date || "",
        } : blank);
        setError("");
        setModalOpen(true);
    }

    async function submit(event) {
        event.preventDefault();
        setSaving(true);
        setError("");

        const payload = {
            ...form,
            name: generatedAccountName(form),
            current_balance: nullableNumber(form.current_balance) || 0,
            credit_limit: nullableNumber(form.credit_limit),
            interest_rate: nullableNumber(form.interest_rate),
            minimum_payment: nullableNumber(form.minimum_payment),
            scheduled_payment: nullableNumber(form.scheduled_payment),
            payment_day: nullableNumber(form.payment_day),
            opened_on: form.opened_on || null,
            maturity_date: form.maturity_date || null,
            institution: form.institution || null,
            notes: form.notes || null,
        };

        try {
            if (editingId) await updateFinancialAccount(editingId, payload, apiContext);
            else await createFinancialAccount(payload, apiContext);
            setModalOpen(false);
            refreshEverything?.();
            await load();
        } catch (err) {
            setError(err.message || "Could not save account.");
        } finally {
            setSaving(false);
        }
    }

    async function remove(account) {
        if (!window.confirm(`Close ${account.name} in HomeOps? Historical records remain.`)) return;
        try {
            await deleteFinancialAccount(account.id, apiContext);
            refreshEverything?.();
            await load();
        } catch (err) {
            setError(err.message || "Could not close account.");
        }
    }

    return <>
        <header className="page-header">
            <div><h1>Financing</h1><p>Mortgage, LOC, cards, loans, cash accounts, and practical payoff forecasts.</p></div>
            <button className="page-primary-action" type="button" onClick={() => edit()} disabled={!schemaReady}>+ Account</button>
        </header>
        <div className="metric-grid">
            <MetricCard label="Debt" value={money(summary.debt_total || 0)} note="active debt balances" />
            <MetricCard label="Cash / Assets" value={money(summary.asset_total || 0)} note="tracked account balances" />
            <MetricCard label="Net Position" value={money(summary.net_position || 0)} note="assets minus debt" />
            <MetricCard label="Monthly Payments" value={money(summary.scheduled_monthly_payments || 0)} note="scheduled debt payments" />
        </div>
        <section className="panel full-panel">
            <div className="panel-header"><h2>Accounts</h2><span>{loading ? "loading" : `${accounts.length} active`}</span></div>
            {error && <div className="form-error">{error}</div>}
            {loading && <div className="empty-box">Loading accounts...</div>}
            {!loading && schemaReady && accounts.length === 0 && <div className="empty-box">Add your mortgage, LOC, cards, savings, or other financing.</div>}
            <div className="record-list">
                {accounts.map((account) => <article className="record-row" key={account.id}>
                    <div>
                        <strong>{account.name}</strong>
                        <p>{account.account_type.replaceAll("_", " ")} · {account.institution || "No institution"}{account.interest_rate !== null ? ` · ${account.interest_rate}%` : ""}</p>
                        {account.payoff_projection?.months !== null && account.is_debt && <small>Forecast: {account.payoff_projection.months} months · {money(account.payoff_projection.interest)} interest · payoff {account.payoff_projection.payoff_date}</small>}
                        {account.payoff_projection?.warning && <small className="warning-text">{account.payoff_projection.warning}</small>}
                    </div>
                    <div className="list-actions">
                        <b>{money(account.current_balance)}</b>
                        <button className="mini-button" onClick={() => edit(account)}>Edit</button>
                        <button className="mini-button danger" onClick={() => remove(account)}>Close</button>
                    </div>
                </article>)}
            </div>
        </section>
        <Modal active={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? "Edit Financial Account" : "Add Financial Account"} size="wide">
            <form className="form-grid" onSubmit={submit}>
                {error && <div className="form-error">{error}</div>}
                <label className="span-6"><span>Institution</span><select value={form.institution} onChange={(e) => setForm({ ...form, institution: e.target.value })} required><option value="">Choose an institution</option>{institutionOptions.map((institution) => <option key={institution} value={institution}>{institution}</option>)}</select></label>
                <label className="span-6"><span>Type</span><select value={form.account_type} onChange={(e) => setForm({ ...form, account_type: e.target.value })}>{ACCOUNT_TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                <div className="span-12 financing-generated-name"><span>Account name</span><strong>{accountName}</strong><small>Generated from the institution and account type.</small></div>
                <label className="span-3"><span>Balance</span><input type="number" step="0.01" value={form.current_balance} onChange={(e) => setForm({ ...form, current_balance: e.target.value })} required /></label>
                <label className="span-3"><span>Credit Limit</span><input type="number" step="0.01" value={form.credit_limit} onChange={(e) => setForm({ ...form, credit_limit: e.target.value })} /></label>
                <label className="span-2"><span>Interest %</span><input type="number" step="0.0001" value={form.interest_rate} onChange={(e) => setForm({ ...form, interest_rate: e.target.value })} /></label>
                <label className="span-2"><span>Minimum</span><input type="number" step="0.01" value={form.minimum_payment} onChange={(e) => setForm({ ...form, minimum_payment: e.target.value })} /></label>
                <label className="span-2"><span>Scheduled</span><input type="number" step="0.01" value={form.scheduled_payment} onChange={(e) => setForm({ ...form, scheduled_payment: e.target.value })} /></label>
                <label className="span-2"><span>Pay Day</span><input type="number" min="1" max="31" value={form.payment_day} onChange={(e) => setForm({ ...form, payment_day: e.target.value })} /></label>
                <label className="span-3"><span>Opened</span><input type="date" value={form.opened_on} onChange={(e) => setForm({ ...form, opened_on: e.target.value })} /></label>
                <label className="span-3"><span>Maturity</span><input type="date" value={form.maturity_date} onChange={(e) => setForm({ ...form, maturity_date: e.target.value })} /></label>
                <label className="span-12"><span>Notes</span><textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></label>
                <button className="primary-action span-12" disabled={saving}>{saving ? "Saving..." : "Save Account"}</button>
            </form>
        </Modal>
    </>;
}
