import type { Field, FieldOption, Section, Repeater, SchemaNode, Reference, EvidenceSource, EvidenceGroup, GuideStep, Guide, AiGuidance, AiDefinition, DocumentConfig, Evidence } from '../../../core/schema/schema-types.ts';
import { simplifiedEvidence } from "./evidence.ts";
import { promptTasks } from "../workflow/prompt-tasks.ts";
import { promptDefinitions } from "../workflow/prompt-definitions.ts";
import { humanSectionHelp, scalarSectionHelp, stageGuides } from './help-content.ts';
import { simplifyReference } from "./references.ts";
import { recordFields, essentialFields } from './field-policy.ts';

const text = (key: string, label: string, extra: Partial<Field> = {}): Field => ({ key, label, type: 'textarea', default: '', rows: 2, completion: false, ...extra });
const notes = text('additionalDetails', 'Additional details (optional)', { optional: true, aiHint: 'Only distinct qualifications that do not belong in the main answer. Leave blank otherwise.' });
const tasks = promptTasks;

function compactSection(section: Section, stageId: string): Section | null {
  const r = section.repeatable;
  if (!r) return null; // Routine review questionnaires are retired, not hidden.
  if (r.dataKey === 'evidenceIssues' && stageId !== 'srs-baseline-evidence-intake') return null;
  const keep = recordFields[r.dataKey];
  if (!keep) return section;
  let fields = r.fields.filter(f => f.hidden || keep.includes(f.key));
  for (const f of r.fields.filter(f => ['status', 'scopeStatus'].includes(f.key) && !keep.includes(f.key))) fields.push({ ...f, hidden: true, editable: false, includeInPrompt: false, includeInPreview: true, showWhen: { key: f.key, in: ['Not an actor', 'Needs clarification', 'Needs scope decision', 'Deferred', 'Excluded'] } });
  if (stageId === 'srs-behavior-casual-descriptions') {
    fields = fields.filter(f => ['name', 'primaryActorId', 'briefDescription'].includes(f.key));
    fields = fields.map(f => f.key === 'briefDescription' ? { ...f, editable: true, label: 'Short description', rows: 3 } : f);
  }
  if (stageId === 'srs-discovery-processes') {
    fields = fields.filter(f => !['trigger', 'importance', 'stakeholderInterests', 'detailLevel', 'descriptionStyle'].includes(f.key));
  }
  if (stageId === 'srs-behavior-detailed-descriptions' && r.dataKey === 'useCases') {
    fields = fields.map(f => f.key === 'trigger' ? { ...f, editable: true } : f);
    fields.push(text('stakeholderInterests', 'Relevant stakeholder interests (if needed)'), {
      key: 'importance', label: 'Importance', type: 'select', default: '', options: ['High', 'Medium', 'Low'], completion: false
    });
  }
  // Existing provenance remains context, never another form-entry task.
  for (const f of r.fields.filter(f => ['sourceReferences', 'perspectiveReferences'].includes(f.key) && !keep.includes(f.key))) {
    fields.push({ ...f, hidden: true, editable: false, completion: false, includeInPreview: false, aiHint: 'Existing provenance; preserve without re-entry.' });
  }
  if (stageId === 'srs-behavior-detailed-descriptions') fields = fields.map(f => ['normalFlow', 'subflows', 'alternativeFlows'].includes(f.key)
    ? { ...f, showWhen: { key: 'detailLevel', notIn: ['Overview sufficient'] }, preserveWhenHidden: true } : f);
  fields = fields.map(simplifyReference).map(f => ['sourceReferences', 'priority', 'boundaryName', 'stakeholderInterests', 'descriptionStyle', 'specialConditions', 'subflows', 'failureGuarantee', 'preconditions'].includes(f.key)
    ? { ...f, optional: true, aiHint: 'Supply only if necessary and not already established by the main answer or linked record.' } : f);
  const completionFields = stageId === 'srs-behavior-detailed-descriptions' && r.dataKey === 'useCases'
    ? ['trigger', 'detailLevel', 'normalFlow']
    : essentialFields[r.dataKey] || [];
  fields = fields.map(f => ({ ...f, completion: !f.hidden && !f.optional && f.editable !== false && completionFields.includes(f.key) }));
  if (!['useCases', 'requirements'].includes(r.dataKey) || !['srs-behavior-casual-descriptions', 'srs-discovery-processes'].includes(stageId)) fields.push(notes);
  if (r.dataKey === 'actors') fields = fields.map(f => f.key === 'interaction' ? { ...f, label: 'Role clarification (optional)', optional: true, placeholder: 'Only if the role name and goals need clarification.', rows: 2 } : f);
  if (r.dataKey === 'requirements') fields = fields.map(f => f.key === 'acceptanceCriterion' ? { ...f, label: 'Additional acceptance detail (if needed)', optional: true, placeholder: 'Leave blank if the statement already makes success clear.' } : f);
  return { ...section, description: '', help: humanSectionHelp(section),
    repeatable: { ...r, minimum: 0, completionMinimum: r.completionMinimum ?? r.minimum ?? 0, completionMode: 'all-required',
      completionFields: fields.filter(f => f.completion).map(f => f.key), fields,
      primaryField: fields.some(f => f.key === r.primaryField) ? r.primaryField : fields.find(f => !f.hidden)?.key }
  };
}

