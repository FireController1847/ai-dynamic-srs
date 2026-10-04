import test from 'node:test';
import assert from 'node:assert/strict';
import { softwareRequirementsSchema as schema } from '../src/features/software-requirements/schema.ts';
import { createDocumentState } from '../src/core/schema/state-factory.ts';
import { placedPreviewModel } from '../src/core/schema/placed-preview.ts';
import { baselinePreviewModel } from '../src/features/software-requirements/phase-one/preview-model.ts';
import { buildSectionPrompt } from '../src/core/ai/prompt-builder.ts';
import { buildEvidenceContext } from '../src/core/ai/evidence-context.ts';
import { completionSummary } from '../src/core/schema/form-completion.ts';
import { sectionRecords } from '../src/core/schema/section-records.ts';
import { createWorkspaceSnapshot } from '../src/core/workspace/workspace-format.ts';
import { parseWorkspace } from '../src/core/workspace/workspace-validation.ts';
import { behaviorReview } from '../src/features/software-requirements/phase-three/behavior-review.ts';
import { qualityReview } from '../src/features/software-requirements/phase-four/quality-review.ts';
import { followThroughReview } from '../src/features/software-requirements/follow-through-review.ts';
import { availableSrsIds, missingReferenceMessages } from '../src/features/software-requirements/record-review.ts';

const stage = id => schema.subpages.flatMap(phase => phase.subpages).find(stage => stage.id === id);
const model = records => createDocumentState([schema], { softwareRequirementsSpecification: { records } });
const recordState = document => document.softwareRequirementsSpecification.records;
const functional = 'srs-behavior-functional-requirements';
const quality = 'srs-quality-assumptions';
const activeCase = { id: 1, name: 'Manage reservation', disposition: 'Ready for elaboration', detailLevel: 'Detailed description needed', casualStory: 'Customer requests a reservation.', normalFlow: '1. Customer requests a reservation.', alternativeFlows: 'EF-1: unavailable; end.', preconditions: 'Customer identified', successGuarantee: 'Reservation recorded' };

test('legacy workspace round trip retains IDs, hidden records, payloads, and unknown fields', () => {
  const original = model({
    requirements: [{ id: 8, statement: 'Legacy obligation', futureData: { retained: true } }, { id: 11, requirementKind: 'Quality', specificationGroup: 'security', statement: 'Protection' }, { id: 14, requirementKind: 'Interface', specificationGroup: 'user', statement: 'Feedback', _retired: true }],
    useCases: [{ ...activeCase, disposition: 'Deferred', casualQuestions: 'Original question' }],
    artifacts: [{ id: 4, artifactGroup: 'activity-workflow', file: { content: '<mxfile>retained</mxfile>' }, _retired: true }],
    evidenceIssues: [{ id: 2, description: 'Legacy issue', status: 'Resolved', resolution: 'Legacy answer' }]
  });
  const snapshot = createWorkspaceSnapshot({ projectContext: {}, sections: original });
  const loaded = createDocumentState([schema], parseWorkspace(JSON.stringify(snapshot)).document.sections);
  assert.deepEqual(loaded, original);
  assert.equal(recordState(loaded).requirements[0].requirementKind, 'Functional');
  assert.deepEqual(recordState(loaded).requirements.map(item => item.id), [8, 11, 14]);
  assert.equal(recordState(loaded).evidenceIssues[0].resolutionEvidence, '');
  assert.equal(recordState(loaded).artifacts[0].file.content, '<mxfile>retained</mxfile>');
});

test('functional filtering agrees across records, preview, prompt, completion, and review', () => {
  const document = model({ requirements: [
    { id: 1, statement: 'Functional marker', useCaseReferences: 'SRS-UC-001', flowReferences: 'SRS-UC-001 step 1', acceptanceCriterion: 'Recorded', verificationMethod: 'Test', rationale: 'Required', priority: 'Must' },
    { id: 2, requirementKind: 'Quality', specificationGroup: 'security', statement: 'Quality marker' },
    { id: 3, statement: 'Retired marker', _retired: true }
  ] });
  const page = stage(functional);
  const section = page.sections.find(section => section.id === 'functional-requirements');
  assert.deepEqual(sectionRecords(section.repeatable, recordState(document)).map(item => item.id), [1]);
  const preview = placedPreviewModel(page, {}, document, schema.document);
  assert.deepEqual(preview.data.previewRecords1.map(item => item.id), [1]);
  const prompt = buildSectionPrompt(page, section, {}, document);
  assert.match(prompt, /Functional marker/);
  assert.doesNotMatch(prompt, /Quality marker|Retired marker/);
  assert.deepEqual(completionSummary({ sections: [section] }, {}, document), { completed: 1, total: 1 });
  assert.deepEqual(behaviorReview(functional, document).catalogs.find(catalog => catalog.title === 'Functional Requirements').items.map(item => item.id), [1]);
});

