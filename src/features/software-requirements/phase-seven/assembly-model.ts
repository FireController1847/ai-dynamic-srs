import type { DataModel, DocumentModel, Field, SchemaNode, Section } from '../../../core/schema/schema-types.ts';
import { asDataModel, recordItems, valueAtPath } from '../../../core/schema/data-models.ts';
import { documentOutlineIndex } from '../../../core/schema/schema-tree.ts';
import { sectionRecords } from '../../../core/schema/section-records.ts';
import { fieldVisible } from '../../../core/schema/field-visibility.ts';
import { formatRecordDisplayId, hasValue } from '../../../core/records/record-values.ts';
import { reconciliationModel } from '../phase-six/traceability.ts';
import { requirementReferenceId } from '../requirement-records.ts';

interface AssemblyEntry extends DataModel {
  id: number;
  label: string;
  body: string;
  file?: unknown;
  figureId?: string;
  title?: string;
}
export interface AssemblyResult {
  page: SchemaNode;
  data: DataModel;
  findings: string[];
  excluded: string[];
  counts: { sections: number; entries: number; figures: number; sources: number };
  approved: boolean;
  status: string;
}

const SOURCE_IDS = new Set([
  'client-requirements', 'system-request', 'cost-benefit-analysis',
  'feasibility-stakeholder-analysis', 'general-notes'
]);
const EXCLUDED = /^(excluded|deferred|rejected|not an actor)$/i;
const PROVISIONAL = /^(draft|candidate|proposed|under review|in progress|unverified|needs clarification|needs evidence|reviewed with)/i;
const REPEATED_REVIEW = new Set([
  'reviewOutcome', 'reviewStatus', 'reviewNotes', 'reviewEvidence', 'issueReferences',
  'perspectiveReadiness', 'perspectiveNotes'
]);
function labelFor(field: Field, value: unknown): string {
  const options = field.options || [];
  const option = options.find(item => typeof item === 'object' && item.value === value);
  return option && typeof option === 'object' ? option.label : String(value ?? '');
}
function fieldText(value: unknown): string {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return value.map(fieldText).filter(Boolean).join('; ');
  if (value && typeof value === 'object') {
    const item = asDataModel(value);
    if ('content' in item || 'artifactKind' in item) return '[Stored attachment — rendered separately where supported]';
    return Object.entries(item).filter(([k]) => k !== 'id' && !k.startsWith('_'))
      .map(([k, v]) => `${k}: ${fieldText(v)}`).filter(Boolean).join('; ');
  }
  return '';
}
function recordState(record: DataModel): string {
  return String(record.disposition || record.scopeStatus || record.status || record.figureStatus || '').trim();
}
function recordId(section: Section, record: DataModel, index: number): string {
  if (section.repeatable?.dataKey === 'requirements') return requirementReferenceId(record);
  return formatRecordDisplayId(section.repeatable?.displayId, record, index);
}
function stageState(root: DataModel, phase: SchemaNode, stage: SchemaNode): DataModel {
  return asDataModel(asDataModel(root[phase.stateKey])[stage.stateKey]);
}
function sectionState(document: DocumentModel, local: DataModel, section: Section): DataModel {
  return section.dataPath ? asDataModel(valueAtPath(document, section.dataPath)) : local;
}
function visibleField(field: Field, record: DataModel): boolean {
  return field.includeInPreview !== false && !field.hidden && field.type !== 'diagram-file'
    && (field.preserveWhenHidden || fieldVisible(field, record));
}
function writtenFields(fields: readonly Field[], record: DataModel, claim: (key: string) => boolean,
  allowReview = false): string[] {
  const lines: string[] = [];
  for (const field of fields) {
    if (!visibleField(field, record) || (!allowReview && REPEATED_REVIEW.has(field.key))
      || !hasValue(record[field.key]) || !claim(field.key)) continue;
    const value = fieldText(record[field.key]);
    if (value) lines.push(`**${field.label}:** ${field.options ? labelFor(field, record[field.key]) : value}`);
  }
  return lines;
}

/**
 * Pure final-document projection. Original records/IDs are never rewritten.
 * A field has exactly one destination even when multiple working stages
 * showed it; the outline, not workflow navigation, owns final ordering.
 */
