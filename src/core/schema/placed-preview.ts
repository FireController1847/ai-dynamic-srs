import type { DataModel, DocumentModel, DataPath, RecordItem, Field, FieldOption, Section, Repeater, SchemaNode, Condition, DisplayId, Reference, DocumentConfig, OutlineSection, Evidence, EvidenceGroup, EvidenceSource } from './schema-types.ts';
import { documentOutlineIndex } from "./schema-tree.ts";
import { dataModelForSection } from "./data-models.ts";
import { hasNonDefaultValue } from "../records/record-values.ts";
import { referenceChoices, resolveReferenceField } from "../records/reference-fields.ts";
import { sectionRecords } from "./section-records.ts";

function previewValue(field: Field, value: unknown, documentModel: DataModel) {
  if (!field.reference) return value;
  if (field.type === "record-links") {
    const choices = referenceChoices(field.reference, documentModel);
    return String(value || '').split(/[,;]\s*/).filter(Boolean).map(id => choices.find(option => option.value === id)?.label || id).join('; ');
  }
  const resolved = resolveReferenceField(field, documentModel, value);
  return value ? resolved.options?.find((option) => option.value === value)?.label || value : value;
}

// Preserve authored fields; placement changes headings, not the form's content contract.
export function placedPreviewModel(page: SchemaNode, localData: DataModel, documentModel: DataModel, documentConfig: DocumentConfig | null | undefined) {
  const outline = documentOutlineIndex(documentConfig?.outline || []);
  const data = { ...localData };
  const sections = (page.sections || []).map((section, index) => {
    const { dataPath, ...previewSection } = section;
    const model = dataModelForSection(section, localData, documentModel);
    const number = outline.get(section.documentTarget || "")?.number;
    const placement: Section = {
      ...previewSection,
      title: section.previewTitle || section.title,
      numberFields: false,
      documentNumber: section.documentNumber || (number && section.documentSubsection
        ? `${number}.${section.documentSubsection}` : number)
    };
    if (section.repeatable) {
      const dataKey = `previewRecords${index}`;
      data[dataKey] = sectionRecords(section.repeatable, model).filter((record) => (
        section.repeatable!.fields.some((field) => hasNonDefaultValue(record[field.key], field.default))
      )).map((record) => {
        const display = { ...record };
        for (const field of section.repeatable!.fields) {
          display[field.key] = previewValue(field, record[field.key], documentModel);
        }
        return display;
      });
      placement.repeatable = { ...section.repeatable, dataKey };
    } else {
      for (const field of section.fields || []) {
        data[field.key] = previewValue(field, model[field.key], documentModel);
      }
    }
    return placement;
  });
  return {
    data,
    page: { ...page, title: documentConfig?.title || page.title, partialTitle: page.title || page.label, sections }
  };
}
