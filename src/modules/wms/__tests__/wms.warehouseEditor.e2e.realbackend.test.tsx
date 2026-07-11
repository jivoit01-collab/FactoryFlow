/**
 * REAL end-to-end test against a live Django `wms` backend (isolated DB).
 *
 * Unlike the unit tests, this runs the actual frontend stack — wmsStore +
 * useWarehouseEditor + ApiAdapter — over real HTTP against a running Django
 * server, with a real JWT and Company-Code header. It proves, on the real
 * backend + real database:
 *   1. a designed warehouse (warehouse + purposes + locations) persists and
 *      survives a reload — i.e. nothing auto-deletes it server-side; and
 *   2. the load-race fix holds end-to-end: a mutation issued while the
 *      `locations` collection is still loading does NOT delete the design from
 *      the database (the original bug did exactly that).
 *
 * Driven by two env vars so it stays inert in normal CI:
 *   E2E_BASE=http://127.0.0.1:8001/api/v1  E2E_TOKEN=<jwt>
 */
import { act, renderHook, waitFor } from '@testing-library/react';
import axios from 'axios';
import { describe, expect, it, vi } from 'vitest';

const BASE = process.env.E2E_BASE;
const TOKEN = process.env.E2E_TOKEN;
const COMPANY = process.env.E2E_COMPANY ?? 'E2E';
const run = BASE && TOKEN ? describe : describe.skip;

// A module-level gate so a request interceptor can hold the `locations` LIST
// call pending — reproducing the exact window where the editor is loading.
let holdLocationsList = false;
let releaseLocations: (() => void) | null = null;
function armLocationsGate() {
  holdLocationsList = true;
}
function openLocationsGate() {
  holdLocationsList = false;
  releaseLocations?.();
  releaseLocations = null;
}

// The real axios instance the frontend store/adapter will use. Named `mock*`
// so vitest allows the hoisted vi.mock factory below to reference it.
const mockApiClient = axios.create({
  baseURL: BASE,
  // Force Node's HTTP adapter: the test runs in jsdom, whose XHR would apply
  // browser CORS/origin rules and fail against the real server ("Network Error").
  adapter: 'http',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}`, 'Company-Code': COMPANY },
});
mockApiClient.interceptors.request.use(async (config) => {
  const isLocationsList =
    config.method === 'get' && /\/wms\/locations\/$/.test((config.baseURL ?? '') + (config.url ?? ''));
  if (isLocationsList && holdLocationsList) {
    await new Promise<void>((resolve) => {
      releaseLocations = resolve;
    });
  }
  return config;
});

// A separate, never-gated client to read the server's TRUE state directly.
const probe = axios.create({
  baseURL: BASE,
  adapter: 'http',
  headers: { Authorization: `Bearer ${TOKEN}`, 'Company-Code': COMPANY },
});
async function serverLocationCount(warehouseId: string): Promise<number> {
  const { data } = await probe.get('/wms/locations/');
  return (data as { warehouseId: string }[]).filter((l) => l.warehouseId === warehouseId).length;
}

vi.mock('@/core/api', () => ({ apiClient: mockApiClient }));

const { wmsStore } = await import('../store/wmsStore');
const { useWarehouseEditor } = await import('../store/useWarehouseEditor');
const { generateLayout, makeWarehouseLocation, makeCellPurpose, DEFAULT_NAMING_SCHEME } =
  await import('../services');
const { createWmsId, nowIso } = await import('../utils');

async function buildAndSaveDesign() {
  const timestamp = nowIso();
  const warehouse = {
    id: createWmsId(),
    code: 'E2E' + Date.now(),
    name: 'E2E Warehouse',
    description: '',
    enabled: true,
    columns: 3,
    rows: 2,
    levels: 1,
    namingScheme: DEFAULT_NAMING_SCHEME,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  const purpose = makeCellPurpose(warehouse.id, { name: 'Storage', color: '#16a34a', holdsStock: true });
  const locations = generateLayout({ columns: 3, rows: 2, levels: 1, naming: DEFAULT_NAMING_SCHEME }).map(
    (cell) => makeWarehouseLocation(warehouse.id, cell),
  );
  await wmsStore.saveWarehouseBundle({ warehouse, zones: [], purposes: [purpose], locations });
  return { warehouse, purpose, locations };
}

run('WMS editor — REAL Django backend E2E', () => {
  it('persists a designed warehouse across a reload (no server-side auto-delete)', async () => {
    wmsStore.reset();
    const { warehouse } = await buildAndSaveDesign();

    // "Reload": drop the in-memory cache and re-fetch from the real server.
    wmsStore.reset();
    const persisted = await wmsStore.getWarehouseBundle(warehouse.id);

    expect(persisted?.warehouse.name).toBe('E2E Warehouse');
    expect(persisted?.locations).toHaveLength(6);
    expect(persisted?.purposes).toHaveLength(1);

    await wmsStore.deleteWarehouseCascade(warehouse.id); // cleanup
  }, 30000);

  it('does NOT delete the design when a mutation fires before locations load', async () => {
    wmsStore.reset();
    const { warehouse, purpose } = await buildAndSaveDesign();
    expect(await serverLocationCount(warehouse.id)).toBe(6);

    // Fresh page open: empty cache, and hold the locations list pending so the
    // editor stays in its loading state while other collections resolve.
    wmsStore.reset();
    armLocationsGate();
    const { result } = renderHook(() => useWarehouseEditor(warehouse.id));
    await waitFor(() => expect(result.current.bundle).not.toBeNull());
    expect(result.current.loading).toBe(true);

    // The dangerous mutation the self-heal used to issue on a partial bundle.
    await act(async () => {
      await result.current.mutate((current) => ({ ...current, purposes: [], locations: [] }));
    });

    // On the REAL server, the design is untouched — the fix suppressed the write.
    expect(await serverLocationCount(warehouse.id)).toBe(6);

    // Let loading finish; the design is still whole.
    await act(async () => {
      openLocationsGate();
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
    const after = await wmsStore.getWarehouseBundle(warehouse.id);
    expect(after?.locations).toHaveLength(6);
    expect(after?.purposes.map((p) => p.id)).toContain(purpose.id);

    await wmsStore.deleteWarehouseCascade(warehouse.id); // cleanup
  }, 30000);
});
