import { formatRecordDisplayId, hasNonDefaultValue, hasValue } from "../records/record-values.js";
import { dataModelForSection, valueAtPath } from "../schema/data-models.js";
import { schemaNodeIndex } from "../schema/schema-tree.js";
import { sectionRecords } from "../schema/section-records.js";
import { diagramFileSummary } from "../artifacts/diagram-files.js";

function optionLabel(field, value) {
  const option = (field?.options || []).find((candidate) => (
    (typeof candidate === "object" ? candidate.value : candidate) === value
  ));
  return typeof option === "object" ? option.label : option || value;
}

function markdownValue(field, value) {
  if (field.type === "diagram-file") return diagramFileSummary(value);
  if (Array.isArray(value)) {
    return value.map((item) => optionLabel(field, item)).join(", ");
  }

  return String(optionLabel(field, value)).trim();
}

function fieldFor(section, key) {
  const fields = section?.repeatable?.fields || section?.fields || [];
  return fields.find((field) => field.key === key) || { key, label: key, includeInPrompt: false };
}

function flatGroupMarkdown(section, group, data) {
  const keys = (group.fieldKeys || (section?.fields || []).map(({ key }) => key))
    .filter((key) => fieldFor(section, key).includeInPrompt !== false);
  const hasMeaningfulContent = keys.some((key) => (
    hasNonDefaultValue(data[key], fieldFor(section, key)?.default)
  ));
  if (!hasMeaningfulContent) {
    return "";
  }

  const lines = keys
    .filter((key) => hasValue(data[key]))
    .map((key) => {
      const field = fieldFor(section, key);
      return `- **${field.label}:** ${markdownValue(field, data[key])}`;
    });

  return lines.join("\n");
}

function recordGroupMarkdown(section, group, data) {
  const keys = (group.recordFieldKeys || (section?.repeatable?.fields || []).map(({ key }) => key))
    .filter((key) => fieldFor(section, key).includeInPrompt !== false);
  const records = sectionRecords(section.repeatable, data)
    .filter((record) => keys.some((key) => (
      hasNonDefaultValue(record[key], fieldFor(section, key)?.default)
    )));

  return records.map((record, index) => {
    const recordId = section.repeatable.displayId
      ? formatRecordDisplayId(section.repeatable.displayId, record, index)
      : `${section.repeatable.itemLabel || "Item"} ${index + 1}`;
    const values = keys
      .filter((key) => hasValue(record[key]))
      .map((key) => {
        const field = fieldFor(section, key);
        return `  - **${field.label}:** ${markdownValue(field, record[key])}`;
      });

    return `- **${recordId}**\n${values.join("\n")}`;
  }).join("\n");
}

export function buildEvidenceContext(evidence, documentModel, documentSchemas) {
  const sources = (evidence?.sources || []).map((definition) => {
    const rootPage = documentSchemas.find(({ id }) => id === definition.pageId);
    const page = definition.nodeId
      ? schemaNodeIndex(rootPage).get(definition.nodeId)
      : rootPage;
    if (!rootPage || !page) {
      return "";
    }

    const data = definition.dataPath
      ? valueAtPath(documentModel, definition.dataPath) || {}
      : documentModel[rootPage.stateKey] || {};
    const groups = (definition.groups || []).map((group) => {
      const section = page.sections?.find(({ id }) => id === group.sectionId);
      if (!section) {
        return "";
      }

      const sectionData = dataModelForSection(section, data, documentModel);
      const content = section.repeatable
        ? recordGroupMarkdown(section, group, sectionData)
        : flatGroupMarkdown(section, group, sectionData);
      return content ? `#### ${group.title || section.title}\n\n${content}` : "";
    }).filter(Boolean);

    if (!groups.length) {
      return `### ${page.code} — ${page.title}\n\n_No populated evidence is recorded in the referenced sections._`;
    }

    return `### ${page.code} — ${page.title}\n\n_Source role: ${definition.reason}_\n\n${groups.join("\n\n")}`;
  }).filter(Boolean);

  if (!sources.length) {
    return "";
  }

  return `## Connected workspace evidence\n\nTreat the following as live source context. Preserve its stable IDs, do not ask the user to re-enter it, and call out contradictions instead of silently combining them.\n\n${sources.join("\n\n---\n\n")}`;
}

export function addEvidenceContextToPrompt(markdown, evidence, documentModel, documentSchemas) {
  const interview = markdown.startsWith("# Guided interview:");
  const selectedEvidence = interview && evidence?.interviewSources ? { ...evidence, sources: evidence.interviewSources } : evidence;
  let context = buildEvidenceContext(selectedEvidence, documentModel, documentSchemas);
  if (markdown.startsWith("# Guided interview:")) {
    // Briefing, not a form dump. Full evidence remains in the field prompts.
    const lines = context.split("\n").filter(line => !line.startsWith("_Source role:") && !line.includes("No populated evidence"));
    context = lines.map(line => line.length > 360 ? line.slice(0, 360) + " [excerpt]" : line).join("\n");
    if (context.length > 6000) context = context.slice(0, 6000) + "\n[Evidence excerpt. Omitted material is not evidence of absence; use the relevant field prompt for full context.]";
  }
  const marker = markdown.includes("## Form to complete")
    ? "## Form to complete"
    : "## Sections to interview";

  return context && markdown.includes(marker)
    ? markdown.replace(marker, `${context}\n\n${marker}`)
    : markdown;
}
