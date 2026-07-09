import {
  AlertTriangle,
  BadgeIndianRupee,
  CheckCircle2,
  FileText,
  ImagePlus,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Trash2,
} from 'lucide-react';
import type { ChangeEvent, FormEvent } from 'react';
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
  Checkbox,
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
  useCreateSafetyFine,
  useCreateSafetyViolationType,
  useDeleteSafetyFine,
  useDeleteSafetyFinePhoto,
  useDeleteSafetyViolationType,
  useMaintenanceOptions,
  useSafetyFine,
  useSafetyFines,
  useSafetyViolationTypes,
  useSettleSafetyFine,
  useUploadSafetyFinePhoto,
} from '../api';
import { SafetyFineStatusBadge } from '../components';
import { getPpeLabel, PPE_OPTIONS } from '../constants/workPermit.constants';
import type { SafetyFine, SafetyFineFilters, SafetyFineStatus } from '../types';

function nowLocal() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function money(amount: string) {
  const value = Number(amount);
  return Number.isFinite(value) ? `₹${value.toLocaleString('en-IN')}` : amount;
}

function toggle(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

/** Manage the violation-type master (name + standard fine amount). */
function ViolationTypesDialog({ onOpenChange }: { onOpenChange: (open: boolean) => void }) {
  const typesQuery = useSafetyViolationTypes();
  const createType = useCreateSafetyViolationType();
  const deleteType = useDeleteSafetyViolationType();

  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');

  const handleAdd = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!name.trim()) return;
    await createType.mutateAsync({ name: name.trim(), default_fine_amount: amount || '0' });
    setName('');
    setAmount('');
    toast.success('Violation type added');
  };

  const types = typesQuery.data ?? [];

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Violation Types</DialogTitle>
        </DialogHeader>

        <form className="flex flex-wrap items-end gap-2" onSubmit={handleAdd}>
          <div className="flex-1 space-y-1">
            <Label htmlFor="vt_name">Name</Label>
            <Input
              id="vt_name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. No Helmet"
            />
          </div>
          <div className="w-40 space-y-1">
            <Label htmlFor="vt_amount">Default fine (₹)</Label>
            <Input
              id="vt_amount"
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <Button type="submit" disabled={createType.isPending}>
            <Plus className="h-4 w-4" />
            Add
          </Button>
        </form>

        {types.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No violation types yet. Add one above.
          </p>
        ) : (
          <ul className="divide-y rounded-md border">
            {types.map((type) => (
              <li key={type.id} className="flex items-center justify-between px-3 py-2 text-sm">
                <span>
                  {type.name}
                  <span className="ml-2 text-muted-foreground">
                    {money(type.default_fine_amount)}
                  </span>
                </span>
                <div className="flex items-center gap-2">
                  {type.fines_count > 0 && (
                    <Badge variant="outline">{type.fines_count} fines</Badge>
                  )}
                  {type.fines_count === 0 && (
                    <button
                      type="button"
                      onClick={async () => {
                        await deleteType.mutateAsync(type.id);
                        toast.success('Violation type removed');
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
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

function NewFineDialog({ onOpenChange }: { onOpenChange: (open: boolean) => void }) {
  const typesQuery = useSafetyViolationTypes({ is_active: true });
  const optionsQuery = useMaintenanceOptions();
  const createFine = useCreateSafetyFine();
  const uploadPhoto = useUploadSafetyFinePhoto();

  const [violationType, setViolationType] = useState('');
  const [offenderName, setOffenderName] = useState('');
  const [employeeCode, setEmployeeCode] = useState('');
  const [contractor, setContractor] = useState('');
  const [contact, setContact] = useState('');
  const [department, setDepartment] = useState('');
  const [occurredAt, setOccurredAt] = useState(nowLocal());
  const [location, setLocation] = useState('');
  const [ppeMissing, setPpeMissing] = useState<string[]>([]);
  const [description, setDescription] = useState('');
  const [fineAmount, setFineAmount] = useState('');
  const [photos, setPhotos] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);

  const types = typesQuery.data ?? [];
  const departments = optionsQuery.data?.org_departments ?? [];

  // Selecting a violation type pre-fills its standard fine (still editable).
  const handleTypeChange = (value: string) => {
    setViolationType(value);
    const selected = types.find((t) => String(t.id) === value);
    if (selected) setFineAmount(selected.default_fine_amount);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!violationType) {
      toast.error('Select a violation type.');
      return;
    }
    if (!offenderName.trim()) {
      toast.error('Worker name is required.');
      return;
    }
    setBusy(true);
    try {
      const fine = await createFine.mutateAsync({
        violation_type: Number(violationType),
        offender_name: offenderName.trim(),
        employee_code: employeeCode.trim(),
        contractor_company: contractor.trim(),
        contact: contact.trim(),
        department: department ? Number(department) : null,
        occurred_at: new Date(occurredAt).toISOString(),
        location: location.trim(),
        ppe_missing: ppeMissing,
        description: description.trim(),
        fine_amount: fineAmount || undefined,
      });
      for (const file of photos) {
        await uploadPhoto.mutateAsync({ fine: fine.id, file });
      }
      toast.success(`Safety fine ${fine.fine_no} issued`);
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Safety Fine</DialogTitle>
        </DialogHeader>
        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="sf_type">Violation type</Label>
              <NativeSelect
                id="sf_type"
                value={violationType}
                onChange={(e) => handleTypeChange(e.target.value)}
                required
              >
                <SelectOption value="">Select…</SelectOption>
                {types.map((type) => (
                  <SelectOption key={type.id} value={String(type.id)}>
                    {type.name} ({money(type.default_fine_amount)})
                  </SelectOption>
                ))}
              </NativeSelect>
              {types.length === 0 && (
                <p className="text-xs text-amber-600">
                  No violation types defined yet — add one first.
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="sf_amount">Fine amount (₹)</Label>
              <Input
                id="sf_amount"
                type="number"
                min="0"
                step="0.01"
                value={fineAmount}
                onChange={(e) => setFineAmount(e.target.value)}
                placeholder="Defaults to the type's amount"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="sf_offender">Worker name</Label>
              <Input
                id="sf_offender"
                value={offenderName}
                onChange={(e) => setOffenderName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sf_code">Employee code</Label>
              <Input
                id="sf_code"
                value={employeeCode}
                onChange={(e) => setEmployeeCode(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sf_dept">Department</Label>
              <NativeSelect
                id="sf_dept"
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
              <Label htmlFor="sf_contractor">Contractor company</Label>
              <Input
                id="sf_contractor"
                value={contractor}
                onChange={(e) => setContractor(e.target.value)}
                placeholder="If a contract worker"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sf_contact">Contact</Label>
              <Input id="sf_contact" value={contact} onChange={(e) => setContact(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sf_when">Occurred at</Label>
              <Input
                id="sf_when"
                type="datetime-local"
                value={occurredAt}
                onChange={(e) => setOccurredAt(e.target.value)}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="sf_location">Location / area</Label>
              <Input
                id="sf_location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Filling Line 2"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>PPE not worn</Label>
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {PPE_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className="flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted/40"
                >
                  <Checkbox
                    checked={ppeMissing.includes(option.value)}
                    onCheckedChange={() => setPpeMissing((c) => toggle(c, option.value))}
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="sf_desc">Description / remarks</Label>
            <Textarea
              id="sf_desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Evidence photos</Label>
            <label className="inline-flex w-fit cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted/40">
              <ImagePlus className="h-4 w-4" />
              Add photos
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  const files = Array.from(e.target.files ?? []);
                  e.target.value = '';
                  if (files.length) setPhotos((c) => [...c, ...files]);
                }}
              />
            </label>
            {photos.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {photos.length} photo{photos.length > 1 ? 's' : ''} selected
                <button type="button" className="ml-2 text-red-600" onClick={() => setPhotos([])}>
                  clear
                </button>
              </p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy || types.length === 0}>
              <BadgeIndianRupee className="h-4 w-4" />
              {busy ? 'Issuing…' : 'Issue Fine'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function FineDetailDialog({
  fineId,
  canManage,
  onOpenChange,
}: {
  fineId: number;
  canManage: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const fineQuery = useSafetyFine(fineId);
  const settleFine = useSettleSafetyFine();
  const uploadPhoto = useUploadSafetyFinePhoto();
  const deletePhoto = useDeleteSafetyFinePhoto();
  const [remarks, setRemarks] = useState('');

  const fine = fineQuery.data;

  const handleUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    await uploadPhoto.mutateAsync({ fine: fineId, file });
    toast.success('Photo added');
  };

  const handleSettle = async (status: 'PAID' | 'WAIVED') => {
    if (status === 'WAIVED' && !remarks.trim()) {
      toast.error('A reason is required to waive a fine.');
      return;
    }
    await settleFine.mutateAsync({
      fineId,
      payload: { status, settlement_remarks: remarks.trim() },
    });
    toast.success(status === 'PAID' ? 'Fine marked paid' : 'Fine waived');
  };

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{fine ? `Safety Fine ${fine.fine_no}` : 'Safety Fine'}</DialogTitle>
        </DialogHeader>

        {fineQuery.isLoading || !fine ? (
          <div className="py-10 text-center text-sm text-muted-foreground">Loading fine…</div>
        ) : (
          <div className="space-y-5 text-sm">
            <div className="flex flex-wrap items-center gap-3">
              <SafetyFineStatusBadge status={fine.status} />
              <span className="text-lg font-semibold">{money(fine.fine_amount)}</span>
              <span className="text-muted-foreground">{fine.violation_type_name}</span>
            </div>

            <div className="grid gap-3 rounded-md border p-3 md:grid-cols-2">
              <div>
                <span className="text-muted-foreground">Worker: </span>
                {fine.offender_name} {fine.employee_code && `(${fine.employee_code})`}
              </div>
              <div>
                <span className="text-muted-foreground">Department: </span>
                {fine.department_name || '-'}
              </div>
              <div>
                <span className="text-muted-foreground">Contractor: </span>
                {fine.contractor_company || '-'}
              </div>
              <div>
                <span className="text-muted-foreground">Contact: </span>
                {fine.contact || '-'}
              </div>
              <div>
                <span className="text-muted-foreground">Occurred: </span>
                {new Date(fine.occurred_at).toLocaleString()}
              </div>
              <div>
                <span className="text-muted-foreground">Location: </span>
                {fine.location || '-'}
              </div>
              <div className="md:col-span-2">
                <span className="text-muted-foreground">Issued by: </span>
                {fine.issued_by_name || '-'}
              </div>
            </div>

            <div className="space-y-1">
              <p className="font-medium">PPE not worn</p>
              {fine.ppe_missing.length === 0 ? (
                <span className="text-xs text-muted-foreground">None recorded</span>
              ) : (
                <div className="flex flex-wrap gap-1">
                  {fine.ppe_missing.map((code) => (
                    <Badge key={code} variant="outline">
                      {getPpeLabel(code)}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {fine.description && (
              <div className="rounded-md border bg-muted/30 p-3">{fine.description}</div>
            )}

            <div className="space-y-2">
              <p className="font-medium">Evidence</p>
              <div className="flex flex-wrap items-center gap-2">
                {fine.photos.map((photo) => (
                  <div key={photo.id} className="relative">
                    <a href={photo.photo} target="_blank" rel="noreferrer">
                      <img
                        src={photo.photo}
                        alt={photo.caption || 'evidence'}
                        className="h-20 w-20 rounded border object-cover"
                      />
                    </a>
                    {canManage && fine.status === 'PENDING' && (
                      <button
                        type="button"
                        className="absolute -right-1 -top-1 rounded-full bg-white p-0.5 shadow"
                        onClick={async () => {
                          await deletePhoto.mutateAsync(photo.id);
                          toast.success('Photo removed');
                        }}
                      >
                        <Trash2 className="h-3 w-3 text-red-600" />
                      </button>
                    )}
                  </div>
                ))}
                {canManage && fine.status === 'PENDING' && (
                  <label className="flex h-20 w-20 cursor-pointer items-center justify-center rounded border border-dashed text-muted-foreground hover:bg-muted/40">
                    <ImagePlus className="h-5 w-5" />
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleUpload}
                    />
                  </label>
                )}
              </div>
            </div>

            {fine.status !== 'PENDING' && (
              <div className="rounded-md border bg-muted/30 p-3">
                <span className="font-medium">
                  {fine.status === 'PAID' ? 'Paid' : 'Waived'} by {fine.settled_by_name || '-'}
                </span>
                {fine.settlement_remarks && <p className="mt-1">{fine.settlement_remarks}</p>}
              </div>
            )}

            {canManage && fine.status === 'PENDING' && (
              <div className="space-y-2 rounded-md border p-3">
                <Label htmlFor="sf_remarks">Settlement remarks (required to waive)</Label>
                <Textarea
                  id="sf_remarks"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                />
                <div className="flex flex-wrap justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleSettle('WAIVED')}
                    disabled={settleFine.isPending}
                  >
                    Waive Fine
                  </Button>
                  <Button
                    type="button"
                    onClick={() => handleSettle('PAID')}
                    disabled={settleFine.isPending}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Mark Paid
                  </Button>
                </div>
              </div>
            )}
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

export default function MaintenanceSafetyFinePage() {
  const { hasPermission } = usePermission();
  const canManage = hasPermission(MAINTENANCE_PERMISSIONS.MANAGE_SAFETY_FINE);

  const [filters, setFilters] = useState<SafetyFineFilters>({
    search: '',
    status: 'ALL',
    violation_type: 'ALL',
    is_active: true,
  });
  const [createOpen, setCreateOpen] = useState(false);
  const [typesOpen, setTypesOpen] = useState(false);
  const [detailId, setDetailId] = useState<number | null>(null);

  const finesQuery = useSafetyFines(filters);
  const typesQuery = useSafetyViolationTypes();
  const deleteFine = useDeleteSafetyFine();

  const fines = finesQuery.data ?? [];
  const types = typesQuery.data ?? [];

  const { pending, pendingAmount, collected } = useMemo(() => {
    const pendingFines = fines.filter((f) => f.status === 'PENDING');
    return {
      pending: pendingFines.length,
      pendingAmount: pendingFines.reduce((sum, f) => sum + Number(f.fine_amount || 0), 0),
      collected: fines
        .filter((f) => f.status === 'PAID')
        .reduce((sum, f) => sum + Number(f.fine_amount || 0), 0),
    };
  }, [fines]);

  const handleDelete = async (fine: SafetyFine) => {
    await deleteFine.mutateAsync(fine.id);
    toast.success('Fine deleted');
  };

  return (
    <div className="space-y-6 p-6">
      <DashboardHeader
        title="Safety Fines"
        description="PPE and safety violations recorded on the floor, with fines"
      >
        <Button
          variant="outline"
          size="sm"
          onClick={() => void finesQuery.refetch()}
          disabled={finesQuery.isFetching}
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
        <Button variant="outline" size="sm" onClick={() => setTypesOpen(true)} disabled={!canManage}>
          <Settings className="h-4 w-4" />
          Violation Types
        </Button>
        <Button size="sm" onClick={() => setCreateOpen(true)} disabled={!canManage}>
          <Plus className="h-4 w-4" />
          New Fine
        </Button>
      </DashboardHeader>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard title="Total Fines" value={fines.length} icon={FileText} />
        <SummaryCard title="Pending" value={pending} icon={AlertTriangle} />
        <SummaryCard title="Pending Amount" value={money(String(pendingAmount))} icon={BadgeIndianRupee} />
        <SummaryCard title="Collected" value={money(String(collected))} icon={CheckCircle2} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
          <CardDescription>Search by worker, fine no or location; filter by status and type</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="space-y-2 xl:col-span-2">
              <Label htmlFor="sf_search">Search</Label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="sf_search"
                  value={filters.search ?? ''}
                  onChange={(e) => setFilters((c) => ({ ...c, search: e.target.value }))}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sf_filter_status">Status</Label>
              <NativeSelect
                id="sf_filter_status"
                value={filters.status ?? 'ALL'}
                onChange={(e) =>
                  setFilters((c) => ({ ...c, status: e.target.value as SafetyFineStatus | 'ALL' }))
                }
              >
                <SelectOption value="ALL">All</SelectOption>
                <SelectOption value="PENDING">Pending</SelectOption>
                <SelectOption value="PAID">Paid</SelectOption>
                <SelectOption value="WAIVED">Waived</SelectOption>
              </NativeSelect>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sf_filter_type">Violation type</Label>
              <NativeSelect
                id="sf_filter_type"
                value={String(filters.violation_type ?? 'ALL')}
                onChange={(e) =>
                  setFilters((c) => ({
                    ...c,
                    violation_type: e.target.value === 'ALL' ? 'ALL' : Number(e.target.value),
                  }))
                }
              >
                <SelectOption value="ALL">All</SelectOption>
                {types.map((type) => (
                  <SelectOption key={type.id} value={String(type.id)}>
                    {type.name}
                  </SelectOption>
                ))}
              </NativeSelect>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="overflow-x-auto rounded-md border">
        <table className="w-full min-w-[960px] text-sm">
          <thead className="border-b bg-muted/40">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Fine No</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Worker</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Violation</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Amount</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Occurred</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {finesQuery.isLoading ? (
              <tr>
                <td colSpan={7} className="h-28 px-4 py-3 text-center text-muted-foreground">
                  Loading fines…
                </td>
              </tr>
            ) : fines.length === 0 ? (
              <tr>
                <td colSpan={7} className="h-28 px-4 py-3 text-center text-muted-foreground">
                  <AlertTriangle className="mx-auto mb-2 h-5 w-5" />
                  No safety fines found.
                </td>
              </tr>
            ) : (
              fines.map((fine) => (
                <tr key={fine.id} className="border-b last:border-b-0 hover:bg-muted/40">
                  <td className="px-4 py-3 font-medium">{fine.fine_no}</td>
                  <td className="px-4 py-3">
                    {fine.offender_name}
                    {fine.department_name && (
                      <span className="block text-xs text-muted-foreground">
                        {fine.department_name}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">{fine.violation_type_name}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{money(fine.fine_amount)}</td>
                  <td className="px-4 py-3">{new Date(fine.occurred_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <SafetyFineStatusBadge status={fine.status} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap justify-end gap-1">
                      <Button variant="outline" size="sm" onClick={() => setDetailId(fine.id)}>
                        <FileText className="h-4 w-4" />
                        View
                      </Button>
                      {canManage && fine.status === 'PENDING' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(fine)}
                          disabled={deleteFine.isPending}
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

      {createOpen && <NewFineDialog onOpenChange={setCreateOpen} />}
      {typesOpen && <ViolationTypesDialog onOpenChange={setTypesOpen} />}
      {detailId !== null && (
        <FineDetailDialog
          fineId={detailId}
          canManage={canManage}
          onOpenChange={(open) => {
            if (!open) setDetailId(null);
          }}
        />
      )}
    </div>
  );
}
