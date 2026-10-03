function pathParts(path) {
  if (Array.isArray(path)) {
    return path;
  }

  return typeof path === "string" ? path.split(".").filter(Boolean) : [];
}

export function valueAtPath(source, path) {
  return pathParts(path).reduce((value, key) => value?.[key], source);
}

export function ensureRecordAtPath(source, path) {
  if (!source || typeof source !== "object" || Array.isArray(source)) {
    return null;
  }

  return pathParts(path).reduce((record, key) => {
    if (!record[key] || typeof record[key] !== "object" || Array.isArray(record[key])) {
      record[key] = {};
    }

    return record[key];
  }, source);
}

export function dataModelForSection(section, localDataModel, documentModel = localDataModel) {
  if (!section.dataPath) {
    return localDataModel;
  }

  return ensureRecordAtPath(documentModel, section.dataPath) || {};
}
