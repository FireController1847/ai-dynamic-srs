import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseDiagramResponse } from '../src/core/artifacts/diagram-ir.ts';
import { parseDiagramBatchResponse } from '../src/core/artifacts/diagram-batch.ts';
import { diagramContext } from '../src/core/artifacts/diagram-context.ts';
import { diagramDrawioXml } from '../src/core/artifacts/diagram-drawio.ts';
import { diagramType } from '../src/core/artifacts/diagram-types.ts';
import { assertDiagramCollectionLimit, MAX_DIAGRAM_COLLECTION_BYTES } from '../src/core/artifacts/diagram-files.ts';
import { buildFormPrompt, buildInterviewPrompt } from '../src/core/ai/prompt-builder.ts';
import { addEvidenceContextToPrompt } from '../src/core/ai/evidence-context.ts';
import { withFinancialEvidence } from '../src/features/cost-benefit-analysis/financial-evidence.ts';
import { softwareRequirementsSchema as schema } from '../src/features/software-requirements/schema.ts';
import { useCaseDiagramConfig, activityDiagramConfig } from '../src/features/software-requirements/phase-three/diagram-config.ts';

const fence = graph => '```dsrs-diagram\n' + JSON.stringify(graph) + '\n```';
const emptyContext = diagramContext(undefined, {});
const useCase = { t: 'use-case', g: [['system', '@system']], n: [['actor', 'actor', 'Customer'], ['book', 'use-case', 'Book appointment', 'system']], e: [['actor', 'book']] };
const activity = { t: 'activity', g: [['customer', 'Customer'], ['system', '@system']], n: [
  ['start', 'start', '', 'customer'], ['ask', 'action', 'Request appointment', 'customer'],
  ['check', 'decision', 'Available?', 'system'], ['record', 'action', 'Record booking', 'system'],
  ['decline', 'action', 'Offer another time', 'system'], ['merge', 'merge', '', 'system'], ['end', 'end', '', 'system']
], e: [['start', 'ask'], ['ask', 'check'], ['check', 'record', 'flow', '[yes]'], ['check', 'decline', 'flow', '[no]'], ['record', 'merge'], ['decline', 'merge'], ['merge', 'end']] };
const page = id => schema.subpages.flatMap(phase => phase.subpages).find(stage => stage.id === id);

const reportedFixture = () => JSON.parse(readFileSync(new URL('./fixtures/reported-use-case-diagram.json', import.meta.url), 'utf8'));

function fixtureDocument(input) {
  const nodeById = new Map(input.n.map(row => [row[0], row]));
  const actorLinks = new Map();
  for (const edge of input.e) {
    if ((edge[2] || 'association') !== 'association') continue;
    const from = nodeById.get(edge[0]);
    const to = nodeById.get(edge[1]);
    const actor = from?.[1] === 'actor' ? from : to?.[1] === 'actor' ? to : null;
    const useCase = from?.[1] === 'use-case' ? from : to?.[1] === 'use-case' ? to : null;
    if (!actor || !useCase) continue;
    actorLinks.set(useCase[0], [...(actorLinks.get(useCase[0]) || []), actor[2]]);
  }
  return {
    clientRequirements: { projectName: 'CommunityApp' },
    softwareRequirementsSpecification: { records: {
      actors: input.n.filter(row => row[1] === 'actor').map(row => ({
        id: Number(row[2].split('-').at(-1)), name: `Actor ${row[2]}`
      })),
      useCases: input.n.filter(row => row[1] === 'use-case').map(row => {
        const refs = actorLinks.get(row[0]) || [];
        return {
          id: Number(row[2].split('-').at(-1)),
          name: `Use Case ${row[2]}`,
          disposition: 'Candidate',
          primaryActorId: refs[0] || '',
          supportingActorReferences: refs.slice(1).join(', ')
        };
      }),
      useCaseRelationships: []
    } }
  };
}

