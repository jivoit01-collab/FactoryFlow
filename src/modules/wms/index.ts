/**
 * WMS (Warehouse Management System) module — public surface.
 *
 * Step 1 ships the data layer only: record types, the pluggable storage adapter,
 * and the central store. No routes/screens yet (those arrive in later steps).
 */
export * from './types';
export * from './storage';
export * from './store';
export * from './services';
export { WmsEnabledGate } from './components/WmsEnabledGate';
export { WmsDisabledNotice } from './components/WmsDisabledNotice';
export { WarehouseGrid, type GridCell } from './components/WarehouseGrid';
export { ZoneDialog, type ZoneFormValue } from './components/ZoneDialog';
export { TextPromptDialog } from './components/TextPromptDialog';
export { TagInput } from './components/TagInput';
export { LocationPropertiesPanel } from './components/LocationPropertiesPanel';
export { WarehouseMapGrid, type MapCell } from './components/WarehouseMapGrid';
export { MapLegend } from './components/MapLegend';
export { LocationDetailPanel } from './components/LocationDetailPanel';
export { wmsModuleConfig } from './module.config';
export { createWmsId, nowIso, withTimestamps } from './utils';
