import type { JsonValue, PortableRecord } from '../../core/workspace/dsrs-format.ts';

export const FSA_KIND = 'fsa.assessment';
export const FSA_ID = 'main';

export const STAKEHOLDER_GROUPS = [
  ['champion', 'Project champions'],
  ['management', 'Organizational management'],
  ['user', 'System users'],
  ['other', 'Other stakeholders'],
] as const;
export type StakeholderGroup = (typeof STAKEHOLDER_GROUPS)[number][0];
export type AssessmentLevel = 'unassessed' | 'favorable' | 'concerns' | 'high-risk' | 'unknown';
export type Decision = 'undetermined' | 'reasonable' | 'conditional' | 'not-recommended';
export type TechnicalKey = 'technology' | 'domain' | 'size' | 'compatibility';
export type OrganizationalKey = 'alignment' | 'champions' | 'management' | 'users' | 'dependencies';

export interface Stakeholder extends Record<string, JsonValue> {
  id: string;
  group: StakeholderGroup;
  source: 'manual' | 'sr-sponsor';
  name: string;
  role: string;
  interests: string;
  concerns: string;
  involvement: string;
}

export interface Evaluation extends Record<string, JsonValue> {
  level: AssessmentLevel;
  context: string;
  risks: string;
  evidence: string;
  unknowns: string;
  stakeholderIds: string[];
}
export interface FeasibilityAssessment extends Record<string, JsonValue> {
  version: 1;
  stakeholders: Stakeholder[];
  technical: Record<TechnicalKey, Evaluation>;
  economic: Evaluation;
  organizational: Record<OrganizationalKey, Evaluation>;
  decision: Decision;
  decisionBasis: string;
}

export const TECHNICAL_AREAS: readonly { key: TechnicalKey; title: string; hint: string }[] = [
  { key: 'technology', title: 'Familiarity with technology', hint: 'Experience with proposed platforms, devices, and development tools.' },
  { key: 'domain', title: 'Familiarity with the functional area', hint: 'How well the team understands the business processes and users.' },
  { key: 'size', title: 'Project size and complexity', hint: 'Breadth, dependencies, timelines, scale, and integration effort.' },
  { key: 'compatibility', title: 'Compatibility with existing technology', hint: 'Existing systems, infrastructure, data, and external interfaces.' },
];
export const ORGANIZATIONAL_AREAS: readonly { key: OrganizationalKey; title: string; hint: string }[] = [
  { key: 'alignment', title: 'Strategic alignment', hint: 'How the proposed system supports business priorities.' },
  { key: 'champions', title: 'Project champion support', hint: 'Advocacy, resources, and commitment from project champions.' },
  { key: 'management', title: 'Organizational management support', hint: 'Leadership approval, staffing, sponsorship, and decision-making.' },
  { key: 'users', title: 'User readiness and acceptance', hint: 'Training, adoption barriers, access, and potential resistance.' },
  { key: 'dependencies', title: 'Organizational dependencies', hint: 'Operational changes, external parties, and other adoption conditions.' },
];
export const LEVELS: readonly [AssessmentLevel, string][] = [
  ['unassessed', 'Not assessed'],
  ['favorable', 'Favorable evidence'],
  ['concerns', 'Concerns identified'],
  ['high-risk', 'Significant risk'],
  ['unknown', 'Insufficient information'],
];

