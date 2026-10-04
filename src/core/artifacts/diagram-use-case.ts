import type {
  DiagramEdge,
  DiagramGraph,
  DiagramLayout,
  DiagramNode,
  DiagramType
} from './diagram-graph.ts';
import { diagramTextStyle, labelHeight } from './diagram-graph.ts';

const CASE_WIDTH = 220;
const CASE_COLUMN_GAP = 100;
const CASE_ROW_GAP = 80;
const BOUNDARY_TITLE_HEIGHT = 58;
const BOUNDARY_PADDING_X = 60;
const BOUNDARY_PADDING_BOTTOM = 55;
const ACTOR_WIDTH = 120;
const ACTOR_GAP = 48;
const BOUNDARY_SIDE_GAP = 120;
const PAGE_MARGIN = 40;

interface CasePlacement {
  node: DiagramNode;
  row: number;
  col: number;
  x: number;
  y: number;
  width: number;
  height: number;
  absoluteX: number;
  absoluteY: number;
}

interface ActorPlacement {
  node: DiagramNode;
  side: 'left' | 'right';
  x: number;
  y: number;
  width: number;
  height: number;
}

function validate(graph: DiagramGraph): void {
  if (graph.groups.length !== 1) throw new Error('A Use-Case Diagram needs exactly one system boundary in g.');
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

function actorCaseConnections(graph: DiagramGraph) {
  const nodes = new Map(graph.nodes.map(node => [node.id, node]));
  const byActor = new Map<string, string[]>();
  const byCase = new Map<string, string[]>();
  for (const edge of graph.edges.filter(edge => edge.kind === 'association')) {
    const from = nodes.get(edge.from)!;
    const to = nodes.get(edge.to)!;
    const actor = from.kind === 'actor' ? from : to;
    const useCase = from.kind === 'use-case' ? from : to;
    if (actor.kind !== 'actor' || useCase.kind !== 'use-case') continue;
    byActor.set(actor.id, [...(byActor.get(actor.id) || []), useCase.id]);
    byCase.set(useCase.id, [...(byCase.get(useCase.id) || []), actor.id]);
  }
  return { byActor, byCase };
}

function relationshipComponents(cases: DiagramNode[], relationships: DiagramEdge[]) {
  const caseIds = new Set(cases.map(node => node.id));
  const adjacency = new Map(cases.map(node => [node.id, new Set<string>()]));
  for (const edge of relationships) {
    if (!caseIds.has(edge.from) || !caseIds.has(edge.to)) continue;
    adjacency.get(edge.from)!.add(edge.to);
    adjacency.get(edge.to)!.add(edge.from);
  }

  const visited = new Set<string>();
  const components: string[][] = [];
  for (const node of cases) {
    if (visited.has(node.id)) continue;
    const component: string[] = [];
    const queue = [node.id];
    visited.add(node.id);
    while (queue.length) {
      const id = queue.shift()!;
      component.push(id);
      for (const neighbor of adjacency.get(id) || []) {
        if (visited.has(neighbor)) continue;
        visited.add(neighbor);
        queue.push(neighbor);
      }
    }
    components.push(component);
  }
  return components;
}

function relationshipOrder(component: string[], relationships: DiagramEdge[], originalOrder: Map<string, number>) {
  if (component.length < 2) return component;
  const inComponent = new Set(component);
  const generalizations = relationships.filter(edge =>
    edge.kind === 'generalization' && inComponent.has(edge.from) && inComponent.has(edge.to));
  if (component.length === 2 && generalizations.length) {
    return [generalizations[0]!.from, generalizations[0]!.to];
  }

  const adjacency = new Map(component.map(id => [id, new Set<string>()]));
  for (const edge of relationships) {
    if (!inComponent.has(edge.from) || !inComponent.has(edge.to)) continue;
    adjacency.get(edge.from)!.add(edge.to);
    adjacency.get(edge.to)!.add(edge.from);
  }
  const ordered: string[] = [];
  const visited = new Set<string>();
  const starts = [...component].sort((left, right) =>
    (adjacency.get(right)?.size || 0) - (adjacency.get(left)?.size || 0)
    || (originalOrder.get(left) || 0) - (originalOrder.get(right) || 0));
  for (const start of starts) {
    if (visited.has(start)) continue;
    const queue = [start];
    visited.add(start);
    while (queue.length) {
      const id = queue.shift()!;
      ordered.push(id);
      const neighbors = [...(adjacency.get(id) || [])].sort((left, right) => {
        const pairLeft = generalizations.some(edge => edge.from === id && edge.to === left) ? -1 : 0;
        const pairRight = generalizations.some(edge => edge.from === id && edge.to === right) ? -1 : 0;
        return pairLeft - pairRight || (originalOrder.get(left) || 0) - (originalOrder.get(right) || 0);
      });
      for (const neighbor of neighbors) {
        if (visited.has(neighbor)) continue;
        visited.add(neighbor);
        queue.push(neighbor);
      }
    }
  }
  return ordered;
}

function dynamicColumns(caseCount: number) {
  return Math.max(2, Math.min(5, Math.ceil(Math.sqrt(Math.max(1, caseCount)))));
}

function caseGrid(
  cases: DiagramNode[],
  relationships: DiagramEdge[],
  byCase: Map<string, string[]>,
  actorRank: Map<string, number>
) {
  const originalOrder = new Map(cases.map((node, index) => [node.id, index]));
  const caseById = new Map(cases.map(node => [node.id, node]));
  const components = relationshipComponents(cases, relationships).map(component => {
    const ordered = relationshipOrder(component, relationships, originalOrder);
    const actors = ordered.flatMap(id => byCase.get(id) || []);
    const anchor = actors.length
      ? actors.reduce((best, id) => (actorRank.get(id) || 0) < (actorRank.get(best) || Number.MAX_SAFE_INTEGER) ? id : best, actors[0]!)
      : '';
    const score = anchor ? actorRank.get(anchor) || 0 : Number.MAX_SAFE_INTEGER;
    return { ids: ordered, score, original: Math.min(...ordered.map(id => originalOrder.get(id) || 0)) };
  }).sort((left, right) => left.score - right.score || left.original - right.original);

  const columns = dynamicColumns(cases.length);
  const positions = new Map<string, { row: number; col: number }>();
  let cursorRow = 0;
  let cursorCol = 0;

  for (const component of components) {
    const blockColumns = component.ids.length === 1 ? 1 : Math.min(columns, Math.max(2, Math.ceil(Math.sqrt(component.ids.length))));
    const blockRows = Math.ceil(component.ids.length / blockColumns);
    if (cursorCol + blockColumns > columns) {
      cursorRow += 1;
      cursorCol = 0;
    }
    component.ids.forEach((id, index) => {
      positions.set(id, {
        row: cursorRow + Math.floor(index / blockColumns),
        col: cursorCol + (index % blockColumns)
      });
    });
    cursorCol += blockColumns;
    if (blockRows > 1) {
      cursorRow += blockRows - 1;
      cursorCol = 0;
      cursorRow += 1;
    } else if (cursorCol >= columns) {
      cursorRow += 1;
      cursorCol = 0;
    }
  }

  const maxRow = Math.max(0, ...positions.values().map(position => position.row));
  return { positions, columns, rows: maxRow + 1, caseById };
}

function median(values: number[]) {
  if (!values.length) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle]! : (sorted[middle - 1]! + sorted[middle]!) / 2;
}

