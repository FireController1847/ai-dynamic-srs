import type { DiagramGraph, DiagramLayout, DiagramType } from './diagram-graph.ts';
import { diagramTextStyle, labelHeight } from './diagram-graph.ts';

function validate(graph: DiagramGraph): void {
  const control = graph.edges.filter(edge => edge.kind === 'flow');
  const starts = graph.nodes.filter(node => node.kind === 'start');
  const ends = graph.nodes.filter(node => node.kind === 'end');
  if (starts.length !== 1 || !ends.length) throw new Error('An activity workflow needs one start and at least one end.');
  const nodes = new Map(graph.nodes.map(node => [node.id, node]));
  for (const edge of graph.edges) {
    const object = nodes.get(edge.from)?.kind === 'object' || nodes.get(edge.to)?.kind === 'object';
    if ((edge.kind === 'object') !== object) throw new Error('Object edges must touch an object node; control flow must not pass through object nodes.');
  }
  for (const node of graph.nodes) {
    const incoming = control.filter(edge => edge.to === node.id);
    const outgoing = control.filter(edge => edge.from === node.id);
    const fail = (text: string) => { throw new Error(`${node.id} (${node.kind}): ${text}`); };
    if (node.kind === 'start' && (incoming.length || outgoing.length !== 1)) fail('the start needs no incoming flow and one outgoing flow.');
    if (node.kind === 'end' && (!incoming.length || outgoing.length)) fail('an end needs incoming flow and no outgoing flow.');
    if (node.kind === 'decision' && (incoming.length !== 1 || outgoing.length < 2 || outgoing.some(edge => !edge.label))) fail('a decision needs one incoming flow and at least two outgoing flows with guards.');
    if (node.kind === 'fork' && (incoming.length !== 1 || outgoing.length < 2)) fail('a fork needs one incoming and at least two outgoing flows.');
    if (['join', 'merge'].includes(node.kind) && (incoming.length < 2 || outgoing.length !== 1)) fail('a join/merge needs at least two incoming flows and one outgoing flow.');
    if (node.kind === 'object' && !graph.edges.some(edge => edge.from === node.id || edge.to === node.id)) fail('an object needs an object-flow connection.');
  }
  const reach = (seeds: string[], reverse = false) => {
    const seen = new Set(seeds);
    const queue = [...seeds];
    for (let i = 0; i < queue.length; i++) for (const edge of control) {
      if ((reverse ? edge.to : edge.from) !== queue[i]) continue;
      const next = reverse ? edge.from : edge.to;
      if (!seen.has(next)) { seen.add(next); queue.push(next); }
    }
    return seen;
  };
  const reachable = reach(starts.map(node => node.id));
  const terminating = reach(ends.map(node => node.id), true);
  for (const node of graph.nodes.filter(node => node.kind !== 'object')) {
    if (!reachable.has(node.id) || !terminating.has(node.id)) throw new Error(`${node.id} must be reachable from the start and have a path to an end.`);
  }
}

/** Collapse loops before ranking. Branches share ranks; joins follow their incoming branches. */
function ranks(graph: DiagramGraph): Map<string, number> {
  const adjacency = new Map(graph.nodes.map(node => [node.id, graph.edges.filter(edge => edge.kind === 'flow' && edge.from === node.id).map(edge => edge.to)]));
  const index = new Map<string, number>(), low = new Map<string, number>();
  const stack: string[] = [], stacked = new Set<string>(), components: string[][] = [];
  let next = 0;
  function visit(id: string): void {
    index.set(id, next); low.set(id, next++); stack.push(id); stacked.add(id);
    for (const target of adjacency.get(id) || []) {
      if (!index.has(target)) { visit(target); low.set(id, Math.min(low.get(id)!, low.get(target)!)); }
      else if (stacked.has(target)) low.set(id, Math.min(low.get(id)!, index.get(target)!));
    }
    if (low.get(id) === index.get(id)) {
      const component: string[] = [];
      let member: string;
      do { member = stack.pop()!; stacked.delete(member); component.push(member); } while (member !== id);
      components.push(graph.nodes.filter(node => component.includes(node.id)).map(node => node.id));
    }
  }
  graph.nodes.forEach(node => { if (!index.has(node.id)) visit(node.id); });
  const owner = new Map(components.flatMap((members, i) => members.map(id => [id, i] as const)));
  const base = components.map(() => 0);
  // Tarjan returns sinks first, so reverse order propagates longest paths through the DAG.
  for (let i = components.length - 1; i >= 0; i--) for (const id of components[i]!) for (const target of adjacency.get(id) || []) {
    const j = owner.get(target)!;
    if (j !== i) base[j] = Math.max(base[j]!, base[i]! + components[i]!.length);
  }
  const result = new Map(components.flatMap((members, i) => members.map((id, offset) => [id, base[i]! + offset] as const)));
  // Object nodes sit alongside the action producing/consuming them.
  for (const node of graph.nodes.filter(node => node.kind === 'object')) {
    const edge = graph.edges.find(edge => edge.from === node.id || edge.to === node.id);
    result.set(node.id, result.get(edge?.from === node.id ? edge.to : edge?.from || '') || 0);
  }
  return result;
}

