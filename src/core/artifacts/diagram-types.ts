import type { DiagramType } from './diagram-graph.ts';
import { useCaseDiagram } from './diagram-use-case.ts';
import { activityDiagram } from './diagram-activity.ts';

/** New types provide semantics and layout here; import, XML and storage stay shared. */
export const diagramTypes: Readonly<Record<string, DiagramType>> = Object.freeze({
  [useCaseDiagram.id]: useCaseDiagram,
  [activityDiagram.id]: activityDiagram
});

export function diagramType(id: string): DiagramType {
  const type = Object.hasOwn(diagramTypes, id) ? diagramTypes[id] : undefined;
  if (!type) throw new Error(`Unsupported diagram type "${id}". Supported types: ${Object.keys(diagramTypes).join(', ')}.`);
  return type;
}
