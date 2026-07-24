import { ArrowLeft, ChevronRight, Plus, RefreshCw } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { QC_PERMISSIONS } from '@/config/permissions';
import { usePermission } from '@/core/auth/hooks/usePermission';
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  NativeSelect,
  SelectOption,
} from '@/shared/components/ui';
import { getErrorMessage } from '@/shared/utils';

import {
  useCreateOnlineRecord,
  useOnlineMonitoringLines,
  useOnlineMonitoringList,
} from '../../api/onlineMonitoring';
import type { OnlineMonitoringListParams, OnlineRecordStatus } from '../../types';

const STATUS_FILTERS: Array<{ key: OnlineRecordStatus | 'all'; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'DRAFT', label: 'Draft' },
  { key: 'SUBMITTED', label: 'Submitted' },
  { key: 'APPROVED', label: 'Approved' },
  { key: 'REJECTED', label: 'Rejected' },
];
const STATUS_BADGE: Record<OnlineRecordStatus, string> = {
  DRAFT: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
  SUBMITTED: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  APPROVED: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  REJECTED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};
const SHIFTS: [string, string][] = [['A', 'Shift A'], ['B', 'Shift B'], ['C', 'Shift C']];

function today() {
  return new Date().toISOString().slice(0, 10);
}

export default function OnlineMonitoringListPage() {
  const navigate = useNavigate();
  const { hasAnyPermission } = usePermission();
  const canCreate = hasAnyPermission([QC_PERMISSIONS.ONLINE_MONITORING.CREATE]);

  const [status, setStatus] = useState<OnlineRecordStatus | 'all'>('all');
  const [search, setSearch] = useState('');
  const params = useMemo<OnlineMonitoringListParams>(
    () => (status === 'all' ? {} : { status }),
    [status],
  );
  const { data: records = [], isLoading, refetch } = useOnlineMonitoringList(params);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return records;
    return records.filter(
      (r) =>
        r.line_name?.toLowerCase().includes(q) ||
        r.sku?.toLowerCase().includes(q) ||
        r.batch_no?.toLowerCase().includes(q) ||
        r.product_name?.toLowerCase().includes(q),
    );
  }, [records, search]);

  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => navigate('/qc')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Online Quality Monitoring</h2>
            <p className="text-sm text-muted-foreground">On-line monitoring quality records</p>
          </div>
        </div>
        <div className="flex gap-2">
          {canCreate && (
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="mr-1.5 h-4 w-4" /> New Record
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Input
          placeholder="Search by line, SKU, product, batch…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="lg:max-w-md"
        />
        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map(({ key, label }) => (
            <Button
              key={key}
              size="sm"
              variant={status === key ? 'default' : 'outline'}
              className="h-8"
              onClick={() => setStatus(key)}
            >
              {label}
            </Button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex h-40 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex h-24 items-center justify-center rounded-md border text-sm text-muted-foreground">
          No records found.
        </div>
      ) : (
        <div className="overflow-hidden rounded-md border">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px]">
              <thead className="bg-muted/50 text-left text-sm">
                <tr>
                  <th className="p-3 font-medium">Date</th>
                  <th className="p-3 font-medium">Line</th>
                  <th className="p-3 font-medium">SKU / Product</th>
                  <th className="p-3 font-medium">Shift</th>
                  <th className="p-3 font-medium">Batch</th>
                  <th className="p-3 font-medium">Readings</th>
                  <th className="p-3 font-medium">Status</th>
                  <th className="p-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr
                    key={r.id}
                    className="cursor-pointer border-t text-sm transition-colors hover:bg-muted/50"
                    onClick={() => navigate(`/qc/online-monitoring/${r.id}`)}
                  >
                    <td className="p-3">{r.date}</td>
                    <td className="p-3">{r.line_name}</td>
                    <td className="p-3">
                      <div className="font-medium">{r.sku || '-'}</div>
                      <div className="text-xs text-muted-foreground">{r.product_name}</div>
                    </td>
                    <td className="p-3">{r.shift || '-'}</td>
                    <td className="p-3">{r.batch_no || '-'}</td>
                    <td className="p-3">{r.reading_count}</td>
                    <td className="p-3">
                      <Badge className={STATUS_BADGE[r.status]}>{r.status}</Badge>
                    </td>
                    <td className="p-3 text-right">
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <CreateRecordDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}

function CreateRecordDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const navigate = useNavigate();
  const { data: lines = [] } = useOnlineMonitoringLines(open);
  const create = useCreateOnlineRecord();

  const [form, setForm] = useState({
    production_line_id: '',
    date: today(),
    sku: '',
    product_name: '',
    flavour: '',
    shift: '',
    batch_no: '',
  });
  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));

  function submit() {
    if (!form.production_line_id) {
      toast.error('Select a production line.');
      return;
    }
    create.mutate(
      {
        production_line_id: Number(form.production_line_id),
        date: form.date,
        sku: form.sku,
        product_name: form.product_name,
        flavour: form.flavour,
        shift: form.shift,
        batch_no: form.batch_no,
      },
      {
        onSuccess: (record) => {
          toast.success('Record created');
          onOpenChange(false);
          navigate(`/qc/online-monitoring/${record.id}`);
        },
        onError: (e) => toast.error(getErrorMessage(e, 'Could not create record')),
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New Online Monitoring Record</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="text-xs text-muted-foreground">Production Line *</label>
            <NativeSelect
              value={form.production_line_id}
              onChange={(e) => set({ production_line_id: e.target.value })}
            >
              <SelectOption value="">Select line…</SelectOption>
              {lines.map((l) => (
                <SelectOption key={l.id} value={String(l.id)}>
                  {l.name}
                </SelectOption>
              ))}
            </NativeSelect>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Date</label>
            <Input type="date" value={form.date} onChange={(e) => set({ date: e.target.value })} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Shift</label>
            <NativeSelect value={form.shift} onChange={(e) => set({ shift: e.target.value })}>
              <SelectOption value="">—</SelectOption>
              {SHIFTS.map(([v, l]) => (
                <SelectOption key={v} value={v}>
                  {l}
                </SelectOption>
              ))}
            </NativeSelect>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">SKU</label>
            <Input value={form.sku} onChange={(e) => set({ sku: e.target.value })} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Flavour</label>
            <Input value={form.flavour} onChange={(e) => set({ flavour: e.target.value })} />
          </div>
          <div className="col-span-2">
            <label className="text-xs text-muted-foreground">Product Name</label>
            <Input value={form.product_name} onChange={(e) => set({ product_name: e.target.value })} />
          </div>
          <div className="col-span-2">
            <label className="text-xs text-muted-foreground">Batch No.</label>
            <Input value={form.batch_no} onChange={(e) => set({ batch_no: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={create.isPending}>
            Create &amp; open
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
