import {
  ArrowRightCircle,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  FileText,
  Plus,
  RefreshCw,
  Search,
  Send,
  Trash2,
  XCircle,
} from 'lucide-react';
import type { FormEvent } from 'react';
import { useState } from 'react';
import { toast } from 'sonner';

import { MAINTENANCE_PERMISSIONS } from '@/config/permissions';
import { usePermission } from '@/core/auth/hooks/usePermission';
import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import { SummaryCard } from '@/shared/components/dashboard/SummaryCard';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  NativeSelect,
  SelectOption,
  Textarea,
} from '@/shared/components/ui';

import {
  useApproveMaterialIndent,
  useCancelMaterialIndent,
  useCreateMaterialIndent,
  useDeleteMaterialIndent,
  useMaintenanceOptions,
  useMaterialIndent,
  useMaterialIndents,
  useRejectMaterialIndent,
  useSubmitMaterialIndent,
} from '../api';
import { MaterialIndentStatusBadge } from '../components';
import type { MaterialIndent, MaterialIndentFilters, MaterialIndentStatus } from '../types';

function today() {
  return new Date().toISOString().slice(0, 10);
}

interface ItemDraft {
  particulars: string;
  specification: string;
  quantity: string;
  unit: string;
  priority: string;
  remarks: string;
}

function emptyItem(): ItemDraft {
  return { particulars: '', specification: '', quantity: '1', unit: 'NOS', priority: 'NORMAL', remarks: '' };
}

