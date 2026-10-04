import type { DataModel } from '../schema/schema-types.ts';
import type { DiagramConfig, DiagramGraph } from './diagram-graph.ts';
import { diagramType } from './diagram-types.ts';
import { diagramContext } from './diagram-context.ts';
import { parseDiagramResponse } from './diagram-ir.ts';
import { assertDiagramCollectionLimit, readDiagramArtifact } from './diagram-files.ts';

function xml(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;').replaceAll('\n', '&#10;').replaceAll('\r', '&#13;').replaceAll('\t', '&#9;');
}

export function diagramDrawioXml(graph: DiagramGraph): string {
  const layout = diagramType(graph.type).layout(graph);
  const cellId = (id: string) => `v-${xml(id)}`;
  const vertices = layout.vertices.map(vertex =>
    `<mxCell id="${cellId(vertex.id)}" value="${xml(vertex.label)}" style="${xml(vertex.style)}" vertex="1" parent="${vertex.parent ? cellId(vertex.parent) : '1'}"><mxGeometry x="${vertex.x}" y="${vertex.y}" width="${vertex.width}" height="${vertex.height}" as="geometry"/></mxCell>`);
  const edges = layout.edges.map((edge, i) => {
    const points = edge.points?.length ? `<Array as="points">${edge.points.map(point => `<mxPoint x="${point.x}" y="${point.y}"/>`).join('')}</Array>` : '';
    return `<mxCell id="e-${i}" value="${xml(edge.label)}" style="${xml(edge.style)}" edge="1" parent="1" source="${cellId(edge.from)}" target="${cellId(edge.to)}"><mxGeometry relative="1" as="geometry">${points}</mxGeometry></mxCell>`;
  });
  return `<?xml version="1.0" encoding="UTF-8"?><mxfile host="app.diagrams.net"><diagram id="dsrs-page" name="${xml(diagramType(graph.type).title)}"><mxGraphModel grid="1" gridSize="10" guides="1" connect="1" arrows="1" page="1" pageScale="1" pageWidth="${Math.max(850, layout.width)}" pageHeight="${Math.max(1100, layout.height)}"><root><mxCell id="0"/><mxCell id="1" parent="0"/>${vertices.join('')}${edges.join('')}</root></mxGraphModel></diagram></mxfile>`;
}

/** Use the exact upload reader/validator/shape; no IR is persisted. */
export async function importDiagramResponse(response: string, config: DiagramConfig | undefined, document: DataModel,
  files: DataModel[] = [], replacing: DataModel | null = null): Promise<DataModel> {
  const graph = parseDiagramResponse(response, diagramContext(config, document), config?.type);
  const content = diagramDrawioXml(graph);
  const file = new File([content], `${graph.type}-diagram.drawio`, { type: 'application/xml', lastModified: 0 });
  const payload = await readDiagramArtifact(file);
  assertDiagramCollectionLimit(files, replacing, [payload]);
  return payload;
}
