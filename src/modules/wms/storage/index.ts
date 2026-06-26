export type { WmsCollection, WmsCollectionMap, WmsStorageAdapter } from './adapter.types';
export { WMS_COLLECTIONS } from './adapter.types';
export { IndexedDbAdapter, isIndexedDbAvailable } from './indexedDbAdapter';
export { LocalStorageAdapter } from './localStorageAdapter';
export { ApiAdapter } from './apiAdapter';
export {
  DEFAULT_ADAPTER_KIND,
  createWmsAdapter,
  getActiveWmsAdapter,
  getActiveWmsAdapterKind,
  setActiveWmsAdapter,
} from './createAdapter';