function assignActorSides(
  actors: DiagramNode[],
  casePlacements: Map<string, CasePlacement>,
  byActor: Map<string, string[]>,
  columns: number
) {
  const degree = (actor: DiagramNode) => byActor.get(actor.id)?.length || 0;
  const ordered = [...actors].sort((left, right) =>
    degree(right) - degree(left) || left.label.localeCompare(right.label) || left.id.localeCompare(right.id));
  const side = new Map<string, 'left' | 'right'>();
  if (!ordered.length) return { side, ordered };

  side.set(ordered[0]!.id, 'left');
  let leftLoad = Math.max(1, degree(ordered[0]!));
  let rightLoad = 0;
  for (const actor of ordered.slice(1)) {
    const connected = (byActor.get(actor.id) || []).map(id => casePlacements.get(id)).filter(Boolean) as CasePlacement[];
    const averageColumn = connected.length
      ? connected.reduce((sum, item) => sum + item.col, 0) / connected.length
      : (columns - 1) / 2;
    const preferred: 'left' | 'right' = averageColumn < (columns - 1) / 2 ? 'left' : 'right';
    const actorLoad = Math.max(1, degree(actor));
    const overloaded = preferred === 'left' ? leftLoad > rightLoad + actorLoad * 1.5 : rightLoad > leftLoad + actorLoad * 1.5;
    const selected = overloaded ? (preferred === 'left' ? 'right' : 'left') : preferred;
    side.set(actor.id, selected);
    if (selected === 'left') leftLoad += actorLoad;
    else rightLoad += actorLoad;
  }

  if (ordered.length > 1 && !ordered.some(actor => side.get(actor.id) === 'right')) {
    side.set(ordered.at(-1)!.id, 'right');
  }
  return { side, ordered };
}

