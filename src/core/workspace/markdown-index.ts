import type { DataModel, Field, Repeater, SchemaNode, Section } from '../schema/schema-types.ts';
import { asDataModel, isDataModel, valueAtPath } from '../schema/data-models.ts';
import { fieldVisible } from '../schema/field-visibility.ts';

export type SavedPath = readonly (string | number)[];
export const pathKey = (path: SavedPath): string => JSON.stringify(path);
export interface MarkdownNode { schema: SchemaNode; path: string[]; sections: MarkdownSection[]; children: MarkdownNode[]; extra: string; }
export interface MarkdownSection { section: Section; node: MarkdownNode; root: string[]; answers: MarkdownAnswer[]; }
export interface MarkdownAnswer { path: SavedPath; field: Field; value: unknown; record?: DataModel; recordPath?: SavedPath; score: number; inactive: boolean; }
export interface MarkdownRecordHome { job: MarkdownSection; record: DataModel; path: SavedPath; repeater: Repeater; }

function sectionRoot(section: Section, local: string[]): string[] {
  const path = section.dataPath;
  return path === undefined ? local : typeof path === 'string' ? path.split('.').filter(Boolean) : [...path];
}

/** Index actual saved locations, never copied previews or evidence panels. */
export function markdownIndex(pages: readonly SchemaNode[], document: DataModel) {
  const owners = new Map<string, { job: MarkdownSection; answer: MarkdownAnswer }>();
  const homes = new Map<string, MarkdownRecordHome>();
  const jobs: MarkdownSection[] = [];
  function register(job: MarkdownSection, field: Field, model: DataModel, parent: SavedPath, record?: DataModel, eligible = true): void {
    const path = [...parent, field.key];
    const inactive = !fieldVisible(field, model);
    const answer = { path, field, value: model[field.key], record, recordPath: record ? parent : undefined,
      score: (eligible ? 100 : 0) + (field.editable !== false ? 10 : 0) + (!field.hidden ? 2 : 0) + (!inactive ? 1 : 0), inactive: inactive || !eligible };
    const key = pathKey(path), previous = owners.get(key);
    if (!previous || answer.score > previous.answer.score) owners.set(key, { job, answer });
  }
  function visit(schema: SchemaNode, parent: string[]): MarkdownNode {
    const path = [...parent, schema.stateKey];
    const node: MarkdownNode = { schema, path, sections: [], children: [], extra: '' };
    for (const section of schema.sections || []) {
      const root = sectionRoot(section, path);
      const model = asDataModel(valueAtPath(document, root));
      const job: MarkdownSection = { section, node, root, answers: [] };
      jobs.push(job); node.sections.push(job);
      const repeater = section.repeatable;
      if (repeater) {
        const collection = model[repeater.dataKey];
        if (!Array.isArray(collection)) continue;
        collection.forEach((record: unknown, index: number) => {
          if (!isDataModel(record)) return;
          const recordPath = [...root, repeater.dataKey, index];
          const eligible = !repeater.recordFilter || fieldVisible({ showWhen: repeater.recordFilter }, record);
          const key = pathKey(recordPath);
          const home = homes.get(key);
          if (!home || (eligible && home.repeater.recordFilter && !fieldVisible({ showWhen: home.repeater.recordFilter }, record))) homes.set(key, { job, record, path: recordPath, repeater });
          for (const field of repeater.fields) register(job, field, record, recordPath, record, eligible);
        });
      } else for (const field of section.fields || []) register(job, field, model, root);
    }
    node.children = (schema.subpages || []).map(child => visit(child, path));
    return node;
  }
  const nodes = pages.map(page => visit(page, []));
  owners.forEach(({ job, answer }) => job.answers.push(answer));
  // Registration order follows navigation and field order; reassigned owners still need their own form order.
  for (const job of jobs) {
    const fields = job.section.repeatable?.fields || job.section.fields || [];
    job.answers.sort((a, b) => {
      const ai = Number(a.recordPath?.at(-1) ?? -1), bi = Number(b.recordPath?.at(-1) ?? -1);
      return ai - bi || fields.findIndex(field => field.key === a.field.key) - fields.findIndex(field => field.key === b.field.key);
    });
  }
  return { nodes, homes, jobs };
}
