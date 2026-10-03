import { valueAtPath } from '../core/schema/data-models.js';

// Compare authored content, including shared sections, without watching our own stamps.
export function createDocumentDateTracker(pages) {
  const previous = new Map();
  const serialize = value => JSON.stringify(value, (key, item) => key === '_lastModified' ? undefined : item);
  function fingerprint(page, sections) {
    const shared = [];
    function visit(node) {
      for (const section of node.sections || []) {
        if (section.dataPath) {
          const model = valueAtPath(sections, section.dataPath) || {};
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
    reset(sections, fallback = new Date().toISOString()) {
      previous.clear();
      for (const page of pages) {
        const model = sections[page.stateKey];
        if (!model) continue;
        model._lastModified ||= fallback;
        previous.set(page.stateKey, fingerprint(page, sections));
      }
    },
    update(sections) {
      const now = new Date().toISOString();
      for (const page of pages) {
        const current = fingerprint(page, sections);
        if (previous.has(page.stateKey) && previous.get(page.stateKey) !== current) sections[page.stateKey]._lastModified = now;
        previous.set(page.stateKey, current);
      }
    }
  };
}
