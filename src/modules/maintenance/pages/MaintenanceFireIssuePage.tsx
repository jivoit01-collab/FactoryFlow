import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Eye,
  HardHat,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Trash2,
  Undo2,
} from 'lucide-react';
import type { FormEvent } from 'react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { MAINTENANCE_PERMISSIONS } from '@/config/permissions';
import { usePermission } from '@/core/auth/hooks/usePermission';
import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import { SummaryCard } from '@/shared/components/dashboard/SummaryCard';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  NativeSelect,
  SelectOption,
} from '@/shared/components/ui';

import {
  useCreateFireIssue,
  useDeleteFireIssue,
  useFireIssue,
  useFireIssues,
  useFireItems,
  useReturnFireIssue,
} from '../api';
import type {
  FireEquipmentIssue,
  FireEquipmentIssueFilters,
  FireEquipmentIssueItemInput,
  FireEquipmentReturnLine,
  FireIssueStatus,
  FireItem,
  FireReturnCondition,
  MaintenanceDecimal,
} from '../types';

const STATUS_CLASSES: Record<FireIssueStatus, string> = {
  ISSUED: 'border-sky-200 bg-sky-50 text-sky-700',
  PARTIALLY_RETURNED: 'border-amber-200 bg-amber-50 text-amber-700',
  RETURNED: 'border-emerald-200 bg-emerald-50 text-emerald-700',
};

const CONDITION_OPTIONS: Array<{ value: FireReturnCondition; label: string }> = [
  { value: 'OK', label: 'OK' },
  { value: 'DAMAGED', label: 'Damaged' },
  { value: 'LOST', label: 'Lost' },
];

function formatQty(value: MaintenanceDecimal | null | undefined) {
  const parsed = Number(value ?? 0);
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 3 }).format(
    Number.isFinite(parsed) ? parsed : 0,
  );
}

function nowLocal() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

interface IssueItemDraft {
  fire_item: string;
  equipment_name: string;
  quantity_issued: string;
  remarks: string;
}

function emptyItemDraft(): IssueItemDraft {
  return { fire_item: '', equipment_name: '', quantity_issued: '1', remarks: '' };
}

