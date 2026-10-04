import type { Condition, DataModel, Field, FieldOption, SchemaNode, Section } from '../schema/schema-types.ts';
import { asDataModel, recordItems, valueAtPath } from '../schema/data-models.ts';
import { sectionRecords } from '../schema/section-records.ts';
import { fieldVisible } from '../schema/field-visibility.ts';
import { formatRecordDisplayId, hasValue } from '../records/record-values.ts';
import { diagramFileSummary } from '../artifacts/diagram-files.ts';
import { narrativeMarkdown } from '../formatting/markdown.ts';
import { documentDate } from '../formatting/document-dates.ts';
import { referenceGuidance, parentPromptGuidance } from './prompt-contract.ts';

export function sectionPromptModel(section: Section, local: DataModel, documentModel: DataModel): DataModel {
  return section.dataPath ? asDataModel(valueAtPath(documentModel, section.dataPath)) : local;
}

export function promptFields(fields: readonly Field[]): Field[] {
  return fields.filter(field => field.includeInPrompt !== false);
}

export function promptValue(value: unknown): string {
  if (!hasValue(value)) return '[Blank]';
  if (Array.isArray(value)) return value.map(promptValue).join(', ');
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value);
  return '[Unrecognized structured value; preserve at its source]';
}

function optionLabel(option: FieldOption): string {
  return typeof option === 'object' ? option.label : String(option);
}

function conditionText(condition: Condition): string {
  if (condition.all) return condition.all.map(conditionText).join(' and ');
  if (condition.notIn) return `${condition.key} is not ${condition.notIn.map(promptValue).join(' or ')}`;
  if (condition.notEmpty) return `${condition.key} has an answer`;
  return `${condition.key} is ${(condition.in || [condition.equals]).map(promptValue).join(' or ')}`;
}

export function fieldIsContext(field: Field): boolean {
  return field.editable === false || Boolean(field.hidden);
}

export function sectionPromptFields(section: Section): Field[] {
  const repeater = section.repeatable;
  return (repeater?.fields || section.fields || []).map(field => {
    if (repeater?.parent && field.key === repeater.parent.fieldKey && !repeater.parent.preserveFreeform) {
      return { ...field, editable: false };
    }
    return repeater?.completionFields?.includes(field.key) && field.completion !== false
      ? { ...field, completion: true } : field;
  });
}

export function fieldInputContract(field: Field, documentModel: DataModel): string {
  const rules: string[] = [];
  if (fieldIsContext(field)) rules.push('Read-only or app-managed context; never return as an input.');
  else if (field.optional || field.advanced) rules.push('Optional; include only when relevant, supported, and useful.');
  else if (field.completion === true) rules.push('Core input for completion when applicable; supply a supported answer.');
  else if (field.completion === false) rules.push('Supporting input, not a progress requirement; supply supported information when material.');
  else rules.push('Editable input; supply its supported value when applicable.');
  if (field.showWhen) rules.push(`Conditional: active only when ${conditionText(field.showWhen)}. Other branches remain possibilities, not required answers.`);
  const reference = referenceGuidance(field, documentModel);
  if (reference) rules.push(reference);
  if (field.type === 'nested-records') {
    rules.push(`Repeated ${field.itemLabel || 'item'} inputs. Give every agreed item separately, with a count and every applicable child field; do not summarize the collection in one paragraph.${field.minimum ? ` Minimum in the form: ${field.minimum}.` : ''}`);
  } else if (field.type === 'diagram-file') {
    rules.push('File upload, not a text box. Supply no binary, data URL, XML, or invented file content. Use only supplied filename/caption metadata; identify the actual artifact still needed separately.');
  } else if (field.type === 'period-values') {
    rules.push('One numeric value per analysis year, in year order; do not collapse to a total.');
  } else if (field.type === 'select' && !reference) {
    rules.push(`Single choice: exactly one allowed label, without commentary. Choices: ${(field.options || []).map(optionLabel).join('; ')}.`);
  } else if (field.type === 'checkbox-group') {
    rules.push(`Multiple choices: selected labels only. Choices: ${(field.options || []).map(optionLabel).join('; ')}.`);
  } else if (field.type === 'number') {
    rules.push(`Numeric input only, no currency symbol, units, prose, or unsupported estimate.${field.min !== undefined ? ` Minimum: ${field.min}.` : ''}${field.max !== undefined ? ` Maximum: ${field.max}.` : ''}${field.step !== undefined ? ` Step: ${field.step}.` : ''}`);
  } else if (field.type === 'date') {
    rules.push('Date input: YYYY-MM-DD, only when supported.');
  } else if (field.type === 'textarea') {
    rules.push('Narrative input: connected prose for explanations; lists for distinct items or ordered steps. Preserve necessary flow and acceptance detail.');
  } else if (!reference) {
    rules.push(field.type === 'url' ? 'One supplied URL, no invented locator.' : 'Single-line plain text, no bullets or introductory prose.');
  }
  if (field.dateDocument) rules.push(`Date maintained automatically by the app (${documentDate(documentModel[field.dateDocument], '__automaticDate') || 'not recorded'}). Return a manual override only when the user requested one or a saved override exists; otherwise this is automatic context. Do not invent a date.`);
  if (narrativeMarkdown(field)) rules.push('Basic Markdown is supported where useful; no HTML or wrapping code fence.');
  if (field.aiHint) rules.push(field.aiHint);
  return rules.join(' ');
}

