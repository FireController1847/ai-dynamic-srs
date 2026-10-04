import test from 'node:test';
import assert from 'node:assert/strict';
import { workspaceMarkdown } from '../src/core/workspace/workspace-markdown.ts';
import { softwareRequirementsSchema } from '../src/features/software-requirements/schema.ts';
import { notesSchema } from '../src/features/notes/schema.ts';

const field = (key, label = key, extra = {}) => ({ key, label, type: 'text', ...extra });
const page = (stateKey, title, sections = [], extra = {}) => ({ id: stateKey, stateKey, title, sections, ...extra });
const section = (id, fields, extra = {}) => ({ id, key: id, title: id, fields, ...extra });
const count = (text, value) => text.split(value).length - 1;
const exportMd = (pages, data) => workspaceMarkdown(pages, data, { title: 'Working project' });

test('navigation placement deduplicates carried fields in favor of their editable owner', () => {
  const schemas = [
    page('overview', 'Overview', [section('Read-only context', [field('answer', 'Carried answer', { editable: false })], { dataPath: ['details'] })]),
    page('details', 'Details', [section('Authoring', [field('answer', 'Actual answer')])])
  ];
  const document = { overview: {}, details: { answer: 'Canonical answer marker' } };
  const before = JSON.stringify(document);
  const md = exportMd(schemas, document);
  assert.equal(count(md, 'Canonical answer marker'), 1);
  assert.match(md, /## Details\n\n### Authoring\n\n\*\*Actual answer\*\*/);
  assert.doesNotMatch(md, /Carried answer|## Overview/);
  assert.equal(JSON.stringify(document), before);
});

test('existing shared use cases retain IDs and split identity from later descriptions once', () => {
  const data = { softwareRequirementsSpecification: { records: { useCases: [
    { id: 7, name: 'Unique case name', primaryActorId: 'SRS-ACT-003', disposition: 'Candidate',
      briefDescription: 'Unique behavioral summary', casualStory: 'Preserved older story' },
    { id: 12, name: 'Deferred case', disposition: 'Deferred', briefDescription: 'Saved deferred summary' },
    { id: 13, name: 'Retired case', _retired: true, briefDescription: 'Saved retired summary' }
  ] } } };
  const md = exportMd([softwareRequirementsSchema], data);
  for (const value of ['Unique case name', 'Unique behavioral summary', 'Preserved older story', 'Saved deferred summary', 'Saved retired summary']) assert.equal(count(md, value), 1, value);
  assert.match(md, /SRS-UC-007/);
  assert.match(md, /SRS-ACT-003/);
  assert.match(md, /\[retired\]/);
  assert.match(md, /02\.3 · Use Cases/);
  assert.match(md, /03\.1 · Casual Descriptions/);
  assert(md.indexOf('Use Cases') < md.indexOf('Unique case name'));
  assert(md.indexOf('Casual Descriptions') < md.indexOf('Unique behavioral summary'));
});

test('Notes includes complete bodies, nested sources, actual edit history and undeclared saved values', () => {
  const body = 'Long note marker '.repeat(1000) + '\n# Authored heading\n- A note item';
  const md = exportMd([notesSchema], { generalNotes: { notes: [{ id: 8, body,
    title: 'Older note title', relatedIds: 'SRS-UC-007',
    references: [{ id: 4, title: 'Client meeting', locator: 'https://example.com/source', notes: 'Evidence marker' }],
    editHistory: [{ id: 2, editedDate: '2026-10-04', changeSummary: 'Corrected scope', reason: 'Client clarification' }]
  }] } });
  assert.match(md, /GN-NOTE-008/);
  assert.equal(count(md, 'Long note marker'), 1000);
  assert.match(md, /> # Authored heading\n> - A note item/);
  for (const value of ['Older note title', 'SRS-UC-007', 'Client meeting', 'https://example.com/source', 'Evidence marker', '2026-10-04', 'Corrected scope', 'Client clarification']) assert.equal(count(md, value), 1, value);
  assert.match(md, /saved ID 4/);
  assert.match(md, /\*\*Edit history\*\*/);
});

test('zeros, false, option labels, inactive answers and unknown saved sections survive', () => {
  const schemas = [page('financial', 'Financial', [section('Inputs', [
    field('enabled', 'Enabled'), field('amount', 'Amount', { type: 'number' }),
    field('years', 'Annual amounts', { type: 'period-values' }),
    field('mode', 'Mode', { type: 'select', options: [{ value: 'custom', label: 'Custom schedule' }] }),
    field('details', 'Prior details', { showWhen: { key: 'enabled', equals: true } })
  ])])];
  const md = exportMd(schemas, { financial: { enabled: false, amount: 0, years: [0, 10, 0], mode: 'custom', details: 'Inactive saved marker', empty: '' },
    olderPage: { legacyAnswer: 'Unknown section marker', oldItems: [{ id: 20, text: 'Unknown child marker' }] } });
  assert.match(md, /\*\*Enabled\*\*\n\n> false/);
  assert.match(md, /\*\*Amount\*\*\n\n> 0/);
  assert.match(md, /Year 1:\*\* 0[\s\S]*Year 3:\*\* 0/);
  assert.match(md, /Custom schedule/);
  assert.match(md, /Prior details \(saved inactive value\)/);
  assert.equal(count(md, 'Inactive saved marker'), 1);
  assert.equal(count(md, 'Unknown section marker'), 1);
  assert.equal(count(md, 'Unknown child marker'), 1);
  assert.match(md, /saved ID 20/);
  assert.doesNotMatch(md, /\*\*Empty\*\*/);
});

test('figures include captions and file metadata but exclude uploaded XML and image bytes', () => {
  const figure = (group, content) => ({ id: group === 'map' ? 3 : 9, group, title: `${group} figure`, caption: `${group} caption`, file: {
    sourceFileName: `${group}.drawio`, artifactKind: 'DrawIO source', mediaType: 'application/xml', sizeBytes: 123, content
  } });
  const schemas = [page('srs', 'SRS', [], { subpages: ['map', 'activity'].map(group => page(group, group, [section(`${group} diagrams`, [], {
    dataPath: ['srs', 'records'], repeatable: { dataKey: 'artifacts', primaryField: 'title', displayId: { prefix: 'FIG-', padding: 4 },
      recordFilter: { key: 'group', equals: group }, fields: [field('title'), field('caption'), field('file', 'Diagram', { type: 'diagram-file' })] }
  })])) })];
  const md = exportMd(schemas, { srs: { records: { artifacts: [figure('map', '<mxfile>Secret XML marker</mxfile>'), figure('activity', 'data:image/png;base64,SecretBinaryMarker')] },
    oldDiagram: { sourceFileName: 'legacy.xml', content: '<mxGraphModel>Legacy XML marker</mxGraphModel>' } } });
  for (const value of ['map figure', 'map caption', 'map.drawio', 'activity figure', 'activity caption', 'activity.drawio', 'legacy.xml']) assert.equal(count(md, value), 1, value);
  assert.match(md, /FIG-0003/);
  assert.match(md, /FIG-0009/);
  assert.doesNotMatch(md, /Secret XML marker|SecretBinaryMarker|Legacy XML marker|<mxfile>|base64,/);
});

test('empty schema paths are read-only and structural Markdown titles are escaped', () => {
  const data = {};
  const md = exportMd([page('missing', 'Missing', [section('Input', [field('answer')], { dataPath: ['absent', 'nested'] })])], data);
  assert.deepEqual(data, {});
  assert.match(md, /No saved answers yet/);
  const title = workspaceMarkdown([], {}, { title: 'Project\n# Extra [heading]' });
  assert.match(title, /^# Project \\# Extra \\\[heading\\\]/);
});