test('open questions persist into Phase 4 without changing saved state', () => {
  const document = model({ useCases: [{ ...activeCase, casualQuestions: 'What if payment fails?' }], evidenceIssues: [{ id: 2, description: 'Payment policy', status: 'Open', resolveByPhase: '4' }] });
  const before = JSON.stringify(document);
  const result = qualityReview(quality, document);
  assert(result.messages.some(text => text.includes('casual questions')));
  assert(result.messages.some(text => text.includes('due by Phase 4')));
  assert(result.messages.some(text => text.includes('resolution owner and next action')));
  assert.equal(JSON.stringify(document), before);
  assert(result.catalogs.some(catalog => catalog.title === 'Shared questions and resolutions'));
});

test('closed legacy issues need evidence; exceptions remain visible; retired links are reported', () => {
  const document = model({ useCases: [{ ...activeCase, casualQuestions: 'See SRS-ISS-003' }], evidenceIssues: [
    { id: 1, description: 'Old question', status: 'Resolved', resolution: 'Answered' },
    { id: 2, description: 'Exception', status: 'Accepted exception', resolution: 'Limited release', resolutionEvidence: 'Sponsor decision', owner: 'Sponsor' },
    { id: 3, description: 'Retired question', _retired: true }
  ] });
  const messages = followThroughReview(document).messages.join('\n');
  assert.match(messages, /SRS-ISS-001: resolved needs/);
  assert.match(messages, /accepted exception remains visible/);
  assert.match(messages, /SRS-ISS-003 is missing or retired/);
});

test('new issue answers appear in Phase 1 and schema-placed previews and prompts', () => {
  const document = model({ evidenceIssues: [{ id: 1, description: 'Question', nextAction: 'Ask sponsor', resolveByPhase: '5', affectedReferences: 'SRS-UC-001', resolutionEvidence: 'Decision log' }] });
  const baseline = stage('srs-baseline-evidence-intake');
  const preview = baselinePreviewModel(baseline, {}, document, [schema]);
  const fields = preview.page.sections.find(section => section.id === 'preview-evidence-issues').repeatable.fields;
  for (const key of ['nextAction', 'resolveByPhase', 'affectedReferences', 'resolutionEvidence']) assert(fields.some(field => field.key === key));
  const page = stage(quality);
  const result = placedPreviewModel(page, {}, document, schema.document);
  assert.equal(result.data.previewRecords2[0].nextAction, 'Ask sponsor');
  assert.match(buildSectionPrompt(page, page.sections[2], {}, document), /Decision log/);
});

test('a use-case map cannot satisfy detailed activity evidence; an explicit explanation can', () => {
  const document = model({ useCases: [{ ...activeCase, figureReferences: 'FIG-0001' }], artifacts: [{ id: 1, title: 'Map', artifactGroup: 'use-case-map', file: { content: 'image' }, useCaseReferences: 'SRS-UC-001' }] });
  const check = () => behaviorReview('srs-behavior-detailed-descriptions', document).messages.some(text => text.includes('walkthrough evidence'));
  assert.equal(check(), true);
  recordState(document).useCases[0].workflowEvidenceNotes = 'Analyst walkthrough recorded in the review.';
  assert.equal(check(), false);
});

test('functional review catches missing verification and inconsistent source paths', () => {
  const document = model({ requirements: [{ id: 1, statement: 'Reserve', useCaseReferences: 'SRS-UC-001', flowReferences: 'SRS-UC-009 step 2', sourceReferences: 'SRS-GOL-099' }] });
  const messages = behaviorReview(functional, document).messages.join('\n');
  assert.match(messages, /choose a verification method/);
  assert.match(messages, /SRS-UC-009 appears in the source path/);
  assert.match(messages, /SRS-GOL-099 is missing/);
});

test('reference review handles figure, goal, perspective, retired and wrong-kind links', () => {
  const document = model({ goals: [{ id: 1, outcome: 'Book', scopeStatus: 'Supported by baseline' }], perspectives: [{ id: 2, viewpoint: 'Customer' }], artifacts: [{ id: 3, title: 'Workflow' }, { id: 4, title: 'Old', retired: true }] });
  const available = availableSrsIds(recordState(document));
  const messages = missingReferenceMessages({ referenceId: 'SRS-QR-001', sourceReferences: 'See SRS-GOL-001, SRS-VPT-002 and FIG-0003; FIG-0004', useCaseReferences: 'SRS-GOL-001' }, ['sourceReferences', 'useCaseReferences'], available);
  assert.equal(messages.length, 2);
  assert(messages.some(text => text.includes('FIG-0004 is missing')));
  assert(messages.some(text => text.includes('wrong record kind')));
});

