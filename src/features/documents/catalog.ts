/** Stable document identities for the workspace navigation. */
export const DOCUMENTS = [
  {
    id: 'cr', abbreviation: 'CR', title: 'Client Requirements',
    description: 'The client’s goals, problems, expectations, and requested capabilities.',
  },
  {
    id: 'sr', abbreviation: 'SR', title: 'System Request',
    description: 'The project sponsor, business need, business requirements, expected value, and special issues.',
  },
  {
    id: 'cba', abbreviation: 'CBA', title: 'Cost-Benefit Analysis',
    description: 'Estimated development and operating costs, benefits, and financial feasibility.',
  },
  {
    id: 'fsa', abbreviation: 'FSA', title: 'Feasibility & Stakeholder Analysis',
    description: 'Technical, economic, and organizational feasibility, including the people affected.',
  },
  {
    id: 'srs', abbreviation: 'SRS', title: 'Software Requirements Specification',
    description: 'The detailed functional and non-functional requirements for the proposed software.',
  },
  {
    id: 'eb', abbreviation: 'EB', title: 'Effort Breakdown',
    description: 'The responsibilities and contributions involved in preparing the specification.',
  },
  {
    id: 'gn', abbreviation: 'GN', title: 'General Notes',
    description: 'Supporting notes, observations, and information gathered throughout the project.',
  },
] as const;

export type DocumentDefinition = (typeof DOCUMENTS)[number];
export type DocumentId = DocumentDefinition['id'];

export function findDocument(id: string): DocumentDefinition | undefined {
  return DOCUMENTS.find(document => document.id === id);
}
