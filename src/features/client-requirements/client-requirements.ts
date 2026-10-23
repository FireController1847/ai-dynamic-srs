import { computed, defineComponent, h, onBeforeUnmount, onMounted, ref, watch, type PropType } from 'vue';
import { MAX_IMPORT_BYTES, serializeDsrs, type PortableRecord } from '../../core/workspace/dsrs-format.ts';
import {
  addBriefItem, downloadOriginal, fileSource, readFileBase64, removeBriefItem,
  reorderBriefItem, sourceEntries, textSource, updateBriefItem,
  type BriefField, type BriefItem, type BriefList, type ClientBrief,
  type SourceEntry,
} from './model.ts';
import { useClientBrief, type ClientWorkspace } from './use-client-brief.ts';

function dateLabel(value: string): string {
  return new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function fileSize(bytes: number): string {
  return bytes < 1024 ? bytes + ' bytes' :
    bytes < 1024 * 1024 ? (bytes / 1024).toFixed(1) + ' KB' :
      (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function hasText(value: string): boolean {
  return value.trim().length > 0;
}

/** CR captures the client's expressed brief, not analyst notes or formal SRS requirements. */
export const ClientRequirements = defineComponent({
  name: 'ClientRequirements',
  props: {
    workspace: { type: Object as PropType<ClientWorkspace>, required: true },
  },
  emits: {
    'dirty-change': (_dirty: boolean) => true,
  },
  setup(props, { emit }) {
    const state = useClientBrief(props.workspace);
    const narrowView = window.matchMedia('(max-width: 900px)');
    const view = ref<'edit' | 'split' | 'preview'>(narrowView.matches ? 'edit' : 'split');
    function viewportChanged(event: MediaQueryListEvent) {
      if (event.matches && view.value === 'split') view.value = 'edit';
    }
    onMounted(() => narrowView.addEventListener('change', viewportChanged));
    const capabilityDraft = ref('');
    const boundaryDraft = ref('');
    const sourceDraft = ref('');
    const filePicker = ref<HTMLInputElement | null>(null);
    const savingSource = ref(false);
    const sourceProblem = ref('');
    const sourceMessage = ref('');

    const sourceData = computed((): { entries: SourceEntry[]; error: string } => {
      const snapshot = props.workspace.current.value;
      if (!snapshot) return { entries: [], error: '' };
      try { return { entries: sourceEntries(snapshot.file.records), error: '' }; }
      catch (error) {
        return { entries: [], error: error instanceof Error ? error.message : String(error) };
      }
    });

    watch(state.dirty, value => emit('dirty-change', value), { immediate: true });
    onBeforeUnmount(() => {
      narrowView.removeEventListener('change', viewportChanged);
      emit('dirty-change', false);
    });

    function change(field: BriefField, value: string): void {
      state.update({ ...state.draft.value, [field]: value });
    }

    function changeItem(list: BriefList, id: string, text: string): void {
      state.update(updateBriefItem(state.draft.value, list, id, text));
    }

    function addItem(list: BriefList): void {
      const value = list === 'capabilities' ? capabilityDraft : boundaryDraft;
      if (!state.writable.value || !hasText(value.value)) return;
      state.update(addBriefItem(state.draft.value, list, value.value));
      value.value = '';
    }

    function moveItem(list: BriefList, position: number, delta: number): void {
      if (state.writable.value) state.update(reorderBriefItem(state.draft.value, list, position, delta));
    }

    function dropItem(list: BriefList, id: string): void {
      if (state.writable.value) state.update(removeBriefItem(state.draft.value, list, id));
    }

    async function addOriginal(record: PortableRecord): Promise<void> {
      const snapshot = props.workspace.current.value;
      if (!props.workspace.ready.value || props.workspace.busy.value || !snapshot) {
        throw new Error('Workspace storage is unavailable.');
      }
      const records = [...snapshot.file.records, record];
      if (new Blob([serializeDsrs({ ...snapshot.file, records })]).size > MAX_IMPORT_BYTES) {
        throw new Error('This attachment would make the .dsrs backup too large to restore.');
      }
      await props.workspace.database.put(record, null, snapshot.storageId);
    }

    async function saveTextSource(): Promise<void> {
      if (!hasText(sourceDraft.value) || savingSource.value) return;
      sourceProblem.value = '';
      sourceMessage.value = '';
      savingSource.value = true;
      try {
        await addOriginal(textSource(sourceDraft.value));
        sourceDraft.value = '';
        sourceMessage.value = 'Original client text preserved.';
      } catch (error) {
        sourceProblem.value = error instanceof Error ? error.message : String(error);
      } finally {
        savingSource.value = false;
      }
    }

    async function uploadSource(event: Event): Promise<void> {
      if (!(event.target instanceof HTMLInputElement)) return;
      const file = event.target.files?.[0];
      event.target.value = '';
      if (!file || savingSource.value) return;
      sourceProblem.value = '';
      sourceMessage.value = '';
      savingSource.value = true;
      try {
        if (Math.ceil(file.size / 3) * 4 > MAX_IMPORT_BYTES) {
          throw new Error('This document is too large for a portable workspace backup.');
        }
        const base64 = await readFileBase64(file);
        await addOriginal(fileSource(file, base64));
        sourceMessage.value = 'Original document preserved: ' + file.name;
      } catch (error) {
        sourceProblem.value = error instanceof Error ? error.message : String(error);
      } finally {
        savingSource.value = false;
      }
    }

    function field(label: string, key: BriefField, placeholder: string, rows?: number) {
      const value = state.draft.value[key];
      const id = 'cr-field-' + key;
      return h('div', { class: 'cr-field' }, [
        h('label', { for: id }, label),
        rows
          ? h('textarea', {
            id, class: 'cr-input cr-input--multiline', rows,
            placeholder, value, disabled: !state.writable.value,
            onInput: (event: Event) => {
              if (event.target instanceof HTMLTextAreaElement) change(key, event.target.value);
            },
          })
          : h('input', {
            id, class: 'cr-input', type: 'text',
            placeholder, value, disabled: !state.writable.value,
            onInput: (event: Event) => {
              if (event.target instanceof HTMLInputElement) change(key, event.target.value);
            },
          }),
      ]);
    }

    function listEditor(list: BriefList) {
      const items: BriefItem[] = state.draft.value[list];
      const label = list === 'capabilities' ? 'capability' : 'boundary';
      const currentDraft = list === 'capabilities' ? capabilityDraft : boundaryDraft;
      return [
        items.length
          ? h('ol', { class: 'cr-items', 'aria-label': list === 'capabilities' ? 'Requested capabilities' : 'Expressed boundaries' },
            items.map((item, index) => h('li', { class: 'cr-item', key: item.id }, [
              h('span', { class: 'cr-item-number', 'aria-hidden': 'true' }, String(index + 1)),
              h('input', {
                class: 'cr-input cr-item-input', type: 'text',
                'aria-label': 'Client-stated ' + label + ' ' + (index + 1),
                value: item.text, disabled: !state.writable.value,
                onInput: (event: Event) => {
                  if (event.target instanceof HTMLInputElement) changeItem(list, item.id, event.target.value);
                },
              }),
              h('div', { class: 'cr-item-actions' }, [
                h('button', {
                  type: 'button', class: 'icon-button',
                  title: 'Move up', 'aria-label': 'Move ' + label + ' ' + (index + 1) + ' up',
                  disabled: !state.writable.value || index === 0,
                  onClick: () => moveItem(list, index, -1),
                }, '↑'),
                h('button', {
                  type: 'button', class: 'icon-button',
                  title: 'Move down', 'aria-label': 'Move ' + label + ' ' + (index + 1) + ' down',
                  disabled: !state.writable.value || index === items.length - 1,
                  onClick: () => moveItem(list, index, 1),
                }, '↓'),
                h('button', {
                  type: 'button', class: 'icon-button delete-button',
                  title: 'Remove', 'aria-label': 'Remove ' + label + ' ' + (index + 1),
                  disabled: !state.writable.value,
                  onClick: () => dropItem(list, item.id),
                }, '×'),
              ]),
            ])))
          : h('p', { class: 'cr-small-note' },
            list === 'capabilities' ? 'No capabilities recorded yet.' : 'No boundaries have been expressed.'),
        h('div', { class: 'cr-add-row' }, [
          h('input', {
            class: 'cr-input', type: 'text',
            'aria-label': 'New client-stated ' + label,
            placeholder: list === 'capabilities'
              ? 'Add one requested capability…'
              : 'Add a constraint or explicit exclusion…',
            value: currentDraft.value,
            disabled: !state.writable.value,
            onInput: (event: Event) => {
              if (event.target instanceof HTMLInputElement) currentDraft.value = event.target.value;
            },
            onKeydown: (event: KeyboardEvent) => {
              if (event.key === 'Enter') { event.preventDefault(); addItem(list); }
            },
          }),
          h('button', {
            type: 'button', class: 'quiet-button',
            disabled: !state.writable.value || !hasText(currentDraft.value),
            onClick: () => addItem(list),
          }, 'Add'),
        ]),
      ];
    }

    function previewParagraph(title: string, text: string) {
      return hasText(text) ? h('section', { class: 'cr-preview-section' }, [
        h('h4', title),
        h('p', text),
      ]) : null;
    }

    function previewList(title: string, items: readonly BriefItem[]) {
      const visible = items.filter(item => hasText(item.text));
      return visible.length ? h('section', { class: 'cr-preview-section' }, [
        h('h4', title),
        h('ul', visible.map(item => h('li', { key: item.id }, item.text.trim()))),
      ]) : null;
    }

    function preview(brief: ClientBrief) {
      const present = hasText(brief.organization) || hasText(brief.context) ||
        hasText(brief.problem) || hasText(brief.solution) ||
        brief.capabilities.some(item => hasText(item.text)) ||
        brief.boundaries.some(item => hasText(item.text));
      return h('section', { class: 'cr-preview-pane', 'aria-labelledby': 'cr-preview-heading' }, [
        h('div', { class: 'cr-preview-heading' }, [
          h('div', [
            h('h3', { id: 'cr-preview-heading' }, 'Document preview'),
            h('p', 'Live · populated sections only'),
          ]),
          h('span', { class: 'cr-preview-label' }, 'CR'),
        ]),
        h('article', { class: 'cr-paper', 'aria-label': 'Client Requirements document preview' }, [
          h('p', { class: 'cr-paper-kicker' }, 'CLIENT BRIEF'),
          h('h3', 'Client Requirements'),
          !present ? h('div', { class: 'cr-paper-empty' }, [
            h('p', 'Your brief will appear as you enter client information.'),
          ]) : [
            hasText(brief.organization) ? h('h4', { class: 'cr-paper-client' }, brief.organization.trim()) : null,
            hasText(brief.context) ? h('p', { class: 'cr-paper-context' }, brief.context.trim()) : null,
            previewParagraph('Problem or opportunity', brief.problem),
            previewParagraph('Desired solution', brief.solution),
            previewList('Requested capabilities', brief.capabilities),
            previewList('Expressed boundaries', brief.boundaries),
          ],
        ]),
      ]);
    }

    function sourceCard(source: SourceEntry) {
      return h('li', { key: source.id }, [
        h('details', { class: 'cr-original-entry' }, [
          h('summary', [
            h('span', source.data.type === 'file' ? source.data.name : 'Original client statement'),
            h('span', { class: 'cr-source-date' }, dateLabel(source.data.createdAt)),
          ]),
          source.data.type === 'text'
            ? h('pre', { class: 'cr-original-text' }, source.data.body)
            : h('div', { class: 'cr-source-download' }, [
              h('span', { class: 'cr-small-note' }, 'Preserved file · ' + fileSize(source.data.size)),
              h('button', {
                type: 'button', class: 'quiet-button',
                onClick: () => {
                  sourceProblem.value = '';
                  try {
                    if (source.data.type === 'file') downloadOriginal(source.data);
                  } catch (error) {
                    sourceProblem.value = error instanceof Error ? error.message : String(error);
                  }
                },
              }, 'Download original'),
            ]),
        ]),
      ]);
    }

    return () => {
      const current = state.draft.value;
      const sources = sourceData.value;
      return h('div', { class: 'cr-workspace', 'data-view': view.value }, [
        h('div', { class: 'cr-toolbar' }, [
          h('div', { class: 'cr-view-toggle', role: 'group', 'aria-label': 'Document layout' },
            ([
              ['edit', 'Editor'],
              ['split', 'Split'],
              ['preview', 'Preview'],
            ] as const).map(([value, label]) => h('button', {
              type: 'button',
              class: ['cr-view-button', view.value === value ? 'is-active' : ''],
              'aria-pressed': view.value === value,
              onClick: () => {
                view.value = value;
                document.getElementById('document-content')?.scrollTo(0, 0);
              },
            }, label))),
          h('div', { class: 'cr-save-actions' }, [
            h('span', {
              class: ['cr-save-status', state.dirty.value ? 'is-unsaved' : ''],
              role: 'status', 'aria-live': 'polite',
            }, !state.ready.value ? 'Loading brief…'
              : state.busy.value ? 'Saving…'
              : state.conflict.value ? 'Save conflict'
              : state.problem.value && state.dirty.value ? 'Save failed — see message'
              : state.dirty.value ? 'Unsaved edits · Save to keep changes'
              : 'Saved in this browser'),
            h('button', {
              type: 'button', class: 'card-primary-button',
              disabled: !state.writable.value || !state.dirty.value,
              onClick: () => { void state.save(); },
            }, state.busy.value ? 'Saving…' : 'Save brief'),
          ]),
        ]),
        state.problem.value ? h('div', { class: 'cr-warning', role: 'alert' }, [
          h('p', state.problem.value),
          h('button', {
            type: 'button', class: 'quiet-button',
            onClick: () => { void state.reload(); },
          }, 'Load saved brief'),
        ]) : null,
        h('div', { class: 'cr-layout' }, [
          h('section', { class: 'cr-editor', 'aria-label': 'Client Requirements editor' }, [
            h('section', { class: 'cr-editor-card' }, [
              h('div', { class: 'cr-card-heading' }, [
                h('span', { class: 'cr-card-number' }, '01'),
                h('div', [h('h3', 'Client context'),
                  h('p', 'Who is requesting the system?')]),
              ]),
              field('Client or organization', 'organization', 'Organization name'),
              field('About the organization', 'context', 'A short description, if supplied', 2),
            ]),
            h('section', { class: 'cr-editor-card' }, [
              h('div', { class: 'cr-card-heading' }, [
                h('span', { class: 'cr-card-number' }, '02'),
                h('div', [h('h3', 'The request'), h('p', 'Only what the client has stated.')]),
              ]),
              field('Problem or opportunity (optional)', 'problem', 'Only if the client expressed one', 2),
              field('Desired solution', 'solution', 'What kind of system does the client envision?', 2),
            ]),
            h('section', { class: 'cr-editor-card' }, [
              h('div', { class: 'cr-card-heading' }, [
                h('span', { class: 'cr-card-number' }, '03'),
                h('div', [h('h3', 'Requested capabilities'),
                  h('p', 'One high-level request per entry.')]),
              ]),
              ...listEditor('capabilities'),
            ]),
            h('details', { class: 'cr-editor-card cr-optional' }, [
              h('summary', { class: 'cr-optional-heading' }, [
                h('span', 'Expressed boundaries'),
                h('span', { class: 'cr-small-note' }, current.boundaries.length ?
                  current.boundaries.length + ' recorded' : 'Optional'),
              ]),
              h('div', { class: 'cr-optional-body' }, [
                h('p', { class: 'cr-small-note' }, 'Only include limitations or exclusions the client explicitly mentioned.'),
                ...listEditor('boundaries'),
              ]),
            ]),
            h('details', { class: 'cr-editor-card cr-optional' }, [
              h('summary', { class: 'cr-optional-heading' }, [
                h('span', 'Original client material'),
                h('span', { class: 'cr-small-note' }, sources.entries.length ?
                  sources.entries.length + ' saved' : 'Optional'),
              ]),
              h('div', { class: 'cr-optional-body' }, [
                h('p', { class: 'cr-small-note' },
                  'Keep original statements or documents for reference. The structured brief is edited separately; no text is extracted or changed automatically.'),
                h('label', { class: 'cr-field-label', for: 'cr-source-text' }, 'Original statement'),
                h('textarea', {
                  id: 'cr-source-text', class: 'cr-input cr-input--multiline',
                  placeholder: 'Paste the client’s wording exactly as provided', rows: 3,
                  value: sourceDraft.value,
                  disabled: savingSource.value || !props.workspace.ready.value || !!sources.error,
                  onInput: (event: Event) => {
                    if (event.target instanceof HTMLTextAreaElement) sourceDraft.value = event.target.value;
                  },
                }),
                h('div', { class: 'cr-source-actions' }, [
                  h('button', {
                    type: 'button', class: 'quiet-button',
                    disabled: savingSource.value || !props.workspace.ready.value || !hasText(sourceDraft.value),
                    onClick: () => { void saveTextSource(); },
                  }, savingSource.value ? 'Saving…' : 'Keep original text'),
                  h('button', {
                    type: 'button', class: 'quiet-button',
                    disabled: savingSource.value || !props.workspace.ready.value,
                    onClick: () => filePicker.value?.click(),
                  }, 'Attach document'),
                  h('input', {
                    ref: filePicker, type: 'file',
                    accept: '.txt,.md,.markdown,.pdf,.doc,.docx,.odt,.rtf,.csv,.json',
                    class: 'visually-hidden', tabindex: -1,
                    onChange: (event: Event) => { void uploadSource(event); },
                  }),
                ]),
                sources.entries.length ? h('ul', { class: 'cr-originals' }, sources.entries.map(sourceCard)) : null,
                sources.error ? h('p', { class: 'cr-error', role: 'alert' }, sources.error) : null,
                sourceProblem.value ? h('p', { class: 'cr-error', role: 'alert' }, sourceProblem.value) : null,
                sourceMessage.value ? h('p', { class: 'cr-success', role: 'status' }, sourceMessage.value) : null,
              ]),
            ]),
          ]),
          preview(current),
        ]),
      ]);
    };
  },
});
