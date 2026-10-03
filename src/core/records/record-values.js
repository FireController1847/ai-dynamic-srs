export function hasValue(value) {
  if (Array.isArray(value)) {
    return value.some((item) => hasValue(item));
  }

  if (value && typeof value === "object") {
    return Object.entries(value).some(([key, item]) => key !== "id" && hasValue(item));
  }

  return value !== null && value !== undefined && String(value).trim() !== "";
}

export function hasNonDefaultValue(value, defaultValue) {
  return hasValue(value)
    && JSON.stringify(value) !== JSON.stringify(defaultValue);
}

export function displayValue(value, fallback = "Not provided") {
  return hasValue(value) ? value : fallback;
}

export function resolveContextValue(localState, contextState, key) {
  return hasValue(localState?.[key]) ? localState[key] : contextState?.[key];
}

export function nextNumericId(records = []) {
  return Math.max(0, ...records.map((record) => Number(record?.id) || 0)) + 1;
}

export function formatDisplayId(config, index) {
  return config
    ? `${config.prefix}${String(index + 1).padStart(config.padding, "0")}`
    : String(index + 1);
}

export function formatRecordDisplayId(config, record, fallbackIndex = 0) {
  const numericId = Number(record?.id);
  const stableIndex = Number.isFinite(numericId) && numericId > 0 ? numericId - 1 : fallbackIndex;
  return formatDisplayId(config, stableIndex);
}