function layout(graph: DiagramGraph): DiagramLayout {
  const rank = ranks(graph);
  const groups = graph.groups.length ? [...graph.groups] : [{ id: '_lane', label: 'Workflow' }];
  if (graph.groups.length && graph.nodes.some(node => !node.group)) groups.push({ id: '_lane', label: 'Shared' });
  const lane = (id: string) => graph.nodes.find(node => node.id === id)?.group || '_lane';
  const rowHeight = Math.max(110, ...graph.nodes.map(node => labelHeight(node.label, ['decision', 'merge'].includes(node.kind) ? 110 : 190, 80))) + 70;
  const height = (Math.max(...rank.values()) + 1) * rowHeight + 110;
  const vertices: DiagramLayout['vertices'] = [];
  let x = 30;
  for (const group of groups) {
    const members = graph.nodes.filter(node => lane(node.id) === group.id);
    const counts = new Map<number, number>();
    members.forEach(node => counts.set(rank.get(node.id)!, (counts.get(rank.get(node.id)!) || 0) + 1));
    const width = Math.max(1, ...counts.values()) * 250 + 40;
    vertices.push({ id: group.id, label: group.label, x, y: 30, width, height,
      style: `${diagramTextStyle}shape=swimlane;startSize=45;horizontal=1;container=1;collapsible=0;fillColor=#f5f8fc;` });
    const slots = new Map<number, number>();
    for (const node of members) {
      const row = rank.get(node.id)!;
      const slot = slots.get(row) || 0;
      slots.set(row, slot + 1);
      let shape = 'rounded=1;arcSize=18;', w = 200, h = rowHeight - 70;
      if (node.kind === 'start') { shape = 'ellipse;fillColor=#172033;'; w = 28; h = 28; }
      if (node.kind === 'end') { shape = 'shape=endState;fillColor=#172033;'; w = 34; h = 34; }
      if (['decision', 'merge'].includes(node.kind)) { shape = 'rhombus;perimeter=rhombusPerimeter;'; w = 190; }
      if (['fork', 'join'].includes(node.kind)) { shape = 'rounded=0;fillColor=#172033;'; w = 200; h = 10; }
      if (node.kind === 'object') shape = 'rounded=0;';
      vertices.push({ id: node.id, label: node.label, parent: group.id,
        x: 25 + slot * 250 + (200 - w) / 2, y: 85 + row * rowHeight + (rowHeight - 70 - h) / 2, width: w, height: h,
        style: `${diagramTextStyle}${shape}${['start', 'end', 'fork', 'join'].includes(node.kind) ? 'verticalLabelPosition=bottom;verticalAlign=top;' : ''}` });
    }
    x += width;
  }
  let backEdges = 0;
  const centerX = (id: string): number => {
    const vertex = vertices.find(vertex => vertex.id === id)!;
    const parent = vertices.find(group => group.id === vertex.parent)!;
    return parent.x + vertex.x + vertex.width / 2;
  };
  const edges = graph.edges.map(edge => {
    const back = edge.kind === 'flow' && rank.get(edge.to)! <= rank.get(edge.from)!;
    const routeX = x + 25 + (back ? backEdges++ * 24 : 0);
    return {
      from: edge.from, to: edge.to, label: edge.label,
      style: `${diagramTextStyle}edgeStyle=orthogonalEdgeStyle;rounded=0;endArrow=open;endFill=0;${back ? 'exitX=0.5;exitY=1;entryX=0.5;entryY=0;' : ''}`,
      points: back
        ? [
          { x: centerX(edge.from), y: 80 + (rank.get(edge.from)! + 1) * rowHeight },
          { x: routeX, y: 80 + (rank.get(edge.from)! + 1) * rowHeight },
          { x: routeX, y: 85 + rank.get(edge.to)! * rowHeight },
          { x: centerX(edge.to), y: 85 + rank.get(edge.to)! * rowHeight }
        ]
        : undefined
    };
  });
  return { vertices, edges, width: x + backEdges * 24 + 60, height: height + 60 };
}

export const activityDiagram: DiagramType = {
  id: 'activity', title: 'Activity workflow',
  nodeKinds: ['start', 'end', 'action', 'decision', 'merge', 'fork', 'join', 'object'],
  edgeKinds: ['flow', 'object'], defaultEdge: 'flow',
  contract: 'g is a list of responsibility swimlanes [id,labelOrReference], or [] if lanes are unnecessary. Assign nodes to a lane when responsibilities are known. Use one start and one or more ends. Actions use concise semantic labels; decisions have one incoming and two or more outgoing flow edges, each labeled with a guard. Use merge for alternative paths (2+ incoming, 1 outgoing), fork for true concurrency (1 incoming, 2+ outgoing), join to synchronize it (2+ incoming, 1 outgoing). Every control node must be reachable from start and have a path to an end; loops are allowed. object nodes connect through object edges to actions, never through control-flow edges. Do not invent concurrency, guards, policy or responsibilities. Use saved actor IDs or @system for lane labels when appropriate.',
  validate, layout
};
