import { computed, onBeforeUnmount, ref, shallowRef, watch, type Ref, type ShallowRef } from 'vue';
import { WorkspaceConflict, type WorkspaceDatabase, type WorkspaceSnapshot } from '../../core/data/indexeddb.ts';
import { MAX_IMPORT_BYTES, serializeDsrs, type PortableRecord } from '../../core/workspace/dsrs-format.ts';
import {
  CR_BRIEF_ID, CR_BRIEF_KIND, briefRecord, copyBrief, emptyBrief, parseBrief,
  type ClientBrief,
} from './model.ts';

export interface ClientWorkspace {
  current: ShallowRef<WorkspaceSnapshot | null>;
  ready: Ref<boolean>;
  busy: Ref<boolean>;
  database: WorkspaceDatabase;
}

/** A single CR brief is authoritative; edit state is only a local, unsaved draft. */
export function useClientBrief(workspace: ClientWorkspace) {
  const draft = shallowRef<ClientBrief>(emptyBrief());
  const saved = shallowRef<ClientBrief>(emptyBrief());
  const recordRevision = ref<number | null>(null);
  const storageId = ref<string | null>(null);
  const ready = ref(false);
  const busy = ref(false);
  const conflict = ref(false);
  const problem = ref('');
  const message = ref('');
  const dirty = computed(() => JSON.stringify(draft.value) !== JSON.stringify(saved.value));
  const writable = computed(() => workspace.ready.value && !workspace.busy.value &&
    ready.value && !busy.value && !conflict.value);
  let fetchCounter = 0;
  let closed = false;
  let refreshQueued = false;

  async function refresh(force = false): Promise<void> {
    const snapshot = workspace.current.value;
    if (!workspace.ready.value || !snapshot || closed) {
      ready.value = false;
      return;
    }
    if (busy.value) { refreshQueued = true; return; }
    const index = ++fetchCounter;
    try {
      const record = await workspace.database.get(CR_BRIEF_KIND, CR_BRIEF_ID, snapshot.storageId);
      if (closed || index !== fetchCounter) return;
      const incoming = record ? parseBrief(record.data) : emptyBrief();
      const incomingRevision = record?.revision ?? null;
      const changedWorkspace = storageId.value !== snapshot.storageId;
      const changedRecord = recordRevision.value !== incomingRevision;
      if (!force && ready.value && dirty.value && (changedWorkspace || changedRecord)) {
        conflict.value = true;
        problem.value = 'The saved workspace changed while you were editing. Keep your draft or reload the latest saved brief.';
        return;
      }
      if (force || !ready.value || changedWorkspace || changedRecord) {
        draft.value = copyBrief(incoming);
        saved.value = copyBrief(incoming);
        recordRevision.value = incomingRevision;
        storageId.value = snapshot.storageId;
      }
      conflict.value = false;
      ready.value = true;
      problem.value = '';
    } catch (error) {
      ready.value = false;
      problem.value = error instanceof Error ? error.message : String(error);
    }
  }

  watch(() => [
    workspace.ready.value,
    workspace.current.value?.storageId,
    workspace.current.value?.revision,
  ], () => { void refresh(); }, { immediate: true });

  function update(next: ClientBrief): void {
    if (writable.value) {
      draft.value = next;
      message.value = '';
    }
  }

  function onBeforeUnload(event: BeforeUnloadEvent): void {
    if (!dirty.value) return;
    event.preventDefault();
    event.returnValue = '';
  }
  window.addEventListener('beforeunload', onBeforeUnload);
  onBeforeUnmount(() => {
    closed = true;
    window.removeEventListener('beforeunload', onBeforeUnload);
  });

  /** Optimistic concurrency: never turn an unseen cross-tab change into a last-writer-wins overwrite. */
  async function save(): Promise<boolean> {
    if (!dirty.value) return true;
    if (!writable.value || !storageId.value) return false;
    const snapshot = workspace.current.value;
    if (!snapshot || snapshot.storageId !== storageId.value) {
      conflict.value = true;
      problem.value = 'The workspace was replaced. Reload the latest saved brief before editing.';
      return false;
    }
    busy.value = true;
    problem.value = '';
    message.value = '';
    const next = copyBrief(draft.value);
    try {
      const record = briefRecord(next);
      const records: PortableRecord[] = snapshot.file.records.filter(entry =>
        entry.kind !== CR_BRIEF_KIND || entry.id !== CR_BRIEF_ID);
      records.push(record);
      if (new Blob([serializeDsrs({ ...snapshot.file, records })]).size > MAX_IMPORT_BYTES) {
        throw new Error('The updated brief exceeds the supported backup size.');
      }
      const revision = await workspace.database.put(record, recordRevision.value, storageId.value);
      recordRevision.value = revision;
      saved.value = copyBrief(next);
      message.value = 'Client brief saved.';
      return true;
    } catch (error) {
      if (error instanceof WorkspaceConflict) conflict.value = true;
      problem.value = error instanceof Error ? error.message : String(error);
      return false;
    } finally {
      busy.value = false;
      if (refreshQueued) {
        refreshQueued = false;
        void refresh();
      }
    }
  }

  async function reload(): Promise<void> {
    if (dirty.value && !window.confirm('Discard unsaved Client Requirements edits and load the saved brief?')) return;
    busy.value = false;
    await refresh(true);
    message.value = '';
  }

  return { draft, dirty, ready, busy, writable, conflict, problem, message, update, save, reload };
}
