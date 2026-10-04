import type { DataModel, DocumentModel, SchemaNode, Field, Section, Repeater, RecordReview, ReviewRecord, ReviewCatalog } from '../../core/schema/schema-types.ts';
import type { SrsRecords } from './record-types.ts';
import { srsRecords } from './record-types.ts';
import { formatRecordDisplayId } from "../../core/records/record-values.ts";

// One collection, one numeric sequence. Kinds preserve the published ID namespaces;
// do not reclassify a record in place, because that would change its reference ID.
const prefixes: Readonly<Record<string, string>> = Object.freeze({ Functional: "SRS-FR-", Quality: "SRS-QR-", Interface: "SRS-IR-" });

export const requirementDisplayId = (kind: string) => ({ prefix: prefixes[kind] || "SRS-REQ-", padding: 3 });
export const requirementKindField = (kind: string): Field => ({
  key: "requirementKind", label: "Requirement kind", type: "text", default: kind,
  hidden: true, editable: false, includeInPrompt: false, includeInPreview: false
});
export const requirementFilter = (kind: string, group?: string) => ({ all: [
  { key: "requirementKind", equals: kind },
  ...(group ? [{ key: "specificationGroup", equals: group }] : [])
] });
export function requirementReferenceId(record: DataModel) {
  return formatRecordDisplayId(requirementDisplayId(String(record.requirementKind || "Functional")), record);
}