function graphForReferences(input, references) {
  const selected = new Set(references);
  const nodeById = new Map(input.n.map(row => [row[0], row]));
  const caseLocalIds = new Set(input.n.filter(row => row[1] === 'use-case' && selected.has(row[2])).map(row => row[0]));
  const actorLocalIds = new Set();
  const edges = [];
  for (const edge of input.e) {
    const kind = edge[2] || 'association';
    if (kind === 'association') {
      const from = nodeById.get(edge[0]);
      const to = nodeById.get(edge[1]);
      const actor = from?.[1] === 'actor' ? from : to?.[1] === 'actor' ? to : null;
      const useCase = from?.[1] === 'use-case' ? from : to?.[1] === 'use-case' ? to : null;
      if (actor && useCase && caseLocalIds.has(useCase[0])) {
        actorLocalIds.add(actor[0]);
        edges.push(edge);
      }
    } else if (caseLocalIds.has(edge[0]) && caseLocalIds.has(edge[1])) {
      edges.push(edge);
    }
  }
  const nodes = input.n.filter(row =>
    (row[1] === 'use-case' && caseLocalIds.has(row[0]))
    || (row[1] === 'actor' && actorLocalIds.has(row[0])));
  return { t: 'use-case', g: input.g, n: nodes, e: edges };
}

function noRectOverlap(left, right) {
  return left.x + left.width <= right.x || right.x + right.width <= left.x
    || left.y + left.height <= right.y || right.y + right.height <= left.y;
}

function assertReadableUseCaseLayout(graph) {
  const layout = diagramType('use-case').layout(graph);
  const boundary = layout.vertices.find(vertex => vertex.id === graph.groups[0].id);
  const cases = layout.vertices.filter(vertex => graph.nodes.find(node => node.id === vertex.id)?.kind === 'use-case');
  const actors = layout.vertices.filter(vertex => graph.nodes.find(node => node.id === vertex.id)?.kind === 'actor');
  for (const useCase of cases) {
    assert.equal(useCase.parent, boundary.id);
    assert(useCase.x >= 0 && useCase.y >= 58);
    assert(useCase.x + useCase.width <= boundary.width);
    assert(useCase.y + useCase.height <= boundary.height);
  }
  for (let i = 0; i < cases.length; i += 1) {
    for (let j = i + 1; j < cases.length; j += 1) assert(noRectOverlap(cases[i], cases[j]));
  }
  for (const actor of actors) {
    assert(actor.x + actor.width <= boundary.x || actor.x >= boundary.x + boundary.width);
  }
  for (let i = 0; i < actors.length; i += 1) {
    for (let j = i + 1; j < actors.length; j += 1) assert(noRectOverlap(actors[i], actors[j]));
  }
  const associations = layout.edges.filter((edge, index) => (graph.edges[index].kind || 'association') === 'association');
  associations.forEach(edge => assert(edge.points?.length >= 4));
  return { layout, boundary, cases, actors };
}

test('compact references resolve saved labels and render deterministic native cells', () => {
  const document = { clientRequirements: { projectName: 'Appointments & care' }, softwareRequirementsSpecification: { records: {
    actors: [{ id: 3, name: 'Customer & family' }], useCases: [{ id: 7, name: 'Book <appointment>', disposition: 'Candidate' }]
  } } };
  const context = diagramContext(useCaseDiagramConfig, document);
  const response = { ...useCase, n: [['actor', 'actor', 'SRS-ACT-003'], ['book', 'use-case', 'SRS-UC-007', 'system']] };
  const graph = parseDiagramResponse(fence(response), context, 'use-case');
  const xml = diagramDrawioXml(graph);
  assert.equal(graph.nodes[1].label, 'Book <appointment>');
  assert.equal(diagramDrawioXml(graph), xml);
  assert.match(xml, /<mxfile[^>]*><diagram[^>]*><mxGraphModel/);
  assert.match(xml, /value="Book &lt;appointment&gt;"/);
  assert.match(xml, /value="Appointments &amp; care"/);
  assert.match(xml, /shape=umlActor/);
  assert.match(xml, /id="v-book"[^>]*parent="v-system"/);
  assert.match(xml, /source="v-actor" target="v-book"/);
  assert.doesNotMatch(xml, /dsrs-diagram|SRS-UC-007/);
});

