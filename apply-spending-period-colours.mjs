import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const pagePath = path.join(root, "src/pages/SpendingPeriodsPage.jsx");
const chartPath = path.join(root, "src/components/PeriodChart.jsx");
const tonePath = path.join(root, "src/lib/spendingPeriodTones.js");
const cssPath = path.join(root, "src/styles/spending-period-tones.css");

for (const requiredPath of [pagePath, chartPath]) {
    if (!fs.existsSync(requiredPath)) {
        throw new Error(`Missing expected file: ${requiredPath}`);
    }
}

fs.mkdirSync(path.dirname(tonePath), { recursive: true });
fs.mkdirSync(path.dirname(cssPath), { recursive: true });

fs.writeFileSync(
    tonePath,
`const PERIOD_TONES = [
    "blue",
    "purple",
    "green",
    "orange",
    "teal",
    "pink",
    "red",
];

const VALID_PERIOD_TONES = new Set(PERIOD_TONES);

const PERIOD_TYPE_TONES = {
    move: "blue",
    renovation: "orange",
    repair: "red",
    project: "purple",
    emergency: "red",
    travel: "teal",
    custom: "green",
};

function stableIndex(value) {
    const text = String(value ?? "");
    let hash = 0;

    for (let index = 0; index < text.length; index += 1) {
        hash = ((hash << 5) - hash + text.charCodeAt(index)) | 0;
    }

    return Math.abs(hash);
}

export function resolveSpendingPeriodTone(record = {}, fallbackIndex = 0) {
    const suppliedTone = String(
        record.tone
        || record.period_tone
        || record.period?.tone
        || ""
    )
        .trim()
        .toLowerCase()
        .replace(/^tone-/, "");

    if (VALID_PERIOD_TONES.has(suppliedTone)) {
        return suppliedTone;
    }

    const periodType = String(
        record.period_type
        || record.period?.period_type
        || record.type
        || ""
    ).toLowerCase();

    if (PERIOD_TYPE_TONES[periodType]) {
        return PERIOD_TYPE_TONES[periodType];
    }

    const stableKey =
        record.period_id
        ?? record.period?.id
        ?? record.id
        ?? record.key
        ?? record.title
        ?? record.name
        ?? fallbackIndex;

    return PERIOD_TONES[stableIndex(stableKey) % PERIOD_TONES.length];
}
`,
    "utf8"
);

fs.writeFileSync(
    cssPath,
`:root {
    --period-tone-blue: #69a8ff;
    --period-tone-purple: #9b7bff;
    --period-tone-green: #4fd49c;
    --period-tone-orange: #f0a14a;
    --period-tone-teal: #45c7c2;
    --period-tone-pink: #db78bd;
    --period-tone-red: #e56b70;
}

.tone-blue {
    --period-tone-color: var(--period-tone-blue);
}

.tone-purple {
    --period-tone-color: var(--period-tone-purple);
}

.tone-green {
    --period-tone-color: var(--period-tone-green);
}

.tone-orange {
    --period-tone-color: var(--period-tone-orange);
}

.tone-teal {
    --period-tone-color: var(--period-tone-teal);
}

.tone-pink {
    --period-tone-color: var(--period-tone-pink);
}

.tone-red {
    --period-tone-color: var(--period-tone-red);
}

.spending-period-card {
    position: relative;
    isolation: isolate;
    overflow: hidden;
    border-left-width: 4px;
    border-left-color: var(--period-tone-color, var(--period-tone-purple));
    background-image: linear-gradient(
        135deg,
        color-mix(
            in srgb,
            var(--period-tone-color, var(--period-tone-purple)) 12%,
            transparent
        ),
        transparent 58%
    );
}

.spending-period-card::after {
    position: absolute;
    z-index: 0;
    top: -90px;
    left: -80px;
    width: 220px;
    height: 220px;
    border-radius: 999px;
    background: var(--period-tone-color, var(--period-tone-purple));
    content: "";
    opacity: 0.055;
    pointer-events: none;
    filter: blur(24px);
}

.spending-period-card > * {
    position: relative;
    z-index: 1;
}

.spending-period-card__identity {
    display: flex;
    align-items: flex-start;
    gap: 11px;
}

.spending-period-card__identity > div {
    display: grid;
    gap: 8px;
}

.spending-period-card__tone {
    width: 9px;
    height: 9px;
    flex: 0 0 9px;
    margin-top: 4px;
    border-radius: 999px;
    background: var(--period-tone-color, var(--period-tone-purple));
    box-shadow: 0 0 0 4px
        color-mix(
            in srgb,
            var(--period-tone-color, var(--period-tone-purple)) 16%,
            transparent
        );
}

.spending-period-card__type {
    color: var(--period-tone-color, var(--period-tone-purple));
}

.bar.marked[class*="tone-"] {
    border-color: color-mix(
        in srgb,
        var(--period-tone-color) 72%,
        white
    );
    background-color: var(--period-tone-color);
    background-image: linear-gradient(
        180deg,
        color-mix(in srgb, var(--period-tone-color) 74%, white),
        var(--period-tone-color)
    );
    box-shadow: 0 7px 20px
        color-mix(in srgb, var(--period-tone-color) 24%, transparent);
}
`,
    "utf8"
);

