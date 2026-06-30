# WMS Module

A self-contained, frontend-driven Warehouse Management System. The user designs
the whole warehouse through the UI; nothing is hardcoded. All data is persisted
through a single pluggable **storage adapter** so the module can later move from
browser storage to a backend API by changing one file.

This is being built in the ordered steps described in `factory_app/idea`.

## Step 1 — Module Foundation (this commit)

The data layer everything else relies on.

```
wms/
├── types/            All record types (the source of truth)
│   └── wms.types.ts  Warehouse, Zone, WarehouseLocation, MaterialWarehouseProfile,
│                     Pallet, InventoryRecord, MovementLogEntry, WmsSettings
├── storage/          Pluggable persistence
│   ├── adapter.types.ts     WmsStorageAdapter contract + collection map
│   ├── indexedDbAdapter.ts  Default (DB: factoryWmsDB)
│   ├── localStorageAdapter.ts  Fallback
│   ├── apiAdapter.ts        Backend stub (Step 10)
│   └── createAdapter.ts     ← the ONE place the active adapter is chosen
├── store/            Central reactive store screens read through
│   ├── wmsStore.ts          In-memory cache over the active adapter
│   └── useWmsStore.ts       React hooks (useWmsCollection)
└── utils.ts          id + timestamp helpers
```

### Design rules baked in

- **Screens talk to the store/adapter, never to storage.** IndexedDB / localStorage
  access lives only inside the adapters.
- **One swap point.** `setActiveWmsAdapter(kind)` in `createAdapter.ts` switches
  the whole module between `indexeddb`, `localstorage`, and `api`.
- **Computed values are not stored.** Occupancy, status colour, and utilization
  are derived later (Step 5), never persisted on a record.

### Verify (Done-when: data survives a page reload)

In dev, the store is exposed as `window.__wmsStore`:

```js
// 1. write a record
await __wmsStore.create('warehouses', {
  id: crypto.randomUUID(), code: 'WH1', name: 'Main', description: '',
  enabled: true, columns: 5, rows: 4, levels: 1,
  namingScheme: { columnStyle: 'LETTERS', rowStyle: 'NUMBERS', levelStyle: 'NUMBERS', prefix: '', separator: '-' },
  createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
});

// 2. reload the page, then:
await __wmsStore.load('warehouses'); // → array still contains WH1
```

## Next steps

2. WMS settings + master enable/disable toggle
3. Warehouse designer (layout builder)
4. Block property editor
5. Visual map + occupancy engine
… see `factory_app/idea` for the full sequence.
