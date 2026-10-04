import type { DataModel, DocumentModel, DataPath, RecordItem, Field, FieldOption, Section, Repeater, SchemaNode, Condition, DisplayId, Reference, DocumentConfig, OutlineSection, Evidence, EvidenceGroup, EvidenceSource } from './schema-types.ts';
export function schemaNodeIndex(rootNode: SchemaNode | undefined) {
  const index = new Map<string, SchemaNode>();

  function visit(node: SchemaNode | undefined) {
    if (!node || typeof node !== "object") {
      return;
    }

    if (node.id) {
      index.set(node.id, node);
    }

    (node.subpages || []).forEach(visit);
  }

  visit(rootNode);
  return index;
}

export function documentOutlineIndex(outline: OutlineSection[] = []) {
  const index = new Map<string, OutlineSection & { number: string }>();

  function visit(sections: OutlineSection[] | undefined, parentNumber: number[] = []) {
    let numberedPosition = 0;

    for (const section of sections || []) {
      const numbered = section.numbered !== false;
      const numberPath = numbered
        ? [...parentNumber, ++numberedPosition]
        : parentNumber;

      index.set(section.key, {
        ...section,
        number: section.number || (numbered ? numberPath.join(".") : "")
      });

      visit(section.sections, numberPath);
    }
  }

  visit(outline);
  return index;
}
