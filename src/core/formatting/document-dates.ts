import { asDataModel } from "../schema/data-models.ts";
import type { DataModel, SchemaNode } from '../schema/schema-types.ts';
export function localIsoDate(value: Date | string | number = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function documentDate(model: unknown, key: string) {
  const data = asDataModel(model);
  return data[key] || (data._lastModified ? localIsoDate(String(data._lastModified)) : '');
}
