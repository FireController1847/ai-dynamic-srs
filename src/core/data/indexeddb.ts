import {
  DSRS_FORMAT, DSRS_VERSION, serializeDsrs, validateDsrs, validatePortableRecord,
  type DsrsFile, type PortableRecord, type JsonValue, type WorkspaceIdentity,
} from '../workspace/dsrs-format.ts';

// These revisions are independent: changing IndexedDB layout never silently changes .dsrs.
export const DATABASE_NAME = 'dynamic-srs-data';
export const DATABASE_VERSION = 1;
const CHANNEL = 'dynamic-srs.data.v1';
const CONTROL = 'control';
const WORKSPACES = 'workspaces';
const RECORDS = 'records';

interface ControlRow { key: 'local'; workspaceId: string }
interface WorkspaceRow extends WorkspaceIdentity {
  storageId: string;
  revision: number;
  updatedAt: string;
}
interface RecordRow extends PortableRecord {
  workspaceId: string;
  revision: number;
}
export interface WorkspaceSnapshot { file: DsrsFile; revision: number; storageId: string }
export interface StoredRecord extends PortableRecord { revision: number }

export class WorkspaceConflict extends Error {
  constructor(message = 'Another tab changed this workspace. Reload before saving.') {
    super(message);
    this.name = 'WorkspaceConflict';
  }
}

function resultOf<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed.'));
  });
}
function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error('IndexedDB transaction failed.'));
    transaction.onabort = () => reject(transaction.error ?? new Error('IndexedDB transaction aborted.'));
  });
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      reject(new Error('IndexedDB is unavailable. Changes cannot be safely saved.'));
      return;
    }
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    let blocked = false;
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(CONTROL)) db.createObjectStore(CONTROL, { keyPath: 'key' });
      if (!db.objectStoreNames.contains(WORKSPACES)) db.createObjectStore(WORKSPACES, { keyPath: 'storageId' });
      if (!db.objectStoreNames.contains(RECORDS)) {
        const store = db.createObjectStore(RECORDS, { keyPath: ['workspaceId', 'kind', 'id'] });
        store.createIndex('workspace', 'workspaceId');
        store.createIndex('kind', ['workspaceId', 'kind']);
      }
    };
    request.onblocked = () => {
      blocked = true;
      reject(new Error('Close other Dynamic SRS tabs to finish the database upgrade.'));
    };
    request.onerror = () => reject(request.error ?? new Error('Could not open IndexedDB.'));
    request.onsuccess = () => {
      if (blocked) request.result.close();
      else resolve(request.result);
    };
  });
}

/** Browser-local record provider. No SRS domain schema or Vue dependency belongs here. */
export class WorkspaceDatabase {
  private database: IDBDatabase | null = null;
  private channel: BroadcastChannel | null = null;
  private readonly listeners = new Set<() => void>();
  private readonly unavailableListeners = new Set<(message: string) => void>();
  private readonly clientId = crypto.randomUUID();
  private unavailable = false;

  async open(): Promise<void> {
    if (this.unavailable) throw new Error('This database connection is unavailable. Reload the page.');
    if (this.database) return;
    const db = await openDatabase();
    db.onversionchange = () => {
      this.unavailable = true;
      db.close();
      this.database = null;
      for (const listener of this.unavailableListeners) {
        try { listener('Another tab upgraded the database. Reload this page.'); }
        catch (error) { console.error('Database listener failed', error); }
      }
    };
    this.database = db;
    if (typeof BroadcastChannel !== 'undefined') {
      this.channel = new BroadcastChannel(CHANNEL);
      this.channel.onmessage = (event: MessageEvent<unknown>) => {
        const value = event.data;
        if (!value || typeof value !== 'object') return;
        const message = value as { type?: unknown; clientId?: unknown };
        if (message.type === 'changed' && message.clientId !== this.clientId) this.notify();
      };
    }
    await this.initialize();
  }

  close(): void {
    this.channel?.close();
    this.channel = null;
    this.database?.close();
    this.database = null;
    this.unavailable = true;
  }
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  subscribeUnavailable(listener: (message: string) => void): () => void {
    this.unavailableListeners.add(listener);
    return () => this.unavailableListeners.delete(listener);
  }
  private notify(): void {
    for (const listener of this.listeners) {
      try { listener(); } catch (error) { console.error('Workspace listener failed', error); }
    }
  }
  private committed(): void {
    this.notify();
    try { this.channel?.postMessage({ type: 'changed', clientId: this.clientId }); }
    catch { /* Recheck on focus/visibility if broadcasts are unsupported. */ }
  }
  private db(): IDBDatabase {
    if (!this.database || this.unavailable) throw new Error('IndexedDB is unavailable. Reload the page.');
    return this.database;
  }

