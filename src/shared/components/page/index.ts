// ============================================================================
// Working-page chrome
// ============================================================================
//
// The shell a list/detail page wears — header, filter bar, table card, status
// chips, stat strip — in the same visual language as the Dashboards hub, so a
// screen opened from the sidebar and a board opened from a tile read as one
// product.

export {
  ROW_CLASSES,
  TABLE_CLASSES,
  TableCard,
  TableEmpty,
  TableLoading,
  Td,
  Th,
  THEAD_CLASSES,
} from './DataTable';
export { EmptyPanel } from './EmptyPanel';
export { FilterAction, FilterBar, type FilterBarProps, FilterField } from './FilterBar';
export { PageHeader, type PageHeaderProps, PageSection } from './PageHeader';
export { StatTile, type StatTileProps, StatTileRow } from './StatTile';
export { StatusPill, type StatusTone } from './StatusPill';
