import { computed, onBeforeUnmount, ref, shallowRef, watch, type Ref, type ShallowRef } from 'vue';
import { WorkspaceConflict, type WorkspaceDatabase, type WorkspaceSnapshot } from '../../core/data/indexeddb.ts';
import { MAX_IMPORT_BYTES, serializeDsrs, type PortableRecord } from '../../core/workspace/dsrs-format.ts';
import {
  CR_BRIEF_ID, CR_BRIEF_KIND, briefRecord, copyBrief, emptyBrief, parseBrief,
  type ClientBrief,
} from './model.ts';

const AUTOSAVE_DELAY_MS = 650;

export interface ClientWorkspace {
  current: ShallowRef<WorkspaceSnapshot | null>;
  ready: Ref<boolean>;
  busy: Ref<boolean>;
  database: WorkspaceDatabase;
}

/** One canonical saved CR record, with a short-lived editable draft and conflict-safe autosave. */
export function useClientBrief(workspace: ClientWorkspace) {
  const draft = shallowRef<ClientBrief>(emptyBrief());
  const saved = shallowRef<ClientBrief>(emptyBrief());
  const recordRevision = ref<number | null>(null);
  const storageId = ref<string | null>(null);
  const ready = ref(false);
  const busy = ref(false);
  const conflict = ref(false);
  const problem = ref('');
  const dirty = computed(() => JSON.stringify(draft.value) !== JSON.stringify(saved.value));
  // Editing remains available while a save is in flight; the saving loop captures later edits too.
  const writable = computed(() => workspace.ready.value && !workspace.busy.value &&
    ready.value && !conflict.value);

  const status = computed(() => {
    if (!ready.value) return 'Opening brief…';
    if (conflict.value) return 'Save conflict';
    if (problem.value) return 'Could not save';
    if (busy.value) return 'Saving…';
    if (dirty.value) return 'Unsaved changes';
    return 'Autosaved';
  });

  let fetchCounter = 0;
  let closed = false;
  let refreshQueued = false;
  let saveTimer: number | null = null;
  let savingTask: Promise<boolean> | null = null;

  function cancelScheduledSave(): void {
    if (saveTimer !== null) window.clearTimeout(saveTimer);
    saveTimer = null;
  }

  function scheduleSave(): void {
    cancelScheduledSave();
    if (closed || !dirty.value || !writable.value || !!problem.value) return;
    saveTimer = window.setTimeout(() => {
      saveTimer = null;
      void flushSave();
    }, AUTOSAVE_DELAY_MS);
  }

  async function refresh(force = false): Promise<void> {
    const snapshot = workspace.current.value;
    if (!workspace.ready.value || !snapshot || closed) {
      ready.value = false;
      cancelScheduledSave();
      return;
    }
    if (savingTask) { refreshQueued = true; return; }
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
        cancelScheduledSave();
        problem.value = 'The saved brief changed elsewhere while you were editing. Reload to see the latest version; your unsaved edits will not be overwritten automatically.';
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
      cancelScheduledSave();
      problem.value = error instanceof Error ? error.message : String(error);
    }
  }

  watch(() => [
    workspace.ready.value,
    workspace.current.value?.storageId,
    workspace.current.value?.revision,
  ], () => { void refresh(); }, { immediate: true });

  watch(draft, () => { scheduleSave(); });

  watch(writable, value => {
    if (value && dirty.value && !problem.value) scheduleSave();
  });

  function update(next: ClientBrief): void {
    if (!writable.value) return;
    draft.value = next;
    if (!conflict.value) problem.value = '';
  }

  function onBeforeUnload(event: BeforeUnloadEvent): void {
    if (!dirty.value) return;
    event.preventDefault();
    event.returnValue = '';
  }
  window.addEventListener('beforeunload', onBeforeUnload);

  onBeforeUnmount(() => {
    closed = true;
    cancelScheduledSave();
    window.removeEventListener('beforeunload', onBeforeUnload);
  });

  /** Coalesce saves, serialize writes, and keep a draft editable during each transaction. */
  async function persist(): Promise<boolean> {
    if (!writable.value || !storageId.value) return false;
    busy.value = true;
    problem.value = '';
    try {
      while (dirty.value && !conflict.value) {
        const snapshot = workspace.current.value;
        if (!snapshot || snapshot.storageId !== storageId.value) {
          conflict.value = true;
          throw new WorkspaceConflict('The workspace was replaced. Your unsaved edits have not been overwritten.');
        }
        const next = copyBrief(draft.value);
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
      }
      return !dirty.value;
    } catch (error) {
      if (error instanceof WorkspaceConflict) conflict.value = true;
      problem.value = error instanceof Error ? error.message : String(error);
      return false;
    } finally {
      busy.value = false;
    }
  }

  /** The same flush is used by autosave and before switching documents. */
  async function flushSave(): Promise<boolean> {
    cancelScheduledSave();
    if (savingTask) return savingTask;
    if (!dirty.value) return true;
    savingTask = persist();
    try {
      return await savingTask;
    } finally {
      savingTask = null;
      if (refreshQueued) {
        refreshQueued = false;
        void refresh();
      }
      // A newer edit during the transaction is retried without losing the existing draft.
      if (dirty.value && writable.value && !problem.value) scheduleSave();
    }
  }

  async function reload(): Promise<void> {
    if (dirty.value && !window.confirm('Discard unsaved Client Requirements edits and load the saved brief?')) return;
    cancelScheduledSave();
    if (savingTask) await savingTask;
    await refresh(true);
  }

  return { draft, dirty, ready, busy, writable, conflict, problem, status, update, flushSave, reload };
}
