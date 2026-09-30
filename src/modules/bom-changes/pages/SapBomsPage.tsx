/**
 * SAP BOMs — the bills of materials SAP holds, read live.
 *
 * Ported from SAP Portal's BOM search and load (`/api/sap/bom/search`,
 * `/api/sap/bom/:treeCode`). Search by the parent's code, the tree's
 * description or the item's name; open one to see its components and
 * resources. The portal's search only ever looked at the first 100 trees; this
 * one searches them all.
 *
 * "Request a change" / "Change directly" open the request form pre-filled with
 * the tree, offered only with the rights those endpoints check.
 */
import { GitBranch, Pencil, RefreshCw, Search } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { BOM_CHANGES_PERMISSIONS } from '@/config/permissions';
import { usePermission } from '@/core/auth';
import {
  EmptyPanel,
  PageHeader,
  PageSection,
  ROW_CLASSES,
  StatusPill,
  TABLE_CLASSES,
  TableCard,
  TableEmpty,
  TableLoading,
  Td,
  Th,
  THEAD_CLASSES,
} from '@/shared/components/page';
import { Button, Input } from '@/shared/components/ui';
import { useDebounce } from '@/shared/hooks';
import { cn } from '@/shared/utils';

import { useSapBom, useSapBoms } from '../api';
import { BomLinesTable } from '../components/BomLinesTable';

export default function SapBomsPage() {
  const navigate = useNavigate();
  const { hasPermission, hasAnyPermission } = usePermission();
  const canAsk = hasAnyPermission([
    BOM_CHANGES_PERMISSIONS.REQUEST,
    BOM_CHANGES_PERMISSIONS.PUSH_DIRECTLY,
  ]);
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState(params.get('search') ?? '');
  const debounced = useDebounce(search.trim(), 300);
  const selected = params.get('tree');

  const trees = useSapBoms(debounced);
  const tree = useSapBom(selected);
  const rows = trees.data ?? [];

  const open = (code: string) => {
    const next = new URLSearchParams(params);
    next.set('tree', code);
    setParams(next, { replace: true });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="SAP BOMs"
        icon={GitBranch}
        accent="indigo"
      >
        <Button
          variant="outline"
          onClick={() => trees.refetch()}
          disabled={trees.isFetching}
          aria-label="Reload from SAP"
        >
          <RefreshCw className={cn('mr-2 h-4 w-4', trees.isFetching && 'animate-spin')} />
          Refresh
        </Button>
      </PageHeader>

      <TableCard
        summary={
          trees.isFetching && !trees.isLoading
            ? 'Searching SAP…'
            : `${rows.length} ${rows.length === 1 ? 'BOM' : 'BOMs'}${rows.length >= 100 ? ' (first 100 — narrow the search)' : ''}`
        }
        actions={
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Item code, BOM or item name"
              aria-label="Search SAP BOMs"
              className="h-9 w-72 pl-8"
            />
          </div>
        }
        bodyClassName="max-h-[420px] overflow-y-auto"
      >
        <table className={TABLE_CLASSES}>
          <thead className={THEAD_CLASSES}>
            <tr>
              <Th>BOM (parent item)</Th>
              <Th>Description</Th>
              <Th>Type</Th>
              <Th align="right">Quantity</Th>
              <Th>Warehouse</Th>
              <Th align="right">Items</Th>
              <Th align="right">Resources</Th>
            </tr>
          </thead>
          <tbody>
            {trees.isLoading ? (
              <TableLoading colSpan={7} message="Reading SAP…" />
            ) : rows.length === 0 ? (
              <TableEmpty
                colSpan={7}
                message={trees.isError ? 'SAP could not be read' : 'No BOM matches'}
              />
            ) : (
              rows.map((row) => (
                <tr
                  key={row.tree_code}
                  className={cn(
                    ROW_CLASSES,
                    'cursor-pointer',
                    row.tree_code === selected && 'bg-muted/60',
                  )}
                  onClick={() => open(row.tree_code)}
                >
                  <Td className="font-mono text-xs font-semibold">{row.tree_code}</Td>
                  <Td>{row.description || '—'}</Td>
                  <Td>{row.bom_type || row.tree_type}</Td>
                  <Td numeric>{row.quantity}</Td>
                  <Td>{row.warehouse || '—'}</Td>
                  <Td numeric>{row.item_count}</Td>
                  <Td numeric>{row.resource_count}</Td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </TableCard>

      {selected && (
        <PageSection
          title={
            <span className="flex flex-wrap items-center gap-2">
              <span className="font-mono">{selected}</span>
              {tree.data && (
                <span className="font-normal text-muted-foreground">{tree.data.description}</span>
              )}
            </span>
          }
          description={
            tree.data
              ? [
                  tree.data.bom_type,
                  `makes ${tree.data.quantity}`,
                  tree.data.warehouse && `warehouse ${tree.data.warehouse}`,
                  tree.data.distribution_rule && `distribution rule ${tree.data.distribution_rule}`,
                  tree.data.project && `project ${tree.data.project}`,
                ]
                  .filter(Boolean)
                  .join(' · ')
              : undefined
          }
          actions={
            tree.data &&
            canAsk && (
              <Button
                size="sm"
                onClick={() =>
                  navigate(
                    `/bom-changes/requests/new?kind=UPDATE&tree=${encodeURIComponent(tree.data.tree_code)}`,
                  )
                }
              >
                <Pencil className="mr-2 h-4 w-4" />
                {hasPermission(BOM_CHANGES_PERMISSIONS.REQUEST)
                  ? 'Request a change'
                  : 'Change this BOM'}
              </Button>
            )
          }
        >
          {tree.isLoading ? (
            <EmptyPanel message="Reading the BOM from SAP…" loading />
          ) : tree.isError || !tree.data ? (
            <EmptyPanel message="SAP could not return this BOM" />
          ) : (
            <TableCard
              summary={
                <span className="flex items-center gap-2">
                  <StatusPill tone="neutral">{tree.data.item_count} items</StatusPill>
                  <StatusPill tone="info">{tree.data.resource_count} resources</StatusPill>
                  {tree.data.updated_at && <span>updated in SAP {tree.data.updated_at}</span>}
                </span>
              }
            >
              <BomLinesTable lines={tree.data.lines} />
            </TableCard>
          )}
        </PageSection>
      )}
    </div>
  );
}