test('code-block JSON and fenced responses use the same validation for both diagram types', () => {
  for (const input of [useCase, activity]) {
    const raw = '\n  ' + JSON.stringify(input) + '\n';
    assert.deepEqual(parseDiagramResponse(raw, emptyContext, input.t), parseDiagramResponse(fence(input), emptyContext, input.t));
    assert.throws(() => parseDiagramResponse(JSON.stringify({ ...input, styles: {} }), emptyContext), /only t, g, n and e/);
    assert.throws(() => parseDiagramResponse(raw, emptyContext, input.t === 'activity' ? 'use-case' : 'activity'), /expects/);
    assert.throws(() => parseDiagramResponse(JSON.stringify({ ...input, n: [...input.n, input.n[0]] }), emptyContext), /duplicate local ID/);
    assert.throws(() => parseDiagramResponse(JSON.stringify({ ...input, e: [['missing', input.n[0][0]]] }), emptyContext), /unknown node/);
  }
  const context = { ...emptyContext, prefixes: ['SRS-UC-'] };
  assert.throws(() => parseDiagramResponse(JSON.stringify({ ...useCase, n: [['u', 'use-case', 'SRS-UC-999', 'system']] }), context), /not a current named reference/);
  assert.throws(() => parseDiagramResponse(JSON.stringify({ ...useCase, n: [['a', 'actor', 'Customer', { x: 0, y: 0 }]] }), context), /strings/);
  assert.throws(() => parseDiagramResponse(JSON.stringify({ ...activity, e: activity.e.map(edge => edge[0] === 'check' ? edge.slice(0, 2) : edge) }), emptyContext), /guards/);
});

test('reported 12-actor, 47-use-case JSON retains references and relationships in native DrawIO', () => {
  const response = readFileSync(new URL('./fixtures/reported-use-case-diagram.json', import.meta.url), 'utf8');
  const input = JSON.parse(response);
  const document = fixtureDocument(input);
  document.clientRequirements.projectName = 'Reported system';
  const context = diagramContext(useCaseDiagramConfig, document);
  const graph = parseDiagramResponse(response, context, 'use-case');
  assert.deepEqual(graph, parseDiagramResponse(fence(input), context, 'use-case'));
  assert.equal(graph.nodes.length, 59);
  assert.equal(graph.edges.length, input.e.length);
  assert.equal(graph.groups[0].label, 'Reported system');
  assert.equal(graph.nodes.find(node => node.id === 'a13').label, 'Actor SRS-ACT-013');
  assert.equal(graph.nodes.find(node => node.id === 'u47').label, 'Use Case SRS-UC-047');
  assert.equal(graph.edges.filter(edge => edge.kind === 'generalization').length, 6);
  const xml = diagramDrawioXml(graph);
  assert.equal(xml, diagramDrawioXml(parseDiagramResponse(fence(input), context, 'use-case')));
  assert.match(xml, /id="v-u47"[^>]*parent="v-sys"/);
  assert.match(xml, /source="v-u10" target="v-u9"/);
  assert.match(xml, /«extend»/);
  assert.match(xml, /source="v-u43" target="v-u34"/);
  assert.match(xml, /endArrow=block;endFill=0/);
  assert.doesNotMatch(xml, /SRS-ACT-|SRS-UC-/);
});

test('bad response envelopes, unknown references and supplied layout are rejected', () => {
  const context = { ...emptyContext, prefixes: ['SRS-UC-'] };
  for (const response of ['Here is your diagram:\n' + fence(useCase), 'Here is your diagram:\n' + JSON.stringify(useCase),
    JSON.stringify(useCase) + '\nDone.', JSON.stringify(useCase) + '\n' + JSON.stringify(useCase),
    fence(useCase) + '\n' + fence(useCase), '```json\n' + JSON.stringify(useCase) + '\n```',
    '```dsrs-diagram\n{broken}\n```', '{broken}', '']) {
    assert.throws(() => parseDiagramResponse(response, context));
  }
  assert.throws(() => parseDiagramResponse(fence({ ...useCase, styles: {} }), context), /only t, g, n and e/);
  assert.throws(() => parseDiagramResponse(fence({ ...useCase, n: [['actor', 'actor', 'Customer', { x: 0, y: 0 }]] }), context), /strings/);
  assert.throws(() => parseDiagramResponse(fence({ ...useCase, n: [['book', 'use-case', 'SRS-UC-999', 'system']] }), context), /not a current named reference/);
  assert.throws(() => parseDiagramResponse(fence(useCase), context, 'activity'), /expects/);
  assert.throws(() => parseDiagramResponse(fence({ ...useCase, n: [...useCase.n, useCase.n[0]] }), context), /duplicate local ID/);
  assert.throws(() => parseDiagramResponse(fence({ ...useCase, e: [['actor', 'missing']] }), context), /unknown node/);
  assert.throws(() => parseDiagramResponse(fence({ ...useCase, e: [['actor', 'book', 'include']] }), context), /two use cases/);
  assert.throws(() => parseDiagramResponse(fence({ ...useCase, n: [] }), context), /no nodes/);
});

