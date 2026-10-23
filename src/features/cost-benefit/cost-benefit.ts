import {
  computed, defineComponent, h, nextTick, onBeforeUnmount, onMounted, ref,
  watch, type PropType, type VNode,
} from 'vue';
import { parseRequest, SR_REQUEST_ID, SR_REQUEST_KIND } from '../system-request/model.ts';
import {
  calculateProjection, estimatedAnnualBenefit, costComplete, type FinancialProjection,
  type FinancialYear,
} from './calculations.ts';
import {
  copyAnalysis, newBenefit, newCost, type BenefitMethod, type BenefitProfile,
  type CostBenefitAnalysis, type CostTiming, type FinancialBenefit, type FinancialCost,
} from './model.ts';
import { useCostBenefit, type CbaWorkspace } from './use-cost-benefit.ts';

export interface CostBenefitHandle { flushSave(): Promise<boolean> }
type InputNode = VNode | null;

function cash(value: number, currency: string): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency', currency, maximumFractionDigits: 2,
  }).format(value);
}
function percent(value: number): string {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(value) + '%';
}
function formatDate(value: string): string {
  if (!value) return '';
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    year: 'numeric', month: 'long', day: 'numeric',
  });
}

export const CostBenefitEditor = defineComponent({
  name: 'CostBenefitEditor',
  props: { workspace: { type: Object as PropType<CbaWorkspace>, required: true } },
  emits: { 'dirty-change': (_dirty: boolean) => true },
  setup(props, { emit, expose }) {
    const state = useCostBenefit(props.workspace);
    const tab = ref<'analysis' | 'report'>('analysis');
    const projected = computed(() => calculateProjection(state.draft.value));
    const relatedBenefits = computed(() => {
      const record = props.workspace.current.value?.file.records.find(item =>
        item.kind === SR_REQUEST_KIND && item.id === SR_REQUEST_ID);
      if (!record) return [] as { id: string; text: string; target: string }[];
      try {
        return parseRequest(record.data).benefits.map(item => ({
          id: item.id, text: item.text, target: item.type === 'measurable' ? item.target : '',
        }));
      } catch { return []; }
    });
    expose({ flushSave: state.flushSave } satisfies CostBenefitHandle);
    watch(state.dirty, dirty => emit('dirty-change', dirty), { immediate: true });
    onBeforeUnmount(() => { emit('dirty-change', false); });

    function update(patch: Partial<CostBenefitAnalysis>) {
      state.update({ ...state.draft.value, ...patch } as CostBenefitAnalysis);
    }
    function updateBenefit(id: string, patch: Partial<FinancialBenefit>) {
      const current = state.draft.value;
      update({ benefits: current.benefits.map(item => item.id === id ? { ...item, ...patch } as FinancialBenefit : item) });
    }
    function updateCost(id: string, patch: Partial<FinancialCost>) {
      const current = state.draft.value;
      update({ costs: current.costs.map(item => item.id === id ? { ...item, ...patch } as FinancialCost : item) });
    }
    function addBenefit() {
      update({ benefits: [...state.draft.value.benefits, newBenefit()] });
    }
    function addCost() {
      update({ costs: [...state.draft.value.costs, newCost()] });
    }
    function removeBenefit(id: string) {
      if (window.confirm('Remove this expected benefit?')) {
        update({ benefits: state.draft.value.benefits.filter(item => item.id !== id) });
      }
    }
    function removeCost(id: string) {
      if (window.confirm('Remove this project expense?')) {
        update({ costs: state.draft.value.costs.filter(item => item.id !== id) });
      }
    }

    function textField(id: string, title: string, value: string, change: (value: string) => void,
      placeholder = '', multiline = false): InputNode {
      const attrs = {
        id, class: 'cr-input', value, placeholder, disabled: !state.writable.value,
        onInput: (event: Event) => {
          if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
            change(event.target.value);
          }
        },
      };
      return h('div', { class: 'cba-field' }, [
        h('label', { for: id }, title),
        multiline ? h('textarea', { ...attrs, rows: 2, class: 'cr-input cr-input--multiline' }) :
          h('input', { ...attrs, type: 'text' }),
      ]);
    }
    function numberField(id: string, title: string, value: number | null,
      change: (value: number | null) => void, opts: { suffix?: string; integer?: boolean; negative?: boolean } = {}): InputNode {
      return h('div', { class: 'cba-field' }, [
        h('label', { for: id }, title),
        h('div', { class: 'cba-number-control' }, [
          h('input', {
            id, type: 'number', class: 'cr-input cba-numeric',
            value: value ?? '', step: opts.integer ? 1 : 'any',
            min: opts.integer ? 1 : opts.negative ? -99.999999 : 0,
            disabled: !state.writable.value, inputmode: 'decimal',
            onInput: (event: Event) => {
              if (!(event.target instanceof HTMLInputElement)) return;
              const raw = event.target.value;
              if (raw === '') { change(null); return; }
              const parsed = Number(raw);
              if (!Number.isFinite(parsed) ||
                (!opts.negative && parsed < (opts.integer ? 1 : 0)) ||
                (opts.negative && parsed <= -100) ||
                (opts.integer && !Number.isSafeInteger(parsed))) return;
              change(parsed);
            },
          }),
          opts.suffix ? h('span', { class: 'cba-unit' }, opts.suffix) : null,
        ]),
      ]);
    }
    function choice<T extends string>(id: string, title: string, value: T,
      choices: readonly [T, string][], change: (value: T) => void): InputNode {
      return h('div', { class: 'cba-field' }, [
        h('label', { for: id }, title),
        h('select', {
          id, class: 'cr-input', value, disabled: !state.writable.value,
          onChange: (event: Event) => {
            if (event.target instanceof HTMLSelectElement) change(event.target.value as T);
          },
        }, choices.map(([key, label]) => h('option', { value: key }, label))),
      ]);
    }
    function noteFields(prefix: string, source: string, explanation: string,
      change: (patch: { source?: string; explanation?: string }) => void): InputNode {
      return h('details', { class: 'cba-detail' }, [
        h('summary', 'Supporting assumptions & sources'),
        h('div', { class: 'cba-field-grid' }, [
          textField(prefix + '-source', 'Source / URL / document reference',
            source, value => change({ source: value }), 'Source, interview, estimate, or URL'),
          textField(prefix + '-explanation', 'Basis and limitations',
            explanation, value => change({ explanation: value }),
            'How was this estimate obtained? Is it a target or a verified figure?', true),
        ]),
      ]);
    }
    function itemHeader(name: string, id: string, remove: () => void, type: string) {
      return h('div', { class: 'cba-item-heading' }, [
        h('div', { class: 'cba-item-title' }, [
          h('span', { class: 'cba-item-icon', 'aria-hidden': 'true' }, type === 'benefit' ? '+' : '−'),
          h('strong', name.trim() || (type === 'benefit' ? 'New benefit' : 'New expense')),
        ]),
        h('button', { type: 'button', class: 'quiet-button cba-remove', disabled: !state.writable.value,
          'aria-label': 'Remove ' + (name.trim() || type) + ' line item ' + id,
          onClick: remove }, 'Remove'),
      ]);
    }
    function benefitEditor(item: FinancialBenefit): InputNode {
      const estimated = estimatedAnnualBenefit(item);
      return h('article', { key: item.id, class: 'cba-item' }, [
        itemHeader(item.name, item.id, () => removeBenefit(item.id), 'benefit'),
        h('div', { class: 'cba-field-grid' }, [
          textField('cba-benefit-name-' + item.id, 'Benefit description', item.name,
            value => updateBenefit(item.id, { name: value }), 'e.g. Reduced printing costs'),
          choice<BenefitMethod>('cba-benefit-method-' + item.id, 'Calculation', item.method,
            [['annual', 'Annual benefit amount'], ['drivers', 'Volume × unit value × change']] as const,
            value => updateBenefit(item.id, { method: value })),
          ...(item.method === 'annual' ? [
            numberField('cba-benefit-amount-' + item.id, 'Full-year benefit',
              item.annualAmount, value => updateBenefit(item.id, { annualAmount: value }),
              { suffix: state.draft.value.currency }),
          ] : [
            numberField('cba-benefit-units-' + item.id, 'Annual units / customers',
              item.units, value => updateBenefit(item.id, { units: value })),
            numberField('cba-benefit-unit-' + item.id, 'Value per unit',
              item.valuePerUnit, value => updateBenefit(item.id, { valuePerUnit: value }),
              { suffix: state.draft.value.currency }),
            numberField('cba-benefit-change-' + item.id, 'Incremental share',
              item.changePercent, value => updateBenefit(item.id, { changePercent: value }), { suffix: '%' }),
          ]),
          choice<BenefitProfile>('cba-benefit-profile-' + item.id, 'Annual realization', item.profile,
            [['level', 'Full amount every year'], ['ramp', 'Linear ramp to full amount in final year']] as const,
            value => updateBenefit(item.id, { profile: value })),
        ]),
        h('div', { class: 'cba-derived' }, [
          h('span', 'Calculated full-year benefit'),
          h('strong', estimated === null ? 'Inputs needed' : cash(estimated, state.draft.value.currency)),
          h('small', item.profile === 'ramp'
            ? 'Annual benefit = full-year estimate × projection year ÷ total years.'
            : 'Applied in full in each projection year.'),
        ]),
        noteFields('cba-benefit-' + item.id, item.source, item.explanation,
          patch => updateBenefit(item.id, patch)),
      ]);
    }
    function costEditor(item: FinancialCost): InputNode {
      return h('article', { key: item.id, class: 'cba-item' }, [
        itemHeader(item.name, item.id, () => removeCost(item.id), 'cost'),
        h('div', { class: 'cba-field-grid' }, [
          textField('cba-cost-name-' + item.id, 'Expense description', item.name,
            value => updateCost(item.id, { name: value }), 'e.g. Hosting, labor, replacement'),
          choice<CostTiming>('cba-cost-timing-' + item.id, 'Expense timing', item.timing,
            [['upfront', 'One-time at project start (year 0)'],
              ['annual', 'Every year from selected year'],
              ['scheduled', 'Once in selected year'],
              ['periodic', 'Every N years from selected year']] as const,
            value => updateCost(item.id, { timing: value })),
          numberField('cba-cost-amount-' + item.id, 'Expense per occurrence',
            item.amount, value => updateCost(item.id, { amount: value }),
            { suffix: state.draft.value.currency }),
          ...(item.timing !== 'upfront' ? [
            numberField('cba-cost-start-' + item.id, 'First occurrence (year)',
              item.firstYear, value => { if (value !== null) updateCost(item.id, { firstYear: value }); },
              { integer: true }),
          ] : []),
          ...(item.timing === 'periodic' ? [
            numberField('cba-cost-period-' + item.id, 'Repeat every (years)',
              item.intervalYears, value => updateCost(item.id, { intervalYears: value }),
              { integer: true }),
          ] : []),
        ]),
        h('p', { class: 'cba-item-helper' },
          item.timing === 'upfront' ? 'Included in the initial investment; not discounted.' :
          item.timing === 'annual' ? 'A constant amount each year from the first occurrence; no automatic escalation is assumed.' :
          item.timing === 'scheduled' ? 'A single future expense, discounted in the specified year.' :
            'The expense recurs at fixed year intervals through the projection horizon.'),
        !costComplete(item) ? h('p', { class: 'cba-incomplete' }, 'Enter a name and expense amount' +
          (item.timing === 'periodic' ? ', plus the interval.' : '.')) : null,
        noteFields('cba-cost-' + item.id, item.source, item.explanation,
          patch => updateCost(item.id, patch)),
      ]);
    }

    function panel(title: string, description: string, children: InputNode[], action?: InputNode): InputNode {
      return h('section', { class: 'cba-panel' }, [
        h('header', { class: 'cba-section-heading' }, [
          h('div', [h('h3', title), h('p', description)]), action || null,
        ]),
        ...children,
      ]);
    }

    function metric(label: string, value: string, explanation: string, strong = false): InputNode {
      return h('div', { class: ['cba-metric', strong ? 'cba-metric-primary' : ''] }, [
        h('span', label), h('strong', value), h('small', explanation),
      ]);
    }
    function summary(projection: FinancialProjection): InputNode {
      const s = projection.summary, c = state.draft.value.currency;
      return h('section', { class: 'cba-summary', 'aria-label': 'Calculated financial summary' }, [
        metric('Net present value', s ? cash(s.npv, c) : '—',
          'Discounted benefits less discounted costs, including initial investment.', true),
        metric('Return on investment', s?.roiPercent === null || !s ? '—' : percent(s.roiPercent),
          'Net nominal gain ÷ total nominal costs.'),
        metric('Benefit / cost ratio', s?.benefitCostRatio === null || !s ? '—' :
          s.benefitCostRatio.toFixed(2) + '×', 'Present value of benefits ÷ present value of costs.'),
        metric('Payback year', s?.paybackYear === null || !s ? 'Not reached / —' :
          'Year ' + s.paybackYear, 'First year cumulative nominal net cash flow is nonnegative.'),
      ]);
    }
    function warning(projection: FinancialProjection): InputNode | null {
      if (projection.error) return h('p', { class: 'cba-alert', role: 'alert' }, projection.error);
      if (projection.missing.length === 0) return null;
      return h('div', { class: 'cba-alert', role: 'status' }, [
        h('strong', 'Financial summary pending'),
        h('p', 'Complete the inputs below for a reportable NPV, ROI, and payback period. Partial projections exclude unfinished items.'),
        h('p', { class: 'cba-missing' }, 'Needed: ' + projection.missing.join(' · ')),
      ]);
    }
    function graphic(rows: FinancialYear[], currency: string): InputNode {
      const max = Math.max(1, ...rows.flatMap(row => [row.benefits, row.costs]));
      return h('div', { class: 'cba-chart-scroll', tabindex: 0,
        'aria-label': 'Annual benefits and costs comparison chart; scroll horizontally for additional years' }, [
        h('div', { class: 'cba-bars', role: 'img',
          'aria-label': 'Benefits and expenses for years ' + rows.map(row => row.year).join(', ') +
            '. Exact values are available in the adjacent annual projection table.' },
        rows.map(row => h('div', { class: 'cba-year-bars', key: row.year }, [
          h('div', { class: 'cba-bar-pair' }, [
            h('span', { class: 'cba-bar cba-bar-benefit', style: { height: (row.benefits / max * 100) + '%' },
              title: 'Year ' + row.year + ' benefit: ' + cash(row.benefits, currency) }),
            h('span', { class: 'cba-bar cba-bar-cost', style: { height: (row.costs / max * 100) + '%' },
              title: 'Year ' + row.year + ' cost: ' + cash(row.costs, currency) }),
          ]),
          h('span', { class: 'cba-year-label' }, row.year === 0 ? 'Start' : 'Y' + row.year),
        ]))),
      ]);
    }
    const columns: { label: string; field: keyof FinancialYear }[] = [
      { label: 'Benefits', field: 'benefits' },
      { label: 'Costs', field: 'costs' },
      { label: 'Net flow', field: 'net' },
      { label: 'PV benefits', field: 'presentBenefits' },
      { label: 'PV costs', field: 'presentCosts' },
      { label: 'PV net', field: 'presentNet' },
      { label: 'Cumulative PV', field: 'cumulativePresentNet' },
    ];
    function projectionTable(rows: FinancialYear[], currency: string): InputNode {
      return h('div', { class: 'cba-table-scroll', tabindex: 0 }, [
        h('table', { class: 'cba-table' }, [
          h('caption', 'Annual financial projections (' + currency + '), including initial year 0 costs'),
          h('thead', [h('tr', [
            h('th', { scope: 'col' }, 'Year'),
            ...columns.map(col => h('th', { scope: 'col' }, col.label)),
          ])]),
          h('tbody', rows.map(row => h('tr', { key: row.year }, [
            h('th', { scope: 'row' }, String(row.year)),
            ...columns.map(col => {
              const amount = row[col.field] as number;
              return h('td', { class: amount < 0 ? 'cba-negative' : '' }, cash(amount, currency));
            }),
          ]))),
        ]),
      ]);
    }

    function sourceLine(source: string, explanation: string): InputNode | null {
      if (!source.trim() && !explanation.trim()) return null;
      return h('small', { class: 'cba-source' }, [
        source.trim() ? 'Source: ' + source.trim() : '',
        source.trim() && explanation.trim() ? ' · ' : '',
        explanation.trim(),
      ]);
    }
    function reportRows<T extends FinancialBenefit | FinancialCost>(items: T[], amount: (item: T) => string) {
      return h('ul', { class: 'cba-report-items' }, items.map(item => h('li', { key: item.id }, [
        h('div', { class: 'cba-report-line' }, [
          h('span', item.name.trim() || '(Unnamed line item)'),
          h('strong', amount(item)),
        ]),
        sourceLine(item.source, item.explanation),
      ])));
    }
    function report(current: CostBenefitAnalysis, projection: FinancialProjection): InputNode {
      const c = current.currency;
      return h('article', { class: 'cr-paper cba-report', 'aria-label': 'Cost-Benefit Analysis report',
        id: 'cba-print-report' }, [
        h('p', { class: 'cr-paper-kicker' }, 'FINANCIAL FEASIBILITY · ESTIMATES'),
        h('h2', 'Cost-Benefit Analysis'),
        h('div', { class: 'cba-report-meta' }, [
          current.date ? h('span', formatDate(current.date)) : null,
          current.preparedBy.trim() ? h('span', 'Prepared by ' + current.preparedBy.trim()) : null,
        ]),
        h('section', [
          h('h3', 'Analysis assumptions'),
          h('p', 'Projection: ' + (current.projectionYears === null ? 'Not entered' :
            current.projectionYears + ' years') + ' · Discount rate: ' +
            (current.discountRatePercent === null ? 'Not entered' : percent(current.discountRatePercent)) +
            ' · Currency: ' + c),
          h('p', { class: 'cba-print-note' },
            'Initial costs occur at year 0; all subsequent cash flows occur at year-end. Benefits are incremental estimates, not confirmed revenue.'),
        ]),
        h('section', [h('h3', 'Expected benefits'),
          current.benefits.length ? reportRows(current.benefits, item => {
            const amount = estimatedAnnualBenefit(item);
            return amount === null ? 'Incomplete' : cash(amount, c) + ' / full year · ' +
              (item.profile === 'ramp' ? 'linear ramp' : 'level');
          }) : h('p', 'None entered.')]),
        h('section', [h('h3', 'Project costs'),
          current.costs.length ? reportRows(current.costs, item =>
            item.amount === null ? 'Incomplete' : cash(item.amount, c) + ' · ' +
              (item.timing === 'upfront' ? 'Year 0' :
                item.timing === 'annual' ? 'Annual from year ' + item.firstYear :
                item.timing === 'scheduled' ? 'Year ' + item.firstYear :
                'Every ' + (item.intervalYears ?? '?') + ' years from year ' + item.firstYear))
            : h('p', 'None entered.')]),
        h('section', [h('h3', 'Financial outcome'),
          projection.summary ? h('div', { class: 'cba-report-outcome' }, [
            h('p', 'NPV: ' + cash(projection.summary.npv, c)),
            h('p', 'Total estimated benefit: ' + cash(projection.summary.totalBenefits, c)),
            h('p', 'Total estimated cost: ' + cash(projection.summary.totalCosts, c)),
            h('p', 'Nominal net cash flow: ' + cash(projection.summary.netCashFlow, c)),
            h('p', 'ROI: ' + (projection.summary.roiPercent === null ? 'Not defined' :
              percent(projection.summary.roiPercent))),
            h('p', 'Benefit/cost ratio: ' + (projection.summary.benefitCostRatio === null ?
              'Not defined' : projection.summary.benefitCostRatio.toFixed(2) + '×')),
            h('p', 'Payback: ' + (projection.summary.paybackYear === null ? 'Not reached' :
              'Year ' + projection.summary.paybackYear)),
          ]) : h('p', 'Incomplete analysis — ' + (projection.error || projection.missing.join('; ')))]),
        projected.value.years.length ? h('section', [
          h('h3', 'Annual projections'),
          projectionTable(projection.years, c),
        ]) : null,
        current.notes.trim() ? h('section', [h('h3', 'Limitations and context'),
          h('p', { class: 'cba-report-notes' }, current.notes.trim())]) : null,
        h('p', { class: 'cba-print-note' },
          'NPV = Σ (annual net cash flow / (1 + discount rate)^year), including year 0. ROI is nominal; payback uses full years. Estimates require independent review before project approval.'),
      ]);
    }

    async function printReport() {
      tab.value = 'report';
      await nextTick();
      window.print();
    }
    function model(): InputNode[] {
      const current = state.draft.value, p = projected.value;
      return [
        panel('Analysis assumptions', 'Enter the period and discount rate used to value future cash flows.', [
          h('div', { class: 'cba-field-grid' }, [
            numberField('cba-period', 'Projection period (years)', current.projectionYears,
              value => update({ projectionYears: value }), { integer: true }),
            numberField('cba-discount', 'Annual discount rate', current.discountRatePercent,
              value => update({ discountRatePercent: value }), { suffix: '%', negative: true }),
            choice<string>('cba-currency', 'Reporting currency', current.currency,
              Array.from(new Set([current.currency, 'USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY']))
                .map(currency => [currency, currency] as [string, string]),
              value => update({ currency: value })),
            textField('cba-prepared-by', 'Prepared by (optional)', current.preparedBy,
              value => update({ preparedBy: value })),
          ]),
          h('div', { class: 'cba-date-row' }, [
            h('label', { for: 'cba-date' }, 'Document date (optional)'),
            h('input', { id: 'cba-date', type: 'date', class: 'cr-input', value: current.date,
              disabled: !state.writable.value,
              onInput: (event: Event) => {
                if (event.target instanceof HTMLInputElement) update({ date: event.target.value });
              } }),
          ]),
          h('p', { class: 'cba-muted' }, 'Blank assumptions remain unspecified. The initial investment is year 0; revenue and costs in later years are discounted at each year-end.'),
        ]),
        panel('Expected benefits', 'Use an entered annual estimate or calculate it from volume, unit value and incremental share.', [
          ...current.benefits.map(benefitEditor),
          !current.benefits.length ? h('p', { class: 'cba-empty' }, 'No financial benefits entered. Each benefit must have supporting assumptions.') : h('span', { class: 'cba-count' }, current.benefits.length + ' benefit items'),
        ], h('button', { class: 'quiet-button', type: 'button', disabled: !state.writable.value,
          onClick: addBenefit }, '+ Add benefit')),
        panel('Project costs', 'Separate upfront, recurring, one-time future, and periodic replacement expenses.', [
          ...current.costs.map(costEditor),
          !current.costs.length ? h('p', { class: 'cba-empty' }, 'No financial costs entered. Blank entries are never assumed to be free.') : h('span', { class: 'cba-count' }, current.costs.length + ' cost items'),
        ], h('button', { class: 'quiet-button', type: 'button', disabled: !state.writable.value,
          onClick: addCost }, '+ Add cost')),
        panel('Evidence and limitations', 'Explain uncertainties, excluded values, and assumptions that influence this analysis.', [
          textField('cba-notes', 'Analysis notes', current.notes,
            value => update({ notes: value }), 'Sources, uncertainty, exclusions, unquantified benefits…', true),
          relatedBenefits.value.length ? h('details', { class: 'cba-detail cba-crossref' }, [
            h('summary', 'Related System Request expectations (' + relatedBenefits.value.length + ')'),
            h('p', { class: 'cba-muted' }, 'Read-only context; estimates are not imported or treated as verified financial facts.'),
            h('ul', relatedBenefits.value.map(item => h('li', { key: item.id }, [
              item.text,
              item.target ? h('small', ' · Target: ' + item.target) : null,
            ]))),
            h('a', { href: '#/documents/sr' }, 'Open System Request'),
          ]) : h('p', { class: 'cba-muted' }, 'Business-value expectations remain separately editable in System Request.'),
        ]),
        panel('Annual projection', 'Derived from the entered line items. Values update immediately.', [
          warning(p) || h('p', { class: 'cba-muted' }, 'All required inputs are present.'),
          p.years.length ? h('div', { class: 'cba-chart' }, [
            h('div', { class: 'cba-chart-legend' }, [
              h('span', { class: 'cba-legend-benefit' }, 'Benefits'),
              h('span', { class: 'cba-legend-cost' }, 'Costs'),
            ]),
            graphic(p.years, current.currency),
          ]) : null,
          p.years.length ? projectionTable(p.years, current.currency) :
            h('p', { class: 'cba-muted' }, 'Enter a projection period and discount rate to see the annual projections.'),
        ]),
      ];
    }

    return () => h('div', { class: 'cba-workspace' }, [
      h('div', { class: 'cba-toolbar' }, [
        h('div', { class: 'cr-view-toggle', role: 'group', 'aria-label': 'Cost-Benefit Analysis view' },
          ([['analysis', 'Financial model'], ['report', 'Report preview']] as const).map(([key, title]) =>
            h('button', { type: 'button', class: ['cr-view-button', tab.value === key ? 'is-active' : ''],
              'aria-pressed': tab.value === key, onClick: () => { tab.value = key; } }, title))),
        h('div', { class: 'cba-toolbar-right' }, [
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
        }, state.conflict.value ? 'Reload saved analysis' : 'Retry save'),
      ]) : null,
      tab.value === 'analysis' ? [
        summary(projected.value),
        ...model(),
      ] : report(state.draft.value, projected.value),
    ]);
  },
});
