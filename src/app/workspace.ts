import { onBeforeUnmount, ref, shallowRef } from 'vue';
import { WorkspaceDatabase, type WorkspaceSnapshot } from '../core/data/indexeddb.ts';
import { downloadText } from '../core/file-download.ts';
import { MAX_IMPORT_BYTES, parseDsrs, type DsrsFile } from '../core/workspace/dsrs-format.ts';

export type WorkspaceController = ReturnType<typeof useWorkspace>;

/** The Vue state is a read-only view of committed IndexedDB content. */
export function useWorkspace() {
  const database = new WorkspaceDatabase();
  const current = shallowRef<WorkspaceSnapshot | null>(null);
  const ready = ref(false);
  const busy = ref(false);
  const problem = ref('');
  let closed = false;
  let generation = 0;
  let refreshPending = false;

  async function refresh() {
    if (busy.value) { refreshPending = true; return; }
    const started = ++generation;
    try {
      const snapshot = await database.snapshot();
      if (!closed && started === generation) {
        current.value = snapshot;
        ready.value = true;
        problem.value = '';
      }
    } catch (error) {
      if (!closed) {
        ready.value = false;
        problem.value = 'Workspace storage could not be read safely: ' + message(error);
      }
    }
  }

  function message(value: unknown): string {
    return value instanceof Error ? value.message : String(value);
  }
  const unsubscribe = database.subscribe(() => { void refresh(); });
  const unavailable = database.subscribeUnavailable(text => {
    ready.value = false;
    problem.value = text;
  });
  const onFocus = () => { if (!closed) void refresh(); };
  window.addEventListener('focus', onFocus);
  document.addEventListener('visibilitychange', onFocus);

  void database.open().then(refresh).catch(error => {
    if (!closed) {
      ready.value = false;
      problem.value = 'Could not open local workspace. Stored data has not been cleared: ' + message(error);
    }
  });

  async function download(): Promise<void> {
    if (!ready.value || busy.value) throw new Error('Workspace storage is not ready.');
    busy.value = true;
    try {
      const data = await database.exportFile();
      downloadText('dynamic-srs-' + new Date().toISOString().replace(/[:.]/g, '-') + '.dsrs', data);
    } finally {
      busy.value = false;
      if (refreshPending) { refreshPending = false; void refresh(); }
    }
  }

  async function readFile(file: File): Promise<DsrsFile> {
    if (file.size > MAX_IMPORT_BYTES) throw new Error('The .dsrs file exceeds 128 MiB.');
    return parseDsrs(await file.text());
  }

  async function restore(file: DsrsFile): Promise<void> {
    if (!ready.value || !current.value || busy.value) throw new Error('Workspace storage is not ready.');
    busy.value = true;
    try {
      await database.restore(file, current.value.storageId);
      const saved = await database.snapshot();
      current.value = saved;
      problem.value = '';
      ready.value = true;
    } catch (error) {
      problem.value = 'Restore failed; your active workspace was not intentionally replaced: ' + message(error);
      throw error;
    } finally {
      busy.value = false;
      if (refreshPending) { refreshPending = false; void refresh(); }
    }
  }

  onBeforeUnmount(() => {
    closed = true;
    unsubscribe();
    unavailable();
    database.close();
    window.removeEventListener('focus', onFocus);
    document.removeEventListener('visibilitychange', onFocus);
  });

  return { current, ready, busy, problem, download, readFile, restore, database };
}