function placeActors(
  actors: DiagramNode[],
  side: 'left' | 'right',
  x: number,
  boundaryY: number,
  boundaryHeight: number,
  actorHeight: number,
  byActor: Map<string, string[]>,
  casePlacements: Map<string, CasePlacement>
): ActorPlacement[] {
  const minY = boundaryY + BOUNDARY_TITLE_HEIGHT + 20;
  const maxY = boundaryY + boundaryHeight - actorHeight - 20;
  const desired = actors.map(node => {
    const centers = (byActor.get(node.id) || [])
      .map(id => casePlacements.get(id))
      .filter(Boolean)
      .map(item => item!.absoluteY + item!.height / 2);
    return { node, y: (centers.length ? median(centers) : boundaryY + boundaryHeight / 2) - actorHeight / 2 };
  }).sort((left, right) => left.y - right.y || left.node.id.localeCompare(right.node.id));

  const spacing = actorHeight + ACTOR_GAP;
  const placed = desired.map((item, index) => ({
    ...item,
    y: Math.max(item.y, minY + index * spacing)
  }));
  if (placed.length) {
    const overflow = placed.at(-1)!.y - maxY;
    if (overflow > 0) placed.forEach(item => { item.y -= overflow; });
    for (let index = placed.length - 2; index >= 0; index -= 1) {
      placed[index]!.y = Math.min(placed[index]!.y, placed[index + 1]!.y - spacing);
    }
    const underflow = minY - placed[0]!.y;
    if (underflow > 0) placed.forEach(item => { item.y += underflow; });
  }

  return placed.map(item => ({
    node: item.node, side, x, y: item.y, width: ACTOR_WIDTH, height: actorHeight
  }));
}

function centerX(box: { x: number; width: number }) { return box.x + box.width / 2; }
function centerY(box: { y: number; height: number }) { return box.y + box.height / 2; }

function associationRoute(
  edge: DiagramEdge,
  actor: ActorPlacement,
  useCase: CasePlacement,
  boundaryX: number,
  boundaryWidth: number,
  sideIndex: number
) {
  const left = actor.side === 'left';
  const outsideX = left ? boundaryX - 34 - sideIndex * 8 : boundaryX + boundaryWidth + 34 + sideIndex * 8;
  const targetX = left ? useCase.absoluteX - 22 : useCase.absoluteX + useCase.width + 22;
  const rowCorridorY = useCase.absoluteY + useCase.height + Math.min(34, CASE_ROW_GAP / 2);
  const fromActor = edge.from === actor.node.id;
  const pointsActorToCase = [
    { x: outsideX, y: centerY(actor) },
    { x: outsideX, y: rowCorridorY },
    { x: targetX, y: rowCorridorY },
    { x: targetX, y: centerY(useCase) }
  ];
  const points = fromActor ? pointsActorToCase : [...pointsActorToCase].reverse();
  const actorExit = left ? '1' : '0';
  const caseEntry = left ? '0' : '1';
  const anchors = fromActor
    ? `exitX=${actorExit};exitY=0.5;entryX=${caseEntry};entryY=0.5;`
    : `exitX=${caseEntry};exitY=0.5;entryX=${actorExit};entryY=0.5;`;
  return { points, anchors };
}