test('review outcomes cannot conceal missing statements or unvalidated dependencies', () => {
  const document = model({ scopeDecisions: [{ id: 1, decisionType: 'Assumption', statement: 'Provider will deliver', status: 'Confirmed', validationStatus: 'Unverified' }] });
  const local = document.softwareRequirementsSpecification.qualityInterfaceSpecification;
  local.qualityAttributes['security-reviewStatus'] = 'Requirements identified';
  local.assumptionsAndDependencies['assumptions-reviewStatus'] = 'No outstanding conditions';
  const messages = qualityReview(quality, document).messages.join('\n');
  assert.match(messages, /no active statement/);
  assert.match(messages, /conflicts with assumptions lacking validation/);
  assert.match(messages, /condition is Unverified/);
  local.qualityAttributes['security-reviewStatus'] = 'No additional requirements';
  local.qualityAttributes['security-reviewFindings'] = 'Existing obligations cover the supported boundary.';
  assert(!qualityReview(quality, document).messages.some(text => text.startsWith('Security and Privacy:')));
});

test('deferred use cases retain their questions without participating in active handoffs', () => {
  const document = model({ useCases: [{ ...activeCase, disposition: 'Deferred', casualQuestions: 'Saved for later' }] });
  assert(!followThroughReview(document).messages.some(text => text.includes('casual questions')));
  const page = stage('srs-behavior-detailed-descriptions');
  const result = placedPreviewModel(page, {}, document, schema.document);
  assert.deepEqual(result.data.previewRecords1, []);
  assert.equal(recordState(document).useCases[0].casualQuestions, 'Saved for later');
});

test('phase evidence sources resolve to real SRS stages and sections', () => {
  for (const phase of schema.subpages.slice(2, 4)) for (const page of phase.subpages) {
    for (const source of page.evidence.sources.filter(source => source.pageId === schema.id)) {
      const target = stage(source.nodeId);
      assert(target, `${page.id}: ${source.nodeId}`);
      for (const group of source.groups) assert(target.sections.some(section => section.id === group.sectionId), `${page.id}: ${group.sectionId}`);
    }
  }
});

test('Phase 4 clipboard carries handoff answers and figure metadata without diagram payloads', () => {
  const document = model({ useCases: [{ ...activeCase, casualQuestions: 'Payment uncertainty SRS-ISS-001' }],
    artifacts: [{ id: 1, title: 'Scenario diagram', artifactGroup: 'activity-workflow', file: { name: 'flow.drawio', content: '<mxfile>PRIVATE-DIAGRAM-PAYLOAD</mxfile>', size: 45, format: 'drawio' }, figureFindings: 'Branch needs confirmation SRS-ISS-001' }],
    evidenceIssues: [{ id: 1, description: 'Payment policy', nextAction: 'Confirm cancellation policy' }]
  });
  document.softwareRequirementsSpecification.actorGoalDiscovery.candidateProcesses.handoffNotes = 'Carry the boundary question forward';
  const context = buildEvidenceContext(stage(quality).evidence, document, [schema]);
  assert.match(context, /Carry the boundary question forward/);
  assert.match(context, /Payment uncertainty/);
  assert.match(context, /Branch needs confirmation/);
  assert.match(context, /Confirm cancellation policy/);
  assert.doesNotMatch(context, /PRIVATE-DIAGRAM-PAYLOAD|<mxfile>/);
});

test('quality and interface views preserve kind IDs and isolate each category', () => {
  const document = model({ requirements: [
    { id: 1, requirementKind: 'Functional', statement: 'Functional obligation' },
    { id: 2, requirementKind: 'Quality', specificationGroup: 'security', statement: 'Security obligation' },
    { id: 3, requirementKind: 'Interface', specificationGroup: 'software', statement: 'Software contract' },
    { id: 4, requirementKind: 'Quality', specificationGroup: 'performance', statement: 'Performance target' }
  ] });
  for (const [stageId, sectionId, expected, prefix] of [
    ['srs-quality-attributes', 'security', 2, 'SRS-QR-'],
    ['srs-quality-interface-requirements', 'software', 3, 'SRS-IR-']
  ]) {
    const page = stage(stageId);
    const section = page.sections.find(section => section.id === sectionId);
    const preview = placedPreviewModel(page, {}, document, schema.document);
    const index = page.sections.indexOf(section);
    assert.deepEqual(preview.data[`previewRecords${index}`].map(item => item.id), [expected]);
    assert.equal(preview.page.sections[index].repeatable.displayId.prefix, prefix);
    // Isolate the section so sibling evidence does not intentionally add neighboring records.
    const prompt = buildSectionPrompt({ ...page, sections: [section] }, section, {}, document);
    assert.match(prompt, new RegExp(`${prefix}00${expected}`));
    assert.doesNotMatch(prompt, /Functional obligation|Performance target/);
  }
});
