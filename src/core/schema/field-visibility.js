export function fieldVisible(field, source) {
  if (!field.showWhen) {
    return true;
  }

  const matches = (condition) => {
    const actual = source[condition.key];
    if (Array.isArray(condition.notIn)) return !condition.notIn.includes(actual);
    if (condition.notEmpty) return actual !== undefined && actual !== null && String(actual).trim() !== "";
    return Array.isArray(condition.in)
      ? condition.in.includes(actual)
      : actual === condition.equals;
  };

  return Array.isArray(field.showWhen.all)
    ? field.showWhen.all.every(matches)
    : matches(field.showWhen);
}
