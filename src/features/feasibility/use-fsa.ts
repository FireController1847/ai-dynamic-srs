import { computed, onBeforeUnmount, ref, shallowRef, watch, type Ref, type ShallowRef } from 'vue';
import { WorkspaceConflict, type WorkspaceDatabase, type WorkspaceSnapshot } from '../../core/data/indexeddb.ts';
import { MAX_IMPORT_BYTES, serializeDsrs, type PortableRecord } from '../../core/workspace/dsrs-format.ts';
import {
  FSA_ID, FSA_KIND, fsaRecord, copyFsa, emptyFsa, parseFsa,
  type FeasibilityAssessment,
} from './model.ts';

const SAVE_DELAY = 650;

export interface FsaWorkspace {
  current: ShallowRef<WorkspaceSnapshot | null>;
  ready: Ref<boolean>;
  busy: Ref<boolean>;
  database: WorkspaceDatabase;
}

/** A single canonical feasibility assessment with CAS revisions and independently editable in-flight drafts. */
export function useFsa(workspace: FsaWorkspace) {
  const draft = shallowRef<FeasibilityAssessment>(emptyFsa());
  const saved = shallowRef<FeasibilityAssessment>(emptyFsa());
  const recordRevision = ref<number | null>(null);
  const storageId = ref<string | null>(null);
  const ready = ref(false);
  const busy = ref(false);
  const conflict = ref(false);
  const problem = ref('');
  const dirty = computed(() => JSON.stringify(draft.value) !== JSON.stringify(saved.value));
  const writable = computed(() => workspace.ready.value && !workspace.busy.value &&
    ready.value && !conflict.value);
  const status = computed(() => !ready.value ? 'Opening feasibility assessment…' :
    conflict.value ? 'Save conflict' : problem.value ? 'Could not save' :
      busy.value ? 'Saving…' : dirty.value ? 'Unsaved changes' : 'Autosaved');

  let fetchCounter = 0;
  let closed = false;
  let refreshQueued = false;
  let timer: number | null = null;
  let savingTask: Promise<boolean> | null = null;

  function cancelTimer() {
    if (timer !== null) window.clearTimeout(timer);
    timer = null;
  }
  function scheduleSave() {
    cancelTimer();
    if (closed || !dirty.value || !writable.value || problem.value) return;
    timer = window.setTimeout(() => { timer = null; void flushSave(); }, SAVE_DELAY);
  }
  async function refresh(force = false): Promise<void> {
    const snapshot = workspace.current.value;
    if (!workspace.ready.value || !snapshot || closed) {
      ready.value = false;
      cancelTimer();
      return;
    }
    if (savingTask) { refreshQueued = true; return; }
    const index = ++fetchCounter;
    try {
      const record = await workspace.database.get(FSA_KIND, FSA_ID, snapshot.storageId);
      if (closed || index !== fetchCounter) return;
      const incoming = record ? parseFsa(record.data) : emptyFsa();
      const revision = record?.revision ?? null;
      const workspaceChanged = storageId.value !== snapshot.storageId;
      const recordChanged = recordRevision.value !== revision;
      if (!force && ready.value && dirty.value && (workspaceChanged || recordChanged)) {
        conflict.value = true;
        cancelTimer();
        problem.value = 'The saved feasibility assessment changed in another tab or workspace. Reload the saved version, or leave your unsaved draft intact.';
        return;
      }
      if (force || !ready.value || workspaceChanged || recordChanged) {
        draft.value = copyFsa(incoming);
        saved.value = copyFsa(incoming);
        recordRevision.value = revision;
        storageId.value = snapshot.storageId;
      }
      conflict.value = false;
      problem.value = '';
      ready.value = true;
    } catch (error) {
      ready.value = false;
      cancelTimer();
      problem.value = error instanceof Error ? error.message : String(error);
    }
  }
  watch(() => [
    workspace.ready.value, workspace.current.value?.storageId,
    workspace.current.value?.revision,
  ], () => { void refresh(); }, { immediate: true });
  watch(draft, scheduleSave);
  watch(writable, value => {
    if (value && dirty.value && !problem.value) scheduleSave();
  });

  function update(next: FeasibilityAssessment) {
    if (!writable.value) return;
    draft.value = next;
    if (!conflict.value) problem.value = '';
  }
  function beforeUnload(event: BeforeUnloadEvent) {
    if (!dirty.value) return;
    event.preventDefault();
    event.returnValue = '';
  }
  window.addEventListener('beforeunload', beforeUnload);
  onBeforeUnmount(() => {
    closed = true;
    cancelTimer();
    window.removeEventListener('beforeunload', beforeUnload);
  });

  async function persist(): Promise<boolean> {
    if (!writable.value || !storageId.value) return false;
    busy.value = true;
    problem.value = '';
    try {
      while (dirty.value && !conflict.value) {
        const snapshot = workspace.current.value;
        if (!snapshot || snapshot.storageId !== storageId.value) {
          conflict.value = true;
          throw new WorkspaceConflict('The active workspace was replaced.');
        }
        const next = copyFsa(draft.value);
        const record = fsaRecord(next);
        const records: PortableRecord[] = snapshot.file.records.filter(entry =>
          entry.kind !== FSA_KIND || entry.id !== FSA_ID);
        records.push(record);
        if (new Blob([serializeDsrs({ ...snapshot.file, records })]).size > MAX_IMPORT_BYTES) {
          throw new Error('The updated assessment exceeds the workspace backup size.');
        }
        const revision = await workspace.database.put(record, recordRevision.value, storageId.value);
        recordRevision.value = revision;
        saved.value = copyFsa(next);
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
  async function flushSave(): Promise<boolean> {
    cancelTimer();
    if (savingTask) return savingTask;
    if (!dirty.value) return true;
    savingTask = persist();
    try {
      return await savingTask;
    } finally {
      savingTask = null;
      if (refreshQueued) { refreshQueued = false; void refresh(); }
      if (dirty.value && writable.value && !problem.value) scheduleSave();
    }
  }
  async function retrySave() {
    if (conflict.value) return false;
    problem.value = '';
    return flushSave();
  }
  async function reload() {
    if (dirty.value && !window.confirm('Discard unsaved Feasibility & Stakeholder Analysis changes?')) return;
    cancelTimer();
    if (savingTask) await savingTask;
    await refresh(true);
  }

  return { draft, dirty, ready, busy, writable, conflict, problem,
    status, update, flushSave, retrySave, reload };
}
