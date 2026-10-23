import {
  computed, defineComponent, h, nextTick, onBeforeUnmount, ref, watch,
  type PropType, type VNode,
} from 'vue';
import { calculateProjection } from '../cost-benefit/calculations.ts';
import { CBA_ID, CBA_KIND, parseAnalysis } from '../cost-benefit/model.ts';
import { SR_REQUEST_ID, SR_REQUEST_KIND, parseRequest, type SystemRequest } from '../system-request/model.ts';
import {
  LEVELS, ORGANIZATIONAL_AREAS, STAKEHOLDER_GROUPS, TECHNICAL_AREAS,
  newStakeholder, type AssessmentLevel, type Decision, type Evaluation,
  type FeasibilityAssessment, type OrganizationalKey, type Stakeholder,
  type StakeholderGroup, type TechnicalKey,
} from './model.ts';
import { useFsa, type FsaWorkspace } from './use-fsa.ts';

export interface FsaHandle { flushSave(): Promise<boolean> }
type Node = VNode | null;
type EvaluationPatch = Partial<Pick<Evaluation, 'level' | 'context' | 'risks' | 'evidence' | 'unknowns' | 'stakeholderIds'>>;
type StakeholderPatch = Partial<Pick<Stakeholder, 'name' | 'role' | 'interests' | 'concerns' | 'involvement'>>;

const DECISIONS: readonly [Decision, string][] = [
  ['undetermined', 'Not yet determined'],
  ['reasonable', 'Appears reasonable to proceed'],
  ['conditional', 'Proceed only after addressing conditions'],
  ['not-recommended', 'Not recommended at present'],
];

function currency(value: number, code: string): string {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: code, maximumFractionDigits: 2 }).format(value);
}
function percent(value: number): string {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(value) + '%';
}
function levelLabel(level: AssessmentLevel): string {
  return LEVELS.find(([key]) => key === level)?.[1] ?? 'Not assessed';
}
function decisionLabel(value: Decision): string {
  return DECISIONS.find(([key]) => key === value)?.[1] ?? 'Not yet determined';
}
function previewText(value: string): Node {
  return value.trim() ? h('p', { class: 'fsa-copy' }, value.trim()) : null;
}

