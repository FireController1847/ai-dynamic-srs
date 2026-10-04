import { records, short, text } from '../../planning/schema-helpers.ts';
export const stakeholderAnalysisSection = {
  ...records('stakeholder-analysis', 'Stakeholders', 'People and concerns carried from Client Requirements. Record feasibility-specific adoption concerns in Organizational feasibility below.', 'stakeholders', 'CR-STK-', 'name', [
    short('name', 'Person or group', { editable: false }), short('role', 'Role', { editable: false }), text('interest', 'Goals or concerns', { editable: false })
  ], { allowAdd: false, allowRemove: false, completionFields: [] }), dataPath: ['clientRequirements']
};