function NewIndentDialog({ onOpenChange }: { onOpenChange: (open: boolean) => void }) {
  const createIndent = useCreateMaterialIndent();
  const optionsQuery = useMaintenanceOptions();

  const [indentDate, setIndentDate] = useState(today());
  const [purpose, setPurpose] = useState('');
  const [department, setDepartment] = useState('');
  const [requestedBy, setRequestedBy] = useState('');
  const [contact, setContact] = useState('');
  const [remarks, setRemarks] = useState('');
  const [rows, setRows] = useState<ItemDraft[]>([emptyItem()]);
  const [busy, setBusy] = useState(false);

  const departments = optionsQuery.data?.org_departments ?? [];

  const setRow = (index: number, patch: Partial<ItemDraft>) => {
    setRows((current) => current.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const filled = rows.filter((r) => r.particulars.trim());
    if (filled.length === 0) {
      toast.error('Add at least one item.');
      return;
    }
    setBusy(true);
    try {
      const indent = await createIndent.mutateAsync({
        indent_date: indentDate,
        purpose: purpose.trim(),
        department: department ? Number(department) : null,
        requested_by_name: requestedBy.trim(),
        contact_no: contact.trim(),
        remarks: remarks.trim(),
        items_input: filled.map((r) => ({
          particulars: r.particulars.trim(),
          specification: r.specification.trim(),
          quantity: r.quantity || '1',
          unit: r.unit.trim() || 'NOS',
          priority: r.priority as 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT',
          remarks: r.remarks.trim(),
        })),
      });
      toast.success(`Material indent ${indent.indent_no} created as draft`);
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-5xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Material Indent</DialogTitle>
        </DialogHeader>
        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="mi_date">Indent date</Label>
              <Input
                id="mi_date"
                type="date"
                value={indentDate}
                onChange={(e) => setIndentDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="mi_purpose">Required for / Purpose of indent</Label>
              <Input
                id="mi_purpose"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                placeholder="e.g. Stationery"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mi_dept">Department</Label>
              <NativeSelect
                id="mi_dept"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
              >
                <SelectOption value="">Not set</SelectOption>
                {departments.map((dept) => (
                  <SelectOption key={dept.id} value={String(dept.id)}>
                    {dept.name}
                  </SelectOption>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-2">
              <Label htmlFor="mi_requested">Requested by</Label>
              <Input
                id="mi_requested"
                value={requestedBy}
                onChange={(e) => setRequestedBy(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mi_contact">Contact</Label>
              <Input id="mi_contact" value={contact} onChange={(e) => setContact(e.target.value)} />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Items</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setRows((current) => [...current, emptyItem()])}
              >
                <Plus className="h-4 w-4" />
                Add item
              </Button>
            </div>
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full min-w-[820px] text-sm">
                <thead className="border-b bg-muted/40">
                  <tr>
                    <th className="px-2 py-2 text-left font-medium text-muted-foreground">#</th>
                    <th className="px-2 py-2 text-left font-medium text-muted-foreground">Particulars</th>
                    <th className="px-2 py-2 text-left font-medium text-muted-foreground">Specification / Make</th>
                    <th className="px-2 py-2 text-left font-medium text-muted-foreground">Qty</th>
                    <th className="px-2 py-2 text-left font-medium text-muted-foreground">Unit</th>
                    <th className="px-2 py-2 text-left font-medium text-muted-foreground">Priority</th>
                    <th className="px-2 py-2 text-left font-medium text-muted-foreground">Remarks</th>
                    <th className="px-2 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, index) => (
                    <tr key={index} className="border-b last:border-b-0">
                      <td className="px-2 py-1.5 text-muted-foreground">{index + 1}</td>
                      <td className="px-2 py-1.5">
                        <Input
                          value={row.particulars}
                          onChange={(e) => setRow(index, { particulars: e.target.value })}
                          placeholder="e.g. A4 Paper box"
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <Input
                          value={row.specification}
                          onChange={(e) => setRow(index, { specification: e.target.value })}
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <Input
                          type="number"
                          min="0"
                          step="0.001"
                          className="w-20"
                          value={row.quantity}
                          onChange={(e) => setRow(index, { quantity: e.target.value })}
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <Input
                          className="w-20"
                          value={row.unit}
                          onChange={(e) => setRow(index, { unit: e.target.value })}
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <NativeSelect
                          value={row.priority}
                          onChange={(e) => setRow(index, { priority: e.target.value })}
                        >
                          <SelectOption value="LOW">Low</SelectOption>
                          <SelectOption value="NORMAL">Normal</SelectOption>
                          <SelectOption value="HIGH">High</SelectOption>
                          <SelectOption value="URGENT">Urgent</SelectOption>
                        </NativeSelect>
                      </td>
                      <td className="px-2 py-1.5">
                        <Input
                          value={row.remarks}
                          onChange={(e) => setRow(index, { remarks: e.target.value })}
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        {rows.length > 1 && (
                          <button
                            type="button"
                            className="text-red-600"
                            onClick={() => setRows((current) => current.filter((_, i) => i !== index))}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="mi_remarks">Remarks</Label>
            <Textarea id="mi_remarks" value={remarks} onChange={(e) => setRemarks(e.target.value)} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              <ClipboardList className="h-4 w-4" />
              {busy ? 'Saving…' : 'Save Draft'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function IndentDetailDialog({
  indentId,
  canManage,
  canApprove,
  onOpenChange,
}: {
  indentId: number;
  canManage: boolean;
  canApprove: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const indentQuery = useMaterialIndent(indentId);
  const submitIndent = useSubmitMaterialIndent();
  const approveIndent = useApproveMaterialIndent();
  const rejectIndent = useRejectMaterialIndent();
  const cancelIndent = useCancelMaterialIndent();
  const [remarks, setRemarks] = useState('');

  const indent = indentQuery.data;

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{indent ? `Material Indent ${indent.indent_no}` : 'Material Indent'}</DialogTitle>
        </DialogHeader>

        {indentQuery.isLoading || !indent ? (
          <div className="py-10 text-center text-sm text-muted-foreground">Loading indent…</div>
        ) : (
          <div className="space-y-5 text-sm">
            <div className="flex flex-wrap items-center gap-3">
              <MaterialIndentStatusBadge status={indent.status} />
              <span className="text-muted-foreground">{indent.indent_date}</span>
            </div>

            <div className="grid gap-3 rounded-md border p-3 md:grid-cols-2">
              <div>
                <span className="text-muted-foreground">Purpose: </span>
                {indent.purpose || '-'}
              </div>
              <div>
                <span className="text-muted-foreground">Department: </span>
                {indent.department_name || '-'}
              </div>
              <div>
                <span className="text-muted-foreground">Requested by: </span>
                {indent.requested_by_name || '-'} {indent.contact_no && `(${indent.contact_no})`}
              </div>
              {indent.generated_pass_no && (
                <div className="md:col-span-2 flex items-center gap-2 text-emerald-700">
                  <ArrowRightCircle className="h-4 w-4" />
                  Gate pass <span className="font-medium">{indent.generated_pass_no}</span> created —
                  now in Gate → Material Out.
                </div>
              )}
            </div>

            <div className="overflow-x-auto rounded-md border">
              <table className="w-full min-w-[640px] text-sm">
                <thead className="border-b bg-muted/40">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">#</th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">Particulars</th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">Spec / Make</th>
                    <th className="px-3 py-2 text-right font-medium text-muted-foreground">Qty</th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">Unit</th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">Priority</th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {indent.items.map((item) => (
                    <tr key={item.id} className="border-b last:border-b-0">
                      <td className="px-3 py-2 text-muted-foreground">{item.line_num}</td>
                      <td className="px-3 py-2">{item.particulars}</td>
                      <td className="px-3 py-2">{item.specification || '-'}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{Number(item.quantity)}</td>
                      <td className="px-3 py-2">{item.unit}</td>
                      <td className="px-3 py-2 capitalize">{item.priority.toLowerCase()}</td>
                      <td className="px-3 py-2">{item.remarks || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {indent.status === 'REJECTED' && indent.decision_remarks && (
              <div className="rounded-md border bg-rose-50/60 p-3">
                <span className="font-medium">Rejected: </span>
                {indent.decision_remarks}
              </div>
            )}

            {/* Actions */}
            <div className="space-y-3 rounded-md border p-3">
              <p className="font-medium">Actions</p>

              {indent.status === 'DRAFT' && canManage && (
                <Button
                  type="button"
                  onClick={async () => {
                    await submitIndent.mutateAsync(indentId);
                    toast.success('Indent submitted for approval');
                  }}
                  disabled={submitIndent.isPending}
                >
                  <Send className="h-4 w-4" />
                  Submit for Approval
                </Button>
              )}

              {indent.status === 'SUBMITTED' && canApprove && (
                <div className="space-y-2">
                  <Label className="text-xs">Decision remarks (optional)</Label>
                  <Textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} />
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      onClick={async () => {
                        const res = await approveIndent.mutateAsync({
                          indentId,
                          payload: { decision_remarks: remarks.trim() },
                        });
                        toast.success(
                          `Approved — gate pass ${res.generated_pass_no} sent to Material Out`,
                        );
                        setRemarks('');
                      }}
                      disabled={approveIndent.isPending}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Approve
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={async () => {
                        if (!remarks.trim()) {
                          toast.error('Add a reason to reject.');
                          return;
                        }
                        await rejectIndent.mutateAsync({
                          indentId,
                          payload: { decision_remarks: remarks.trim() },
                        });
                        toast.success('Indent rejected');
                        setRemarks('');
                      }}
                      disabled={rejectIndent.isPending}
                    >
                      <XCircle className="h-4 w-4" />
                      Reject
                    </Button>
                  </div>
                </div>
              )}

              {indent.status === 'SUBMITTED' && !canApprove && (
                <p className="text-sm text-muted-foreground">Waiting for approval.</p>
              )}

              {(indent.status === 'DRAFT' || indent.status === 'SUBMITTED') && canManage && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={async () => {
                    await cancelIndent.mutateAsync(indentId);
                    toast.success('Indent cancelled');
                  }}
                  disabled={cancelIndent.isPending}
                >
                  Cancel Indent
                </Button>
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function MaintenanceMaterialIndentPage() {
  const { hasPermission } = usePermission();
  const canManage = hasPermission(MAINTENANCE_PERMISSIONS.MANAGE_MATERIAL_INDENT);
  const canApprove = hasPermission(MAINTENANCE_PERMISSIONS.APPROVE_MATERIAL_INDENT);

  const [filters, setFilters] = useState<MaterialIndentFilters>({
    search: '',
    status: 'ALL',
    is_active: true,
  });
  const [createOpen, setCreateOpen] = useState(false);
  const [detailId, setDetailId] = useState<number | null>(null);

  const indentsQuery = useMaterialIndents(filters);
  const deleteIndent = useDeleteMaterialIndent();

  const indents = indentsQuery.data ?? [];
  const drafts = indents.filter((i) => i.status === 'DRAFT').length;
  const pending = indents.filter((i) => i.status === 'SUBMITTED').length;
  const approved = indents.filter((i) => i.status === 'APPROVED').length;

  const handleDelete = async (indent: MaterialIndent) => {
    await deleteIndent.mutateAsync(indent.id);
    toast.success('Indent deleted');
  };

  return (
    <div className="space-y-6 p-6">
      <DashboardHeader
        title="Material Indent"
        description="Raise material requisitions; approved indents flow to Gate → Material Out"
      >
        <Button
          variant="outline"
          size="sm"
          onClick={() => void indentsQuery.refetch()}
          disabled={indentsQuery.isFetching}
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
        <Button size="sm" onClick={() => setCreateOpen(true)} disabled={!canManage}>
          <Plus className="h-4 w-4" />
          New Indent
        </Button>
      </DashboardHeader>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard title="Total" value={indents.length} icon={FileText} />
        <SummaryCard title="Drafts" value={drafts} icon={ClipboardList} />
        <SummaryCard title="Pending Approval" value={pending} icon={Send} />
        <SummaryCard title="Approved" value={approved} icon={CheckCircle2} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
          <CardDescription>Search by indent no, purpose or item; filter by status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <div className="space-y-2 xl:col-span-2">
              <Label htmlFor="mi_search">Search</Label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="mi_search"
                  value={filters.search ?? ''}
                  onChange={(e) => setFilters((c) => ({ ...c, search: e.target.value }))}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="mi_filter_status">Status</Label>
              <NativeSelect
                id="mi_filter_status"
                value={filters.status ?? 'ALL'}
                onChange={(e) =>
                  setFilters((c) => ({ ...c, status: e.target.value as MaterialIndentStatus | 'ALL' }))
                }
              >
                <SelectOption value="ALL">All</SelectOption>
                <SelectOption value="DRAFT">Draft</SelectOption>
                <SelectOption value="SUBMITTED">Submitted</SelectOption>
                <SelectOption value="APPROVED">Approved</SelectOption>
                <SelectOption value="REJECTED">Rejected</SelectOption>
                <SelectOption value="CANCELLED">Cancelled</SelectOption>
              </NativeSelect>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="overflow-x-auto rounded-md border">
        <table className="w-full min-w-[960px] text-sm">
          <thead className="border-b bg-muted/40">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Indent No</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Date</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Purpose</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Items</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Gate Pass</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {indentsQuery.isLoading ? (
              <tr>
                <td colSpan={7} className="h-28 px-4 py-3 text-center text-muted-foreground">
                  Loading indents…
                </td>
              </tr>
            ) : indents.length === 0 ? (
              <tr>
                <td colSpan={7} className="h-28 px-4 py-3 text-center text-muted-foreground">
                  <CalendarDays className="mx-auto mb-2 h-5 w-5" />
                  No material indents found.
                </td>
              </tr>
            ) : (
              indents.map((indent) => (
                <tr key={indent.id} className="border-b last:border-b-0 hover:bg-muted/40">
                  <td className="px-4 py-3 font-medium">{indent.indent_no}</td>
                  <td className="px-4 py-3">{indent.indent_date}</td>
                  <td className="px-4 py-3">{indent.purpose || '-'}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{indent.total_items}</td>
                  <td className="px-4 py-3">
                    <MaterialIndentStatusBadge status={indent.status} />
                  </td>
                  <td className="px-4 py-3">{indent.generated_pass_no || '-'}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap justify-end gap-1">
                      <Button variant="outline" size="sm" onClick={() => setDetailId(indent.id)}>
                        <FileText className="h-4 w-4" />
                        View
                      </Button>
                      {canManage && indent.status === 'DRAFT' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(indent)}
                          disabled={deleteIndent.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {createOpen && <NewIndentDialog onOpenChange={setCreateOpen} />}
      {detailId !== null && (
        <IndentDetailDialog
          indentId={detailId}
          canManage={canManage}
          canApprove={canApprove}
          onOpenChange={(open) => {
            if (!open) setDetailId(null);
          }}
        />
      )}
    </div>
  );
}