export const FsaEditor = defineComponent({
  name: 'FsaEditor',
  props: { workspace: { type: Object as PropType<FsaWorkspace>, required: true } },
  emits: { 'dirty-change': (_dirty: boolean) => true },
  setup(props, { expose, emit }) {
    const state = useFsa(props.workspace);
    const view = ref<'assessment' | 'preview'>('assessment');
    expose({ flushSave: state.flushSave } satisfies FsaHandle);
    watch(state.dirty, dirty => emit('dirty-change', dirty), { immediate: true });
    onBeforeUnmount(() => emit('dirty-change', false));

    const sr = computed<{ value: SystemRequest | null; error: string }>(() => {
      const row = props.workspace.current.value?.file.records.find(record =>
        record.kind === SR_REQUEST_KIND && record.id === SR_REQUEST_ID);
      if (!row) return { value: null, error: '' };
      try { return { value: parseRequest(row.data), error: '' }; }
      catch { return { value: null, error: 'The saved System Request could not be read.' }; }
    });
    const cba = computed(() => {
      const row = props.workspace.current.value?.file.records.find(record =>
        record.kind === CBA_KIND && record.id === CBA_ID);
      if (!row) return { analysis: null, projection: null, error: '' };
      try {
        const analysis = parseAnalysis(row.data);
        return { analysis, projection: calculateProjection(analysis), error: '' };
      } catch {
        return { analysis: null, projection: null, error: 'The saved Cost-Benefit Analysis could not be read.' };
      }
    });
    const sponsorRecorded = computed(() => !!sr.value.value &&
      !!(sr.value.value.sponsorContact.trim() || sr.value.value.sponsorOrganization.trim()));
    const sponsorLinked = computed(() => state.draft.value.stakeholders.some(item => item.source === 'sr-sponsor'));
    const allEvaluations = computed(() => [
      ...TECHNICAL_AREAS.map(area => ({ title: 'Technical · ' + area.title, value: state.draft.value.technical[area.key] })),
      { title: 'Economic · Financial feasibility', value: state.draft.value.economic },
      ...ORGANIZATIONAL_AREAS.map(area => ({ title: 'Organizational · ' + area.title, value: state.draft.value.organizational[area.key] })),
    ]);
    const concerns = computed(() => allEvaluations.value.filter(item =>
      item.value.level === 'concerns' || item.value.level === 'high-risk'));
    const unknowns = computed(() => allEvaluations.value.filter(item =>
      item.value.level === 'unknown' || item.value.level === 'unassessed' ||
      !!item.value.unknowns.trim()));

    function update(patch: Partial<FeasibilityAssessment>) {
      state.update({ ...state.draft.value, ...patch } as FeasibilityAssessment);
    }
    function updateStakeholder(id: string, patch: StakeholderPatch) {
      update({ stakeholders: state.draft.value.stakeholders.map(item =>
        item.id === id ? { ...item, ...patch } : item) });
    }
    function addStakeholder(group: StakeholderGroup, source: Stakeholder['source'] = 'manual') {
      if (source === 'sr-sponsor' && sponsorLinked.value) return;
      update({ stakeholders: [...state.draft.value.stakeholders, newStakeholder(group, source)] });
    }
    function removeStakeholder(item: Stakeholder) {
      if (!window.confirm('Remove this stakeholder and its assessment references?')) return;
      const without = (area: Evaluation): Evaluation => ({
        ...area, stakeholderIds: area.stakeholderIds.filter(id => id !== item.id),
      });
      const current = state.draft.value;
      update({
        stakeholders: current.stakeholders.filter(entry => entry.id !== item.id),
        technical: Object.fromEntries(TECHNICAL_AREAS.map(area =>
          [area.key, without(current.technical[area.key])])) as FeasibilityAssessment['technical'],
        economic: without(current.economic),
        organizational: Object.fromEntries(ORGANIZATIONAL_AREAS.map(area =>
          [area.key, without(current.organizational[area.key])])) as FeasibilityAssessment['organizational'],
      });
    }
    function technical(key: TechnicalKey, patch: EvaluationPatch) {
      const current = state.draft.value;
      update({ technical: { ...current.technical,
        [key]: { ...current.technical[key], ...patch } } });
    }
    function organizational(key: OrganizationalKey, patch: EvaluationPatch) {
      const current = state.draft.value;
      update({ organizational: { ...current.organizational,
        [key]: { ...current.organizational[key], ...patch } } });
    }
    function economic(patch: EvaluationPatch) {
      update({ economic: { ...state.draft.value.economic, ...patch } });
    }
    function input(id: string, label: string, value: string, change: (next: string) => void,
      placeholder = '', multiline = false): Node {
      const attrs = {
        id, class: 'cr-input', value, placeholder, disabled: !state.writable.value,
        onInput: (event: Event) => {
          if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
            change(event.target.value);
          }
        },
      };
      return h('div', { class: 'fsa-field' }, [
        h('label', { for: id }, label),
        multiline ? h('textarea', { ...attrs, class: 'cr-input cr-input--multiline', rows: 2 }) :
          h('input', { ...attrs, type: 'text' }),
      ]);
    }
    function select<T extends string>(id: string, label: string, current: T,
      options: readonly (readonly [T, string])[], change: (next: T) => void): Node {
      return h('div', { class: 'fsa-field' }, [
        h('label', { for: id }, label),
        h('select', { id, class: 'cr-input', value: current, disabled: !state.writable.value,
          onChange: (event: Event) => {
            if (event.target instanceof HTMLSelectElement) change(event.target.value as T);
          },
        }, options.map(([value, title]) => h('option', { value }, title))),
      ]);
    }
    function stakeholderName(item: Stakeholder): string {
      if (item.source === 'sr-sponsor') {
        const request = sr.value.value;
        return request?.sponsorContact.trim() || request?.sponsorOrganization.trim() || 'SR sponsor not specified';
      }
      return item.name.trim() || 'Unnamed stakeholder';
    }
    function stakeholderRole(item: Stakeholder): string {
      return item.source === 'sr-sponsor' ? (sr.value.value?.sponsorRole.trim() || 'Project sponsor') : item.role.trim();
    }
    function stakeholderEditor(item: Stakeholder): Node {
      const id = 'fsa-stakeholder-' + item.id;
      return h('details', { key: item.id, class: 'fsa-entry' }, [
        h('summary', [
          h('span', { class: 'fsa-entry-label' }, stakeholderName(item)),
          h('span', { class: 'fsa-entry-meta' }, stakeholderRole(item) || 'Role not recorded'),
        ]),
        h('div', { class: 'fsa-entry-body' }, [
          item.source === 'sr-sponsor' ? h('div', { class: 'fsa-crossref' }, [
            h('strong', 'Linked System Request sponsor'),
            h('p', (sr.value.value?.sponsorOrganization.trim() || 'Organization not specified') +
              ' · Name and role are maintained in SR, not copied here.'),
            h('a', { href: '#/documents/sr' }, 'View System Request'),
            sr.value.error ? h('p', { role: 'alert' }, sr.value.error) : null,
          ]) : h('div', { class: 'fsa-form-grid' }, [
            input(id + '-name', 'Person or group', item.name, value => updateStakeholder(item.id, { name: value }),
              'Name, team, or organization'),
            input(id + '-role', 'Project role', item.role, value => updateStakeholder(item.id, { role: value }),
              'e.g. IT staff, project sponsor'),
          ]),
          input(id + '-interests', 'Interests and expected benefits', item.interests,
            value => updateStakeholder(item.id, { interests: value }), 'What matters to this stakeholder?', true),
          input(id + '-concerns', 'Concerns', item.concerns,
            value => updateStakeholder(item.id, { concerns: value }), 'Potential objections or impacts', true),
          input(id + '-involvement', 'Involvement or expected support', item.involvement,
            value => updateStakeholder(item.id, { involvement: value }), 'Review, decisions, adoption, training…', true),
          h('div', { class: 'fsa-entry-actions' }, [
            h('button', { type: 'button', class: 'quiet-button', disabled: !state.writable.value,
              onClick: () => removeStakeholder(item) }, 'Remove stakeholder'),
          ]),
        ]),
      ]);
    }
    function stakeholderSection(): Node {
      const current = state.draft.value.stakeholders;
      return panel('1 · Stakeholder analysis', 'Identify people and groups who may support, influence, or use the system.',
        STAKEHOLDER_GROUPS.map(([group, label]) => {
          const entries = current.filter(item => item.group === group);
          return h('div', { class: 'fsa-group', key: group }, [
            h('div', { class: 'fsa-group-header' }, [
              h('h4', label),
              h('button', { type: 'button', class: 'quiet-button', disabled: !state.writable.value,
                onClick: () => addStakeholder(group) }, '+ Add'),
            ]),
            entries.length ? entries.map(stakeholderEditor) :
              h('p', { class: 'fsa-muted' }, 'No stakeholders recorded in this category.'),
            group === 'champion' && !sponsorLinked.value ? h('div', { class: 'fsa-sponsor-action' }, [
              h('button', { type: 'button', class: 'quiet-button',
                disabled: !state.writable.value || !sponsorRecorded.value,
                onClick: () => addStakeholder('champion', 'sr-sponsor') }, '+ Link SR sponsor'),
              h('span', { class: 'fsa-muted' }, sponsorRecorded.value
                ? 'Use the project sponsor without duplicating their name and role.'
                : 'Add a sponsor in System Request to enable this link.'),
            ]) : null,
          ]);
        }));
    }
    function references(id: string, area: Evaluation, change: (patch: EvaluationPatch) => void): Node {
      if (!state.draft.value.stakeholders.length) {
        return h('p', { class: 'fsa-muted' }, 'Add stakeholders above to link them with this assessment.');
      }
      return h('fieldset', { class: 'fsa-references' }, [
        h('legend', 'Relevant stakeholders (optional)'),
        ...state.draft.value.stakeholders.map(item =>
          h('label', { key: item.id, class: 'fsa-reference' }, [
            h('input', { type: 'checkbox', name: id + '-' + item.id,
              checked: area.stakeholderIds.includes(item.id), disabled: !state.writable.value,
              onChange: (event: Event) => {
                if (!(event.target instanceof HTMLInputElement)) return;
                const ids = event.target.checked ? [...area.stakeholderIds, item.id] :
                  area.stakeholderIds.filter(key => key !== item.id);
                change({ stakeholderIds: ids });
              },
            }),
            h('span', stakeholderName(item)),
          ])),
      ]);
    }
    function evaluationCard(id: string, title: string, hint: string, area: Evaluation,
      change: (patch: EvaluationPatch) => void, showStakeholders = false): Node {
      return h('details', { key: id, class: 'fsa-assessment-card' }, [
        h('summary', { class: 'fsa-assessment-header' }, [
          h('span', { class: 'fsa-assessment-title' }, [h('strong', title), h('small', hint)]),
          h('span', { class: ['fsa-level', 'fsa-level-' + area.level] }, levelLabel(area.level)),
        ]),
        h('div', { class: 'fsa-assessment-body' }, [
          select(id + '-level', 'Current assessment', area.level, LEVELS, value => change({ level: value })),
          input(id + '-context', 'Known circumstances', area.context,
            value => change({ context: value }), 'Relevant conditions, capabilities, and constraints', true),
          h('div', { class: 'fsa-form-grid' }, [
            input(id + '-risks', 'Risks or concerns', area.risks,
              value => change({ risks: value }), 'Specific issues and possible consequences', true),
            input(id + '-unknowns', 'Unresolved questions', area.unknowns,
              value => change({ unknowns: value }), 'What needs to be verified?', true),
          ]),
          input(id + '-evidence', 'Evidence and sources', area.evidence,
            value => change({ evidence: value }), 'Client input, study, test, source or reference', true),
          showStakeholders ? references(id, area, change) : null,
        ]),
      ]);
    }
    function panel(title: string, description: string, children: Node[] | VNode[]): Node {
      return h('section', { class: 'fsa-panel' }, [
        h('header', { class: 'fsa-panel-heading' }, [h('h3', title), h('p', description)]),
        ...children,
      ]);
    }
    function financialEvidence(): Node {
      const linked = cba.value;
      const a = linked.analysis, p = linked.projection;
      if (linked.error) return h('p', { class: 'fsa-note', role: 'alert' }, linked.error);
      if (!a || !p) return h('div', { class: 'fsa-note' }, [
        h('strong', 'Financial assessment incomplete'),
        h('p', 'No saved Cost-Benefit Analysis is available. Financial results cannot be inferred.'),
        h('a', { href: '#/documents/cba' }, 'Open Cost-Benefit Analysis'),
      ]);
      if (!p.summary) return h('div', { class: 'fsa-note' }, [
        h('strong', 'Financial assessment incomplete'),
        h('p', p.error || 'The CBA is saved but required financial inputs are missing.'),
        p.missing.length ? h('p', { class: 'fsa-muted' }, 'Missing: ' + p.missing.join(' · ')) : null,
        h('a', { href: '#/documents/cba' }, 'Review CBA inputs'),
      ]);
      const metrics = [
        ['Net present value', currency(p.summary.npv, a.currency)],
        ['Nominal ROI', p.summary.roiPercent === null ? 'Not defined' : percent(p.summary.roiPercent)],
        ['Whole-year payback', p.summary.paybackYear === null ? 'Not reached' : 'Year ' + p.summary.paybackYear],
        ['Projected benefits', currency(p.summary.totalBenefits, a.currency)],
        ['Projected costs', currency(p.summary.totalCosts, a.currency)],
        ['Benefit/cost ratio', p.summary.benefitCostRatio === null ? 'Not defined' : p.summary.benefitCostRatio.toFixed(2) + '×'],
      ];
      return h('div', { class: 'fsa-financial' }, [
        h('p', { class: 'fsa-muted' }, 'Calculated in CBA · ' + a.projectionYears + ' years · ' +
          percent(a.discountRatePercent as number) + ' annual discount rate. Estimates, not an approval decision.'),
        h('dl', { class: 'fsa-financial-grid' }, metrics.map(([label, value]) => h('div', { key: label }, [
          h('dt', label), h('dd', value),
        ]))),
        h('a', { href: '#/documents/cba' }, 'Open authoritative financial model'),
      ]);
    }
    function economicSection(): Node {
      return panel('3 · Economic feasibility', 'Should we build it? The CBA owns all calculations; record the interpretation here.', [
        financialEvidence(),
        evaluationCard('fsa-economic', 'Financial viability and uncertainty',
          'Evaluate costs, benefits, assumptions, and decision risks without modifying financial figures.',
          state.draft.value.economic, economic),
      ]);
    }
    function summarySection(): Node {
      const decision = state.draft.value.decision;
      return panel('5 · Overall feasibility summary', 'Summarize findings for reviewers; only the analyst supplies a conclusion.', [
        h('div', { class: 'fsa-overview' }, [
          h('div', [h('strong', 'Identified concerns'), h('span', concerns.value.length
            ? concerns.value.map(item => item.title).join(' · ') : 'No risk indicators selected yet; absence of a rating is not evidence of feasibility.')]),
          h('div', [h('strong', 'Unresolved or unassessed'), h('span', unknowns.value.length
            ? unknowns.value.map(item => item.title).join(' · ') : 'No unresolved areas recorded.')]),
          !cba.value.projection?.summary ?
            h('p', { class: 'fsa-muted' }, 'Financial evidence is incomplete. The CBA has not produced a complete projection.') : null,
        ]),
        select('fsa-decision', 'Analyst conclusion (never inferred)', decision, DECISIONS,
          value => update({ decision: value })),
        input('fsa-decision-basis', 'Summary, supporting reasons, and conditions',
          state.draft.value.decisionBasis, value => update({ decisionBasis: value }),
          'Why does this assessment appear reasonable, conditional, or unresolved?', true),
      ]);
    }
    function reportArea(title: string, value: Evaluation): Node {
      const lines: [string, string][] = [
        ['Circumstances', value.context], ['Risks and concerns', value.risks],
        ['Evidence', value.evidence], ['Unresolved questions', value.unknowns],
      ];
      const stakeholders = value.stakeholderIds.map(id => state.draft.value.stakeholders.find(item => item.id === id))
        .filter((item): item is Stakeholder => !!item).map(stakeholderName);
      return h('div', { class: 'fsa-report-area' }, [
        h('div', { class: 'fsa-report-area-title' }, [
          h('strong', title),
          h('span', levelLabel(value.level)),
        ]),
        ...lines.filter(([, text]) => text.trim()).map(([label, text]) =>
          h('p', [h('b', label + ': '), text.trim()])),
        stakeholders.length ? h('p', [h('b', 'Relevant stakeholders: '), stakeholders.join(', ')]) : null,
      ]);
    }
    function reportStakeholder(item: Stakeholder): Node {
      const notes = [
        ['Interests', item.interests], ['Concerns', item.concerns], ['Involvement', item.involvement],
      ].filter(([, content]) => !!content.trim());
      return h('li', { key: item.id }, [
        h('strong', stakeholderName(item)),
        stakeholderRole(item) ? h('span', ' · ' + stakeholderRole(item)) : null,
        item.source === 'sr-sponsor' ? h('small', ' · Linked to System Request') : null,
        ...notes.map(([label, value]) => h('p', [h('b', label + ': '), value.trim()])),
      ]);
    }
    function report(): Node {
      const current = state.draft.value;
      return h('article', { class: 'cr-paper fsa-report', id: 'fsa-report', 'aria-label': 'Feasibility and Stakeholder Analysis report' }, [
        h('p', { class: 'cr-paper-kicker' }, 'PROJECT ASSESSMENT · ANALYST FINDINGS'),
        h('h2', 'Feasibility & Stakeholder Analysis'),
        h('p', { class: 'fsa-report-intro' }, 'The analysis describes available evidence, potential risks, and remaining questions. Qualitative indicators and financial estimates are not automatic project approval.'),
        h('section', [
          h('h3', '1. Stakeholder analysis'),
          ...STAKEHOLDER_GROUPS.map(([key, title]) => {
            const members = current.stakeholders.filter(item => item.group === key);
            return h('div', { class: 'fsa-report-group', key }, [
              h('h4', title),
              members.length ? h('ul', members.map(reportStakeholder)) :
                h('p', { class: 'fsa-report-empty' }, 'Not yet identified.'),
            ]);
          }),
        ]),
        h('section', [
          h('h3', '2. Technical feasibility — Can we build it?'),
          ...TECHNICAL_AREAS.map(item => reportArea(item.title, current.technical[item.key])),
        ]),
        h('section', [
          h('h3', '3. Economic feasibility — Should we build it?'),
          financialEvidence(),
          reportArea('Analyst assessment', current.economic),
        ]),
        h('section', [
          h('h3', '4. Organizational feasibility — If we build it, will they come?'),
          ...ORGANIZATIONAL_AREAS.map(item => reportArea(item.title, current.organizational[item.key])),
        ]),
        h('section', [
          h('h3', '5. Overall feasibility summary'),
          h('p', [h('b', 'Analyst conclusion: '), decisionLabel(current.decision)]),
          previewText(current.decisionBasis) ||
            h('p', { class: 'fsa-report-empty' }, 'No overall rationale or decision conditions recorded.'),
          concerns.value.length ? h('p', [h('b', 'Identified risk areas: '),
            concerns.value.map(item => item.title).join('; ')]) : null,
          unknowns.value.length ? h('p', [h('b', 'Areas requiring investigation: '),
            unknowns.value.map(item => item.title).join('; ')]) : null,
          !cba.value.projection?.summary ? h('p', 'Financial projections are incomplete or unavailable.') : null,
        ]),
        h('p', { class: 'fsa-report-footer' }, 'Source of financial figures: Cost-Benefit Analysis (CBA). Stakeholder sponsor references: System Request (SR).'),
      ]);
    }
    async function printReport() {
      view.value = 'preview';
      await nextTick();
      window.print();
    }
    return () => h('div', { class: 'fsa-workspace' }, [
      h('div', { class: 'fsa-toolbar' }, [
        h('div', { class: 'cr-view-toggle', role: 'group', 'aria-label': 'Feasibility analysis view' },
          ([['assessment', 'Assessment'], ['preview', 'Document preview']] as const).map(([key, label]) =>
            h('button', { type: 'button',
              class: ['cr-view-button', view.value === key ? 'is-active' : ''],
              'aria-pressed': view.value === key, onClick: () => { view.value = key; } }, label))),
        h('div', { class: 'fsa-toolbar-actions' }, [
          h('button', { type: 'button', class: 'quiet-button', onClick: () => { void printReport(); } }, 'Print report'),
          h('div', { class: 'cr-autosave', role: 'status', 'aria-live': 'polite' }, [
            h('span', { class: ['cr-autosave-indicator', {
              'is-pending': state.dirty.value || state.busy.value,
              'is-error': !!state.problem.value || state.conflict.value,
            }], 'aria-hidden': 'true' }, '✓'),
            h('span', state.status.value),
          ]),
        ]),
      ]),
      state.problem.value ? h('div', { class: 'cr-warning', role: 'alert' }, [
        h('p', state.problem.value),
        h('button', { type: 'button', class: 'quiet-button',
          onClick: () => { if (state.conflict.value) void state.reload(); else void state.retrySave(); },
        }, state.conflict.value ? 'Reload saved assessment' : 'Retry save'),
      ]) : null,
      view.value === 'preview' ? report() : [
        h('p', { class: 'fsa-guide' }, 'Record what is known, why it matters, and what requires investigation. Open a topic to assess it. No numeric risk score or automatic verdict is assigned.'),
        stakeholderSection(),
        panel('2 · Technical feasibility', 'Can we build it? Expand an area to capture conditions, risks, and supporting evidence.',
          TECHNICAL_AREAS.map(item => evaluationCard('fsa-tech-' + item.key, item.title,
            item.hint, state.draft.value.technical[item.key], patch => technical(item.key, patch)))),
        economicSection(),
        panel('4 · Organizational feasibility', 'If we build it, will they come? Link stakeholder records instead of retyping them.',
          ORGANIZATIONAL_AREAS.map(item => evaluationCard('fsa-org-' + item.key, item.title,
            item.hint, state.draft.value.organizational[item.key],
            patch => organizational(item.key, patch), true))),
        summarySection(),
      ],
    ]);
  },
});
