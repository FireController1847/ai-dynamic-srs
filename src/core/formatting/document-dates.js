export function localIsoDate(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function documentDate(model, key) {
  return model?.[key] || (model?._lastModified ? localIsoDate(model._lastModified) : '');
}
