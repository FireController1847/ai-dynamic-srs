import test from 'node:test';
import assert from 'node:assert/strict';
import { softwareRequirementsSchema as schema } from '../src/features/software-requirements/schema.ts';
import { createDocumentState } from '../src/core/schema/state-factory.ts';
import { completionSummary } from '../src/core/schema/form-completion.ts';
import { buildInterviewPrompt, buildSectionPrompt } from '../src/core/ai/prompt-builder.ts';
import { createWorkspaceSnapshot } from '../src/core/workspace/workspace-format.ts';
import { parseWorkspace } from '../src/core/workspace/workspace-validation.ts';

const stage = id => schema.subpages.flatMap(phase => phase.subpages).find(page => page.id === id);
const discovery = stage('srs-discovery-processes');
const casual = stage('srs-behavior-casual-descriptions');
const catalog = discovery.sections.find(section => section.repeatable?.dataKey === 'useCases');
const descriptions = casual.sections.find(section => section.repeatable?.dataKey === 'useCases');
const model = useCases => createDocumentState([schema], { softwareRequirementsSpecification: { records: { useCases } } });
const records = document => document.softwareRequirementsSpecification.records.useCases;
const namedCase = { id: 7, name: 'Book appointment', primaryActorId: 'SRS-ACT-003', goalReferences: 'SRS-GOL-004', disposition: 'Candidate' };

test('identified use cases complete discovery without authoring a description', () => {
  const document = model([namedCase]);
  assert(!catalog.repeatable.fields.some(field => field.key === 'briefDescription'));
  assert.deepEqual(completionSummary({ sections: [catalog] }, {}, document), { completed: 1, total: 1 });
  assert.deepEqual(completionSummary(casual, {}, document), { completed: 0, total: 1 });
  assert.deepEqual(completionSummary({ sections: [catalog] }, {}, model([{ ...namedCase, name: '', briefDescription: 'A saved story' }])), { completed: 0, total: 1 });
});

test('casual completion covers every eligible description and ignores carried identity', () => {
  const document = model([
    { ...namedCase, briefDescription: 'Customer requests an appointment; the system records the booking.' },
    { ...namedCase, id: 9, name: 'Cancel appointment', briefDescription: '' },
    { ...namedCase, id: 12, disposition: 'Deferred' },
    { ...namedCase, id: 13, disposition: 'Excluded' },
    { ...namedCase, id: 14, _retired: true }
  ]);
  assert.equal(descriptions.repeatable.allowAdd, false);
  assert.equal(descriptions.repeatable.allowRemove, false);
  assert.deepEqual(completionSummary(casual, {}, document), { completed: 1, total: 2 });
  records(document)[1].briefDescription = 'Customer cancels; the system releases the appointment.';
  assert.deepEqual(completionSummary(casual, {}, document), { completed: 2, total: 2 });
  records(document)[1].name = '';
  records(document)[1].primaryActorId = '';
  assert.deepEqual(completionSummary(casual, {}, document), { completed: 2, total: 2 });
});

test('interview and scoped prompts keep description authoring in Casual Descriptions', () => {
  const document = model([{ ...namedCase, briefDescription: 'Saved behavioral marker' }]);
  for (const prompt of [buildInterviewPrompt(discovery, {}, document), buildSectionPrompt(discovery, catalog, {}, document)]) {
    assert.doesNotMatch(prompt, /Saved behavioral marker|short purpose\/result paragraph/);
    assert.match(prompt, /03\.1 Casual Descriptions/);
  }
  for (const prompt of [buildInterviewPrompt(casual, {}, document), buildSectionPrompt(casual, descriptions, {}, document)]) {
    assert.match(prompt, /Saved behavioral marker/);
    assert.match(prompt, /Short description/);
    assert.match(prompt, /SRS-UC-007/);
  }
});

test('saved descriptions and references survive normalization, refinement and round trip', () => {
  const document = model([
    { ...namedCase, briefDescription: 'Existing summary', casualStory: 'Older separate story' },
    { ...namedCase, id: 12, disposition: 'Deferred', briefDescription: 'Deferred summary' }
  ]);
  assert.equal(records(document)[0].briefDescription, 'Existing summary');
  records(document)[0].briefDescription = 'Refined summary';
  const snapshot = createWorkspaceSnapshot({ projectContext: {}, sections: document });
  const loaded = createDocumentState([schema], parseWorkspace(JSON.stringify(snapshot)).document.sections);
  assert.deepEqual(records(loaded), records(document));
  assert.equal(records(loaded)[0].casualStory, 'Older separate story');
  assert.deepEqual(records(loaded).map(record => record.id), [7, 12]);
  assert.equal(records(loaded)[0].primaryActorId, 'SRS-ACT-003');
  assert.equal(records(loaded)[0].goalReferences, 'SRS-GOL-004');
  const detailed = stage('srs-behavior-detailed-descriptions');
  const section = detailed.sections.find(section => section.repeatable?.dataKey === 'useCases');
  assert.equal(section.repeatable.fields.find(field => field.key === 'briefDescription').editable, false);
  assert.match(buildSectionPrompt(detailed, section, {}, loaded), /Refined summary/);
});
