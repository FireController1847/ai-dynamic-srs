import { computed, defineComponent, h, ref, type PropType } from 'vue';
import type { WorkspaceController } from '../../app/workspace.ts';
import { MAX_IMPORT_BYTES, serializeDsrs, type PortableRecord } from '../../core/workspace/dsrs-format.ts';
import {
  CR_AI_KIND, CR_INTERVIEW_KIND, aiInterpretationPrompt, clientRecords, createNote,
  createSourceFile, createSourceText, downloadOriginalFile, readFileBase64,
  type ClientEntry, type ClientRecords,
} from './model.ts';

function formatDate(value: string): string {
  return new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

function formatFileSize(size: number): string {
  return size < 1024 ? size + ' bytes' : size < 1024 * 1024
    ? (size / 1024).toFixed(1) + ' KB' : (size / (1024 * 1024)).toFixed(1) + ' MB';
}

export const ClientRequirements = defineComponent({
  name: 'ClientRequirements',
  props: {
    workspace: { type: Object as PropType<WorkspaceController>, required: true },
  },
  setup(props) {
    const originalDraft = ref('');
    const aiDraft = ref('');
    const interviewDraft = ref('');
    const fileInput = ref<HTMLInputElement | null>(null);
    const working = ref(false);
    const feedback = ref('');
    const problem = ref('');

    const records = computed((): { value: ClientRecords; error: string } => {
      const empty: ClientRecords = { sources: [], interpretations: [], interviews: [] };
      const snapshot = props.workspace.current.value;
      if (!snapshot) return { value: empty, error: '' };
      try { return { value: clientRecords(snapshot.file.records), error: '' }; }
      catch (error) {
        return { value: empty, error: error instanceof Error ? error.message : String(error) };
      }
    });

    const canWrite = computed(() =>
      props.workspace.ready.value && !props.workspace.busy.value && !working.value &&
      !records.value.error);

    function clearMessage() { feedback.value = ''; problem.value = ''; }
    function errorMessage(error: unknown) {
      problem.value = error instanceof Error ? error.message : String(error);
    }

    async function addText(): Promise<void> {
      if (!originalDraft.value.trim() || !canWrite.value) return;
      clearMessage();
      working.value = true;
      try {
        await saveWhileWorking(createSourceText(originalDraft.value));
        originalDraft.value = '';
        feedback.value = 'Original client statement saved unchanged.';
      } catch (error) { errorMessage(error); }
      finally { working.value = false; }
    }

    // Writing locks the UI during async operations, but storage readiness is checked
    // against the current committed workspace immediately before the database write.
    async function saveWhileWorking(record: PortableRecord): Promise<void> {
      const snapshot = props.workspace.current.value;
      if (!props.workspace.ready.value || props.workspace.busy.value || records.value.error || !snapshot) {
        throw new Error('Workspace storage is unavailable.');
      }
      const next = { ...snapshot.file, records: [...snapshot.file.records, record] };
      if (new Blob([serializeDsrs(next)]).size > MAX_IMPORT_BYTES) {
        throw new Error('This document would make the .dsrs backup too large to restore. Use a smaller source file.');
      }
      await props.workspace.database.put(record, null, snapshot.storageId);
    }

    async function addFile(event: Event): Promise<void> {
      if (!(event.target instanceof HTMLInputElement)) return;
      const file = event.target.files?.[0];
      event.target.value = '';
      if (!file || !canWrite.value) return;
      clearMessage();
      working.value = true;
      try {
        // The portable format has a 128 MiB import safeguard. Refuse an individual
        // attachment that could never fit a restorable backup.
        if (Math.ceil(file.size / 3) * 4 > MAX_IMPORT_BYTES) {
          throw new Error('This file is too large for a restorable .dsrs backup.');
        }
        const base64 = await readFileBase64(file);
        await saveWhileWorking(createSourceFile(file, base64));
        feedback.value = 'Original file saved intact: ' + file.name;
      } catch (error) { errorMessage(error); }
      finally { working.value = false; }
    }

    async function addNote(kind: typeof CR_AI_KIND | typeof CR_INTERVIEW_KIND): Promise<void> {
      const draft = kind === CR_AI_KIND ? aiDraft : interviewDraft;
      if (!draft.value.trim() || !canWrite.value) return;
      clearMessage();
      working.value = true;
      try {
        await saveWhileWorking(createNote(kind, draft.value));
        draft.value = '';
        feedback.value = kind === CR_AI_KIND ? 'AI interpretation saved as a separate draft.' :
          'Interview note saved separately from the original client material.';
      } catch (error) { errorMessage(error); }
      finally { working.value = false; }
    }

    async function copyPrompt(): Promise<void> {
      if (records.value.value.sources.length === 0) return;
      clearMessage();
      try {
        await navigator.clipboard.writeText(aiInterpretationPrompt(records.value.value.sources));
        feedback.value = 'Prompt copied. Paste it into your AI chat and attach any listed documents.';
      } catch (error) {
        errorMessage(error);
        problem.value += ' You can also select and copy the prompt from the preview below.';
      }
    }

    function sourceCard(item: ClientRecords['sources'][number]) {
      const source = item.data;
      return h('li', { key: item.id, class: 'cr-entry' }, [
        h('div', { class: 'cr-entry-top' }, [
          h('strong', source.type === 'text' ? 'Pasted client statement' : source.name),
          h('time', { datetime: source.createdAt }, formatDate(source.createdAt)),
        ]),
        source.type === 'text'
          ? h('pre', { class: 'cr-verbatim' }, source.body)
          : h('div', { class: 'cr-file-entry' }, [
            h('span', { class: 'cr-muted' }, 'Original file · ' + formatFileSize(source.size)),
            h('button', {
              type: 'button', class: 'quiet-button',
              onClick: () => {
                clearMessage();
                try { downloadOriginalFile(source); }
                catch (error) { errorMessage(error); }
              },
            }, 'Download original'),
          ]),
      ]);
    }

    function noteCard(item: ClientEntry) {
      if (item.kind === 'cr.source') return null;
      return h('li', { key: item.id, class: 'cr-entry' }, [
        h('div', { class: 'cr-entry-top' }, [
          h('strong', item.kind === CR_AI_KIND ? 'AI interpretation · unverified' : 'Interview note · client follow-up'),
          h('time', { datetime: item.data.createdAt }, formatDate(item.data.createdAt)),
        ]),
        h('pre', { class: 'cr-verbatim' }, item.data.body),
      ]);
    }

    return () => {
      const data = records.value.value;
      const usable = canWrite.value;
      return h('div', { class: 'cr-workspace' }, [
        h('p', { class: 'cr-intro' },
          'Start with the client’s own words. Details can be clarified later; nothing here needs to be finalized first.'),
        records.value.error ? h('p', { class: 'workspace-file-error', role: 'alert' }, records.value.error) : null,
        h('section', { class: 'cr-section', 'aria-labelledby': 'cr-original-heading' }, [
          h('header', { class: 'cr-section-heading' }, [
            h('div', [
              h('h3', { id: 'cr-original-heading' }, 'Original client material'),
              h('p', 'Added as received. AI notes and later clarifications will not change it.'),
            ]),
            h('span', { class: 'cr-count' }, String(data.sources.length)),
          ]),
          h('label', { class: 'cr-field-label', for: 'cr-original-text' }, 'Paste client requirements'),
          h('textarea', {
            id: 'cr-original-text', class: 'cr-textarea', rows: 4,
            placeholder: 'Paste the original statement, email, or brief exactly as provided…',
            value: originalDraft.value,
            disabled: !usable,
            onInput: (event: Event) => {
              if (event.target instanceof HTMLTextAreaElement) originalDraft.value = event.target.value;
            },
          }),
          h('div', { class: 'cr-actions' }, [
            h('button', {
              type: 'button', class: 'card-primary-button',
              disabled: !usable || !originalDraft.value.trim(),
              onClick: () => { void addText(); },
            }, working.value ? 'Saving…' : 'Save original text'),
            h('button', {
              type: 'button', class: 'quiet-button',
              disabled: !usable,
              onClick: () => fileInput.value?.click(),
            }, 'Upload document'),
            h('input', {
              ref: fileInput, type: 'file',
              accept: '.txt,.md,.markdown,.pdf,.doc,.docx,.odt,.rtf,.csv,.json',
              class: 'visually-hidden', tabindex: -1,
              onChange: (event: Event) => { void addFile(event); },
            }),
          ]),
          data.sources.length
            ? h('ul', { class: 'cr-entries', 'aria-label': 'Original client statements' }, data.sources.map(sourceCard))
            : h('p', { class: 'cr-muted cr-none' }, 'No client material added yet.'),
        ]),
        h('details', { class: 'cr-section cr-disclosure' }, [
          h('summary', { class: 'cr-disclosure-title' }, [
            h('span', 'Optional AI interpretation'),
            h('span', { class: 'cr-secondary' }, data.interpretations.length + ' saved'),
          ]),
          h('div', { class: 'cr-disclosure-content' }, [
            h('p', { class: 'cr-muted' },
              'Ask an AI to identify early business needs, goals, and open questions. Its response stays separate from the source. Nothing is sent automatically.'),
            h('div', { class: 'cr-actions' }, [
              h('button', {
                type: 'button', class: 'quiet-button',
                disabled: !data.sources.length,
                onClick: () => { void copyPrompt(); },
              }, 'Copy AI prompt'),
              h('a', {
                class: 'quiet-button', href: 'https://chatgpt.com/',
                target: '_blank', rel: 'noopener noreferrer',
              }, 'Open ChatGPT ↗'),
            ]),
            h('p', { class: 'cr-muted cr-small' },
              'Paste the copied prompt into your AI chat. If you uploaded a PDF or Word file, download the original above and attach it to that chat too.'),
            data.sources.length ? h('details', { class: 'cr-prompt-preview' }, [
              h('summary', 'View or manually copy prompt'),
              h('textarea', {
                class: 'cr-textarea', rows: 5, readonly: true,
                'aria-label': 'AI interpretation prompt',
                value: aiInterpretationPrompt(data.sources),
              }),
            ]) : null,
            h('label', { class: 'cr-field-label', for: 'cr-ai-response' }, 'AI response (optional)'),
            h('textarea', {
              id: 'cr-ai-response', class: 'cr-textarea', rows: 4,
              placeholder: 'Paste the AI response here to keep it separate from the original client statement…',
              value: aiDraft.value, disabled: !usable,
              onInput: (event: Event) => {
                if (event.target instanceof HTMLTextAreaElement) aiDraft.value = event.target.value;
              },
            }),
            h('div', { class: 'cr-actions' }, [
              h('button', {
                type: 'button', class: 'quiet-button',
                disabled: !usable || !aiDraft.value.trim(),
                onClick: () => { void addNote(CR_AI_KIND); },
              }, 'Save interpretation'),
            ]),
            data.interpretations.length
              ? h('ul', { class: 'cr-entries' }, data.interpretations.map(noteCard))
              : null,
          ]),
        ]),
        h('details', { class: 'cr-section cr-disclosure' }, [
          h('summary', { class: 'cr-disclosure-title' }, [
            h('span', 'Interview notes & clarifications'),
            h('span', { class: 'cr-secondary' }, data.interviews.length + ' saved'),
          ]),
          h('div', { class: 'cr-disclosure-content' }, [
            h('p', { class: 'cr-muted' },
              'Record what the client clarified or answered later. Earlier statements are preserved; unresolved questions can stay open.'),
            h('label', { class: 'cr-field-label', for: 'cr-interview-note' }, 'New interview note'),
            h('textarea', {
              id: 'cr-interview-note', class: 'cr-textarea', rows: 3,
              placeholder: 'What did the client explain or clarify?',
              value: interviewDraft.value, disabled: !usable,
              onInput: (event: Event) => {
                if (event.target instanceof HTMLTextAreaElement) interviewDraft.value = event.target.value;
              },
            }),
            h('div', { class: 'cr-actions' }, [
              h('button', {
                type: 'button', class: 'quiet-button',
                disabled: !usable || !interviewDraft.value.trim(),
                onClick: () => { void addNote(CR_INTERVIEW_KIND); },
              }, 'Save interview note'),
            ]),
            data.interviews.length ? h('ul', { class: 'cr-entries' }, data.interviews.map(noteCard)) : null,
          ]),
        ]),
        feedback.value ? h('p', { class: 'cr-feedback', role: 'status' }, feedback.value) : null,
        problem.value ? h('p', { class: 'workspace-file-error', role: 'alert' }, problem.value) : null,
      ]);
    };
  },
});
