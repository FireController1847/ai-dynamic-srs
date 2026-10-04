import type { DataModel, DocumentModel, SchemaNode, CopyRequest, NavigationRequest, PrintRequest } from '../core/schema/schema-types.ts';
import { asDataModel, valueAtPath } from '../core/schema/data-models.ts';

// Compare authored content, including shared sections, without watching our own stamps.
export function createDocumentDateTracker(pages: readonly SchemaNode[]) {
  const previous = new Map<string, string | undefined>();
  const serialize = (value: unknown) => JSON.stringify(value, (key, item) => key === '_lastModified' ? undefined : item);
  function fingerprint(page: SchemaNode, sections: DocumentModel) {
    const shared: unknown[] = [];
    function visit(node: SchemaNode) {
      for (const section of node.sections || []) {
        if (section.dataPath) {
          const model = asDataModel(valueAtPath(sections, section.dataPath));
          shared.push(section.repeatable ? model[section.repeatable.dataKey]
            : Object.fromEntries((section.fields || []).map(field => [field.key, model[field.key]])));
        }
      }
      (node.subpages || []).forEach(visit);
    }
    visit(page);
    const dependencies = (page.dateDependencies || []).map(key => sections[key]);
    return serialize([sections[page.stateKey], shared, dependencies]);
  }
  return {
    reset(sections: DocumentModel, fallback: string = new Date().toISOString()) {
      previous.clear();
      for (const page of pages) {
        const model = sections[page.stateKey];
        if (!model) continue;
        model._lastModified ||= fallback;
        previous.set(page.stateKey, fingerprint(page, sections));
      }
    },
    update(sections: DocumentModel) {
      const now = new Date().toISOString();
      for (const page of pages) {
        const current = fingerprint(page, sections);
        if (previous.has(page.stateKey) && previous.get(page.stateKey) !== current) sections[page.stateKey]._lastModified = now;
        previous.set(page.stateKey, current);
      }
    }
  };
}
