// A minimal, localStorage-backed stand-in for the Firestore JS SDK.
//
// It implements just enough of the real API surface (collection, doc, query,
// where, orderBy, limit, getDocs, getDoc, addDoc, updateDoc, deleteDoc,
// serverTimestamp, runTransaction, writeBatch) for this app's existing
// service files to run against it completely unmodified — see
// src/lib/firestoreFacade.ts, which is the only thing that imports this file.
//
// Data lives entirely in this browser's localStorage. It is never sent
// anywhere, and it's wiped whenever resetDemoData() is called (see demoMode.ts).

import { DEMO_DB_STORAGE_KEY } from './demoMode';

type PlainDoc = Record<string, any>;
type DemoDB = Record<string, Record<string, PlainDoc>>;

let idCounter = 0;
function genId(): string {
  idCounter += 1;
  return `demo-${Date.now().toString(36)}-${idCounter}-${Math.random().toString(36).slice(2, 8)}`;
}

function loadDB(): DemoDB {
  try {
    const raw = localStorage.getItem(DEMO_DB_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // fall through to empty DB
  }
  return {};
}

function saveDB(dbObj: DemoDB): void {
  try {
    localStorage.setItem(DEMO_DB_STORAGE_KEY, JSON.stringify(dbObj));
  } catch {
    // storage full or unavailable — demo just won't persist across reloads
  }
}

// ---- Timestamp handling -------------------------------------------------
// Firestore's serverTimestamp()/Timestamp objects expose .toDate(). Several
// call sites in this app check `field?.toDate ? field.toDate() : new Date(field)`,
// so this lightweight class keeps that code path working unmodified.
class DemoTimestamp {
  constructor(private iso: string) {}
  toDate() {
    return new Date(this.iso);
  }
  toMillis() {
    return new Date(this.iso).getTime();
  }
  toString() {
    return this.iso;
  }
}

const TIMESTAMP_MARKER = '__demoServerTimestamp__';

export function serverTimestamp() {
  return { [TIMESTAMP_MARKER]: true, iso: new Date().toISOString() };
}

function serializeForStorage(data: PlainDoc): PlainDoc {
  const out: PlainDoc = {};
  for (const [k, v] of Object.entries(data)) {
    if (v && typeof v === 'object' && (v as any)[TIMESTAMP_MARKER]) {
      out[k] = { [TIMESTAMP_MARKER]: true, iso: (v as any).iso };
    } else {
      out[k] = v;
    }
  }
  return out;
}

function hydrate(data: PlainDoc): PlainDoc {
  const out: PlainDoc = {};
  for (const [k, v] of Object.entries(data)) {
    if (v && typeof v === 'object' && (v as any)[TIMESTAMP_MARKER]) {
      out[k] = new DemoTimestamp((v as any).iso);
    } else {
      out[k] = v;
    }
  }
  return out;
}

// ---- Refs -----------------------------------------------------------------
export class DemoCollectionRef {
  constructor(public path: string) {}
}
export class DemoDocRef {
  constructor(public path: string, public id: string) {}
}

export function collection(_db: any, path: string): DemoCollectionRef {
  return new DemoCollectionRef(path);
}

export function doc(a: any, b?: string, c?: string): DemoDocRef {
  if (a instanceof DemoCollectionRef) {
    return new DemoDocRef(a.path, b || genId());
  }
  if (typeof b === 'string' && typeof c === 'string') {
    return new DemoDocRef(b, c);
  }
  if (typeof b === 'string') {
    return new DemoDocRef(b, genId());
  }
  throw new Error('demoFirestore.doc(): unsupported arguments');
}

// ---- Query building ---------------------------------------------------
type WhereClause = { __type: 'where'; field: string; op: string; value: any };
type OrderClause = { __type: 'orderBy'; field: string; dir: 'asc' | 'desc' };
type LimitClause = { __type: 'limit'; n: number };
type Clause = WhereClause | OrderClause | LimitClause;

export function where(field: string, op: string, value: any): WhereClause {
  return { __type: 'where', field, op, value };
}
export function orderBy(field: string, dir: 'asc' | 'desc' = 'asc'): OrderClause {
  return { __type: 'orderBy', field, dir };
}
export function limit(n: number): LimitClause {
  return { __type: 'limit', n };
}

export class DemoQuery {
  filters: WhereClause[] = [];
  orderField?: string;
  orderDir: 'asc' | 'desc' = 'asc';
  limitCount?: number;
  constructor(public colPath: string) {}
}

export function query(base: DemoCollectionRef | DemoQuery, ...clauses: Clause[]): DemoQuery {
  const q = base instanceof DemoQuery ? base : new DemoQuery(base.path);
  for (const c of clauses) {
    if (c.__type === 'where') q.filters.push(c);
    else if (c.__type === 'orderBy') {
      q.orderField = c.field;
      q.orderDir = c.dir;
    } else if (c.__type === 'limit') q.limitCount = c.n;
  }
  return q;
}

function matchOp(val: any, op: string, target: any): boolean {
  switch (op) {
    case '==':
      return val === target;
    case '!=':
      return val !== target;
    case '<':
      return val < target;
    case '<=':
      return val <= target;
    case '>':
      return val > target;
    case '>=':
      return val >= target;
    case 'in':
      return Array.isArray(target) && target.includes(val);
    case 'array-contains':
      return Array.isArray(val) && val.includes(target);
    default:
      return false;
  }
}

function compareVals(a: any, b: any): number {
  const av = a && a[TIMESTAMP_MARKER] ? a.iso : a;
  const bv = b && b[TIMESTAMP_MARKER] ? b.iso : b;
  if (av === bv) return 0;
  return av > bv ? 1 : -1;
}

function makeSnap(id: string, data: PlainDoc) {
  return { id, data: () => hydrate(data) };
}

// ---- Read/write API ------------------------------------------------------
export async function getDocs(q: DemoQuery | DemoCollectionRef) {
  const query_ = q instanceof DemoQuery ? q : new DemoQuery(q.path);
  const dbObj = loadDB();
  let entries = Object.entries(dbObj[query_.colPath] || {});
  for (const f of query_.filters) {
    entries = entries.filter(([id, data]) => {
      const val = f.field === '__name__' ? id : data[f.field];
      return matchOp(val, f.op, f.value);
    });
  }
  if (query_.orderField) {
    const field = query_.orderField;
    entries.sort((a, b) => compareVals(a[1][field], b[1][field]) * (query_.orderDir === 'desc' ? -1 : 1));
  }
  if (query_.limitCount != null) entries = entries.slice(0, query_.limitCount);
  const docs = entries.map(([id, data]) => makeSnap(id, data));
  return { empty: docs.length === 0, size: docs.length, docs };
}

export async function getDoc(ref: DemoDocRef) {
  const dbObj = loadDB();
  const data = dbObj[ref.path]?.[ref.id];
  return {
    exists: () => !!data,
    id: ref.id,
    data: () => (data ? hydrate(data) : undefined),
  };
}

export async function addDoc(colRef: DemoCollectionRef, data: PlainDoc): Promise<DemoDocRef> {
  const dbObj = loadDB();
  const id = genId();
  dbObj[colRef.path] = dbObj[colRef.path] || {};
  dbObj[colRef.path][id] = serializeForStorage(data);
  saveDB(dbObj);
  return new DemoDocRef(colRef.path, id);
}

export async function updateDoc(ref: DemoDocRef, partial: PlainDoc): Promise<void> {
  const dbObj = loadDB();
  const existing = dbObj[ref.path]?.[ref.id];
  if (!existing) throw new Error(`Demo doc not found: ${ref.path}/${ref.id}`);
  dbObj[ref.path][ref.id] = { ...existing, ...serializeForStorage(partial) };
  saveDB(dbObj);
}

export async function deleteDoc(ref: DemoDocRef): Promise<void> {
  const dbObj = loadDB();
  if (dbObj[ref.path]) delete dbObj[ref.path][ref.id];
  saveDB(dbObj);
}

// ---- Transactions & batches ------------------------------------------
// Simplified (non-concurrent) semantics: writes apply to a working copy and
// are only persisted if the callback resolves without throwing.
class DemoTransaction {
  constructor(private working: DemoDB) {}
  async get(ref: DemoDocRef) {
    const data = this.working[ref.path]?.[ref.id];
    return { exists: () => !!data, id: ref.id, data: () => (data ? hydrate(data) : undefined) };
  }
  set(ref: DemoDocRef, data: PlainDoc) {
    this.working[ref.path] = this.working[ref.path] || {};
    this.working[ref.path][ref.id] = serializeForStorage(data);
  }
  update(ref: DemoDocRef, partial: PlainDoc) {
    const existing = this.working[ref.path]?.[ref.id] || {};
    this.working[ref.path][ref.id] = { ...existing, ...serializeForStorage(partial) };
  }
  delete(ref: DemoDocRef) {
    if (this.working[ref.path]) delete this.working[ref.path][ref.id];
  }
}

export async function runTransaction<T>(_db: any, updateFn: (t: DemoTransaction) => Promise<T>): Promise<T> {
  const working = JSON.parse(JSON.stringify(loadDB())) as DemoDB;
  const txn = new DemoTransaction(working);
  const result = await updateFn(txn);
  saveDB(working);
  return result;
}

export function writeBatch(_db: any) {
  const working = JSON.parse(JSON.stringify(loadDB())) as DemoDB;
  return {
    set(ref: DemoDocRef, data: PlainDoc) {
      working[ref.path] = working[ref.path] || {};
      working[ref.path][ref.id] = serializeForStorage(data);
    },
    update(ref: DemoDocRef, partial: PlainDoc) {
      const existing = working[ref.path]?.[ref.id] || {};
      working[ref.path][ref.id] = { ...existing, ...serializeForStorage(partial) };
    },
    delete(ref: DemoDocRef) {
      if (working[ref.path]) delete working[ref.path][ref.id];
    },
    async commit() {
      saveDB(working);
    },
  };
}