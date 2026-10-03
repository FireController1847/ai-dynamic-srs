import { referenceChoices } from "../records/reference-fields.js";
import { parentRecordGroups } from "../records/parent-records.js";

export function parentPromptGuidance(section, documentModel) {
  const parent = section.repeatable?.parent;
  if (!parent) return "";
  const { parents } = parentRecordGroups(section.repeatable, {}, documentModel);
  return `Group ${section.repeatable.itemLabel.toLowerCase()} updates under their ${parent.label.toLowerCase()}. The UI sets ${parent.fieldKey} when adding under that group; do not ask the user to type it or repeat it in each answer. Refer to the group once by name and ID. Available groups: ${parents.map(item => `${item.label} (${item.value})`).join("; ") || "none established; identify the missing parent before creating linked records"}.${parent.allowUngrouped ? " Ungrouped records are allowed when their boundary or cross-cutting scope is supported; do not invent a parent." : " Preserve unresolved links for explicit reassignment, not guessed repair."}${parent.preserveFreeform ? " For cross-cutting records only, preserve or clarify their existing multi-record/free-text relationship rather than forcing one parent." : ""}`;
}

export function tabBrief(page) {
  return `## Current task: ${page.title || page.label}\n\n${page.ai?.task || page.description || page.form?.intro || page.label}\n\nReuse earlier answers. Reopen them only for a concrete gap or contradiction affecting this task. Use reliable context already in this conversation, but do not assume access to workspace files, another chat, or unstated memory. Ask for missing evidence rather than reconstructing it.`;
}

export const responseContract = `Return concise, directly usable field updates in the format appropriate to each input. Use short, connected paragraphs for explanations, context, assessments and decision reasoning. Use bullets for distinct items and numbered lists for ordered steps. Concision means removing filler, not turning every sentence into a bullet. Single-line inputs take a short plain-text value. For every repeatable group, state the item count and number the entries in the agreed inventory order, including counts for children under each parent. This inventory formatting organizes records; it does not require lists inside each record’s narrative fields. Use the fewest words that preserve the decision or requirement; preserve the necessary detail in numbered flows, contracts, and acceptance criteria. No introductory essay, closing recap, repeated methodology, or generic recommendations.
Return only fields that need a new answer or correction, using their exact section headings, record IDs, and field labels. Omit unchanged and read-only fields. Preserve valid existing answers; omission means unchanged, not deletion. Do not allocate IDs to proposed new records: label them "New record" for the application to assign.
Omit optional fields by default, including fields inside optional expandable panels. Fill one only when essential to correctness, resolving a material ambiguity, or recording an explicit user request—not merely because information is available. Do not ask questions just to populate optional fields or explain why you omitted them. Keep necessary constraints, exceptions, and acceptance criteria. Do not insert "None", "N/A", "No additional requirements found", or similar filler. For choice dropdowns, return exactly one allowed choice, without explanation in the field. For multi-select checkboxes, return only the selected choices. Optional expandable panels are not choice dropdowns. Record a brief non-applicability reason only when a real boundary decision needs justification. Never confuse missing evidence with non-applicability.
For a necessary answer that cannot be supported, ask a concise question outside the form under "Questions to resolve". Never put uncertainty markers or questions in numeric, date, choice, or reference fields. If there are no updates or questions, reply only "Ready to continue."`;

export const referenceContract = `## Reference rules

Use exact IDs demonstrated by supplied records or the current tab's available choices. An ID appearing only in an example, placeholder, or an unverified existing link is not evidence that its target exists. Never invent, renumber, abbreviate, or guess an ID. Keep record types and relationships correct.
For ID-only fields, return IDs only, separated by comma and space; no labels, explanations, URLs, ranges, Markdown links, or "none". A single-record selector takes exactly one available ID; a multiple-record selector takes comma-separated available IDs. Put the reason for the link in a rationale/findings field, not in the reference input.
For supporting-source fields that explicitly accept external locators, use an existing record ID or a precise supplied document/section/date locator. Never fabricate a citation. For flow/path references, include the exact use-case ID and the recorded step/path label; do not invent path labels.
When a needed reference is unavailable, leave the proposed reference blank and identify the missing target in Questions to resolve. Flag an invalid saved reference as a correction; do not silently replace it with a plausible ID. Only cite relevant evidence, not every supplied record.`;

export function referenceGuidance(field, documentModel) {
  if (field.reference) {
    const options = referenceChoices(field.reference, documentModel);
    return `Reference input: ${field.type === "record-links" ? "one or more existing IDs, comma-separated" : "exactly one existing ID"}, without labels. Available records: ${options.length ? options.map(option => option.label).join("; ") : "none supplied; ask for the missing record instead of inventing one"}.`;
  }
  const format = field.referenceFormat || (/^sourceReferences$/.test(field.key) ? "source-locators"
    : /^flowReferences$/.test(field.key) ? "paths"
    : /References$|ReferenceIds$/.test(field.key) ? "ids" : "");
  if (format === "source-locators") return "Reference input: exact supplied source IDs or precise supplied external document/section/date locators; no commentary or invented citations.";
  if (format === "paths") return "Reference input: existing use-case ID plus its recorded step/path label; separate multiple locators with semicolons.";
  if (format === "ids") return "Reference input: existing relevant IDs only, separated by comma and space. Leave blank if no supported link; place any explanation or missing-target question outside this field.";
  return "";
}
