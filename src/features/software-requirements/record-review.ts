import type { DataModel, DocumentModel, SchemaNode, Field, Section, Repeater, RecordReview, ReviewRecord, ReviewCatalog } from '../../core/schema/schema-types.ts';
import type { SrsRecords } from './record-types.ts';
import { srsRecords } from './record-types.ts';
import { recordItems } from "../../core/schema/data-models.ts";
import { formatRecordDisplayId } from "../../core/records/record-values.ts";
import { requirementReferenceId } from "./requirement-records.ts";

export const present = (value: unknown) => Boolean(String(value ?? "").trim());
export const live = (record: DataModel) => record && !record._retired && !record.retired;
export const idFor = (prefix: string, record: DataModel) => formatRecordDisplayId({ prefix, padding: prefix === "FIG-" ? 4 : 3 }, record);
// Extract IDs from prose without mistaking surrounding words for references.
export const referenceIds = (value: unknown) => [...new Set(String(value || "").toUpperCase().match(/\b(?:SRS-[A-Z]+|FIG)-\d+\b/g) || [])];

export function availableSrsIds(records: SrsRecords) {
  const collections: [string, string, ((item: DataModel) => boolean)?][] = [
    ["actors", "SRS-ACT-", item => item.status !== "Not an actor"],
    ["goals", "SRS-GOL-", item => !["Deferred", "Excluded"].includes(String(item.scopeStatus))],
    ["useCases", "SRS-UC-", item => ["Candidate", "Ready for elaboration", "Needs clarification"].includes(String(item.disposition))],
    ["scopeDecisions", "SRS-SCP-", item => item.status !== "Superseded"],
    ["perspectives", "SRS-VPT-"], ["terms", "SRS-TERM-"], ["audiences", "SRS-AUD-"],
    ["useCaseRelationships", "SRS-REL-"], ["artifacts", "FIG-"], ["evidenceIssues", "SRS-ISS-"]
  ];
  return new Set([
    ...collections.flatMap(([key, prefix, eligible = () => true]) => recordItems(records[key])
      .filter(item => live(item) && eligible(item)).map(item => idFor(prefix, item))),
    ...(records.requirements || []).filter(item => live(item) && !["Deferred", "Rejected"].includes(String(item.status))).map(requirementReferenceId)
  ]);
}

export function missingReferenceMessages(item: DataModel, fields: string[], available: Set<string>) {
  const kinds: Record<string, string[]> = { useCaseReferences: ["SRS-UC-"], externalActorId: ["SRS-ACT-"], relatedRequirementReferences: ["SRS-FR-", "SRS-QR-", "SRS-IR-"] };
  return fields.flatMap(field => referenceIds(item[field]).flatMap(id => {
    if (kinds[field] && !kinds[field].some(prefix => id.startsWith(prefix))) return [`${item.referenceId}: ${id} is the wrong record kind for ${field}; use ${kinds[field].join(" or ")} IDs.`];
    return available.has(id) ? [] : [`${item.referenceId}: ${id} is missing, retired, or not active; review the link.`];
  }));
}
