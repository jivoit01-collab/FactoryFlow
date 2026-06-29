/**
 * In-memory stand-in for the Warehouse Ops backend, used to drive the store
 * tests now that the module persists only through the REST `ApiAdapter`.
 *
 * It implements the exact contract the Django `wms` app exposes — list / get /
 * create (upsert by id) / bulk / merge-patch / delete, with a 404 for missing
 * reads — so the tests exercise the real adapter + store against
 * backend-equivalent behaviour. Wire it into a test file with:
 *
 *   vi.mock('@/core/api', async () => {
 *     const mod = await import('./helpers/wmsBackendMock');
 *     return { apiClient: mod.apiClient };
 *   });
 *   import { resetWmsBackend } from './helpers/wmsBackendMock';
 *
 * The dynamic import in the mock factory and the static import in the test
 * resolve to the same module instance, so `resetWmsBackend()` clears the same
 * store the adapter writes to.
 */
import { createWmsId } from '../../utils';

type Doc = Record<string, unknown> & { id: string };

const tables = new Map<string, Map<string, Doc>>();

function tableFor(name: string): Map<string, Doc> {
  let table = tables.get(name);
  if (!table) {
    table = new Map();
    tables.set(name, table);
  }
  return table;
}

/** Clear every collection (call in `beforeEach`). */
export function resetWmsBackend(): void {
  tables.clear();
}

function notFound(): never {
  // Shaped like an axios error so ApiAdapter.get treats it as "missing".
  throw { response: { status: 404 } };
}

function parse(url: string): { collection: string; tail?: string } {
  const parts = url.split('/').filter(Boolean); // ['wms', collection, tail?]
  return { collection: parts[1], tail: parts[2] };
}

function store(record: Doc, table: Map<string, Doc>): Doc {
  const id = record.id ?? createWmsId();
  const doc = { ...record, id } as Doc;
  table.set(id, doc);
  return doc;
}

async function get(url: string) {
  const { collection, tail } = parse(url);
  const table = tableFor(collection);
  if (!tail) return { data: Array.from(table.values()) };
  const doc = table.get(tail);
  if (!doc) notFound();
  return { data: doc };
}

async function post(url: string, body: unknown) {
  const { collection, tail } = parse(url);
  const table = tableFor(collection);
  if (tail === 'bulk') {
    const saved = (body as Doc[]).map((record) => store(record, table));
    return { data: saved };
  }
  return { data: store(body as Doc, table) };
}

async function patch(url: string, body: unknown) {
  const { collection, tail } = parse(url);
  const table = tableFor(collection);
  const existing = tail ? table.get(tail) : undefined;
  if (!existing) notFound();
  const merged = { ...existing, ...(body as Record<string, unknown>), id: existing.id } as Doc;
  table.set(existing.id, merged);
  return { data: merged };
}

async function del(url: string) {
  const { collection, tail } = parse(url);
  if (tail) tableFor(collection).delete(tail);
  return { data: undefined };
}

export const apiClient = { get, post, patch, delete: del };