test('include, extend and generalization retain direction and UML arrow semantics', () => {
  const graph = parseDiagramResponse(fence({ ...useCase, n: [...useCase.n, ['pay', 'use-case', 'Pay', 'system'], ['special', 'use-case', 'Priority booking', 'system']],
    e: [['actor', 'book'], ['book', 'pay', 'include'], ['special', 'book', 'extend', 'Priority requested'], ['special', 'book', 'generalization']] }), emptyContext);
  const edges = diagramType(graph.type).layout(graph).edges;
  assert.equal(edges[1].from, 'book'); assert.equal(edges[1].to, 'pay');
  assert.match(edges[1].label, /«include»/); assert.match(edges[1].style, /dashed=1/);
  assert.match(edges[2].label, /«extend»\nPriority requested/);
  assert.match(edges[3].style, /endArrow=block;endFill=0/);
  assert.throws(() => parseDiagramResponse(fence({ ...useCase, n: [...useCase.n, ['pay', 'use-case', 'Pay', 'system']], e: [['book', 'pay', 'include'], ['pay', 'book', 'include']] }), emptyContext), /cycle/);
});

test('activity decisions, lanes and joins produce non-overlapping deterministic layout', () => {
  const graph = parseDiagramResponse(fence(activity), emptyContext, 'activity');
  const layout = diagramType('activity').layout(graph);
  const record = layout.vertices.find(vertex => vertex.id === 'record');
  const decline = layout.vertices.find(vertex => vertex.id === 'decline');
  const merge = layout.vertices.find(vertex => vertex.id === 'merge');
  assert.equal(record.y, decline.y);
  assert(record.x + record.width < decline.x);
  assert(merge.y > record.y);
  assert.equal(record.parent, 'system');
  assert.match(diagramDrawioXml(graph), /shape=swimlane/);
  assert.match(diagramDrawioXml(graph), /shape=endState/);
  assert.match(diagramDrawioXml(graph), /value="\[yes\]"/);
  assert.deepEqual(diagramType('activity').layout(graph), layout);
  assert.throws(() => parseDiagramResponse(fence({ ...activity, e: activity.e.map(edge => edge[0] === 'check' ? edge.slice(0, 2) : edge) }), emptyContext), /guards/);
  assert.throws(() => parseDiagramResponse(fence({ ...activity, n: [...activity.n, ['orphan', 'action', 'Unsupported action']] }), emptyContext), /reachable/);
});

test('activity forks/joins and object flows share the same graph and XML path', () => {
  const graph = parseDiagramResponse(fence({ t: 'activity', g: [], n: [
    ['s', 'start', ''], ['fork', 'fork', ''], ['a', 'action', 'Reserve'], ['b', 'action', 'Notify'],
    ['join', 'join', ''], ['end', 'end', ''], ['data', 'object', 'Reservation']
  ], e: [['s', 'fork'], ['fork', 'a'], ['fork', 'b'], ['a', 'join'], ['b', 'join'], ['join', 'end'], ['a', 'data', 'object']] }), emptyContext);
  const layout = diagramType('activity').layout(graph);
  assert.equal(layout.vertices.find(vertex => vertex.id === 'fork').height, 10);
  assert.equal(layout.vertices.find(vertex => vertex.id === 'join').height, 10);
  assert.equal(layout.edges.at(-1).to, 'data');
  assert.doesNotMatch(layout.edges.at(-1).style, /dashed=1/);
});

