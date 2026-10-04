import type { DataModel, DataPath, DocumentModel, RecordItem, Section } from './schema-types.ts';

export function isDataModel(value: unknown): value is DataModel {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function asDataModel(value: unknown): DataModel {
  return isDataModel(value) ? value : {};
}

export function recordItems(value: unknown): RecordItem[] {
  return Array.isArray(value) ? value.filter(isDataModel) as RecordItem[] : [];
}

function pathParts(path: DataPath | undefined): readonly string[] {
  return Array.isArray(path) ? path : typeof path === 'string' ? path.split('.').filter(Boolean) : [];
}

export function valueAtPath(source: unknown, path: DataPath | undefined): unknown {
  return pathParts(path).reduce<unknown>((value, key) => isDataModel(value) ? value[key] : undefined, source);
}

export function ensureRecordAtPath(source: unknown, path: DataPath): DataModel | null {
  if (!isDataModel(source)) return null;
  return pathParts(path).reduce<DataModel>((record, key) => {
    if (!isDataModel(record[key])) record[key] = {};
    return record[key] as DataModel;
  }, source);
}

export function dataModelForSection(section: Section, localDataModel: DataModel, documentModel: DocumentModel | DataModel = localDataModel): DataModel {
  return section.dataPath ? ensureRecordAtPath(documentModel, section.dataPath) || {} : localDataModel;
}

/** Mutating controls must keep the canonical array, rather than a filtered display copy. */
export function mutableRecords(model: DataModel, key: string): DataModel[] {
  if (!Array.isArray(model[key])) model[key] = [];
  return model[key] as DataModel[];
}
