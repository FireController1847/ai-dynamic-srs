import type { DiagramGraph, DiagramLayout, DiagramType } from './diagram-graph.ts';
import { diagramTextStyle, labelHeight } from './diagram-graph.ts';

type ModelKind = 'domain' | 'interaction' | 'state' | 'ui-flow';

const config: Record<ModelKind, {
  title: string; nodes: string[]; edges: string[]; edge: string; contract: string;
}> = {
  domain: {
    title: 'Domain and Class Model',
    nodes: ['concept', 'class', 'value', 'enumeration'],
    edges: ['association', 'aggregation', 'composition', 'generalization', 'dependency'],
    edge: 'association',
    contract: 'Set g to [] and omit node groups. Model domain concepts and conceptual responsibilities, not implementation classes. Use generalization child-to-parent, dependency user-to-dependency and associations only where evidenced. Label associations with meaningful roles/multiplicity when supported.'
  },
  interaction: {
    title: 'Interaction Model',
    nodes: ['actor', 'participant', 'system', 'external'],
    edges: ['message', 'response', 'event', 'dependency'],
    edge: 'message',
    contract: 'Set g to [] and omit node groups. One named use-case scenario per figure. Nodes are existing participants or conceptual responsibilities. Order communication labels as 1., 2., etc. Include alternatives and failure responses only when evidenced. This is a communication model, not an implementation sequence diagram.'
  },
  state: {
    title: 'State Model',
    nodes: ['start', 'state', 'choice', 'end'],
    edges: ['transition'],
    edge: 'transition',
    contract: 'Set g to [] and omit node groups. Model one significant stateful object or lifecycle. Provide one start, named states, event labels and supported guards or actions on transitions. Do not claim all objects need state machines.'
  },
  'ui-flow': {
    title: 'UI Scenario Flow',
    nodes: ['screen', 'action', 'decision', 'feedback', 'end'],
    edges: ['navigate', 'submit', 'error', 'recover', 'flow'],
    edge: 'navigate',
    contract: 'Set g to [] and omit node groups. Derive the navigation/input/output and failure-recovery path from named use cases. This is a user journey/storyboard flow, not a fabricated pixel-perfect screen design. Label validations and recovery routes where established.'
  }
};

function modelValidate(kind: ModelKind, graph: DiagramGraph) {
  if (graph.groups.length || graph.nodes.some(node => node.group)) {
    throw new Error('Phase 5 model diagrams do not use graph groups. Set g to [] and omit each node group.');
  }
  const nodes = new Map(graph.nodes.map(node => [node.id, node]));
  if (kind === 'domain' && !graph.nodes.some(node => ['concept', 'class'].includes(node.kind))) {
    throw new Error('A domain model needs at least one conceptual entity.');
  }
  if (kind === 'interaction' && graph.nodes.length < 2) {
    throw new Error('An interaction model must identify at least two collaborating participants.');
  }
  if (kind === 'state') {
    if (graph.nodes.filter(node => node.kind === 'start').length !== 1 || !graph.nodes.some(node => node.kind === 'state')) {
      throw new Error('A state model needs exactly one start and at least one named state.');
    }
    if (!graph.edges.some(edge => nodes.get(edge.from)?.kind === 'start')) {
      throw new Error('Connect the initial state to a meaningful state.');
    }
  }
  if (kind === 'ui-flow' && !graph.nodes.some(node => node.kind === 'screen')) {
    throw new Error('A UI flow needs at least one view or screen.');
  }
  for (const edge of graph.edges) {
    if (kind === 'domain' && edge.kind === 'generalization'
      && edge.from === edge.to) throw new Error('A domain class cannot generalize itself.');
    if (kind === 'state' && edge.kind !== 'transition') throw new Error('State edges must be transitions.');
    if (kind === 'state' && nodes.get(edge.from)?.kind === 'end') throw new Error('A final state cannot have outgoing transitions.');
    if (kind === 'state' && nodes.get(edge.to)?.kind === 'start') throw new Error('An initial state cannot have incoming transitions.');
  }
}

function modelStyle(kind: ModelKind, nodeKind: string) {
  const base = diagramTextStyle;
  if (nodeKind === 'start' || nodeKind === 'end') return 'ellipse;html=0;aspect=fixed;whiteSpace=wrap;fillColor=#245b9a;strokeColor=#245b9a;fontColor=#ffffff;';
  if (nodeKind === 'choice' || nodeKind === 'decision') return 'rhombus;html=0;whiteSpace=wrap;strokeColor=#526077;fillColor=#eaf2fc;fontColor=#172033;';
  if (kind === 'domain' && nodeKind === 'enumeration') return base+'rounded=0;fillColor=#f0f5fb;';
  if (kind === 'state') return base+'rounded=1;arcSize=12;fillColor=#eaf2fc;';
  if (kind === 'interaction' && nodeKind === 'actor') return base+'rounded=1;fillColor=#eaf2fc;';
  if (kind === 'ui-flow' && nodeKind === 'screen') return base+'rounded=1;fillColor=#eaf2fc;';
  return base+'rounded=1;';
}

function modelLayout(kind: ModelKind, graph: DiagramGraph): DiagramLayout {
  const columns = kind === 'interaction' ? Math.min(4,graph.nodes.length) : Math.min(4, Math.max(1, Math.ceil(Math.sqrt(graph.nodes.length))));
  const gapX = 85, gapY = 100, width = kind === 'domain' ? 220 : 200;
  const padding = 70;
  const heights = graph.nodes.map(node => node.kind === 'start' || node.kind === 'end' ? 44 : labelHeight(node.label, width, 70));
  const rowHeight = Math.max(92, ...heights);
  const vertices = graph.nodes.map((node,index) => {
    const column=index % columns, row=Math.floor(index / columns);
    const circular=node.kind==='start'||node.kind==='end';
    return {
      id:node.id,label:node.label || (node.kind==='start'?'Start':'End'),
      x:padding+column*(width+gapX)+(circular ? (width-44)/2 : 0),
      y:padding+row*(rowHeight+gapY),
      width:circular?44:width,height:circular?44:heights[index]!,
      style:modelStyle(kind,node.kind)
    };
  });
  const edges=graph.edges.map(edge => ({
    from:edge.from,to:edge.to,
    label:edge.label,
    style:'edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=0;endArrow=block;endFill=1;strokeColor=#526077;fontSize=12;labelBackgroundColor=#ffffff;'
  }));
  return {
    vertices,edges,
    width: Math.max(850,padding*2+columns*width+(columns-1)*gapX),
    height:Math.max(1100,padding*2+Math.ceil(graph.nodes.length/columns)*(rowHeight+gapY))
  };
}

export function modelDiagram(kind: ModelKind): DiagramType {
  const item=config[kind];
  return {
    id:kind,title:item.title,nodeKinds:item.nodes,edgeKinds:item.edges,
    defaultEdge:item.edge,contract:item.contract,
    validate:(graph)=>modelValidate(kind,graph),
    layout:(graph)=>modelLayout(kind,graph)
  };
}