let pageSource = fs.readFileSync(pagePath, "utf8");

if (!pageSource.includes("../lib/spendingPeriodTones")) {
    pageSource = pageSource.replace(
        `import { useHomeOps } from "../context/HomeOpsContext";`,
        `import { useHomeOps } from "../context/HomeOpsContext";
import { resolveSpendingPeriodTone } from "../lib/spendingPeriodTones";
import "../styles/spending-period-tones.css";`
    );
}

const periodListStart = pageSource.indexOf(
    `                <div className="period-list wide spending-period-list">`
);
const periodListEnd = pageSource.indexOf(
    `\n            </section>`,
    periodListStart
);

if (periodListStart === -1 || periodListEnd === -1) {
    throw new Error("Could not locate the Spending Period card list.");
}

const newPeriodList = `                <div className="period-list wide spending-period-list">
                    {periods.map((period, index) => {
                        const tone = resolveSpendingPeriodTone(period, index);

                        return (
                            <article
                                className={\`period-card spending-period-card \${tone} tone-\${tone}\`}
                                data-period-tone={tone}
                                key={period.id}
                            >
                                <div className="spending-period-card__heading">
                                    <div className="spending-period-card__identity">
                                        <i
                                            className={\`spending-period-card__tone tone-\${tone}\`}
                                            aria-hidden="true"
                                        />
                                        <div>
                                            <strong>{period.name || period.title}</strong>
                                            <span className="spending-period-card__type">
                                                {readableType(period.period_type)}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="spending-period-card__actions">
                                        <button
                                            className="mini-button"
                                            type="button"
                                            onClick={() => openEdit(period)}
                                        >
                                            Edit
                                        </button>

                                        <button
                                            className="mini-button mini-button--danger"
                                            type="button"
                                            onClick={() => requestDelete(period)}
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>

                                <p>
                                    {period.dates} · {money(period.amount)} linked · {period.entry_count || 0} entries
                                    {period.timing_label ? \` · \${period.timing_label}\` : ""}
                                </p>

                                {period.description && <small>{period.description}</small>}
                            </article>
                        );
                    })}
                </div>`;

pageSource =
    pageSource.slice(0, periodListStart)
    + newPeriodList
    + pageSource.slice(periodListEnd);

fs.writeFileSync(pagePath, pageSource, "utf8");

let chartSource = fs.readFileSync(chartPath, "utf8");

if (!chartSource.includes("../lib/spendingPeriodTones")) {
    chartSource = chartSource.replace(
        `import { useRef, useState } from "react";`,
        `import { useRef, useState } from "react";
import { resolveSpendingPeriodTone } from "../lib/spendingPeriodTones";
import "../styles/spending-period-tones.css";`
    );
}

const chartToneAnchor =
    `                        const itemCount = Number(day.itemCount || day.count || 0);`;

if (!chartSource.includes("const periodTone = day.marked")) {
    if (!chartSource.includes(chartToneAnchor)) {
        throw new Error("Could not locate the PeriodChart item-count line.");
    }

    chartSource = chartSource.replace(
        chartToneAnchor,
`${chartToneAnchor}
                        const periodTone = day.marked
                            ? resolveSpendingPeriodTone({
                                ...day,
                                tone: day.tone || day.period_tone || day.period?.tone,
                                period_type: day.period_type || day.period?.period_type,
                                period_id: day.period_id || day.period?.id,
                            }, index)
                            : null;`
    );
}

const oldBar = `                                <span
                                    className={day.marked ? "bar marked" : "bar"}
                                    style={{ height: \`\${height}px\` }}
                                    aria-hidden="true"
                                />`;

const newBar = `                                <span
                                    className={[
                                        "bar",
                                        day.marked ? "marked" : "",
                                        periodTone ? \`tone-\${periodTone}\` : "",
                                    ].filter(Boolean).join(" ")}
                                    style={{ height: \`\${height}px\` }}
                                    data-period-tone={periodTone || undefined}
                                    aria-hidden="true"
                                />`;

if (chartSource.includes(oldBar)) {
    chartSource = chartSource.replace(oldBar, newBar);
} else if (!chartSource.includes("data-period-tone={periodTone")) {
    throw new Error("Could not locate the PeriodChart bar markup.");
}

fs.writeFileSync(chartPath, chartSource, "utf8");

console.log("Patched:");
console.log(" - src/pages/SpendingPeriodsPage.jsx");
console.log(" - src/components/PeriodChart.jsx");
console.log("Created:");
console.log(" - src/lib/spendingPeriodTones.js");
console.log(" - src/styles/spending-period-tones.css");