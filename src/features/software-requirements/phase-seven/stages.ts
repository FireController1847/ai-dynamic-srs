import type { Field, SchemaNode, Section } from '../../../core/schema/schema-types.ts';

const text = (key: string, label: string, required = false): Field => ({
  key, label, type: 'textarea', rows: 3, default: '', completion: required,
  optional: !required
});
const choice = (key: string, label: string, options: string[]): Field => ({
  key, label, type: 'select', default: '', options, completion: true
});
const section = (id: string, title: string, target: string, fields: Field[]): Section =>
  ({ id, key: id, title, documentTarget: target, fields });

function stage(id: string, stateKey: string, label: string, description: string,
  targets: string[], sections: Section[], steps: {title: string; text: string}[],
  complete = false): SchemaNode {
  return {
    id, stateKey, label, description, documentTargets: targets,
    formComponent: 'assembly-stage-form',
    previewComponent: complete ? 'assembly-stage-preview' : 'placed-stage-preview',
    form: { kicker: 'Phase 7 · Assemble the SRS', intro: description, showCompletion: true,
      fullWidth: complete },
    guide: { title: label, summary: description, steps },
    ai: { showInterview: false },
    sections
  };
}

export const phaseSevenStages: readonly SchemaNode[] = Object.freeze([
  stage('srs-assembly-document-control', 'documentControl', 'Document Control',
    'Identify the issue, responsible parties and revision history without altering the underlying requirements.',
    ['front-matter.document-control', 'front-matter.revision-history'],
    [
      section('assembly-identification', 'Controlled document identity', 'front-matter.document-control', [
        { key: 'preparedBy', label: 'Prepared by', type: 'text', default: '', completion: true },
        { key: 'version', label: 'SRS document version', type: 'text', default: '', completion: true },
        { key: 'issueDate', label: 'Issue date', type: 'date', default: '', completion: true },
        text('documentPurpose', 'Specific issue purpose or audience (if needed)'),
        text('changeControl', 'Revision and change-control authority')
      ]),
      {
        id: 'assembly-revisions', key: 'assemblyRevisions', title: 'Revision history',
        documentTarget: 'front-matter.revision-history',
        repeatable: {
          dataKey: 'revisionHistory', itemLabel: 'Revision', addLabel: 'Add revision', minimum: 0,
          stableIds: true, previewStyle: 'list', primaryField: 'description', completionMinimum: 0,
          fields: [
            { key: 'version', label: 'Revision', type: 'text', default: '' },
            { key: 'date', label: 'Date', type: 'date', default: '' },
            { key: 'description', label: 'Recorded change and reason', type: 'textarea', default: '' },
            { key: 'authority', label: 'Author or approver', type: 'text', default: '' }
          ]
        }
      }
    ],
    [
      {title:'Identify the controlled issue',text:'Record the actual SRS version, issue date and preparer; these are document metadata, not permission to approve requirements.'},
      {title:'Preserve revisions',text:'Use revision entries for meaningful changes. Existing SRS requirement and figure IDs remain unchanged.'}
    ]),
  stage('srs-assembly-artifacts-references', 'controlledArtifacts', 'Figures & References',
    'Choose explicit figure inclusion rules and confirm reference labels and visual readability.',
    ['introduction.references', 'supporting-information.artifacts'],
    [section('assembly-figure-policy', 'Figure and reference control', 'supporting-information.artifacts', [
      choice('figurePolicy', 'Figure inclusion',
        ['Include available figures with review status', 'Include reconciled figures only']),
      choice('visualReview', 'Visual and offline diagram review',
        ['Not yet reviewed', 'Reviewed selected pages, captions and print rendering']),
      choice('referenceReview', 'Reference and numbering review',
        ['Not yet reviewed', 'Checked IDs, citations and figure numbering']),
      text('figureReviewNotes', 'Figure/reference exceptions and dispositions')
    ])],
    [
      {title:'Inspect the actual diagrams',text:'Check selected DrawIO pages and printed captions. Metadata or XML presence alone cannot establish visual correctness.'},
      {title:'Keep IDs stable',text:'Use canonical FIG IDs and saved evidence locators. Never renumber stored records to match document order.'}
    ]),
  stage('srs-assembly-appendices', 'appendices', 'Appendices',
    'Embed available supporting analysis for offline readers or give an explicit, reviewable exclusion.',
    ['supporting-information.appendices'],
    [section('assembly-appendix-decision', 'Supporting material disposition', 'supporting-information.appendices', [
      choice('appendixPolicy', 'Supporting material inclusion',
        ['Embed available source workspace text', 'Exclude supporting material with explicit rationale']),
      text('appendixExclusion', 'Reason and authority for unavailable or excluded material'),
      text('appendixNotes', 'Appendix scope and external-material availability')
    ])],
    [
      {title:'Preserve offline context',text:'Where included, the document uses the saved CR, SR, CBA, FSA and Notes source answers rather than live workspace links.'},
      {title:'Disclose exclusions',text:'An omitted or unavailable source requires an explicit disposition; text export does not imply that external attachments were embedded.'}
    ]),
  stage('srs-assembly-review', 'assemblyReview', 'Assembly Review',
    'Review the complete assembled document, included drafts, unresolved issues and verification plans without automatically approving anything.',
    ['verification-traceability.coverage', 'verification-traceability.verification'],
    [section('assembly-content-policy', 'Content and release-readiness review', 'verification-traceability.coverage', [
      choice('contentPolicy', 'Canonical content inclusion',
        ['Include active drafts with explicit status', 'Reviewed or confirmed records only']),
      choice('reviewDisposition', 'Assembly review disposition',
        ['In progress', 'Reviewed with open findings', 'Reviewed for issue']),
      text('reviewNotes', 'Outstanding meanings, document issues, and SRS-ISS dispositions'),
      text('exceptionAuthority', 'Authority accepting any documented exceptions')
    ])],
    [
      {title:'Challenge the assembled text',text:'Compare authored sources against the printed SRS. No partial preview is concatenated and no repeat register is written.'},
      {title:'Review blocking findings',text:'Unresolved SRS-ISS entries, unconfirmed targets, missing diagrams and incomplete verification plans stay visible.'},
      {title:'Keep planned verification honest',text:'A selected method and acceptance criterion are not executed tests or proof of compliance.'}
    ]),
  stage('srs-assembly-complete-document', 'completeDocument', 'Complete SRS',
    'Preview and print the assembled SRS, with explicit human issue approval and honest draft status.',
    [],
    [section('assembly-final-decision', 'Issue decision', 'front-matter.document-control', [
      choice('releaseDecision', 'Document issue disposition',
        ['Working draft', 'Ready for review', 'Approved for issue']),
      {key:'approver',label:'Actual approval authority',type:'text',default:'',completion:true,
        showWhen:{key:'releaseDecision',equals:'Approved for issue'}},
      {key:'approvalDate',label:'Actual approval date',type:'date',default:'',completion:true,
        showWhen:{key:'releaseDecision',equals:'Approved for issue'}},
      text('releaseNotes','Approval conditions, unresolved exceptions or issue notes')
    ])],
    [
      {title:'Read the single assembled document',text:'Use this final preview rather than accumulating working partials; print or save to PDF from its toolbar.'},
      {title:'Issue only by human decision',text:'The issue disposition is a recorded human decision. Open structural findings prevent the cover from claiming an approved release.'}
    ], true)
]);
