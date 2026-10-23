import { defineComponent, h, ref, shallowRef, type PropType } from 'vue';
import { type DsrsFile } from '../core/workspace/dsrs-format.ts';
import type { WorkspaceController } from './workspace.ts';

/** Simple import/export access until the SRS workflow UI is designed. */
export const WorkspaceFiles = defineComponent({
  name: 'WorkspaceFiles',
  props: { workspace: { type: Object as PropType<WorkspaceController>, required: true } },
  setup(props) {
    const input = ref<HTMLInputElement | null>(null);
    const pending = shallowRef<{ name: string; data: DsrsFile } | null>(null);
    const reading = ref(false);
    const message = ref('');
    const error = ref('');

    async function select(event: Event): Promise<void> {
      if (!(event.target instanceof HTMLInputElement)) return;
      const file = event.target.files?.[0];
      event.target.value = '';
      if (!file) return;
      pending.value = null;
      message.value = '';
      error.value = '';
      reading.value = true;
      try { pending.value = { name: file.name, data: await props.workspace.readFile(file) }; }
      catch (cause) { error.value = cause instanceof Error ? cause.message : String(cause); }
      finally { reading.value = false; }
    }
    async function download(): Promise<void> {
      message.value = '';
      error.value = '';
      try {
        await props.workspace.download();
        message.value = 'Download started. Confirm the .dsrs file is in your Downloads folder.';
      } catch (cause) { error.value = cause instanceof Error ? cause.message : String(cause); }
    }
    async function restore(): Promise<void> {
      if (!pending.value) return;
      message.value = '';
      error.value = '';
      try {
        await props.workspace.restore(pending.value.data);
        pending.value = null;
        message.value = 'Workspace restored successfully.';
      } catch (cause) { error.value = cause instanceof Error ? cause.message : String(cause); }
    }

    return () => h('section', { class: 'workspace-files', 'aria-label': 'Workspace backups' }, [
      h('h3', 'Workspace files'),
      h('p', 'Your workspace is saved in this browser with IndexedDB. Download a .dsrs copy to keep it safe.'),
      h('div', { class: 'workspace-files-actions' }, [
        h('button', {
          type: 'button', class: 'quiet-button', disabled: !props.workspace.ready.value || props.workspace.busy.value,
          onClick: () => { void download(); },
        }, 'Download .dsrs'),
        h('button', {
          type: 'button', class: 'quiet-button', disabled: !props.workspace.ready.value || props.workspace.busy.value || reading.value,
          onClick: () => input.value?.click(),
        }, reading.value ? 'Reading file…' : 'Import .dsrs'),
        h('input', {
          ref: input, type: 'file', accept: '.dsrs,application/json', hidden: true,
          onChange: (event: Event) => { void select(event); },
        }),
      ]),
      pending.value ? h('div', { class: 'workspace-import-review', role: 'region', 'aria-label': 'Review workspace import' }, [
        h('p', [
          'Replace this browser workspace with ', h('strong', pending.value.data.workspace.name),
          ' from “' + pending.value.name + '”? It contains ' + pending.value.data.records.length +
          ' saved records. This replaces the current workspace rather than merging it.',
        ]),
        h('p', 'Download the current workspace first if you want to preserve a separate backup.'),
        h('div', { class: 'workspace-files-actions' }, [
          h('button', {
            type: 'button', class: 'quiet-button', disabled: props.workspace.busy.value,
            onClick: () => { void restore(); },
          }, props.workspace.busy.value ? 'Restoring…' : 'Replace workspace'),
          h('button', {
            type: 'button', class: 'quiet-button', disabled: props.workspace.busy.value,
            onClick: () => { pending.value = null; },
          }, 'Cancel'),
        ]),
      ]) : null,
      message.value ? h('p', { role: 'status', class: 'workspace-file-message' }, message.value) : null,
      error.value ? h('p', { role: 'alert', class: 'workspace-file-error' }, error.value) : null,
    ]);
  },
});