test('activity loops route backward edges outside the lanes', () => {
  const graph = parseDiagramResponse(fence({ t: 'activity', g: [], n: [
    ['start', 'start', ''], ['merge', 'merge', ''], ['attempt', 'action', 'Try operation'],
    ['decision', 'decision', 'Succeeded?'], ['retry', 'action', 'Retry'], ['end', 'end', '']
  ], e: [['start', 'merge'], ['merge', 'attempt'], ['attempt', 'decision'], ['decision', 'end', 'flow', '[yes]'],
    ['decision', 'retry', 'flow', '[retry allowed]'], ['retry', 'merge']] }), emptyContext);
  const layout = diagramType('activity').layout(graph);
  const backward = layout.edges.find(edge => edge.from === 'retry');
  const lane = layout.vertices.find(vertex => vertex.id === '_lane');
  assert(backward.points.some(point => point.x > lane.x + lane.width));
  assert.match(diagramDrawioXml(graph), /<Array as="points"><mxPoint/);
});

test('shared file limits count retired/other-stage files and exclude only the replaced payload', () => {
  const existing = { sizeBytes: MAX_DIAGRAM_COLLECTION_BYTES - 40 };
  const retired = { sizeBytes: 30, retired: true };
  assert.throws(() => assertDiagramCollectionLimit([existing, retired], null, [{ sizeBytes: 11 }]), /3 MB/);
  assert.doesNotThrow(() => assertDiagramCollectionLimit([existing, retired], existing, [{ sizeBytes: 100 }]));
});