  private async initialize(): Promise<void> {
    const transaction = this.db().transaction([CONTROL, WORKSPACES], 'readwrite');
    const done = transactionDone(transaction);
    const control = transaction.objectStore(CONTROL);
    control.get('local').onsuccess = event => {
      if ((event.target as IDBRequest<ControlRow | undefined>).result) return;
      const identity: WorkspaceIdentity = {
        id: crypto.randomUUID(), name: 'Untitled workspace', createdAt: new Date().toISOString(),
      };
      const storageId = crypto.randomUUID();
      transaction.objectStore(WORKSPACES).put({
        ...identity, storageId, revision: 0, updatedAt: identity.createdAt,
      } satisfies WorkspaceRow);
      control.put({ key: 'local', workspaceId: storageId } satisfies ControlRow);
    };
    await done;
  }

  /** Consistent committed snapshot: metadata and records share one read transaction. */
  async snapshot(): Promise<WorkspaceSnapshot> {
    const transaction = this.db().transaction([CONTROL, WORKSPACES, RECORDS], 'readonly');
    const done = transactionDone(transaction);
    const active = await resultOf<ControlRow | undefined>(transaction.objectStore(CONTROL).get('local'));
    if (!active) throw new Error('The active workspace pointer is missing.');
    const metaRequest = transaction.objectStore(WORKSPACES).get(active.workspaceId);
    const recordsRequest = transaction.objectStore(RECORDS).index('workspace').getAll(active.workspaceId);
    const [meta, records] = await Promise.all([
      resultOf<WorkspaceRow | undefined>(metaRequest),
      resultOf<RecordRow[]>(recordsRequest),
      done,
    ]);
    if (!meta) throw new Error('The active workspace metadata is missing.');
    const file = validateDsrs({
      format: DSRS_FORMAT, version: DSRS_VERSION,
      workspace: { id: meta.id, name: meta.name, createdAt: meta.createdAt },
      records: records.map(({ kind, id, data }) => ({ kind, id, data })),
    });
    return { file, revision: meta.revision, storageId: meta.storageId };
  }

  /** Read only one domain/collection, not the complete workspace. */
  async list(kind: string, storageId: string): Promise<StoredRecord[]> {
    const transaction = this.db().transaction([CONTROL, RECORDS], 'readonly');
    const done = transactionDone(transaction);
    const pointer = await resultOf<ControlRow | undefined>(transaction.objectStore(CONTROL).get('local'));
    if (pointer?.workspaceId !== storageId) throw new WorkspaceConflict();
    const request = transaction.objectStore(RECORDS).index('kind').getAll([storageId, kind]);
    const records = await resultOf<RecordRow[]>(request);
    await done;
    return records.map(({ id, kind: recordKind, data, revision }) =>
      ({ id, kind: recordKind, data, revision }));
  }

  async get(kind: string, id: string, storageId: string): Promise<StoredRecord | null> {
    const transaction = this.db().transaction([CONTROL, RECORDS], 'readonly');
    const done = transactionDone(transaction);
    const pointer = await resultOf<ControlRow | undefined>(transaction.objectStore(CONTROL).get('local'));
    if (pointer?.workspaceId !== storageId) throw new WorkspaceConflict();
    const request = transaction.objectStore(RECORDS).get([storageId, kind, id]);
    const record = await resultOf<RecordRow | undefined>(request);
    await done;
    return record ? { id: record.id, kind: record.kind, data: record.data, revision: record.revision } : null;
  }

  /** CAS: creation expects null; edits require an exact per-record revision. */
  async put(record: PortableRecord, expectedRevision: number | null, storageId: string): Promise<number> {
    const valid = validatePortableRecord(record);
    const transaction = this.db().transaction([CONTROL, WORKSPACES, RECORDS], 'readwrite');
    const done = transactionDone(transaction);
    let failure: Error | null = null;
    let revision = 0;
    const abort = (error: Error) => { failure = error; transaction.abort(); };
    transaction.objectStore(CONTROL).get('local').onsuccess = event => {
      const active = (event.target as IDBRequest<ControlRow | undefined>).result;
      if (active?.workspaceId !== storageId) { abort(new WorkspaceConflict()); return; }
      const store = transaction.objectStore(RECORDS);
      store.get([storageId, valid.kind, valid.id]).onsuccess = read => {
        const current = (read.target as IDBRequest<RecordRow | undefined>).result;
        if ((current?.revision ?? null) !== expectedRevision) {
          abort(new WorkspaceConflict('This record was edited in another tab.')); return;
        }
        revision = (current?.revision ?? 0) + 1;
        store.put({ ...valid, workspaceId: storageId, revision } satisfies RecordRow);
        this.bumpRevision(transaction, storageId, abort);
      };
    };
    try { await done; } catch (error) { throw failure ?? error; }
    this.committed();
    return revision;
  }