export function simplifyStage(stage: SchemaNode): SchemaNode {
  if (!tasks[stage.id]) return stage;
  let sections = (stage.sections || []).map(s => compactSection(s, stage.id)).filter((section): section is Section => section !== null);
  if (stage.id === 'srs-baseline-scope') sections.unshift({
    id: 'carried-scope', key: 'carriedScope', title: 'Existing project boundary', documentTarget: 'introduction.scope',
    dataPath: ['clientRequirements'], fields: [
      text('inScope', 'Included', { editable: false }), text('outOfScope', 'Excluded', { editable: false })
    ], description: 'Carried from Client Requirements. Add a scope decision below only when the boundary changes.'
  });
  if (stage.id === 'srs-baseline-specification-frame') sections.unshift({
    id: 'specification-purpose', key: 'specificationPurpose', title: 'Purpose and product context', documentTarget: 'introduction.purpose-audience',
    fields: [text('purposeStatement', 'Purpose of this SRS', { completion: true }), text('productPerspective', 'Product context (only if the carried context needs refinement)')]
  });
  if (stage.id === 'srs-quality-operating-context') sections.unshift({
    id: 'operating-environment', key: 'operatingEnvironment', title: 'Operating environment', documentTarget: 'overall-description.operating-environment',
    fields: [text('environmentDescription', 'Where and under what conditions the system runs', { completion: true })]
  });
  // A simple category choice distinguishes an untouched category from a deliberate absence.
  if (['srs-quality-attributes', 'srs-quality-interface-requirements'].includes(stage.id)) {
    sections = sections.flatMap(section => [{
      id: `${section.id}-applicability`, key: `${section.key}Applicability`, title: section.title,
      documentTarget: section.documentTarget,
      description: 'Choose whether this category applies, then add only supported obligations.',
      help: `${humanSectionHelp(section)} Choose Applicable when obligations exist, Not applicable when the category is outside the project, or Needs clarification when evidence is missing.`,
      fields: [{ key: `${section.id}Applicability`, label: 'Applies to this project', type: 'select', default: '',
        options: ['Applicable', 'Not applicable', 'Needs clarification'], completion: true }]
    }, section]);
  }
  sections = sections.map(section => ({ ...section, help: scalarSectionHelp[section.id] || section.help || humanSectionHelp(section) }));
  const task = tasks[stage.id];
  const guide = stageGuides[stage.id];
  return { ...stage, label: stage.id === 'srs-discovery-processes' ? 'Use Cases' : stage.id === 'srs-discovery-perspectives' ? 'User Classes' : stage.label,
    description: guide.summary, sections, omitEmptyFields: true,
    evidence: simplifiedEvidence(stage),
    formComponent: stage.id === 'srs-discovery-actors-goals' ? 'actors-goals-form' : 'simplified-stage-form',
    form: { ...stage.form, intro: guide.summary, showCompletion: true },
    guide,
    ai: { ...stage.ai, task, definitions: promptDefinitions[stage.id] || [], compactInterview: true, includeSiblingContext: false, draftingGuidance: task, interviewGuidance: task }
  };
}