test('diagram prompts narrow evidence and cannot be enriched with unrelated metadata/payloads', () => {
  const stage = page('srs-behavior-use-case-map');
  const section = stage.sections.find(section => section.repeatable?.dataKey === 'artifacts');
  const figure = { id: 2, artifactGroup: 'use-case-map', useCaseReferences: 'SRS-UC-007', caption: 'UNRELATED-CAPTION', file: { sourceFileName: 'SECRET-FILENAME.drawio', content: '<mxfile>PRIVATE-XML</mxfile>' } };
  const document = { softwareRequirementsSpecification: { records: {
    artifacts: [figure], actors: [{ id: 3, name: 'Customer' }, { id: 4, name: 'UNRELATED-ACTOR' }],
    useCases: [{ id: 7, name: 'Book appointment', disposition: 'Candidate', primaryActorId: 'SRS-ACT-003' }, { id: 8, name: 'UNRELATED-CASE', disposition: 'Candidate' }]
  } }, clientRequirements: { projectName: 'Appointments' } };
  const prompt = buildFormPrompt(stage, section, {}, document, { record: figure });
  assert.match(prompt, /^# AI diagram:/);
  assert.match(prompt, /exactly one compact fenced/);
  assert.match(prompt, /SRS-UC-007/);
  assert.doesNotMatch(prompt, /UNRELATED-|PRIVATE-XML|SECRET-FILENAME|sourceFileName|## Form to complete/);
  assert.equal(addEvidenceContextToPrompt(prompt, stage.evidence, document, [schema]), prompt);
  assert.equal(withFinancialEvidence(prompt, 'cost-benefit-analysis:', document), prompt);
  const interview = buildInterviewPrompt(stage, {}, document);
  assert.doesNotMatch(interview, /PRIVATE-XML/);
  const ordinary = buildFormPrompt(stage, section, {}, document, { record: figure, fieldPath: ['caption'] });
  assert.match(ordinary, /^# Form prompt:/);
  assert.doesNotMatch(ordinary, /PRIVATE-XML/);
  const context = diagramContext(activityDiagramConfig, document, [{ useCaseReferences: 'SRS-UC-007', scenario: 'Known scenario' }]);
  assert.match(JSON.stringify(context.evidence), /Known scenario/);
  assert.doesNotMatch(JSON.stringify(context.evidence), /UNRELATED-|PRIVATE-XML|SECRET-FILENAME/);
});

test('section-level use-case batch preserves the six established CommunityApp figures and readable layouts', () => {
  const input = reportedFixture();
  const document = fixtureDocument(input);
  const range = (start, end) => Array.from({ length: end - start + 1 }, (_, index) => `SRS-UC-${String(start + index).padStart(3, '0')}`);
  const partitions = [
    ['Local Account, Discovery, and Participation', [...range(1, 14), 'SRS-UC-025']],
    ['Reviews, Reporting, and Community Moderation', [...range(19, 22), 'SRS-UC-026']],
    ['Purchases and Personal Publishing', [...range(23, 24), ...range(27, 28)]],
    ['Organization Ownership and Governance', [...range(15, 18), ...range(29, 37)]],
    ['Delegated Organization Management', [...range(29, 34), ...range(38, 43)]],
    ['CommunityApp Support and Administration', range(44, 47)]
  ];
  const figures = partitions.map(([title, references]) => {
    const graph = graphForReferences(input, references);
    const actorReferences = graph.n.filter(row => row[1] === 'actor').map(row => row[2]).join(', ');
    return {
      title,
      caption: `Use-Case coverage for ${title}.`,
      useCaseReferences: references.join(', '),
      actorReferences,
      graph
    };
  });
  const response = '```dsrs-diagrams\n' + JSON.stringify({ figures }) + '\n```';
  const parsed = parseDiagramBatchResponse(response, useCaseDiagramConfig, document);
  assert.deepEqual(parsed.map(figure => figure.metadata.title), partitions.map(([title]) => title));
  assert.equal(parsed.length, 6);

  for (const figure of parsed) {
    const { layout, boundary, actors } = assertReadableUseCaseLayout(figure.graph);
    assert.match(diagramDrawioXml(figure.graph), /<mxfile/);
    assert.equal(diagramDrawioXml(figure.graph), diagramDrawioXml(figure.graph));
    if (actors.length > 1) {
      assert(actors.some(actor => actor.x + actor.width <= boundary.x));
      assert(actors.some(actor => actor.x >= boundary.x + boundary.width));
    }
    for (const edge of figure.graph.edges.filter(edge => edge.kind === 'generalization')) {
      const from = layout.vertices.find(vertex => vertex.id === edge.from);
      const to = layout.vertices.find(vertex => vertex.id === edge.to);
      assert(Math.hypot((from.x + from.width / 2) - (to.x + to.width / 2), (from.y + from.height / 2) - (to.y + to.height / 2)) < 450);
    }
  }

  const broken = structuredClone({ figures });
  broken.figures[4].actorReferences = 'SRS-ACT-999';
  assert.throws(() => parseDiagramBatchResponse(JSON.stringify(broken), useCaseDiagramConfig, document), /outside this figure|canonical actor/);
});

test('section prompt requests a batch while individual figure prompt remains single-figure', () => {
  const stage = page('srs-behavior-use-case-map');
  const section = stage.sections.find(section => section.repeatable?.dataKey === 'artifacts');
  const input = reportedFixture();
  const document = fixtureDocument(input);
  const figure = {
    id: 2,
    artifactGroup: 'use-case-map',
    title: 'Local Account, Discovery, and Participation',
    caption: 'Local participation',
    useCaseReferences: 'SRS-UC-001, SRS-UC-002',
    actorReferences: 'SRS-ACT-001'
  };
  document.softwareRequirementsSpecification.records.artifacts = [figure];

  const sectionPrompt = buildFormPrompt(stage, section, {}, document);
  assert.match(sectionPrompt, /^# AI diagrams:/);
  assert.match(sectionPrompt, /dsrs-diagrams/);
  assert.match(sectionPrompt, /Preserve figure partitions/);
  assert.match(sectionPrompt, /Local Account, Discovery, and Participation/);
  assert.doesNotMatch(sectionPrompt, /one combined diagram/);

  const figurePrompt = buildFormPrompt(stage, section, {}, document, { record: figure });
  assert.match(figurePrompt, /^# AI diagram:/);
  assert.match(figurePrompt, /dsrs-diagram/);
  assert.doesNotMatch(figurePrompt, /dsrs-diagrams/);
  assert.match(figurePrompt, /replaces only this figure's file/);
});