function relationshipRoute(from: CasePlacement, to: CasePlacement) {
  if (from.row === to.row) {
    const leftToRight = from.col < to.col;
    return {
      points: undefined,
      anchors: `exitX=${leftToRight ? 1 : 0};exitY=0.5;entryX=${leftToRight ? 0 : 1};entryY=0.5;`
    };
  }
  if (from.col === to.col) {
    const downward = from.row < to.row;
    return {
      points: undefined,
      anchors: `exitX=0.5;exitY=${downward ? 1 : 0};entryX=0.5;entryY=${downward ? 0 : 1};`
    };
  }

  const rightward = from.col < to.col;
  const corridorX = rightward
    ? from.absoluteX + from.width + CASE_COLUMN_GAP / 2
    : from.absoluteX - CASE_COLUMN_GAP / 2;
  return {
    points: [
      { x: corridorX, y: centerY(from) },
      { x: corridorX, y: centerY(to) }
    ],
    anchors: `exitX=${rightward ? 1 : 0};exitY=0.5;entryX=${rightward ? 0 : 1};entryY=0.5;`
  };
}

function layout(graph: DiagramGraph): DiagramLayout {
  const cases = graph.nodes.filter(node => node.kind === 'use-case');
  const actors = graph.nodes.filter(node => node.kind === 'actor');
  const relationships = graph.edges.filter(edge => edge.kind !== 'association');
  const { byActor, byCase } = actorCaseConnections(graph);
  const actorDegreeOrder = [...actors].sort((left, right) =>
    (byActor.get(right.id)?.length || 0) - (byActor.get(left.id)?.length || 0)
    || left.id.localeCompare(right.id));
  const actorRank = new Map(actorDegreeOrder.map((actor, index) => [actor.id, index]));
  const grid = caseGrid(cases, relationships, byCase, actorRank);

  const caseHeight = Math.max(70, ...cases.map(node => labelHeight(node.label, CASE_WIDTH, 70)));
  const actorHeight = Math.max(100, ...actors.map(node => labelHeight(node.label, ACTOR_WIDTH, 60) + 42));
  const boundaryX = PAGE_MARGIN + ACTOR_WIDTH + BOUNDARY_SIDE_GAP;
  const boundaryY = PAGE_MARGIN;
  const boundaryWidth = BOUNDARY_PADDING_X * 2
    + grid.columns * CASE_WIDTH
    + Math.max(0, grid.columns - 1) * CASE_COLUMN_GAP;
  const caseBodyHeight = grid.rows * caseHeight + Math.max(0, grid.rows - 1) * CASE_ROW_GAP;
  const baseBoundaryHeight = BOUNDARY_TITLE_HEIGHT + 45 + caseBodyHeight + BOUNDARY_PADDING_BOTTOM;
  const maxActorsPerSide = Math.max(1, Math.ceil(actors.length / 2));
  const actorRequiredHeight = BOUNDARY_TITLE_HEIGHT + 40
    + maxActorsPerSide * actorHeight
    + Math.max(0, maxActorsPerSide - 1) * ACTOR_GAP
    + 40;
  const boundaryHeight = Math.max(240, baseBoundaryHeight, actorRequiredHeight);
  const caseTop = BOUNDARY_TITLE_HEIGHT + 30 + Math.max(0, (boundaryHeight - baseBoundaryHeight) / 2);

  const casePlacements = new Map<string, CasePlacement>();
  for (const node of cases) {
    const slot = grid.positions.get(node.id)!;
    const x = BOUNDARY_PADDING_X + slot.col * (CASE_WIDTH + CASE_COLUMN_GAP);
    const y = caseTop + slot.row * (caseHeight + CASE_ROW_GAP);
    casePlacements.set(node.id, {
      node, row: slot.row, col: slot.col, x, y,
      width: CASE_WIDTH, height: caseHeight,
      absoluteX: boundaryX + x, absoluteY: boundaryY + y
    });
  }

  const sides = assignActorSides(actors, casePlacements, byActor, grid.columns);
  const leftActors = sides.ordered.filter(actor => sides.side.get(actor.id) === 'left');
  const rightActors = sides.ordered.filter(actor => sides.side.get(actor.id) === 'right');
  const left = placeActors(leftActors, 'left', PAGE_MARGIN, boundaryY, boundaryHeight, actorHeight, byActor, casePlacements);
  const rightX = boundaryX + boundaryWidth + BOUNDARY_SIDE_GAP;
  const right = placeActors(rightActors, 'right', rightX, boundaryY, boundaryHeight, actorHeight, byActor, casePlacements);
  const actorPlacements = new Map([...left, ...right].map(item => [item.node.id, item]));

  const group = graph.groups[0]!;
  const vertices: DiagramLayout['vertices'] = [{
    id: group.id, label: group.label, x: boundaryX, y: boundaryY, width: boundaryWidth, height: boundaryHeight,
    style: `${diagramTextStyle}shape=swimlane;startSize=${BOUNDARY_TITLE_HEIGHT};horizontal=1;rounded=0;container=1;collapsible=0;fillColor=#f5f8fc;fontStyle=1;`
  }];

  for (const placement of casePlacements.values()) {
    vertices.push({
      id: placement.node.id, label: placement.node.label, parent: group.id,
      x: placement.x, y: placement.y, width: placement.width, height: placement.height,
      style: `${diagramTextStyle}ellipse;perimeter=ellipsePerimeter;spacing=10;`
    });
  }
  for (const placement of [...left, ...right]) {
    vertices.push({
      id: placement.node.id, label: placement.node.label,
      x: placement.x, y: placement.y, width: placement.width, height: placement.height,
      style: `${diagramTextStyle}shape=umlActor;verticalLabelPosition=bottom;verticalAlign=top;spacingTop=4;`
    });
  }

  const sideOrder = new Map<string, number>();
  left.forEach((actor, index) => sideOrder.set(actor.node.id, index));
  right.forEach((actor, index) => sideOrder.set(actor.node.id, index));
  const nodes = new Map(graph.nodes.map(node => [node.id, node]));
  const edges = graph.edges.map(edge => {
    const relationship = edge.kind === 'include' ? '«include»' : edge.kind === 'extend' ? '«extend»' : '';
    const label = [relationship, edge.label].filter(Boolean).join('\n');
    const arrow = edge.kind === 'association' ? 'endArrow=none;' : edge.kind === 'generalization'
      ? 'endArrow=block;endFill=0;' : 'endArrow=open;endFill=0;dashed=1;';
    const baseStyle = `${diagramTextStyle}edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;labelBackgroundColor=#ffffff;${arrow}`;
    const fromNode = nodes.get(edge.from)!;
    const toNode = nodes.get(edge.to)!;

    if (edge.kind === 'association') {
      const actorNode = fromNode.kind === 'actor' ? fromNode : toNode;
      const caseNode = fromNode.kind === 'use-case' ? fromNode : toNode;
      const actor = actorPlacements.get(actorNode.id)!;
      const useCase = casePlacements.get(caseNode.id)!;
      const route = associationRoute(edge, actor, useCase, boundaryX, boundaryWidth, sideOrder.get(actor.node.id) || 0);
      return { from: edge.from, to: edge.to, label, points: route.points, style: `${baseStyle}${route.anchors}` };
    }

    if (fromNode.kind === 'use-case' && toNode.kind === 'use-case') {
      const route = relationshipRoute(casePlacements.get(edge.from)!, casePlacements.get(edge.to)!);
      return { from: edge.from, to: edge.to, label, points: route.points, style: `${baseStyle}${route.anchors}` };
    }

    return { from: edge.from, to: edge.to, label, style: baseStyle };
  });

  const rightmost = right.length ? Math.max(...right.map(actor => actor.x + actor.width)) : boundaryX + boundaryWidth;
  const bottom = Math.max(
    boundaryY + boundaryHeight,
    ...[...left, ...right].map(actor => actor.y + actor.height)
  );
  return {
    vertices,
    edges,
    width: rightmost + PAGE_MARGIN,
    height: bottom + PAGE_MARGIN
  };
}

export const useCaseDiagram: DiagramType = {
  id: 'use-case', title: 'Use-Case Diagram', nodeKinds: ['actor', 'use-case'],
  edgeKinds: ['association', 'include', 'extend', 'generalization'], defaultEdge: 'association',
  contract: 'g contains exactly one system boundary [id,labelOrReference]. Actor nodes stay outside it (omit group); every use-case node names that group. Use saved actor/use-case IDs as labelOrReference. association links an actor and a use case; include goes from including case to mandatory reused case; extend goes from optional case to base; generalization goes from child to parent of the same kind. These edges are not execution order. Preserve established relationship directions; include only supported connections.',
  validate, layout
};
