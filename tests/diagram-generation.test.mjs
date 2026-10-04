import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseDiagramResponse } from '../src/core/artifacts/diagram-ir.ts';
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
  const record = row => ({ id: Number(row[2].split('-').at(-1)), name: `Saved label for ${row[0]}`, disposition: 'Candidate' });
  const document = { clientRequirements: { projectName: 'Reported system' }, softwareRequirementsSpecification: { records: {
    actors: input.n.filter(row => row[1] === 'actor').map(record),
    useCases: input.n.filter(row => row[1] === 'use-case').map(record)
  } } };
  const context = diagramContext(useCaseDiagramConfig, document);
  const graph = parseDiagramResponse(response, context, 'use-case');
  assert.deepEqual(graph, parseDiagramResponse(fence(input), context, 'use-case'));
  assert.equal(graph.nodes.length, 59);
  assert.equal(graph.edges.length, input.e.length);
  assert.equal(graph.groups[0].label, 'Reported system');
  assert.equal(graph.nodes.find(node => node.id === 'a13').label, 'Saved label for a13');
  assert.equal(graph.nodes.find(node => node.id === 'u47').label, 'Saved label for u47');
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
