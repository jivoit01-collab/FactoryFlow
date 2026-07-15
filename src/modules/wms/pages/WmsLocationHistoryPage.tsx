/**
 * Full movement audit trail for one location, server-paginated.
 *
 * Reached from the map's location detail panel ("View full history"). Movements
 * are unbounded in an FMCG warehouse, so every page is fetched on demand via
 * `useLocationMovements` (newest first) rather than loading the whole
 * `movements` collection.
 */
import { ArrowLeft } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { Button, Card, CardContent } from '@/shared/components/ui';

import { MovementItem } from '../components/MovementItem';
import { WmsDisabledNotice } from '../components/WmsDisabledNotice';
import { useLocationMovements, useWarehouses, useWmsCollection, useWmsEnabled } from '../store';

const PAGE_SIZE = 25;

export default function WmsLocationHistoryPage() {
  const enabled = useWmsEnabled();
  const { locationId = '' } = useParams<{ locationId: string }>();
  const { data: locations } = useWmsCollection('locations');
  const { data: pallets } = useWmsCollection('pallets');
  const { warehouses } = useWarehouses();
  const [page, setPage] = useState(0);

  const location = useMemo(
    () => locations.find((item) => item.id === locationId) ?? null,
    [locations, locationId],
  );
  const warehouse = useMemo(
    () => (location ? warehouses.find((item) => item.id === location.warehouseId) ?? null : null),
    [warehouses, location],
  );
  const codeById = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of locations) map.set(item.id, item.code);
    return map;
  }, [locations]);
  const plateById = useMemo(() => {
    const map = new Map<string, string>();
    for (const pallet of pallets) map.set(pallet.id, pallet.licensePlate);
    return map;
  }, [pallets]);

  const { movements, count, loading, error } = useLocationMovements(
    locationId || null,
    PAGE_SIZE,
    page * PAGE_SIZE,
  );
  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));

  if (!enabled) {
    return (
      <div className="mx-auto max-w-3xl p-4 md:p-6">
        <WmsDisabledNotice />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4 md:p-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-2 mb-2">
          <Link to="/warehouse-ops/map">
            <ArrowLeft className="mr-1 h-4 w-4" /> Back to map
          </Link>
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight">
          Movement history
          {location ? (
            <span className="ml-2 font-mono text-xl text-muted-foreground">{location.code}</span>
          ) : null}
        </h1>
        <p className="text-sm text-muted-foreground">
          {warehouse ? `${warehouse.name} · ` : ''}
          {count} movement{count === 1 ? '' : 's'}
        </p>
      </div>

      <Card>
        <CardContent className="space-y-2 py-4">
          {loading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>
          ) : error ? (
            <p className="py-8 text-center text-sm text-destructive">Could not load movements.</p>
          ) : movements.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No movements recorded for this location.
            </p>
          ) : (
            movements.map((entry) => (
              <MovementItem
                key={entry.id}
                entry={entry}
                thisLocationId={locationId}
                codeById={codeById}
                plateById={plateById}
              />
            ))
          )}
        </CardContent>
      </Card>

      {count > PAGE_SIZE ? (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            Page {page + 1} of {totalPages}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 0 || loading}
              onClick={() => setPage((current) => Math.max(0, current - 1))}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages - 1 || loading}
              onClick={() => setPage((current) => current + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
