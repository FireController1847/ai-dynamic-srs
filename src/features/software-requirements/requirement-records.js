import { formatRecordDisplayId } from "../../core/records/record-values.js";

// One collection, one numeric sequence. Kinds preserve the published ID namespaces;
// do not reclassify a record in place, because that would change its reference ID.
const prefixes = Object.freeze({ Functional: "SRS-FR-", Quality: "SRS-QR-", Interface: "SRS-IR-" });

export const requirementDisplayId = kind => ({ prefix: prefixes[kind], padding: 3 });
export const requirementKindField = kind => ({
  key: "requirementKind", type: "text", default: kind,
  hidden: true, editable: false, includeInPrompt: false, includeInPreview: false
});
export const requirementFilter = (kind, group) => ({ all: [
  { key: "requirementKind", equals: kind },
  ...(group ? [{ key: "specificationGroup", equals: group }] : [])
] });
export function requirementReferenceId(record) {
  return formatRecordDisplayId(requirementDisplayId(record.requirementKind || "Functional"), record);
}
