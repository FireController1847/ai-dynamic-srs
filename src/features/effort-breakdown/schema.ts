import type { Field, FieldOption, Section, Repeater, SchemaNode, Reference, EvidenceSource, EvidenceGroup, GuideStep, Guide, AiGuidance, AiDefinition, DocumentConfig, Evidence } from '../../core/schema/schema-types.ts';
const allocationFields = [1, 2, 3, 4, 5].map((number) => ({
  key: `member${number}`,
  label: `Member ${number} responsibility (%)`,
  type: "number",
  default: 0,
  min: 0,
  max: 100,
  step: 1,
  columns: "col-sm-6 col-xl-4"
}));

const evenAllocation = { member1: 25, member2: 25, member3: 25, member4: 25, member5: 0 };

export const effortBreakdownSchema: SchemaNode = {
  id: "effort-breakdown",
  stateKey: "effortBreakdown",
  code: "EB",
  label: "Effort Breakdown (EB)",
  title: "Effort Breakdown",
  description: "Assign project responsibility and compare each team member's weighted contribution.",
  previewComponent: "effort-breakdown-preview",
  form: {
    kicker: "Responsibility allocation",
    intro: "Enter team members and distribute each task's responsibility so every task totals 100%.",
    showCompletion: false,
    fullWidth: true
  },
  guide: {
    title: "How to complete the Effort Breakdown",
    summary: "Use the responsibility matrix to make project ownership visible and reasonably balanced.",
    steps: [
      { title: "Name the team", text: "Enter up to five team members in the order they should appear in the matrix." },
      { title: "Confirm the tasks and points", text: "Keep, revise, or expand the seeded task list to match the actual final-project deliverables." },
      { title: "Allocate responsibility", text: "For each task, enter percentages that add to 100%. Use zero when a member has no responsibility for that task." },
      { title: "Review weighted totals", text: "Compare each member's point total and adjust the allocation when responsibility is unintentionally uneven." },
      { title: "Update after completion", text: "Revise projected percentages when the work actually performed differs from the original plan." }
    ],
    termsTitle: "Effort-allocation terms",
    terms: [
      { term: "Task completion", definition: "The sum of member responsibility percentages for a task; a fully allocated task totals 100%." },
      { term: "Member total", definition: "The sum of each task's point value multiplied by that member's responsibility percentage." }
    ]
  },
  ai: {
    definitions: [
      { term: "Task completion", definition: "The sum of responsibility percentages assigned to members for a task; full allocation totals 100%." },
      { term: "Member total", definition: "The sum of task points weighted by that member’s responsibility percentage." }
    ]
  },
  document: {
    titleField: "projectName",
    organizationField: "clientOrganization",
    versionField: "version",
    metadata: [
      { key: "preparedBy", label: "Prepared by" },
      { key: "preparationDate", dateDocument: "effortBreakdown", label: "Date", format: "date" },
      { key: "version", label: "Version" }
    ]
  },
  sections: [
    {
      id: "document-details",
      key: "documentDetails",
      title: "Document details and team",
      description: "Identify the document and the team members shown in the responsibility matrix.",
      includeInPreview: false,
      help: "Name up to five team members in the order they should appear in the matrix; leave unused positions blank. The document details identify the preparer, date and version of this allocation record.",
      fields: [
        { key: "preparedBy", label: "Prepared by", type: "text", default: "", columns: "col-md-4" },
        { key: "preparationDate", dateDocument: "effortBreakdown", label: "Preparation date", type: "date", default: "", columns: "col-md-4" },
        { key: "version", label: "Document version", type: "text", default: "0.1", columns: "col-md-4" },
        { key: "member1Name", label: "Team member 1", type: "text", default: "", columns: "col-md-4" },
        { key: "member2Name", label: "Team member 2", type: "text", default: "", columns: "col-md-4" },
        { key: "member3Name", label: "Team member 3", type: "text", default: "", columns: "col-md-4" },
        { key: "member4Name", label: "Team member 4", type: "text", default: "", columns: "col-md-4" },
        { key: "member5Name", label: "Team member 5", type: "text", default: "", columns: "col-md-4" }
      ]
    },
    {
      id: "responsibility-matrix",
      key: "responsibilityMatrix",
      title: "Responsibility matrix",
      description: "Assign a point value and each member's responsibility percentage for every final-project task.",
      help: "Use one row per task or meaningful subsection and confirm its point value. Assign nonnegative responsibility percentages totaling 100% for each row, using zero for members who do not own that task. Member totals weight each task’s points by the assigned percentage; revise the seeded tasks to match the actual work.",
      repeatable: {
        dataKey: "tasks",
        itemLabel: "Task",
        addLabel: "Add task",
        minimum: 1,
        completionFields: ["taskName", "points"],
        initialItems: [
          { taskName: "System Request", points: 60, ...evenAllocation },
          { taskName: "Cost-Benefit Analysis", points: 60, ...evenAllocation },
          { taskName: "Presentation", points: 60, ...evenAllocation },
          { taskName: "Brochure", points: 60, ...evenAllocation },
          { taskName: "Customer Statement of Requirements", points: 30, ...evenAllocation },
          { taskName: "Glossary of Terms", points: 5, ...evenAllocation },
          { taskName: "Stakeholders", points: 5, ...evenAllocation },
          { taskName: "Actors and Goals", points: 5, ...evenAllocation },
          { taskName: "Use Case Diagram", points: 20, ...evenAllocation },
          { taskName: "Casual Descriptions", points: 20, ...evenAllocation },
          { taskName: "Use Case Descriptions", points: 20, ...evenAllocation },
          { taskName: "Activity Diagrams", points: 25, ...evenAllocation },
          { taskName: "Interaction Diagrams", points: 25, ...evenAllocation },
          { taskName: "Overview Class Diagram and Domain List", points: 25, ...evenAllocation },
          { taskName: "Nonfunctional Requirements", points: 15, ...evenAllocation },
          { taskName: "References", points: 5, ...evenAllocation },
          { taskName: "User Interface Design", points: 50, ...evenAllocation }
        ],
        fields: [
          { key: "taskName", label: "Task name", type: "text", default: "", columns: "col-xl-5", completion: true },
          { key: "points", label: "Point value", type: "number", default: 0, min: 0, step: 0.5, columns: "col-sm-6 col-xl-2", completion: true },
          ...allocationFields
        ]
      }
    },
    {
      id: "allocation-notes",
      key: "allocationNotes",
      title: "Allocation notes",
      description: "Explain exceptions, major changes from the initial plan, or other context reviewers need.",
      help: "Explain material exceptions, intentional imbalances or changes between planned and actual contributions. Keep the notes focused on context that the percentages cannot express, without repeating the task rows.",
      fields: [
        { key: "allocationNotes", label: "Notes", type: "textarea", rows: 4, default: "", columns: "col-12" }
      ]
    }
  ]
};