function NewIssueDialog({
  open,
  fireItems,
  isSubmitting,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  fireItems: FireItem[];
  isSubmitting?: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: {
    issued_to_name: string;
    employee_code: string;
    department: string;
    contact: string;
    issued_at: string;
    expected_return: string | null;
    purpose: string;
    items_input: FireEquipmentIssueItemInput[];
  }) => Promise<void> | void;
}) {
  const [name, setName] = useState('');
  const [employeeCode, setEmployeeCode] = useState('');
  const [department, setDepartment] = useState('');
  const [contact, setContact] = useState('');
  const [issuedAt, setIssuedAt] = useState(nowLocal());
  const [expectedReturn, setExpectedReturn] = useState('');
  const [purpose, setPurpose] = useState('');
  const [rows, setRows] = useState<IssueItemDraft[]>([emptyItemDraft()]);

  const setRow = (index: number, patch: Partial<IssueItemDraft>) => {
    setRows((current) => current.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  const handleFireItemChange = (index: number, value: string) => {
    const selected = fireItems.find((item) => String(item.id) === value);
    setRow(index, {
      fire_item: value,
      equipment_name: selected ? selected.name : rows[index].equipment_name,
    });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!name.trim()) {
      toast.error('Enter the person the gear is issued to.');
      return;
    }
    const items = rows
      .filter((row) => row.equipment_name.trim() && Number(row.quantity_issued) > 0)
      .map((row) => ({
        fire_item: row.fire_item ? Number(row.fire_item) : null,
        equipment_name: row.equipment_name.trim(),
        quantity_issued: row.quantity_issued,
        remarks: row.remarks.trim(),
      }));
    if (items.length === 0) {
      toast.error('Add at least one equipment line with a quantity.');
      return;
    }
    await onSubmit({
      issued_to_name: name.trim(),
      employee_code: employeeCode.trim(),
      department: department.trim(),
      contact: contact.trim(),
      issued_at: issuedAt,
      expected_return: expectedReturn || null,
      purpose: purpose.trim(),
      items_input: items,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-5xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Issue Fire Equipment</DialogTitle>
        </DialogHeader>
        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="issue_name">Issued to</Label>
              <Input
                id="issue_name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Person name"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="issue_emp">Employee code</Label>
              <Input
                id="issue_emp"
                value={employeeCode}
                onChange={(event) => setEmployeeCode(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="issue_dept">Department</Label>
              <Input
                id="issue_dept"
                value={department}
                onChange={(event) => setDepartment(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="issue_contact">Contact</Label>
              <Input
                id="issue_contact"
                value={contact}
                onChange={(event) => setContact(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="issue_at">Issued at</Label>
              <Input
                id="issue_at"
                type="datetime-local"
                value={issuedAt}
                onChange={(event) => setIssuedAt(event.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="issue_expected">Expected return</Label>
              <Input
                id="issue_expected"
                type="datetime-local"
                value={expectedReturn}
                onChange={(event) => setExpectedReturn(event.target.value)}
              />
            </div>
            <div className="space-y-2 xl:col-span-2">
              <Label htmlFor="issue_purpose">Purpose</Label>
              <Input
                id="issue_purpose"
                value={purpose}
                onChange={(event) => setPurpose(event.target.value)}
                placeholder="e.g. Night shift fire duty"
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Equipment issued</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setRows((current) => [...current, emptyItemDraft()])}
              >
                <Plus className="h-4 w-4" />
                Add item
              </Button>
            </div>
            {rows.map((row, index) => (
              <div key={index} className="rounded-md border p-3">
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <div className="space-y-1 xl:col-span-2">
                    <Label className="text-xs">Fire store item (optional)</Label>
                    <NativeSelect
                      value={row.fire_item}
                      onChange={(event) => handleFireItemChange(index, event.target.value)}
                    >
                      <SelectOption value="">Free item (not stocked)</SelectOption>
                      {fireItems.map((item) => (
                        <SelectOption key={item.id} value={String(item.id)}>
                          {item.part_number} - {item.name} (stock {formatQty(item.current_stock)})
                        </SelectOption>
                      ))}
                    </NativeSelect>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Equipment name</Label>
                    <Input
                      value={row.equipment_name}
                      onChange={(event) => setRow(index, { equipment_name: event.target.value })}
                      placeholder="e.g. Helmet"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Quantity</Label>
                    <Input
                      type="number"
                      min="0.001"
                      step="0.001"
                      value={row.quantity_issued}
                      onChange={(event) => setRow(index, { quantity_issued: event.target.value })}
                    />
                  </div>
                  <div className="space-y-1 xl:col-span-4">
                    <Label className="text-xs">Remarks</Label>
                    <Input
                      value={row.remarks}
                      onChange={(event) => setRow(index, { remarks: event.target.value })}
                    />
                  </div>
                </div>
                {rows.length > 1 && (
                  <div className="mt-2 flex justify-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setRows((current) => current.filter((_, i) => i !== index))}
                    >
                      <Trash2 className="h-4 w-4" />
                      Remove
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              <HardHat className="h-4 w-4" />
              Issue Equipment
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface ReturnDraft {
  quantity: string;
  condition: FireReturnCondition;
}

/** One label + value pair in the issue's detail grid. */
function DetailField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 break-words text-sm">{value || '—'}</dd>
    </div>
  );
}

function formatDateTime(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleString();
}

/**
 * The whole issue, exactly as it was filled in — plus the return inputs for
 * anyone who can record one. Opened by clicking the row: an issue is a record
 * people need to read back (who took what, on whose authority, due when), not
 * just a queue item waiting for a return.
 */
function IssueDetailDialog({
  issueId,
  canManage,
  onOpenChange,
}: {
  issueId: number;
  canManage: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const issueQuery = useFireIssue(issueId);
  const returnIssue = useReturnFireIssue();
  const [drafts, setDrafts] = useState<Record<number, ReturnDraft>>({});

  const issue = issueQuery.data;

  const setDraft = (itemId: number, patch: Partial<ReturnDraft>) => {
    setDrafts((current) => {
      const existing: ReturnDraft = current[itemId] ?? { quantity: '', condition: 'OK' };
      return { ...current, [itemId]: { ...existing, ...patch } };
    });
  };

  const handleReturn = async () => {
    if (!issue) return;
    const returns: FireEquipmentReturnLine[] = [];
    for (const item of issue.items) {
      const draft = drafts[item.id];
      const qty = Number(draft?.quantity ?? 0);
      if (draft && qty > 0) {
        returns.push({
          item: item.id,
          quantity: draft.quantity,
          return_condition: draft.condition,
        });
      }
    }
    if (returns.length === 0) {
      toast.error('Enter a return quantity for at least one item.');
      return;
    }
    await returnIssue.mutateAsync({ issueId, payload: { returns } });
    setDrafts({});
    toast.success('Return recorded');
  };

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {issue ? `${issue.issued_to_name} — issue #${issue.id}` : 'Fire Equipment Issue'}
          </DialogTitle>
          <DialogDescription>
            Everything recorded when this gear was issued, and what is still outstanding.
          </DialogDescription>
        </DialogHeader>

        {issueQuery.isLoading || !issue ? (
          <div className="py-10 text-center text-sm text-muted-foreground">Loading…</div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <Badge variant="outline" className={STATUS_CLASSES[issue.status]}>
                {issue.status_display}
              </Badge>
              {issue.is_overdue && (
                <Badge variant="outline" className="border-red-200 bg-red-50 text-red-700">
                  Overdue
                </Badge>
              )}
            </div>

            {/* Everything captured on the issue form, in the order it was filled. */}
            <dl className="grid gap-4 rounded-md border p-4 sm:grid-cols-2 lg:grid-cols-3">
              <DetailField label="Issued to" value={issue.issued_to_name} />
              <DetailField label="Employee code" value={issue.employee_code} />
              <DetailField label="Department" value={issue.department} />
              <DetailField label="Contact" value={issue.contact} />
              <DetailField label="Issued at" value={formatDateTime(issue.issued_at)} />
              <DetailField
                label="Expected return"
                value={
                  issue.expected_return ? (
                    <span className={issue.is_overdue ? 'font-medium text-red-600' : undefined}>
                      {formatDateTime(issue.expected_return)}
                    </span>
                  ) : null
                }
              />
              <DetailField label="Purpose" value={issue.purpose} />
              <DetailField label="Issued by" value={issue.issued_by_name} />
              <DetailField label="Returned at" value={formatDateTime(issue.returned_at)} />
              {issue.remarks ? (
                <DetailField
                  label="Remarks"
                  value={<span className="whitespace-pre-wrap">{issue.remarks}</span>}
                />
              ) : null}
              <DetailField
                label="Recorded by"
                value={
                  issue.created_by_name
                    ? `${issue.created_by_name} · ${formatDateTime(issue.created_at)}`
                    : formatDateTime(issue.created_at)
                }
              />
            </dl>

            <div className="overflow-x-auto rounded-md border">
              <table className="w-full min-w-[720px] text-sm">
                <thead className="border-b bg-muted/40">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">Item</th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                      Remarks
                    </th>
                    <th className="px-3 py-2 text-right font-medium text-muted-foreground">Issued</th>
                    <th className="px-3 py-2 text-right font-medium text-muted-foreground">Returned</th>
                    <th className="px-3 py-2 text-right font-medium text-muted-foreground">Pending</th>
                    {canManage && (
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                        Return now
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {issue.items.map((item) => {
                    const pending = Number(item.pending_return_qty);
                    return (
                      <tr key={item.id} className="border-b last:border-b-0">
                        <td className="px-3 py-2">
                          <div>{item.equipment_name}</div>
                          {/* Which fire-store item was picked, or nothing when the
                              line was typed in free-hand. */}
                          {(item.fire_item_part_number || item.fire_item_name) && (
                            <div className="text-xs text-muted-foreground">
                              {[item.fire_item_part_number, item.fire_item_name]
                                .filter(Boolean)
                                .join(' · ')}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">{item.remarks || '—'}</td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {formatQty(item.quantity_issued)}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {formatQty(item.quantity_returned)}
                          {Number(item.quantity_returned) > 0 && (
                            <span className="ml-1 text-xs text-muted-foreground">
                              ({item.return_condition_display})
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">{formatQty(pending)}</td>
                        {canManage && (
                          <td className="px-3 py-2">
                            {pending > 0 ? (
                              <div className="flex items-center gap-2">
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.001"
                                  className="h-8 w-20"
                                  placeholder="Qty"
                                  value={drafts[item.id]?.quantity ?? ''}
                                  onChange={(event) =>
                                    setDraft(item.id, { quantity: event.target.value })
                                  }
                                />
                                <NativeSelect
                                  className="h-8 w-28"
                                  value={drafts[item.id]?.condition ?? 'OK'}
                                  onChange={(event) =>
                                    setDraft(item.id, {
                                      condition: event.target.value as FireReturnCondition,
                                    })
                                  }
                                >
                                  {CONDITION_OPTIONS.map((option) => (
                                    <SelectOption key={option.value} value={option.value}>
                                      {option.label}
                                    </SelectOption>
                                  ))}
                                </NativeSelect>
                              </div>
                            ) : (
                              <span className="text-xs text-emerald-700">Settled</span>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <p className="text-xs text-muted-foreground">
              Serviceable (OK) returns go back into Fire store stock; Damaged/Lost are written off.
            </p>
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {issue && canManage && issue.status !== 'RETURNED' && (
            <Button type="button" onClick={handleReturn} disabled={returnIssue.isPending}>
              <RotateCcw className="h-4 w-4" />
              Record Return
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function MaintenanceFireIssuePage() {
  const { hasPermission } = usePermission();
  const canManage = hasPermission(MAINTENANCE_PERMISSIONS.MANAGE_FIRE_ISSUE);

  const [filters, setFilters] = useState<FireEquipmentIssueFilters>({
    search: '',
    status: 'ALL',
    is_active: true,
  });
  const [createOpen, setCreateOpen] = useState(false);
  const [detailId, setDetailId] = useState<number | null>(null);

  const issuesQuery = useFireIssues(filters);
  const fireItemsQuery = useFireItems({ is_active: true });
  const createIssue = useCreateFireIssue();
  const deleteIssue = useDeleteFireIssue();

  const issues = issuesQuery.data ?? [];
  const outstanding = issues.filter((issue) => issue.status !== 'RETURNED').length;
  const overdue = issues.filter((issue) => issue.is_overdue).length;
  const returned = issues.filter((issue) => issue.status === 'RETURNED').length;

  const fireItems = useMemo(() => fireItemsQuery.data ?? [], [fireItemsQuery.data]);

  const handleCreate = async (payload: {
    issued_to_name: string;
    employee_code: string;
    department: string;
    contact: string;
    issued_at: string;
    expected_return: string | null;
    purpose: string;
    items_input: FireEquipmentIssueItemInput[];
  }) => {
    await createIssue.mutateAsync(payload);
    toast.success('Equipment issued');
    setCreateOpen(false);
  };

  const handleDelete = async (issue: FireEquipmentIssue) => {
    await deleteIssue.mutateAsync(issue.id);
    toast.success('Issue deleted');
  };

  return (
    <div className="space-y-6 p-6">
      <DashboardHeader
        title="Fire Equipment Issue / Return"
        description="Issue fire gear (helmet, suit, boots) to a person and track returns"
      >
        <Button
          variant="outline"
          size="sm"
          onClick={() => void issuesQuery.refetch()}
          disabled={issuesQuery.isFetching}
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
        <Button size="sm" onClick={() => setCreateOpen(true)} disabled={!canManage}>
          <Plus className="h-4 w-4" />
          Issue Equipment
        </Button>
      </DashboardHeader>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard title="Issues" value={issues.length} icon={ClipboardList} />
        <SummaryCard title="Outstanding" value={outstanding} icon={HardHat} />
        <SummaryCard title="Overdue" value={overdue} icon={AlertTriangle} />
        <SummaryCard title="Returned" value={returned} icon={CheckCircle2} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
          <CardDescription>Search by person, employee code, department or item</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="space-y-2 xl:col-span-2">
              <Label htmlFor="issue_search">Search</Label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="issue_search"
                  value={filters.search ?? ''}
                  onChange={(event) =>
                    setFilters((current) => ({ ...current, search: event.target.value }))
                  }
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="issue_filter_status">Status</Label>
              <NativeSelect
                id="issue_filter_status"
                value={filters.status ?? 'ALL'}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    status: event.target.value as FireIssueStatus | 'ALL',
                  }))
                }
              >
                <SelectOption value="ALL">All</SelectOption>
                <SelectOption value="ISSUED">Issued</SelectOption>
                <SelectOption value="PARTIALLY_RETURNED">Partially Returned</SelectOption>
                <SelectOption value="RETURNED">Returned</SelectOption>
              </NativeSelect>
            </div>
            <div className="flex items-end">
              <Button
                type="button"
                variant={filters.overdue ? 'default' : 'outline'}
                className="w-full"
                onClick={() =>
                  setFilters((current) => ({
                    ...current,
                    overdue: current.overdue ? undefined : true,
                  }))
                }
              >
                <AlertTriangle className="h-4 w-4" />
                Overdue only
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="overflow-x-auto rounded-md border">
        <table className="w-full min-w-[960px] text-sm">
          <thead className="border-b bg-muted/40">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Issued To</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Department</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Issued</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Expected Return</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Items</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {issuesQuery.isLoading ? (
              <tr>
                <td colSpan={7} className="h-28 px-4 py-3 text-center text-muted-foreground">
                  Loading issues…
                </td>
              </tr>
            ) : issues.length === 0 ? (
              <tr>
                <td colSpan={7} className="h-28 px-4 py-3 text-center text-muted-foreground">
                  <HardHat className="mx-auto mb-2 h-5 w-5" />
                  No equipment issues found.
                </td>
              </tr>
            ) : (
              issues.map((issue) => (
                // The row is the way into the issue — the Actions buttons open
                // the same dialog, they just say so out loud.
                <tr
                  key={issue.id}
                  className="cursor-pointer border-b last:border-b-0 hover:bg-muted/40"
                  onClick={() => setDetailId(issue.id)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      setDetailId(issue.id);
                    }
                  }}
                  tabIndex={0}
                  aria-label={`Open issue for ${issue.issued_to_name}`}
                >
                  <td className="px-4 py-3">
                    <div className="font-semibold">{issue.issued_to_name}</div>
                    {issue.employee_code && (
                      <div className="text-xs text-muted-foreground">{issue.employee_code}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">{issue.department || '-'}</td>
                  <td className="px-4 py-3">{new Date(issue.issued_at).toLocaleString()}</td>
                  <td className="px-4 py-3">
                    {issue.expected_return ? (
                      <span className={issue.is_overdue ? 'font-medium text-red-600' : ''}>
                        {new Date(issue.expected_return).toLocaleString()}
                      </span>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {issue.total_items}
                    {issue.pending_items > 0 && (
                      <Badge
                        variant="outline"
                        className="ml-2 border-amber-200 bg-amber-50 text-amber-700"
                      >
                        {issue.pending_items} out
                      </Badge>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className={STATUS_CLASSES[issue.status]}>
                      {issue.status_display}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap justify-end gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(event) => {
                          event.stopPropagation();
                          setDetailId(issue.id);
                        }}
                      >
                        {issue.status === 'RETURNED' ? (
                          <Eye className="h-4 w-4" />
                        ) : (
                          <Undo2 className="h-4 w-4" />
                        )}
                        {issue.status === 'RETURNED' ? 'View' : 'Return'}
                      </Button>
                      {canManage && issue.status === 'ISSUED' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(event) => {
                            event.stopPropagation();
                            void handleDelete(issue);
                          }}
                          disabled={deleteIssue.isPending}
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

      {createOpen && (
        <NewIssueDialog
          open={createOpen}
          fireItems={fireItems}
          isSubmitting={createIssue.isPending}
          onOpenChange={setCreateOpen}
          onSubmit={handleCreate}
        />
      )}
      {detailId !== null && (
        <IssueDetailDialog
          issueId={detailId}
          canManage={canManage}
          onOpenChange={(open) => {
            if (!open) setDetailId(null);
          }}
        />
      )}
    </div>
  );
}