function evaluation(): Evaluation {
  return { level: 'unassessed', context: '', risks: '', evidence: '', unknowns: '', stakeholderIds: [] };
}
export function emptyFsa(): FeasibilityAssessment {
  return {
    version: 1, stakeholders: [],
    technical: { technology: evaluation(), domain: evaluation(), size: evaluation(), compatibility: evaluation() },
    economic: evaluation(),
    organizational: { alignment: evaluation(), champions: evaluation(),
      management: evaluation(), users: evaluation(), dependencies: evaluation() },
    decision: 'undetermined', decisionBasis: '',
  };
}
export function copyFsa(value: FeasibilityAssessment): FeasibilityAssessment {
  const copyArea = (item: Evaluation): Evaluation => ({ ...item, stakeholderIds: [...item.stakeholderIds] });
  return {
    ...value, stakeholders: value.stakeholders.map(item => ({ ...item })),
    technical: {
      technology: copyArea(value.technical.technology), domain: copyArea(value.technical.domain),
      size: copyArea(value.technical.size), compatibility: copyArea(value.technical.compatibility),
    },
    economic: copyArea(value.economic),
    organizational: {
      alignment: copyArea(value.organizational.alignment), champions: copyArea(value.organizational.champions),
      management: copyArea(value.organizational.management), users: copyArea(value.organizational.users),
      dependencies: copyArea(value.organizational.dependencies),
    },
  };
}
export function newStakeholder(group: StakeholderGroup, source: Stakeholder['source'] = 'manual'): Stakeholder {
  return { id: crypto.randomUUID(), group, source, name: '', role: '',
    interests: '', concerns: '', involvement: '' };
}

function object(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
function isStakeholder(value: unknown): value is Stakeholder {
  return object(value) && typeof value.id === 'string' && !!value.id.trim() &&
    STAKEHOLDER_GROUPS.some(([group]) => group === value.group) &&
    (value.source === 'manual' || value.source === 'sr-sponsor') &&
    ['name', 'role', 'interests', 'concerns', 'involvement'].every(key => typeof value[key] === 'string');
}
function isEvaluation(value: unknown): value is Evaluation {
  return object(value) && LEVELS.some(([level]) => level === value.level) &&
    ['context', 'risks', 'evidence', 'unknowns'].every(key => typeof value[key] === 'string') &&
    Array.isArray(value.stakeholderIds) &&
    value.stakeholderIds.every(id => typeof id === 'string' && !!id.trim()) &&
    new Set(value.stakeholderIds).size === value.stakeholderIds.length;
}
/** Invalid or future-version FSA content is never silently replaced with blank data. */
export function parseFsa(value: unknown): FeasibilityAssessment {
  if (!object(value) || value.version !== 1 ||
    !Array.isArray(value.stakeholders) || !value.stakeholders.every(isStakeholder) ||
    !object(value.technical) || !TECHNICAL_AREAS.every(area => isEvaluation(value.technical && (value.technical as Record<string, unknown>)[area.key])) ||
    !isEvaluation(value.economic) ||
    !object(value.organizational) || !ORGANIZATIONAL_AREAS.every(area =>
      isEvaluation(value.organizational && (value.organizational as Record<string, unknown>)[area.key])) ||
    !['undetermined', 'reasonable', 'conditional', 'not-recommended'].includes(String(value.decision)) ||
    typeof value.decisionBasis !== 'string') {
    throw new Error('The saved Feasibility & Stakeholder Analysis cannot be read safely.');
  }
  const ids = value.stakeholders.map(item => item.id);
  if (new Set(ids).size !== ids.length ||
    value.stakeholders.filter(item => item.source === 'sr-sponsor').length > 1) {
    throw new Error('The saved stakeholder list contains conflicting identities.');
  }
  const parsed = copyFsa(value as unknown as FeasibilityAssessment);
  const known = new Set(ids);
  const all = [
    ...TECHNICAL_AREAS.map(item => parsed.technical[item.key]),
    parsed.economic,
    ...ORGANIZATIONAL_AREAS.map(item => parsed.organizational[item.key]),
  ];
  if (all.some(area => area.stakeholderIds.some(id => !known.has(id)))) {
    throw new Error('The saved feasibility assessment has missing stakeholder references.');
  }
  return parsed;
}
export function fsaRecord(value: FeasibilityAssessment): PortableRecord {
  return { kind: FSA_KIND, id: FSA_ID, data: value };
}