  async remove(kind: string, id: string, expectedRevision: number, storageId: string): Promise<void> {
    const transaction = this.db().transaction([CONTROL, WORKSPACES, RECORDS], 'readwrite');
    const done = transactionDone(transaction);
    let failure: Error | null = null;
    const abort = (error: Error) => { failure = error; transaction.abort(); };
    transaction.objectStore(CONTROL).get('local').onsuccess = event => {
      const active = (event.target as IDBRequest<ControlRow | undefined>).result;
      if (active?.workspaceId !== storageId) { abort(new WorkspaceConflict()); return; }
      const store = transaction.objectStore(RECORDS);
      store.get([storageId, kind, id]).onsuccess = read => {
        const current = (read.target as IDBRequest<RecordRow | undefined>).result;
        if (!current || current.revision !== expectedRevision) {
          abort(new WorkspaceConflict('This record was edited in another tab.')); return;
        }
        store.delete([storageId, kind, id]);
        this.bumpRevision(transaction, storageId, abort);
      };
    };
    try { await done; } catch (error) { throw failure ?? error; }
    this.committed();
  }

  private bumpRevision(transaction: IDBTransaction, storageId: string, abort: (error: Error) => void): void {
    const store = transaction.objectStore(WORKSPACES);
    store.get(storageId).onsuccess = event => {
      const current = (event.target as IDBRequest<WorkspaceRow | undefined>).result;
      if (!current) { abort(new Error('Workspace metadata is missing.')); return; }
      store.put({ ...current, revision: current.revision + 1, updatedAt: new Date().toISOString() });
    };
  }

  async exportFile(): Promise<string> {
    return serializeDsrs((await this.snapshot()).file);
  }

  /** Validate, stage, verify, then atomically flip the active workspace pointer. */
  async restore(value: unknown, expectedStorageId: string): Promise<void> {
    const file = validateDsrs(value);
    const storageId = crypto.randomUUID();
    {
      const transaction = this.db().transaction(WORKSPACES, 'readwrite');
      const done = transactionDone(transaction);
      transaction.objectStore(WORKSPACES).put({
        ...file.workspace, storageId, revision: 0, updatedAt: new Date().toISOString(),
      } satisfies WorkspaceRow);
      await done;
    }
    for (let index = 0; index < file.records.length; index += 300) {
      const transaction = this.db().transaction(RECORDS, 'readwrite');
      const done = transactionDone(transaction);
      for (const record of file.records.slice(index, index + 300)) {
        transaction.objectStore(RECORDS).put({ ...record, workspaceId: storageId, revision: 1 } satisfies RecordRow);
      }
      await done;
    }
    // A partial staging failure cannot corrupt the active workspace.
    {
      const transaction = this.db().transaction(RECORDS, 'readonly');
      const done = transactionDone(transaction);
      const records = await resultOf<RecordRow[]>(
        transaction.objectStore(RECORDS).index('workspace').getAll(storageId));
      await done;
      const staged = records.map(({ kind, id, data }) => ({ kind, id, data }));
      if (serializeDsrs({ ...file, records: staged }) !== serializeDsrs(file)) {
        throw new Error('Staged records did not match the file. Your current workspace is unchanged.');
      }
    }
    const transaction = this.db().transaction(CONTROL, 'readwrite');
    const done = transactionDone(transaction);
    let failure: Error | null = null;
    transaction.objectStore(CONTROL).get('local').onsuccess = event => {
      const active = (event.target as IDBRequest<ControlRow | undefined>).result;
      if (active?.workspaceId !== expectedStorageId) {
        failure = new WorkspaceConflict('Another tab replaced the workspace. Import was cancelled.');
        transaction.abort();
        return;
      }
      transaction.objectStore(CONTROL).put({ key: 'local', workspaceId: storageId } satisfies ControlRow);
    };
    try { await done; } catch (error) { throw failure ?? error; }
    this.committed();
  }
}
