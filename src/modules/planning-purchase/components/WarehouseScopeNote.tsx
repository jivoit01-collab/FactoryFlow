import { MATERIAL_TYPE_LABEL } from '../constants';
import type { WarehouseScope } from '../types';

/**
 * States which warehouses a number was counted in, per material type.
 *
 * Worth its own line rather than a footnote: the same plan reads very differently
 * depending on the scope — counting the whole estate pulls in finished-goods
 * godowns and wastage — so a reader has to be able to see which stores are behind
 * a shortage without asking anyone.
 */
export function WarehouseScopeNote({
  scope,
  filtered,
  excluded = [],
}: {
  scope: WarehouseScope;
  filtered: boolean;
  excluded?: string[];
}) {
  // A caller-supplied filter collapses the per-type map to one list, because at
  // that point it applies to every component whatever its type.
  if (filtered && scope.ALL?.length) {
    return (
      <p>
        Stock counted in <strong>{scope.ALL.join(', ')}</strong> as filtered.
      </p>
    );
  }

  const lines = (['PACKAGING', 'RAW'] as const)
    .map((type) => ({ type, codes: scope[type] ?? [] }))
    .filter((entry) => entry.codes.length);

  if (!lines.length) {
    return <p>Stock counted in every warehouse — no scope is configured.</p>;
  }

  return (
    <p>
      Stock counted per material type:{' '}
      {lines.map((entry, index) => (
        <span key={entry.type}>
          {index > 0 ? '; ' : ''}
          {(MATERIAL_TYPE_LABEL[entry.type] ?? entry.type).toLowerCase()} from{' '}
          <strong>{entry.codes.join(', ')}</strong>
        </span>
      ))}
      {excluded.length ? `. Excluded: ${excluded.join(', ')}` : ''}.
    </p>
  );
}
