const PERIOD_TONES = [
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

function stableToneFromKey(value) {
    const text = String(value ?? "").trim();
    const numericValue = Number(text);

    if (text !== "" && Number.isInteger(numericValue)) {
        return PERIOD_TONES[Math.abs(numericValue) % PERIOD_TONES.length];
    }

    return PERIOD_TONES[stableIndex(text) % PERIOD_TONES.length];
}

export function resolveSpendingPeriodTone(record = {}, fallbackIndex = 0) {
    const periodKey =
        record.period_id
        ?? record.periodId
        ?? record.period?.id;

    /*
     * A period's identity takes priority over a generic API tone.
     * This keeps separate periods visually distinct while allowing
     * charts carrying period_id to resolve the exact same colour.
     */
    if (
        periodKey !== null
        && periodKey !== undefined
        && String(periodKey).trim() !== ""
    ) {
        return stableToneFromKey(periodKey);
    }

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

    const fallbackKey =
        record.key
        ?? record.title
        ?? record.name
        ?? fallbackIndex;

    return stableToneFromKey(fallbackKey);
}
