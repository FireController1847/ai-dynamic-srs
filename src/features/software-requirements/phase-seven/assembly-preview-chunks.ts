import type { DataModel, SchemaNode, Section } from '../../../core/schema/schema-types.ts';
import { recordItems } from '../../../core/schema/data-models.ts';
import type { AssemblyResult } from './assembly-model.ts';

export interface AssemblyPreviewChunk {
  section: Section;
  entries: DataModel[];
  first: number;
  last: number;
  label: string;
}

export interface AssemblyChunkView {
  page: SchemaNode;
  data: DataModel;
}

// Limit ordinary text records per mounted Vue tree, and render no more than
// one potentially expensive SVG/DrawIO figure at a time.
const MAX_TEXT_ENTRIES = 8;

export function assemblyPreviewChunks(assembly: AssemblyResult): AssemblyPreviewChunk[] {
  const chunks: AssemblyPreviewChunk[] = [];
  for (const section of assembly.page.sections || []) {
    if (!section.repeatable) continue;
    const records = recordItems(assembly.data[section.repeatable.dataKey]);
    let first = 0;
    while (first < records.length) {
      let last = first;
      while (last < records.length && last - first < MAX_TEXT_ENTRIES) {
        const hasFigure = Boolean(records[last].file);
        if (hasFigure && last > first) break;
        last++;
        if (hasFigure) break;
      }
      const number = section.documentNumber ? section.documentNumber + ' ' : '';
      chunks.push({
        section, entries: records.slice(first, last), first, last,
        label: number + section.title
      });
      first = last;
    }
  }
  return chunks;
}

export function assemblyChunkView(assembly: AssemblyResult, chunk: AssemblyPreviewChunk, print = false): AssemblyChunkView {
  const key = chunk.section.repeatable?.dataKey;
  if (!key) throw new Error('The assembled section has no record collection.');
  return {
    page: {
      ...assembly.page,
      id: print ? assembly.page.id + '-print' : assembly.page.id,
      sections: [chunk.section]
    },
    data: { ...assembly.data, [key]: chunk.entries }
  };
}