export function assembleSrs(document: DocumentModel, schemas: readonly SchemaNode[],
  projectContext: DataModel = {}): AssemblyResult {
  const srs = schemas.find(page => page.id === 'software-requirements-specification');
  const root = asDataModel(document.softwareRequirementsSpecification);
  const assembly = asDataModel(root.srsAssembly);
  const control = asDataModel(assembly.documentControl);
  const figures = asDataModel(assembly.controlledArtifacts);
  const appendix = asDataModel(assembly.appendices);
  const review = asDataModel(assembly.assemblyReview);
  const completion = asDataModel(assembly.completeDocument);
  const outline = documentOutlineIndex(srs?.document?.outline || []);
  const indexed = new Map<string, AssemblyEntry[]>();
  const excluded: string[] = [], findings: string[] = [];
  const seen = new Set<string>();
  let countFigures = 0, countSources = 0;

  const append = (target: string | undefined, entry: {label:string;body:string;file?:unknown;figureId?:string;title?:string}) => {
    if (!target || !outline.has(target)) return;
    const rows = indexed.get(target) || [];
    rows.push({ ...entry, id: rows.length + 1 });
    indexed.set(target, rows);
  };
  const draftPolicy = String(review.contentPolicy || 'Include active drafts with explicit status');
  const figurePolicy = String(figures.figurePolicy || 'Include available figures with review status');

  for (const phase of srs?.subpages || []) {
    if (phase.id === 'srs-assemble-document') continue;
    for (const stage of phase.subpages || []) {
      if (stage.id === 'srs-reconciliation-cleanup') continue;
      const local = stageState(root, phase, stage);
      for (const section of stage.sections || []) {
        if (!outline.has(section.documentTarget || '')) continue;
        // Working review questionnaires and live Phase 6 reports are not final SRS prose.
        if (section.id.toLowerCase().includes('review')
          && !section.repeatable && (section.fields || []).every(field =>
            REPEATED_REVIEW.has(field.key) || field.key === 'issueReferences')) continue;
        const source = sectionState(document, local, section);
        if (section.repeatable) {
          const repeater = section.repeatable, records = sectionRecords(repeater, source);
          records.forEach((record, index) => {
            const id = recordId(section, record, index);
            const status = recordState(record);
            const identity = `${repeater.dataKey}:${String(record.id ?? index)}`;
            const reason = EXCLUDED.test(status) ? 'deferred, rejected or excluded'
              : (draftPolicy === 'Reviewed or confirmed records only' && PROVISIONAL.test(status))
                ? 'unreviewed or provisional' : '';
            const figure = repeater.dataKey === 'artifacts';
            const figureReason = figure && figurePolicy === 'Include reconciled figures only'
              && status !== 'Reconciled' ? 'figure not reconciled' : '';
            if (reason || figureReason) {
              const marker = `${id} — ${status || 'Unspecified'}`;
              if (!excluded.includes(marker)) excluded.push(marker);
              return;
            }
            const lines = writtenFields(repeater.fields, record,
              key => { const name = identity + ':' + key; if (seen.has(name)) return false; seen.add(name); return true; });
            const fileField = repeater.fields.find(field => field.key === 'file' && field.type === 'diagram-file');
            const file = fileField ? record.file : undefined;
            let usableFile = false;
            if (figure && fileField) {
              usableFile = Boolean(file && typeof file === 'object' && hasValue(asDataModel(file).content));
              if (!usableFile) findings.push(`${id}: a diagram file is unavailable for offline rendering.`);
              else {
                const fileKey = identity + ':file';
                if (seen.has(fileKey)) usableFile = false;
                else { seen.add(fileKey); countFigures++; }
              }
            }
            const title = fieldText(record.name || record.title || record.viewpoint
              || record.statement || record.description || '');
            if (!lines.length && !usableFile) return;
            append(section.documentTarget, {
              label: [id, title].filter(Boolean).join(' — '),
              body: [status ? `**Record disposition:** ${status}` : '', ...lines].filter(Boolean).join('\n\n'),
              ...(usableFile ? { file, figureId: id, title: title || id } : {})
            });
          });
        } else {
          const fields = section.fields || [];
          const base = `${phase.id}:${stage.id}:${section.id}:`;
          const lines = writtenFields(fields, source,
            key => { const k = base + key; if (seen.has(k)) return false; seen.add(k); return true; });
          if (lines.length) append(section.documentTarget, { label: section.previewTitle || section.title, body: lines.join('\n\n') });
        }
      }
    }
  }

  const extras = (target: string, label: string, pairs: [string,unknown][]) => {
    const body = pairs.filter(([,value]) => hasValue(value))
      .map(([name,value]) => `**${name}:** ${fieldText(value)}`).join('\n\n');
    if (body) append(target, {label,body});
  };
  extras('front-matter.document-control','Document control',[
    ['Prepared by',control.preparedBy],['SRS version',control.version],
    ['Issue date',control.issueDate],['Document purpose',control.documentPurpose],
    ['Change authority',control.changeControl],['Approval authority',completion.approver],
    ['Approval date',completion.approvalDate],['Issue notes',completion.releaseNotes]
  ]);
  for (const entry of recordItems(control.revisionHistory).filter(item => !item._retired && !item.retired)) {
    extras('front-matter.revision-history','Revision ' + fieldText(entry.version || entry.id),[
      ['Date',entry.date],['Change',entry.description],['Authority',entry.authority]
    ]);
  }
  extras('supporting-information.artifacts','Figure and reference control',[
    ['Inclusion policy',figurePolicy],['Visual review',figures.visualReview],
    ['Reference review',figures.referenceReview],['Disposition notes',figures.figureReviewNotes]
  ]);
  extras('supporting-information.appendices','Supporting evidence disposition',[
    ['Inclusion',appendix.appendixPolicy],['Exclusion or missing-material rationale',appendix.appendixExclusion],
    ['Scope and availability notes',appendix.appendixNotes]
  ]);
  extras('verification-traceability.coverage','Assembly review',[
    ['Content inclusion',draftPolicy],['Human review disposition',review.reviewDisposition],
    ['Unresolved semantic findings',review.reviewNotes],['Exception authority',review.exceptionAuthority]
  ]);

  const trace = reconciliationModel(document);
  for (const row of trace.requirements) {
    const links = [
      ['Evidence',row.sourceEvidence], ['Use cases',row.useCases.join(', ')],
      ['Goals',row.goals.join(', ')], ['Actors',row.actors.join(', ')],
      ['Paths',row.paths], ['Figures',row.figures.join(', ')],
      ['Planned method',row.method], ['Review status',row.status],
      ['Outstanding checks',row.findings.join('; ')]
    ] as [string,unknown][];
    append('verification-traceability.traceability',{
      label: row.id + ' — canonical reference chain',
      body: links.filter(([,value])=>hasValue(value)).map(([k,v])=>`**${k}:** ${fieldText(v)}`).join('\n\n')
    });
  }
  for (const finding of trace.findings) findings.push(finding.message);

  // Existing issue register is already included exactly once above; retain
  // accepted exceptions and unresolved items as explicit audit evidence.
  const issues = recordItems(asDataModel(root.records).evidenceIssues)
    .filter(record => !record._retired && !record.retired);
  for (const issue of issues) {
    const status = String(issue.status || 'Open');
    if (status !== 'Resolved' && status !== 'Accepted exception')
      findings.push(`SRS-ISS-${String(issue.id).padStart(3,'0')}: unresolved issue (${status}).`);
  }
  if (excluded.length) append('supporting-information.appendices',{
    label:'Excluded and deferred records (audit)',
    body: 'These canonical records remain saved but were excluded from the normative content by the declared inclusion rules.\n\n'
      + excluded.map(item => '- ' + item).join('\n')
  });

  if (appendix.appendixPolicy === 'Embed available source workspace text') {
    for (const sourcePage of schemas.filter(page => SOURCE_IDS.has(page.id))) {
      const localRoot = asDataModel(document[sourcePage.stateKey]);
      const parts: string[] = [];
      const claims = new Set<string>();
      const visit = (node: SchemaNode, local: DataModel, path: string) => {
        for (const section of node.sections || []) {
          const model = sectionState(document, local, section);
          if (section.repeatable) {
            for (const [index, record] of sectionRecords(section.repeatable, model).entries()) {
              const prefix = `${section.repeatable.dataKey}:${record.id ?? index}`;
              const body = writtenFields(section.repeatable.fields, record,
                key => {const id = prefix + ':' + key; if (claims.has(id)) return false; claims.add(id); return true;},true);
              if (body.length) parts.push(`### ${section.title} — ${recordId(section,record,index)}\n\n${body.join('\n\n')}`);
            }
          } else {
            const body = writtenFields(section.fields || [], model,
              key => {const id = path + section.id + ':' + key;if(claims.has(id))return false;claims.add(id);return true;},true);
            if (body.length) parts.push(`### ${section.title}\n\n${body.join('\n\n')}`);
          }
        }
        for (const child of node.subpages || []) visit(child,asDataModel(local[child.stateKey]),path+child.stateKey+'/');
      };
      visit(sourcePage,localRoot,sourcePage.stateKey+'/');
      if (parts.length) {
        countSources++;
        append('supporting-information.appendices',{
          label: sourcePage.title || sourcePage.label || sourcePage.id,
          body: parts.join('\n\n')
        });
      }
    }
    if (!countSources) findings.push('No supporting source workspace text is currently available for the offline appendix.');
  } else if (appendix.appendixPolicy === 'Exclude supporting material with explicit rationale') {
    if (!hasValue(appendix.appendixExclusion))
      findings.push('An explicit rationale is required when prior supporting material is excluded.');
  } else findings.push('Supporting material has no recorded inclusion/disposition decision.');

  if (!hasValue(control.preparedBy) || !hasValue(control.version) || !hasValue(control.issueDate))
    findings.push('Document control requires a preparer, issue date and SRS version.');
  if (figures.visualReview !== 'Reviewed selected pages, captions and print rendering')
    findings.push('Selected diagram pages, captions and printed output have not been visually reviewed.');
  if (figures.referenceReview !== 'Checked IDs, citations and figure numbering')
    findings.push('Final references and figure numbering have not been explicitly checked.');
  if (review.reviewDisposition !== 'Reviewed for issue')
    findings.push('The final SRS has not received an explicit reviewed-for-issue disposition.');
  if (completion.releaseDecision === 'Approved for issue'
      && (!hasValue(completion.approver) || !hasValue(completion.approvalDate)))
    findings.push('Approval requires an actual approver and date.');
  const uniqueFindings = [...new Set(findings)];
  const approved = completion.releaseDecision === 'Approved for issue' && uniqueFindings.length === 0;
  const status = approved ? 'Approved for issue'
    : `${String(completion.releaseDecision || 'Working draft')} — NOT APPROVED`;

  const data: DataModel = {
    ...root, projectName: projectContext.projectName || root.projectName,
    preparedBy: control.preparedBy, version: control.version || '0.1',
    issueDate: control.issueDate, documentStatus: status
  };
  const sections: Section[] = [];
  let serial = 0;
  for (const [target, node] of outline) {
    const entries = indexed.get(target);
    if (!entries?.length) continue;
    const dataKey = `assembledSection${++serial}`;
    data[dataKey] = entries;
    sections.push({
      id: `assembly-section-${serial}`, key: dataKey,
      title: node.title, documentTarget: target, documentNumber: node.number,
      repeatable: {
        dataKey, itemLabel: 'Document entry', stableIds: true, minimum: 0,
        previewStyle: 'list', primaryField: 'label', artifactField: 'file',
        fields: [
          {key:'label',label:'Entry',type:'text'},
          {key:'body',label:'Details',type:'textarea',markdown:true},
          {key:'file',label:'Controlled figure',type:'diagram-file'}
        ]
      }
    });
  }
  const page: SchemaNode = {
    id:'srs-assembly-complete-document',stateKey:'completeDocument',
    code:'SRS',label:'Complete SRS',title:'Software Requirements Specification',
    description:'Controlled live projection of canonical SRS records.',
    omitEmptyFields:true,sections
  };
  return {
    page,data,findings:uniqueFindings,excluded,
    counts:{sections:sections.length,entries:[...indexed.values()].reduce((n,arr)=>n+arr.length,0),
      figures:countFigures,sources:countSources},
    approved,status
  };
}
