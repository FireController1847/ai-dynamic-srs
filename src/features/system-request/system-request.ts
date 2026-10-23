import { defineComponent, h, onBeforeUnmount, onMounted, ref, Transition, TransitionGroup, watch, type PropType } from 'vue';
import {
  addBenefit, addEntry, removeBenefit, removeEntry, reorderEntries,
  updateBenefit, updateEntry, type RequestEntry, type RequestField,
  type RequestList, type SystemRequest, type ValueEntry,
} from './model.ts';
import { useSystemRequest, type RequestWorkspace } from './use-system-request.ts';

function hasText(value: string): boolean { return value.trim().length > 0; }
function readableDate(value: string): string {
  if (!value) return '';
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    year: 'numeric', month: 'long', day: 'numeric',
  });
}
export interface SystemRequestHandle { flushSave(): Promise<boolean> }

/** Compact business-focused project initiation document. Never modifies CR, GN, or CBA. */
export const SystemRequestEditor = defineComponent({
  name: 'SystemRequestEditor',
  props: {
    workspace: { type: Object as PropType<RequestWorkspace>, required: true },
  },
  emits: { 'dirty-change': (_dirty: boolean) => true },
  setup(props, { emit, expose }) {
    const state = useSystemRequest(props.workspace);
    expose({ flushSave: state.flushSave } satisfies SystemRequestHandle);

    const narrowView = window.matchMedia('(max-width: 900px)');
    const view = ref<'edit' | 'split' | 'preview'>(narrowView.matches ? 'edit' : 'split');
    const requirementDraft = ref('');
    const issueDraft = ref('');
    const benefitDraft = ref('');
    const benefitType = ref<ValueEntry['type']>('qualitative');

    function viewportChanged(event: MediaQueryListEvent) {
      if (event.matches && view.value === 'split') view.value = 'edit';
    }
    onMounted(() => narrowView.addEventListener('change', viewportChanged));
    watch(state.dirty, value => emit('dirty-change', value), { immediate: true });
    onBeforeUnmount(() => {
      narrowView.removeEventListener('change', viewportChanged);
      emit('dirty-change', false);
    });

    function setField(key: RequestField, value: string) {
      state.update({ ...state.draft.value, [key]: value });
    }
    function field(label: string, key: RequestField, placeholder: string, rows?: number) {
      const id = 'sr-' + key;
      const attrs = {
        id, class: 'cr-input', value: state.draft.value[key],
        placeholder, disabled: !state.writable.value,
      };
      return h('div', { class: 'cr-field' }, [
        h('label', { for: id }, label),
        rows ? h('textarea', {
          ...attrs, class: 'cr-input cr-input--multiline', rows,
          onInput: (event: Event) => {
            if (event.target instanceof HTMLTextAreaElement) setField(key, event.target.value);
          },
        }) : h('input', {
          ...attrs, type: key === 'date' ? 'date' : 'text',
          onInput: (event: Event) => {
            if (event.target instanceof HTMLInputElement) setField(key, event.target.value);
          },
        }),
      ]);
    }
    function card(number: string, title: string, help: string, content: ReturnType<typeof h>[]) {
      return h('section', { class: 'cr-editor-card' }, [
        h('div', { class: 'cr-card-heading' }, [
          h('span', { class: 'cr-card-number' }, number),
          h('div', [h('h3', title), h('p', help)]),
        ]),
        ...content,
      ]);
    }
    function move(list: RequestList | 'benefits', index: number, delta: number) {
      if (!state.writable.value) return;
      const current = state.draft.value;
      if (list === 'benefits') state.update({
        ...current, benefits: reorderEntries(current.benefits, index, delta),
      });
      else state.update({ ...current, [list]: reorderEntries(current[list], index, delta) });
    }
    function actions(list: RequestList | 'benefits', index: number, count: number, id: string, label: string) {
      return h('div', { class: 'cr-item-actions' }, [
        h('button', {
          type: 'button', class: 'icon-button', title: 'Move up',
          'aria-label': 'Move ' + label + ' ' + (index + 1) + ' up',
          disabled: !state.writable.value || index === 0,
          onClick: () => move(list, index, -1),
        }, '↑'),
        h('button', {
          type: 'button', class: 'icon-button', title: 'Move down',
          'aria-label': 'Move ' + label + ' ' + (index + 1) + ' down',
          disabled: !state.writable.value || index === count - 1,
          onClick: () => move(list, index, 1),
        }, '↓'),
        h('button', {
          type: 'button', class: 'icon-button delete-button', title: 'Remove',
          'aria-label': 'Remove ' + label + ' ' + (index + 1),
          disabled: !state.writable.value,
          onClick: () => {
            if (list === 'benefits') state.update(removeBenefit(state.draft.value, id));
            else state.update(removeEntry(state.draft.value, list, id));
          },
        }, '×'),
      ]);
    }
    function addText(list: RequestList) {
      const input = list === 'requirements' ? requirementDraft : issueDraft;
      if (!state.writable.value || !hasText(input.value)) return;
      state.update(addEntry(state.draft.value, list, input.value));
      input.value = '';
    }
    function listEditor(list: RequestList) {
      const items: RequestEntry[] = state.draft.value[list];
      const label = list === 'requirements' ? 'requirement' : 'special issue';
      const input = list === 'requirements' ? requirementDraft : issueDraft;
      return [
        items.length ? h(TransitionGroup, {
          name: 'cr-entry', tag: 'ol', class: 'cr-items',
          'aria-label': list === 'requirements' ? 'Business requirements' : 'Special issues',
        }, {
          default: () => items.map((item, index) => h('li', { class: 'cr-item', key: item.id }, [
            h('span', { class: 'cr-item-number', 'aria-hidden': 'true' }, String(index + 1)),
            h('input', {
              type: 'text', class: 'cr-input cr-item-input',
              'aria-label': 'Business ' + label + ' ' + (index + 1),
              value: item.text, disabled: !state.writable.value,
              onInput: (event: Event) => {
                if (event.target instanceof HTMLInputElement) {
                  state.update(updateEntry(state.draft.value, list, item.id, event.target.value));
                }
              },
            }),
            actions(list, index, items.length, item.id, label),
          ])),
        }) : h('p', { class: 'cr-small-note' },
          list === 'requirements' ? 'No business requirements yet.' : 'No special issues recorded.'),
        h('div', { class: 'cr-add-row' }, [
          h('input', {
            type: 'text', class: 'cr-input', 'aria-label': 'New ' + label,
            placeholder: list === 'requirements'
              ? 'Add one high-level capability or outcome…'
              : 'Add a consideration or constraint…',
            value: input.value, disabled: !state.writable.value,
            onInput: (event: Event) => {
              if (event.target instanceof HTMLInputElement) input.value = event.target.value;
            },
            onKeydown: (event: KeyboardEvent) => {
              if (event.key === 'Enter') { event.preventDefault(); addText(list); }
            },
          }),
          h('button', {
            type: 'button', class: 'quiet-button',
            disabled: !state.writable.value || !hasText(input.value),
            onClick: () => addText(list),
          }, 'Add'),
        ]),
      ];
    }
    function addValue() {
      if (!state.writable.value || !hasText(benefitDraft.value)) return;
      state.update(addBenefit(state.draft.value, benefitDraft.value, benefitType.value));
      benefitDraft.value = '';
    }
    function benefitEditor() {
      const items = state.draft.value.benefits;
      return [
        items.length ? h(TransitionGroup, {
          name: 'cr-entry', tag: 'ol', class: 'cr-items',
          'aria-label': 'Expected business benefits',
        }, {
          default: () => items.map((item, index) => h('li', {
            key: item.id, class: 'cr-item sr-benefit-row',
          }, [
            h('span', { class: 'cr-item-number', 'aria-hidden': 'true' }, String(index + 1)),
            h('div', { class: 'sr-benefit-fields' }, [
              h('input', {
                class: 'cr-input', type: 'text', value: item.text,
                'aria-label': 'Benefit ' + (index + 1),
                placeholder: 'Describe the expected business benefit',
                disabled: !state.writable.value,
                onInput: (event: Event) => {
                  if (event.target instanceof HTMLInputElement) {
                    state.update(updateBenefit(state.draft.value, item.id, { text: event.target.value }));
                  }
                },
              }),
              h('div', { class: 'sr-benefit-details' }, [
                h('label', { class: 'sr-benefit-kind' }, [
                  h('span', { class: 'sr-visually-hidden' }, 'Benefit ' + (index + 1) + ' type'),
                  h('select', {
                    class: 'cr-input sr-type-select',
                    value: item.type, disabled: !state.writable.value,
                    onChange: (event: Event) => {
                      if (event.target instanceof HTMLSelectElement) {
                        const type = event.target.value === 'measurable' ? 'measurable' : 'qualitative';
                        state.update(updateBenefit(state.draft.value, item.id, { type }));
                      }
                    },
                  }, [
                    h('option', { value: 'qualitative' }, 'Qualitative'),
                    h('option', { value: 'measurable' }, 'Measurable'),
                  ]),
                ]),
                item.type === 'measurable' ? h('input', {
                  class: 'cr-input sr-target-input', type: 'text',
                  value: item.target, disabled: !state.writable.value,
                  'aria-label': 'Benefit ' + (index + 1) + ' target (optional)',
                  placeholder: 'Target / timeframe (optional)',
                  onInput: (event: Event) => {
                    if (event.target instanceof HTMLInputElement) {
                      state.update(updateBenefit(state.draft.value, item.id, { target: event.target.value }));
                    }
                  },
                }) : null,
              ]),
            ]),
            actions('benefits', index, items.length, item.id, 'benefit'),
          ])),
        }) : h('p', { class: 'cr-small-note' }, 'No expected benefits yet.'),
        h('div', { class: 'sr-benefit-add' }, [
          h('div', { class: 'cr-add-row' }, [
            h('input', {
              type: 'text', class: 'cr-input',
              'aria-label': 'New expected benefit',
              placeholder: 'Add an expected improvement or measurable outcome…',
              value: benefitDraft.value, disabled: !state.writable.value,
              onInput: (event: Event) => {
                if (event.target instanceof HTMLInputElement) benefitDraft.value = event.target.value;
              },
              onKeydown: (event: KeyboardEvent) => {
                if (event.key === 'Enter') { event.preventDefault(); addValue(); }
              },
            }),
            h('button', {
              type: 'button', class: 'quiet-button',
              disabled: !state.writable.value || !hasText(benefitDraft.value),
              onClick: addValue,
            }, 'Add'),
          ]),
          h('div', { class: 'sr-benefit-picker', role: 'group', 'aria-label': 'New benefit type' }, [
            h('button', {
              class: ['sr-kind-button', benefitType.value === 'qualitative' ? 'is-active' : ''],
              type: 'button', 'aria-pressed': benefitType.value === 'qualitative',
              onClick: () => { benefitType.value = 'qualitative'; },
            }, 'Qualitative'),
            h('button', {
              class: ['sr-kind-button', benefitType.value === 'measurable' ? 'is-active' : ''],
              type: 'button', 'aria-pressed': benefitType.value === 'measurable',
              onClick: () => { benefitType.value = 'measurable'; },
            }, 'Measurable'),
          ]),
        ]),
      ];
    }

    function previewSection(title: string, children: ReturnType<typeof h>) {
      return h('section', { class: 'cr-preview-section' }, [h('h4', title), children]);
    }
    function preview(request: SystemRequest) {
      const visibleRequirements = request.requirements.filter(item => hasText(item.text));
      const visibleBenefits = request.benefits.filter(item => hasText(item.text));
      const visibleIssues = request.specialIssues.filter(item => hasText(item.text));
      const sponsor = [request.sponsorOrganization.trim(), request.sponsorContact.trim(),
        request.sponsorRole.trim()].filter(hasText).join(' · ');
      const present = !!(sponsor || hasText(request.sponsorDetails) || hasText(request.businessNeed) ||
        visibleRequirements.length || visibleBenefits.length || visibleIssues.length ||
        hasText(request.date) || hasText(request.preparedBy));
      return h('section', { class: 'cr-preview-pane', 'aria-labelledby': 'sr-preview-heading' }, [
        h('div', { class: 'cr-preview-heading' }, [
          h('div', [
            h('h3', { id: 'sr-preview-heading' }, 'Document preview'),
            h('p', 'Live · populated sections only'),
          ]),
          h('span', { class: 'cr-preview-label' }, 'SR'),
        ]),
        h('article', { class: 'cr-paper sr-paper', 'aria-label': 'System Request document preview' }, [
          h('p', { class: 'cr-paper-kicker' }, 'PROJECT INITIATION'),
          h('h3', 'System Request'),
          (hasText(request.date) || hasText(request.preparedBy)) ? h('div', { class: 'sr-paper-meta' }, [
            hasText(request.date) ? h('span', readableDate(request.date)) : null,
            hasText(request.preparedBy) ? h('span', 'Prepared by ' + request.preparedBy.trim()) : null,
          ]) : null,
          !present ? h('div', { class: 'cr-paper-empty' }, [
            h('p', 'The System Request will appear as you enter project information.'),
          ]) : [
            (hasText(sponsor) || hasText(request.sponsorDetails))
              ? previewSection('Project Sponsor', h('div', { class: 'sr-preview-copy' }, [
                sponsor ? h('p', sponsor) : null,
                hasText(request.sponsorDetails) ? h('p', request.sponsorDetails.trim()) : null,
              ])) : null,
            hasText(request.businessNeed) ? previewSection('Business Need',
              h('p', request.businessNeed.trim())) : null,
            visibleRequirements.length ? previewSection('Business Requirements',
              h('ul', visibleRequirements.map(item => h('li', { key: item.id }, item.text.trim())))) : null,
            visibleBenefits.length ? previewSection('Business Value',
              h('ul', visibleBenefits.map(item => h('li', { key: item.id }, [
                h('span', item.text.trim()),
                item.type === 'measurable' && hasText(item.target)
                  ? h('span', { class: 'sr-preview-target' }, ' — Target: ' + item.target.trim()) : null,
              ])))) : null,
            visibleIssues.length ? previewSection('Special Issues',
              h('ul', visibleIssues.map(item => h('li', { key: item.id }, item.text.trim())))) : null,
          ],
        ]),
      ]);
    }

    return () => {
      const current = state.draft.value;
      return h('div', { class: 'cr-workspace sr-workspace', 'data-view': view.value }, [
        h('div', { class: 'cr-toolbar' }, [
          h('div', { class: 'cr-view-toggle', role: 'group', 'aria-label': 'Document layout' },
            ([
              ['edit', 'Editor'], ['split', 'Split'], ['preview', 'Preview'],
            ] as const).map(([value, label]) => h('button', {
              class: ['cr-view-button', view.value === value ? 'is-active' : ''],
              type: 'button', 'aria-pressed': view.value === value,
              onClick: () => {
                view.value = value;
                document.getElementById('document-content')?.scrollTo(0, 0);
              },
            }, label))),
          h('div', { class: 'cr-autosave', role: 'status', 'aria-live': 'polite',
            'aria-label': 'Automatic save status' }, [
            h('span', { class: ['cr-autosave-indicator', {
              'is-pending': state.dirty.value || state.busy.value,
              'is-error': !!state.problem.value || state.conflict.value,
            }], 'aria-hidden': 'true' }, [
              h('svg', {
                width: 15, height: 15, viewBox: '0 0 24 24',
                fill: 'none', stroke: 'currentColor', 'stroke-width': 2,
                'stroke-linecap': 'round', 'stroke-linejoin': 'round',
                'aria-hidden': 'true',
              }, [h('path', { d: 'M5 12l4 4L19 6' })]),
            ]),
            h(Transition, { name: 'cr-status', mode: 'out-in' }, {
              default: () => h('span', { key: state.status.value, class: 'cr-autosave-label' }, state.status.value),
            }),
          ]),
        ]),
        state.problem.value ? h('div', { class: 'cr-warning', role: 'alert' }, [
          h('p', state.problem.value),
          h('button', {
            type: 'button', class: 'quiet-button',
            onClick: () => {
              if (state.conflict.value) void state.reload();
              else void state.retrySave();
            },
          }, state.conflict.value ? 'Reload saved request' : 'Retry save'),
        ]) : null,
        h('div', { class: 'cr-layout' }, [
          h(Transition, { name: 'cr-pane' }, {
            default: () => view.value === 'preview' ? null :
              h('section', { class: 'cr-editor', 'aria-label': 'System Request editor' }, [
                card('01', 'Project Sponsor', 'Who is backing the proposed project?', [
                  h('div', { class: 'sr-two-fields' }, [
                    field('Sponsoring organization', 'sponsorOrganization', 'Organization or business'),
                    field('Primary contact', 'sponsorContact', 'Contact name'),
                  ]),
                  h('div', { class: 'sr-two-fields' }, [
                    field('Contact role (optional)', 'sponsorRole', 'Position or relationship'),
                    field('Other identifying information (optional)', 'sponsorDetails', 'Department, office or contact details'),
                  ]),
                ]),
                card('02', 'Business Need', 'Why does the business need this project?', [
                  field('Business problem or opportunity', 'businessNeed',
                    'Briefly explain the current problem, opportunity, and why a new system is proposed…', 3),
                ]),
                card('03', 'Business Requirements', 'High-level capabilities or outcomes, not detailed specifications.', [
                  ...listEditor('requirements'),
                ]),
                card('04', 'Business Value', 'Record expected benefits; targets are estimates, not financial calculations.', [
                  ...benefitEditor(),
                ]),
                card('05', 'Special Issues', 'Optional constraints, concerns, or other circumstances affecting the project.', [
                  ...listEditor('specialIssues'),
                ]),
                h('section', { class: 'cr-editor-card sr-document-details',
                  'aria-label': 'Document information' }, [
                  h('h3', 'Document information'),
                  h('div', { class: 'sr-two-fields' }, [
                    field('Date (optional)', 'date', ''),
                    field('Prepared by (optional)', 'preparedBy', 'Name or team'),
                  ]),
                  h('p', { class: 'cr-small-note' },
                    'The System Request is an overview for project initiation. Original client statements stay in CR; interview notes stay in GN; financial analysis belongs in CBA.'),
                ]),
              ]),
          }),
          h(Transition, { name: 'cr-pane' }, {
            default: () => view.value === 'edit' ? null : preview(current),
          }),
        ]),
      ]);
    };
  },
});
