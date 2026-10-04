import type { DataModel, DataPath, Reference } from '../schema/schema-types.ts';

/** Transient semantic input only. The generated DrawIO file is the saved artifact. */
export interface DiagramGroup { id: string; label: string; }
export interface DiagramNode { id: string; kind: string; label: string; group: string; }
export interface DiagramEdge { from: string; to: string; kind: string; label: string; }
export interface DiagramGraph { type: string; groups: DiagramGroup[]; nodes: DiagramNode[]; edges: DiagramEdge[]; }
export interface DiagramEvidenceSource {
  key: string;
  reference: Reference;
  fields: string[];
  /** Include records linked from the already selected source records. */
  linkedFrom?: { source: string; fields: string[]; requireAll?: boolean };
}
export interface DiagramBatchMetadataField {
  field: string;
  required?: boolean;
  source?: string;
  nodeKind?: string;
}
export interface DiagramConfig {
  type: string;
  sources: DiagramEvidenceSource[];
  scope?: { source: string; field: string };
  recordFields?: string[];
  labels?: { id: string; paths: DataPath[]; fallback: string }[];
  batch?: { metadata: DiagramBatchMetadataField[] };
}
export interface DiagramContext { labels: Map<string, string>; prefixes: string[]; evidence: DataModel; }
export interface DiagramBox { x: number; y: number; width: number; height: number; }
export interface DiagramVertex extends DiagramBox { id: string; label: string; style: string; parent?: string; }
export interface DiagramConnector { from: string; to: string; label: string; style: string; points?: { x: number; y: number }[]; }
export interface DiagramLayout { vertices: DiagramVertex[]; edges: DiagramConnector[]; width: number; height: number; }
export interface DiagramType {
  id: string;
  title: string;
  nodeKinds: readonly string[];
  edgeKinds: readonly string[];
  defaultEdge: string;
  contract: string;
  validate(graph: DiagramGraph): void;
  layout(graph: DiagramGraph): DiagramLayout;
}

export const diagramTextStyle = 'html=0;whiteSpace=wrap;fontSize=13;fontColor=#172033;strokeColor=#526077;fillColor=#ffffff;';

export function labelHeight(label: string, width = 200, minimum = 60): number {
  const lineLength = Math.max(12, Math.floor(width / 7));
  const lines = label.split('\n').reduce((sum, line) => sum + Math.max(1, Math.ceil(line.length / lineLength)), 0);
  return Math.max(minimum, lines * 18 + 24);
}
