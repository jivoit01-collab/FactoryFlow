import { ClipboardCheck, Play } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { STOCK_AUDIT_PERMISSIONS } from '@/config/permissions';
import { usePermission } from '@/core/auth';
import { EmptyPanel, PageHeader, StatusPill } from '@/shared/components';
import { SearchableSelect } from '@/shared/components/SearchableSelect';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui';
import { getErrorMessage } from '@/shared/utils';

import { useSapWarehouses, useStartAudit, useStockAudits } from '../api';
import { when } from '../format';
import type { SapWarehouse } from '../types';

/**
 * Stock audits of the signed-in company's SAP warehouses: start one, or carry
 * on with one already open.
 */
export default function StockAuditListPage() {
  const { hasPermission } = usePermission();
  const canManage = hasPermission(STOCK_AUDIT_PERMISSIONS.MANAGE);
  const navigate = useNavigate();

  const audits = useStockAudits();
  const warehouses = useSapWarehouses(canManage);
  const start = useStartAudit();
  const [code, setCode] = useState('');

  const picked = useMemo(
    () => (warehouses.data ?? []).find((w) => w.code === code) ?? null,
    [warehouses.data, code],
  );

  const handleStart = async () => {
    if (!picked) return;
    try {
      const audit = await start.mutateAsync({
        warehouse_code: picked.code,
        warehouse_name: picked.name,
      });
      toast.success(`Audit of ${picked.code} started`);
      navigate(`/warehouse-ops/stock-audit/${audit.id}`);
    } catch (error) {
      toast.error(getErrorMessage(error, 'The audit was not started.'));
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Stock Audit" icon={ClipboardCheck} accent="teal" />

      {canManage && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">New audit</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-end gap-3">
              <div className="w-full max-w-md">
                <SearchableSelect<SapWarehouse>
                  label="Warehouse"
                  inputId="stock-audit-warehouse"
                  items={warehouses.data ?? []}
                  isLoading={warehouses.isLoading}
                  isError={warehouses.isError}
                  error={
                    warehouses.isError
                      ? getErrorMessage(warehouses.error, 'SAP is not answering.')
                      : undefined
                  }
                  value={code}
                  defaultDisplayText={picked ? `${picked.code} — ${picked.name}` : ''}
                  placeholder="Search a warehouse"
                  getItemKey={(w) => w.code}
                  getItemLabel={(w) => `${w.code} — ${w.name}`}
                  filterFn={(w, term) =>
                    `${w.code} ${w.name}`.toLowerCase().includes(term.toLowerCase())
                  }
                  renderItem={(w) => (
                    <div className="flex w-full items-center justify-between gap-2">
                      <span>
                        <span className="font-mono">{w.code}</span> — {w.name}
                      </span>
                      {w.open_audit_id && <StatusPill tone="progress">Audit open</StatusPill>}
                    </div>
                  )}
                  onItemSelect={(w) => setCode(w.code)}
                  onClear={() => setCode('')}
                  loadingText="Reading SAP’s warehouses…"
                  emptyText="SAP lists no active warehouse."
                  notFoundText="No warehouse matches."
                />
              </div>
              {picked?.open_audit_id ? (
                <Button asChild>
                  <Link to={`/warehouse-ops/stock-audit/${picked.open_audit_id}`}>Open</Link>
                </Button>
              ) : (
                <Button onClick={handleStart} disabled={!picked || start.isPending}>
                  <Play className="mr-2 h-4 w-4" />
                  {start.isPending ? 'Starting…' : 'Start'}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Audits</CardTitle>
        </CardHeader>
        <CardContent>
          {audits.isLoading || !audits.data?.length ? (
            <EmptyPanel
              loading={audits.isLoading}
              message={audits.isLoading ? 'Loading…' : 'No audits yet.'}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="py-2 font-medium">Warehouse</th>
                    <th className="py-2 font-medium">Status</th>
                    <th className="py-2 font-medium">Counted</th>
                    <th className="py-2 font-medium">Started</th>
                  </tr>
                </thead>
                <tbody>
                  {audits.data.map((audit) => (
                    <tr key={audit.id} className="border-b last:border-0">
                      <td className="py-2">
                        <Link
                          to={`/warehouse-ops/stock-audit/${audit.id}`}
                          className="font-medium text-primary hover:underline"
                        >
                          <span className="font-mono">{audit.warehouse_code}</span>{' '}
                          {audit.warehouse_name}
                        </Link>
                      </td>
                      <td className="py-2">
                        <StatusPill tone={audit.status === 'OPEN' ? 'progress' : 'done'} dot>
                          {audit.status === 'OPEN' ? 'Open' : 'Closed'}
                        </StatusPill>
                      </td>
                      <td className="py-2 tabular-nums">
                        {audit.counted ?? 0} / {audit.lines ?? 0}
                      </td>
                      <td className="py-2 text-muted-foreground">{when(audit.started_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
