import {
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  FileText,
  Paperclip,
  Plus,
  RefreshCw,
  Search,
  Send,
  Trash2,
  Upload,
  X,
  XCircle,
} from 'lucide-react';
import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
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
  useDeleteMaterialIndentAttachment,
  useGateInMaterialIndent,
  useMaintenanceOptions,
  useMaterialIndent,
  useMaterialIndents,
  usePurchaseMaterialIndent,
  useReceiveMaterialIndent,
  useRejectMaterialIndent,
  useReviewMaterialIndent,
  useSubmitMaterialIndent,
  useUploadMaterialIndentAttachment,
} from '../api';
import { MaterialIndentQuotations, MaterialIndentStatusBadge } from '../components';
import type {
  MaterialIndent,
  MaterialIndentFilters,
  MaterialIndentItem,
  MaterialIndentStatus,
} from '../types';

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

/** How many images a single indent may carry. */
const MAX_INDENT_ATTACHMENTS = 15;

/** A single selected-file preview that owns (and cleans up) its object URL.
 *  Click to open the file in a new tab; shows an image thumbnail for images,
 *  otherwise a file-icon card with the name. */
function FileThumb({ file, onRemove }: { file: File; onRemove: () => void }) {
  const isImage = file.type.startsWith('image/');
  // Create and revoke the object URL in the same effect so each URL is revoked
  // exactly when it stops being rendered. (Creating it in useMemo is unreliable
  // under StrictMode — the cleanup can revoke a URL that's still on screen,
  // producing an ERR_FILE_NOT_FOUND blob when opened.)
  const [url, setUrl] = useState('');
  useEffect(() => {
    const objectUrl = URL.createObjectURL(file);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing a browser object URL to state
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  return (
    <div className="group relative h-20 w-20 overflow-hidden rounded-md border">
      <a
        href={url || undefined}
        target="_blank"
        rel="noreferrer"
        title={`Open ${file.name}`}
        className="block h-full w-full"
      >
        {isImage && url ? (
          <img src={url} alt={file.name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-1 bg-muted/40 p-1 text-center">
            <FileText className="h-6 w-6 text-muted-foreground" />
            <span className="w-full truncate px-0.5 text-[10px] leading-tight text-muted-foreground">
              {file.name}
            </span>
          </div>
        )}
      </a>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onRemove();
        }}
        title="Remove"
        className="absolute right-0.5 top-0.5 rounded-full bg-black/60 p-0.5 text-white opacity-0 transition group-hover:opacity-100"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function NewIndentDialog({ onOpenChange }: { onOpenChange: (open: boolean) => void }) {
  const createIndent = useCreateMaterialIndent();
  const uploadAttachment = useUploadMaterialIndentAttachment();
  const optionsQuery = useMaintenanceOptions();

  const [indentDate, setIndentDate] = useState(today());
  const [purpose, setPurpose] = useState('');
  const [department, setDepartment] = useState('');
  const [requestedBy, setRequestedBy] = useState('');
  const [contact, setContact] = useState('');
  const [remarks, setRemarks] = useState('');
  const [rows, setRows] = useState<ItemDraft[]>([emptyItem()]);
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);

  const departments = optionsQuery.data?.org_departments ?? [];

  const setRow = (index: number, patch: Partial<ItemDraft>) => {
    setRows((current) => current.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  };

  const addFiles = (selected: FileList | null) => {
    if (!selected || selected.length === 0) return;
    const picked = Array.from(selected);
    setFiles((current) => {
      const room = MAX_INDENT_ATTACHMENTS - current.length;
      if (room <= 0) {
        toast.error(`You can attach at most ${MAX_INDENT_ATTACHMENTS} files.`);
        return current;
      }
      if (picked.length > room) {
        toast.error(`Only ${room} more file(s) can be added (limit ${MAX_INDENT_ATTACHMENTS}).`);
      }
      return [...current, ...picked.slice(0, room)];
    });
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

      // Upload any attached files against the freshly-created indent.
      let failedUploads = 0;
      if (files.length > 0) {
        const results = await Promise.allSettled(
          files.map((file) =>
            uploadAttachment.mutateAsync({ indent: indent.id, file, doc_type: 'OTHER' }),
          ),
        );
        failedUploads = results.filter((r) => r.status === 'rejected').length;
      }

      if (failedUploads > 0) {
        toast.warning(
          `Indent ${indent.indent_no} created, but ${failedUploads} file(s) failed to upload. Re-attach them from the indent.`,
        );
      } else {
        toast.success(`Material indent ${indent.indent_no} created as draft`);
      }
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
              <Label htmlFor="mi_contact">Contact No.</Label>
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

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Attachments</Label>
              <span className="text-xs text-muted-foreground">
                {files.length}/{MAX_INDENT_ATTACHMENTS} files
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {files.map((file, index) => (
                <FileThumb
                  key={`${file.name}-${file.lastModified}-${index}`}
                  file={file}
                  onRemove={() => setFiles((current) => current.filter((_, i) => i !== index))}
                />
              ))}
              {files.length < MAX_INDENT_ATTACHMENTS && (
                <label className="flex h-20 w-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-md border border-dashed text-xs text-muted-foreground hover:bg-muted/40">
                  <Paperclip className="h-5 w-5" />
                  Add
                  <input
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      addFiles(e.target.files);
                      e.target.value = '';
                    }}
                  />
                </label>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Attach up to {MAX_INDENT_ATTACHMENTS} files (photos, PDFs, documents, etc.).
            </p>
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
  canReview,
  canApprove,
  canPurchase,
  canGateIn,
  canReceive,
  onOpenChange,
}: {
  indentId: number;
  canManage: boolean;
  canReview: boolean;
  canApprove: boolean;
  canPurchase: boolean;
  canGateIn: boolean;
  canReceive: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const indentQuery = useMaterialIndent(indentId);
  const submitIndent = useSubmitMaterialIndent();
  const reviewIndent = useReviewMaterialIndent();
  const approveIndent = useApproveMaterialIndent();
  const rejectIndent = useRejectMaterialIndent();
  const purchaseIndent = usePurchaseMaterialIndent();
  const gateInIndent = useGateInMaterialIndent();
  const receiveIndent = useReceiveMaterialIndent();
  const uploadAttachment = useUploadMaterialIndentAttachment();
  const deleteAttachment = useDeleteMaterialIndentAttachment();
  const cancelIndent = useCancelMaterialIndent();
  const [remarks, setRemarks] = useState('');
  const [storeRemarks, setStoreRemarks] = useState('');
  const [purchaseRemarks, setPurchaseRemarks] = useState('');
  const [issued, setIssued] = useState<Record<number, string>>({});
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [driverName, setDriverName] = useState('');
  const [docType, setDocType] = useState('INVOICE');

  const indent = indentQuery.data;
  const reviewing = indent?.status === 'SUBMITTED' && canReview;

  // When the store starts reviewing, default each row to "issue the full qty".
  useEffect(() => {
    if (reviewing && indent) {
      setIssued((prev) =>
        Object.keys(prev).length ? prev : Object.fromEntries(indent.items.map((i) => [i.id, i.quantity])),
      );
    }
  }, [reviewing, indent]);

  const issuedFor = (item: MaterialIndentItem) =>
    reviewing ? (issued[item.id] ?? item.quantity) : item.issued_quantity;
  const shortfallFor = (item: MaterialIndentItem) => {
    if (!reviewing) return item.shortfall_quantity;
    const s = Number(item.quantity) - Number(issued[item.id] ?? item.quantity);
    return String(s > 0 ? s : 0);
  };

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto">
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

            {/* Requester details — visible to store, authority and purchaser. */}
            <div className="grid gap-3 rounded-md border p-3 md:grid-cols-2">
              <div>
                <span className="text-muted-foreground">Purpose: </span>
                {indent.purpose || '-'}
              </div>
              <div>
                <span className="text-muted-foreground">Department: </span>
                {indent.department_name || '-'}
              </div>
              <div className="md:col-span-2">
                <span className="text-muted-foreground">Raised by: </span>
                {indent.requested_by_name || indent.created_by_name || '-'}
                {indent.contact_no && ` (${indent.contact_no})`}
                {indent.submitted_by_name && ` · submitted by ${indent.submitted_by_name}`}
              </div>
            </div>

            <div className="overflow-x-auto rounded-md border">
              <table className="w-full min-w-[720px] text-sm">
                <thead className="border-b bg-muted/40">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">#</th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">Particulars</th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">Spec / Make</th>
                    <th className="px-3 py-2 text-right font-medium text-muted-foreground">Req. Qty</th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">Unit</th>
                    <th className="px-3 py-2 text-right font-medium text-muted-foreground">Issued</th>
                    <th className="px-3 py-2 text-right font-medium text-muted-foreground">To Purchase</th>
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
                      <td className="px-3 py-2 text-right">
                        {reviewing ? (
                          <Input
                            type="number"
                            min="0"
                            max={item.quantity}
                            step="0.001"
                            className="ml-auto w-24"
                            value={issued[item.id] ?? item.quantity}
                            onChange={(e) =>
                              setIssued((c) => ({ ...c, [item.id]: e.target.value }))
                            }
                          />
                        ) : (
                          <span className="tabular-nums">{Number(issuedFor(item))}</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums font-medium text-amber-700">
                        {Number(shortfallFor(item)) || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Gate-in details once the goods have arrived. */}
            {(indent.gatein_vehicle_number || indent.gate_in_by_name) && (
              <div className="rounded-md border bg-muted/30 p-3">
                <span className="font-medium">Gate-in: </span>
                {indent.gatein_vehicle_number || '—'}
                {indent.gatein_driver_name && ` · ${indent.gatein_driver_name}`}
                {indent.gate_in_by_name && (
                  <span className="text-muted-foreground"> · by {indent.gate_in_by_name}</span>
                )}
              </div>
            )}

            {/* Invoice / bill attachments. */}
            {indent.attachments.length > 0 && (
              <div className="space-y-1">
                <p className="font-medium">Documents</p>
                <ul className="space-y-1">
                  {indent.attachments.map((att) => (
                    <li
                      key={att.id}
                      className="flex items-center justify-between rounded border px-3 py-2"
                    >
                      <a
                        href={att.file}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-2 text-primary hover:underline"
                      >
                        <FileText className="h-4 w-4" />
                        {att.title || att.doc_type_display || att.file.split('/').pop()}
                      </a>
                      {(canGateIn || canReceive || canManage) && (
                        <button
                          type="button"
                          onClick={async () => {
                            await deleteAttachment.mutateAsync(att.id);
                            toast.success('Attachment removed');
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {indent.status === 'RECEIVED' && (
              <div className="rounded-md border bg-emerald-50/60 p-3">
                <span className="font-medium">Received into Store / Spares</span>
                {indent.received_by_name && ` by ${indent.received_by_name}`} — purchased items added
                to stock.
              </div>
            )}

            {/* Trail of remarks at each stage. */}
            {indent.store_remarks && (
              <div className="rounded-md border bg-muted/30 p-3">
                <span className="font-medium">Store note: </span>
                {indent.store_remarks}
                {indent.reviewed_by_name && (
                  <span className="text-muted-foreground"> — {indent.reviewed_by_name}</span>
                )}
              </div>
            )}
            {indent.status === 'REJECTED' && indent.decision_remarks && (
              <div className="rounded-md border bg-rose-50/60 p-3">
                <span className="font-medium">Rejected: </span>
                {indent.decision_remarks}
              </div>
            )}
            {indent.status === 'PURCHASED' && (
              <div className="rounded-md border bg-emerald-50/60 p-3">
                <span className="font-medium">Purchased</span>
                {indent.purchased_by_name && ` by ${indent.purchased_by_name}`}
                {indent.purchase_remarks && ` — ${indent.purchase_remarks}`}
              </div>
            )}

            {/* Actions */}
            <div className="space-y-3 rounded-md border p-3">
              <p className="font-medium">Actions</p>

              {/* 1. Requester submits straight for purchase approval (store step skipped) */}
              {indent.status === 'DRAFT' && canManage && (
                <Button
                  type="button"
                  onClick={async () => {
                    await submitIndent.mutateAsync(indentId);
                    toast.success('Sent for purchase approval');
                  }}
                  disabled={submitIndent.isPending}
                >
                  <Send className="h-4 w-4" />
                  Send for Approval
                </Button>
              )}

              {/* 2. Store engineer reviews: sets issued qty, issues or forwards shortfall */}
              {reviewing && (
                <div className="space-y-2">
                  <Label className="text-xs">Store note (optional)</Label>
                  <Textarea value={storeRemarks} onChange={(e) => setStoreRemarks(e.target.value)} />
                  <p className="text-xs text-muted-foreground">
                    Set how much of each item you can issue from stock. Any shortfall is forwarded
                    for purchase approval.
                  </p>
                  <Button
                    type="button"
                    onClick={async () => {
                      const res = await reviewIndent.mutateAsync({
                        indentId,
                        payload: {
                          items: indent.items.map((i) => ({
                            id: i.id,
                            issued_quantity: issued[i.id] ?? i.quantity,
                          })),
                          store_remarks: storeRemarks.trim(),
                        },
                      });
                      toast.success(
                        res.status === 'ISSUED'
                          ? 'All items issued from store'
                          : 'Available items issued; shortfall sent for approval',
                      );
                      setStoreRemarks('');
                    }}
                    disabled={reviewIndent.isPending}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Issue / Forward Shortfall
                  </Button>
                </div>
              )}
              {indent.status === 'SUBMITTED' && !canReview && (
                <p className="text-sm text-muted-foreground">Waiting for store review.</p>
              )}

              {/* 3. Higher authority approves the purchase of the shortfall */}
              {indent.status === 'PENDING_APPROVAL' && canApprove && (
                <div className="space-y-2">
                  <Label className="text-xs">Decision remarks (optional)</Label>
                  <Textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} />
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      onClick={async () => {
                        await approveIndent.mutateAsync({
                          indentId,
                          payload: { decision_remarks: remarks.trim() },
                        });
                        toast.success('Approved — sent to purchaser');
                        setRemarks('');
                      }}
                      disabled={approveIndent.isPending}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Approve Purchase
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
              {indent.status === 'PENDING_APPROVAL' && !canApprove && (
                <p className="text-sm text-muted-foreground">Waiting for purchase approval.</p>
              )}

              {/* 4a. Purchaser collects company quotations; approver picks one */}
              {['APPROVED', 'PENDING_QUOTATION_SELECTION', 'QUOTATION_SELECTED'].includes(
                indent.status,
              ) &&
                (canPurchase || canApprove) && (
                  <MaterialIndentQuotations
                    indent={indent}
                    canPurchase={canPurchase}
                    canApprove={canApprove}
                  />
                )}
              {indent.status === 'PENDING_QUOTATION_SELECTION' && !canApprove && (
                <p className="text-sm text-muted-foreground">
                  Waiting for the approver to pick a company.
                </p>
              )}

              {/* 4b. Purchaser buys from the selected company and closes their step */}
              {(indent.status === 'QUOTATION_SELECTED' ||
                (indent.status === 'APPROVED' && indent.quotations.length === 0)) &&
                canPurchase && (
                <div className="space-y-2">
                  <Label className="text-xs">Vendor / PO note (optional)</Label>
                  <Textarea
                    value={purchaseRemarks}
                    onChange={(e) => setPurchaseRemarks(e.target.value)}
                  />
                  <Button
                    type="button"
                    onClick={async () => {
                      await purchaseIndent.mutateAsync({
                        indentId,
                        payload: { purchase_remarks: purchaseRemarks.trim() },
                      });
                      toast.success('Marked purchased');
                      setPurchaseRemarks('');
                    }}
                    disabled={purchaseIndent.isPending}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Mark Purchased
                  </Button>
                </div>
              )}
              {['APPROVED', 'QUOTATION_SELECTED'].includes(indent.status) && !canPurchase && (
                <p className="text-sm text-muted-foreground">Waiting for the purchaser.</p>
              )}

              {/* 5. Gate records vehicle + invoice/bill when purchased goods arrive */}
              {indent.status === 'PURCHASED' && canGateIn && (
                <div className="space-y-2">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Vehicle number</Label>
                      <Input value={vehicleNumber} onChange={(e) => setVehicleNumber(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Driver name</Label>
                      <Input value={driverName} onChange={(e) => setDriverName(e.target.value)} />
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <NativeSelect
                      value={docType}
                      onChange={(e) => setDocType(e.target.value)}
                      className="w-32"
                    >
                      <SelectOption value="INVOICE">Invoice</SelectOption>
                      <SelectOption value="BILL">Bill</SelectOption>
                      <SelectOption value="OTHER">Other</SelectOption>
                    </NativeSelect>
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted/40">
                      <Upload className="h-4 w-4" />
                      Attach invoice / bill
                      <input
                        type="file"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          e.target.value = '';
                          if (!file) return;
                          await uploadAttachment.mutateAsync({
                            indent: indentId,
                            file,
                            doc_type: docType as 'INVOICE' | 'BILL' | 'OTHER',
                          });
                          toast.success('Attachment added');
                        }}
                      />
                    </label>
                  </div>
                  <Button
                    type="button"
                    onClick={async () => {
                      await gateInIndent.mutateAsync({
                        indentId,
                        payload: {
                          vehicle_number: vehicleNumber.trim(),
                          driver_name: driverName.trim(),
                        },
                      });
                      toast.success('Gated in — sent to store to receive');
                      setVehicleNumber('');
                      setDriverName('');
                    }}
                    disabled={gateInIndent.isPending}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Gate In
                  </Button>
                </div>
              )}
              {indent.status === 'PURCHASED' && !canGateIn && (
                <p className="text-sm text-muted-foreground">Awaiting gate-in of the purchased goods.</p>
              )}

              {/* 6. Store collects the arrival into Store/Spares stock */}
              {indent.status === 'GATE_IN' && canReceive && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    Collecting adds each purchased item’s quantity to Store / Spares stock
                    (matching or creating the part).
                  </p>
                  <Button
                    type="button"
                    onClick={async () => {
                      await receiveIndent.mutateAsync({ indentId, payload: {} });
                      toast.success('Received into Store / Spares stock');
                    }}
                    disabled={receiveIndent.isPending}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Collect into Store
                  </Button>
                </div>
              )}
              {indent.status === 'GATE_IN' && !canReceive && (
                <p className="text-sm text-muted-foreground">Awaiting store receipt.</p>
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
  const canReview = hasPermission(MAINTENANCE_PERMISSIONS.REVIEW_MATERIAL_INDENT);
  const canApprove = hasPermission(MAINTENANCE_PERMISSIONS.APPROVE_MATERIAL_INDENT);
  const canPurchase = hasPermission(MAINTENANCE_PERMISSIONS.PURCHASE_MATERIAL_INDENT);
  const canGateIn = hasPermission(MAINTENANCE_PERMISSIONS.GATEIN_MATERIAL_INDENT);
  const canReceive = hasPermission(MAINTENANCE_PERMISSIONS.RECEIVE_MATERIAL_INDENT);

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
  const forApproval = indents.filter((i) => i.status === 'PENDING_APPROVAL').length;
  const toPurchase = indents.filter((i) => i.status === 'APPROVED').length;

  const handleDelete = async (indent: MaterialIndent) => {
    await deleteIndent.mutateAsync(indent.id);
    toast.success('Indent deleted');
  };

  return (
    <div className="space-y-6 p-6">
      <DashboardHeader
        title="Material Indent"
        description="Raise material requests → straight to purchase approval → purchase"
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

      <div className="grid gap-4 md:grid-cols-3">
        <SummaryCard title="Total" value={indents.length} icon={FileText} />
        <SummaryCard title="For Approval" value={forApproval} icon={Send} />
        <SummaryCard title="To Purchase" value={toPurchase} icon={CheckCircle2} />
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
                <SelectOption value="SUBMITTED">Submitted to Store</SelectOption>
                <SelectOption value="ISSUED">Issued from Store</SelectOption>
                <SelectOption value="PENDING_APPROVAL">Pending Purchase Approval</SelectOption>
                <SelectOption value="APPROVED">Approved for Purchase</SelectOption>
                <SelectOption value="PURCHASED">Purchased</SelectOption>
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
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Requested By</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
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
                    {indent.requested_by_name || indent.created_by_name || '-'}
                    {indent.department_name && (
                      <span className="block text-xs text-muted-foreground">
                        {indent.department_name}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <MaterialIndentStatusBadge status={indent.status} />
                  </td>
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
          canReview={canReview}
          canApprove={canApprove}
          canPurchase={canPurchase}
          canGateIn={canGateIn}
          canReceive={canReceive}
          onOpenChange={(open) => {
            if (!open) setDetailId(null);
          }}
        />
      )}
    </div>
  );
}
