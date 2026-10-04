import type { DiagramGraph, DiagramLayout, DiagramType } from './diagram-graph.ts';
import { diagramTextStyle, labelHeight } from './diagram-graph.ts';

function validate(graph: DiagramGraph): void {
  if (graph.groups.length !== 1) throw new Error('A use-case diagram needs exactly one system boundary in g.');
  if (!graph.nodes.some(node => node.kind === 'use-case')) throw new Error('Add at least one use-case node.');
  const nodes = new Map(graph.nodes.map(node => [node.id, node]));
  for (const node of graph.nodes) {
    if (node.kind === 'actor' && node.group) throw new Error(`Actor ${node.id} must be outside the system boundary (omit its group).`);
    if (node.kind === 'use-case' && node.group !== graph.groups[0]?.id) throw new Error(`Use case ${node.id} must reference the system boundary group.`);
  }
  for (const edge of graph.edges) {
    if (edge.from === edge.to) throw new Error('A use-case relationship cannot link a node to itself.');
    const from = nodes.get(edge.from)!;
    const to = nodes.get(edge.to)!;
    if (edge.kind === 'association' && from.kind === to.kind) throw new Error('Associations must connect an actor and a use case.');
    if (['include', 'extend'].includes(edge.kind) && (from.kind !== 'use-case' || to.kind !== 'use-case')) throw new Error(`${edge.kind} must connect two use cases.`);
    if (edge.kind === 'generalization' && from.kind !== to.kind) throw new Error('Generalization must connect two actors or two use cases, from child to parent.');
  }
  for (const kind of ['include', 'generalization']) {
    const visiting = new Set<string>(), visited = new Set<string>();
    function visit(id: string): void {
      if (visiting.has(id)) throw new Error(`The diagram has a ${kind} cycle. Correct the source relationships first.`);
      if (visited.has(id)) return;
      visiting.add(id);
      for (const edge of graph.edges.filter(edge => edge.kind === kind && edge.from === id)) visit(edge.to);
      visiting.delete(id); visited.add(id);
    }
    graph.nodes.forEach(node => visit(node.id));
  }
}

function layout(graph: DiagramGraph): DiagramLayout {
  const cases = graph.nodes.filter(node => node.kind === 'use-case');
  const actors = graph.nodes.filter(node => node.kind === 'actor');
  const columns = Math.min(3, Math.ceil(Math.sqrt(cases.length)));
  const rowHeight = Math.max(...cases.map(node => labelHeight(node.label, 200, 80))) + 55;
  const actorHeight = Math.max(145, ...actors.map(node => labelHeight(node.label, 110) + 100));
  const boundaryHeight = Math.max(130 + Math.ceil(cases.length / columns) * rowHeight, actors.length * actorHeight + 70);
  const boundaryWidth = columns * 260 + 60;
  const group = graph.groups[0]!;
  const vertices: DiagramLayout['vertices'] = [{
    id: group.id, label: group.label, x: 220, y: 30, width: boundaryWidth, height: boundaryHeight,
    style: `${diagramTextStyle}shape=swimlane;startSize=45;horizontal=1;rounded=0;container=1;collapsible=0;fillColor=#f5f8fc;`
  }];
  cases.forEach((node, index) => vertices.push({
    id: node.id, label: node.label, parent: group.id,
    x: 45 + (index % columns) * 260, y: 90 + Math.floor(index / columns) * rowHeight,
    width: 200, height: rowHeight - 55,
    style: `${diagramTextStyle}ellipse;perimeter=ellipsePerimeter;`
  }));
  actors.forEach((node, index) => vertices.push({
    id: node.id, label: node.label, x: 60, y: 95 + index * actorHeight, width: 110, height: 80,
    style: `${diagramTextStyle}shape=umlActor;verticalLabelPosition=bottom;verticalAlign=top;`
  }));
  const edges = graph.edges.map(edge => {
    const relationship = edge.kind === 'include' ? '«include»' : edge.kind === 'extend' ? '«extend»' : '';
    const label = [relationship, edge.label].filter(Boolean).join('\n');
    const arrow = edge.kind === 'association' ? 'endArrow=none;' : edge.kind === 'generalization'
      ? 'endArrow=block;endFill=0;' : 'endArrow=open;endFill=0;dashed=1;';
    return { from: edge.from, to: edge.to, label, style: `${diagramTextStyle}edgeStyle=orthogonalEdgeStyle;rounded=0;${arrow}` };
  });
  return { vertices, edges, width: boundaryWidth + 280, height: boundaryHeight + 90 };
}

export const useCaseDiagram: DiagramType = {
  id: 'use-case', title: 'Use-case map', nodeKinds: ['actor', 'use-case'],
  edgeKinds: ['association', 'include', 'extend', 'generalization'], defaultEdge: 'association',
  contract: 'g contains exactly one system boundary [id,labelOrReference]. Actor nodes stay outside it (omit group); every use-case node names that group. Use saved actor/use-case IDs as labelOrReference. association links an actor and a use case; include goes from including case to mandatory reused case; extend goes from optional case to base; generalization goes from child to parent of the same kind. These edges are not execution order. Preserve established relationship directions; include only supported connections.',
  validate, layout
};
