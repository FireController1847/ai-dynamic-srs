import type { DataModel, Field, Section } from '../schema/schema-types.ts';
import { referenceChoices } from '../records/reference-fields.ts';
import { parentRecordGroups } from '../records/parent-records.ts';

export function parentPromptGuidance(section: Section, documentModel: DataModel): string {
  const repeater = section.repeatable;
  const parent = repeater?.parent;
  if (!repeater || !parent) return '';
  const { parents } = parentRecordGroups(repeater, {}, documentModel);
  return `Organize each ${repeater.itemLabel || 'record'} under its ${parent.label}. Available groups: ${parents.map(item => `${item.label} (${item.value})`).join('; ') || 'none recorded'}. ${parent.preserveFreeform ? 'Preserve supported cross-cutting relationships when no single parent is appropriate.' : `The app sets ${parent.fieldKey} under the selected group; name the group once and omit this app-managed input from answers.`} Preserve stable child IDs and saved order. ${parent.allowUngrouped ? 'Supported ungrouped entries are allowed.' : 'Do not guess a missing parent; keep the entry unresolved and identify the required parent separately.'}`;
}

export const responseContract = `## Formatted response contract

This is form preparation, not an interview, review, or change report. Return complete, directly usable answers for the requested scope using the agreed interview information, reliable available project context, supplied current values, and evidence. Do not ask questions, walk the user through decisions, or restart discovery. Do not return only differences or silently omit unchanged editable values.
Use exact section titles, record IDs and field labels. For each requested record, repeat every applicable editable core field with its supported answer, including valid existing answers. For a collection, list all eligible existing records plus every agreed addition in entry order and state the total response count; distinguish existing records from "New record" additions. Never allocate new IDs. A one-record or one-field prompt returns only that target, not neighboring records or fields. For nested collections, state child counts under each parent and repeat the full child structure for every agreed item. A sample template never limits a collection to one item.
Single-line inputs take one plain-text value; narratives use connected paragraphs, distinct items use bullets, and ordered flows use numbered steps. Preserve enough detail for actual entry and verification. Choice inputs take exactly a listed label; reference inputs take exact supported IDs. Number and date fields contain only supported values in their required format. No introductory essay, recommendations, closing recap, wrapping code fence, or methodology.
Read-only, hidden and app-managed values are context, not inputs to reproduce. Apply only the relevant conditional branch; never fill all mutually exclusive branches. Preserve authored values when a branch is hidden. Optional detail may be omitted when unnecessary; a specifically requested optional field should be supplied when supported. Never fabricate an estimate, decision, citation, date, ID or file. Do not use "None", "N/A", or generic no-findings prose as filler.
If an applicable core input cannot be supported, retain its exact field label with an empty answer. After the formatted form, list concise declarative items under "Needs information" naming the record/field and the fact still needed. Do not ask follow-up questions in this response or put uncertainty markers in inputs. Missing information is not non-applicability. If the requested scope has no applicable editable inputs, state that briefly without inventing records or claiming the tab is complete.`;

export const referenceContract = `## Reference rules

Use exact IDs demonstrated by supplied eligible records or current available choices. An ID appearing only in an example, placeholder, or invalid saved link does not establish that its target exists. Never invent, renumber, abbreviate or guess IDs. Keep record types and relationships correct.
A single-record selector takes one available ID. A multiple-record selector or ID-only input takes comma-and-space-separated available IDs only, without names, prose, ranges, links or "none". For supporting-source inputs that accept external locators, use precise supplied document/section/date locators or eligible source IDs, never fabricated citations. For flow/path inputs, preserve the exact supplied use-case ID and recorded path/step labels.
Do not silently repair an invalid saved link. Keep unsupported proposed references blank and list the missing target under Needs information. Reference rationales belong in a supported narrative field, not the selector. Only link relevant evidence.`;

export function referenceGuidance(field: Field, documentModel: DataModel): string {
  const references = field.reference ? [field.reference] : field.references || [];
  if (references.length) {
    const choices = [...new Map(references.flatMap(reference => referenceChoices(reference, documentModel)).map(choice => [choice.value, choice])).values()];
    return `Reference input: ${field.type === 'record-links' ? 'one or more existing IDs, comma-and-space-separated' : 'exactly one existing ID'}, without labels. Available choices: ${choices.length ? choices.map(choice => choice.label).join('; ') : 'none recorded; unsupported links remain blank and the missing target is reported separately'}.`;
  }
  const format = field.referenceFormat || (/^sourceReferences$/.test(field.key) ? 'source-locators'
    : /^flowReferences$/.test(field.key) ? 'paths'
    : /References$|ReferenceIds$/.test(field.key) ? 'ids' : '');
  if (format === 'source-locators') return 'Reference input: exact supplied source IDs or precise supplied external document/section/date locators, no commentary or fabricated citations.';
  if (format === 'paths') return 'Reference input: supplied use-case ID plus its recorded step/path label; separate multiple locators with semicolons.';
  if (format === 'ids') return 'Reference input: existing relevant IDs only, comma-and-space-separated. Unsupported links remain blank; missing targets are reported outside the input.';
  return '';
}