export function renderFieldContracts(fields: readonly Field[], documentModel: DataModel, indent = ''): string {
  return promptFields(fields).map(field => {
    const children = fieldIsContext(field) ? (field.fields || []).map(child => ({ ...child, editable: false })) : field.fields || [];
    const childContract = field.type === 'nested-records'
      ? `\n${renderFieldContracts(children, documentModel, `${indent}  `)}` : '';
    return `${indent}- **${field.label}** (${field.key}): ${fieldInputContract(field, documentModel)}${childContract}`;
  }).join('\n');
}

export function renderSectionContract(section: Section, documentModel: DataModel): string {
  const repeater = section.repeatable;
  const group = repeater
    ? `Repeated collection: ${repeater.itemLabel || section.title}. ${repeater.allowAdd === false
      ? 'Use only eligible existing records; additions are made in the source catalog.'
      : 'Include every eligible existing record and every additional entry agreed in the interview, including entries not yet added to the app. Repeat the full child structure for each; a template is not an item count.'}\n${repeater.parent ? parentPromptGuidance(section, documentModel) + '\n' : ''}${repeater.aiAddendum ? `Domain formatting guidance: ${repeater.aiAddendum}\n` : ''}` : '';
  const fields = sectionPromptFields(section);
  return `### ${section.title}\n\n${group}${renderFieldContracts(fields, documentModel)}`;
}

function displayFieldValue(field: Field, value: unknown): string {
  if (field.type === 'diagram-file') return diagramFileSummary(value) || '[No file supplied]';
  const option = field.options?.find(option => (typeof option === 'object' ? option.value : option) === value);
  return option === undefined ? promptValue(value) : optionLabel(option);
}

export function renderFieldValues(fields: readonly Field[], data: DataModel, documentModel: DataModel, periods: number, indent = ''): string {
  return promptFields(fields).map(field => {
    const value = data[field.key];
    const visible = fieldVisible(field, data);
    const status = `${fieldIsContext(field) ? ' [context only]' : ''}${!visible ? ' [inactive branch; saved context only]' : ''}`;
    if (!visible && !hasValue(value)) return `${indent}- **${field.label}${status}:** [No answer for this inactive branch]`;
    if (field.type === 'nested-records') {
      const items = recordItems(value).filter(item => !item._retired && !item.retired);
      const childFields = fieldIsContext(field) || !visible ? (field.fields || []).map(child => ({ ...child, editable: false })) : field.fields || [];
      const children = items.map((item, index) => `${indent}  - ${field.itemLabel || 'Item'} ${index + 1}${hasValue(item.id) ? ` (saved item ID ${promptValue(item.id)})` : ''}:\n${renderFieldValues(childFields, item, documentModel, periods, `${indent}    `)}`).join('\n');
      return `${indent}- **${field.label}${status}:** ${items.length} saved ${items.length === 1 ? 'item' : 'items'}${children ? '\n' + children : '; no saved entries. Use the child contract for agreed additions.'}`;
    }
    if (field.type === 'period-values') {
      const values = Array.isArray(value) ? value : [];
      const years = Array.from({ length: periods }, (_, index) => `${indent}  - Year ${index + 1}: ${promptValue(values[index])}`).join('\n');
      return `${indent}- **${field.label}${status}:**\n${years}`;
    }
    const defaultStatus = hasValue(value) && field.default !== undefined && JSON.stringify(value) === JSON.stringify(field.default)
      ? ' [matches app default; not evidence of user confirmation]' : '';
    return `${indent}- **${field.label}${status}${defaultStatus}:** ${displayFieldValue(field, value).replaceAll('\n', `\n${indent}  `)}`;
  }).join('\n');
}

export function promptPeriodCount(page: SchemaNode, local: DataModel): number {
  const configured = Number(local[page.periodField || 'analysisYears']);
  return Math.min(page.periods?.maximum || 20, Math.max(page.periods?.minimum || 1,
    Number.isFinite(configured) && configured > 0 ? Math.round(configured) : page.periods?.default || 1));
}

export function promptRecordLabel(section: Section, item: DataModel, index = 0): string {
  return section.repeatable?.displayId
    ? formatRecordDisplayId(section.repeatable.displayId, item, index)
    : `${section.repeatable?.itemLabel || 'Item'} ${index + 1}`;
}

export function renderSectionInventory(section: Section, local: DataModel, documentModel: DataModel, periods: number): string {
  const model = sectionPromptModel(section, local, documentModel);
  const fields = sectionPromptFields(section);
  if (!section.repeatable) return `### ${section.title}\n\n${renderFieldValues(fields, model, documentModel, periods)}`;
  const records = sectionRecords(section.repeatable, model);
  const children = records.map((record, index) => `#### ${index + 1}. ${promptRecordLabel(section, record, index)}\n\n${renderFieldValues(fields, record, documentModel, periods)}`).join('\n\n');
  return `### ${section.title}\n\n${records.length} eligible existing ${records.length === 1 ? 'record' : 'records'} in saved order. Blank added records are included.${children ? '\n\n' + children : '\nNo eligible records are saved in this collection. Discover agreed entries using the full child contract; do not invent records to meet a count.'}`;
}
