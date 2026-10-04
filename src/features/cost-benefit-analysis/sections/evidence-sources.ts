import { records, text, optional } from '../../planning/schema-helpers.ts';
export const evidenceSourcesSection = records('evidence-sources', 'Sources', 'Cite each source once, then link estimates to it. Label assumptions honestly.', 'sources', 'CBA-SRC-', 'item', [
  { key: "item", label: "Input or assumption", type: "text", default: "", columns: "col-md-6", aiHint: "Name the model input or assumption supported by this record." },
  { key: "sourceType", label: "Source type", type: "select", default: "", columns: "col-md-3", placeholder: "Select a type", options: ["Client record", "Client interview", "Vendor quote", "Market research", "Internal estimate", "Analyst assumption", "Other"], aiHint: "Classify how the information was obtained." },
  { key: "asOfDate", label: "Period or as-of date", type: "date", default: "", columns: "col-md-3", aiHint: "Record the date represented by the source, not merely the date it was entered." },
  { key: "sourceName", label: "Source name", type: "text", default: "", columns: "col-md-5", aiHint: "Provide the report, interview, vendor, organization, webpage, or document title." },
  { key: "reference", label: "Link or document reference", type: "text", default: "", columns: "col-md-7", placeholder: "https://… or document/section reference", aiHint: "Provide a direct URL when applicable or a precise internal document reference." },
  optional(text('notes', 'Source details or limitations', { placeholder: 'Relevant quoted value and units, method, or limitations only when not clear from the linked estimate.' }))
], { itemLabel: 'Source', addLabel: 'Add source' });
