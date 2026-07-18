import {
  AlertTriangle,
  Boxes,
  CheckCircle2,
  ClipboardList,
  Edit,
  Package,
  PackageCheck,
  PackagePlus,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  SlidersHorizontal,
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
  Checkbox,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  MultiSelect,
  NativeSelect,
  SelectOption,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
} from '@/shared/components/ui';

import {
  useAdjustSpareStock,
  useConsumeSpareRequest,
  useCreateMaintenanceSpare,
  useCreateSpareCategory,
  useIssueSpareRequest,
  useMaintenanceAssets,
  useMaintenanceDashboard,
  useMaintenanceOptions,
  useMaintenanceSpares,
  useMaterialIndents,
  useReceiveMaterialIndent,
  useReturnUnusedSpareRequest,
  useSpareRequests,
  useUpdateMaintenanceSpare,
} from '../api';
import { MaterialIndentStatusBadge } from '../components';
import type {
  MaintenanceAsset,
  MaintenanceDecimal,
  MaintenanceSpare,
  MaintenanceSpareFilters,
  MaintenanceSparePayload,
  SpareCategoryPayload,
  SpareIssuePayload,
  SpareRequest,
  SpareRequestActionPayload,
  SpareRequestStatus,
  SpareStockAdjustPayload,
} from '../types';

type SpareActionKind = 'issue' | 'consume' | 'return';

interface SpareFormState {
  category: string;
  name: string;
  part_number: string;
  sap_item_code: string;
  uom: string;
  compatible_assets: string[];
  is_critical: boolean;
  minimum_stock: string;
  reorder_level: string;
  current_stock: string;
  unit_cost: string;
  storage_location: string;
  description: string;
}

const EMPTY_SPARE_FORM: SpareFormState = {
  category: '',
  name: '',
  part_number: '',
  sap_item_code: '',
  uom: 'NOS',
  compatible_assets: [],
  is_critical: false,
  minimum_stock: '0',
  reorder_level: '0',
  current_stock: '0',
  unit_cost: '0',
  storage_location: '',
  description: '',
};

const REQUEST_STATUS_CLASSES: Record<SpareRequestStatus, string> = {
  REQUESTED: 'border-sky-200 bg-sky-50 text-sky-700',
  PARTIALLY_ISSUED: 'border-amber-200 bg-amber-50 text-amber-700',
  ISSUED: 'border-blue-200 bg-blue-50 text-blue-700',
  PARTIALLY_CONSUMED: 'border-violet-200 bg-violet-50 text-violet-700',
  CLOSED: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  CANCELLED: 'border-slate-200 bg-slate-50 text-slate-600',
};

function decimalNumber(value: MaintenanceDecimal | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatQty(value: MaintenanceDecimal | null | undefined) {
  const parsed = decimalNumber(value);
  return new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 3,
  }).format(parsed);
}

function formatMoney(value: MaintenanceDecimal | null | undefined) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(decimalNumber(value));
}

function choiceLabel<TValue extends string>(
  choices: Array<{ value: TValue; label: string }> | undefined,
  value: TValue,
) {
  return choices?.find((item) => item.value === value)?.label ?? value.replaceAll('_', ' ');
}

function formFromSpare(spare?: MaintenanceSpare | null): SpareFormState {
  if (!spare) return EMPTY_SPARE_FORM;
  return {
    category: String(spare.category),
    name: spare.name,
    part_number: spare.part_number,
    sap_item_code: spare.sap_item_code,
    uom: spare.uom,
    compatible_assets: spare.compatible_assets.map(String),
    is_critical: spare.is_critical,
    minimum_stock: String(spare.minimum_stock ?? 0),
    reorder_level: String(spare.reorder_level ?? 0),
    current_stock: String(spare.current_stock ?? 0),
    unit_cost: String(spare.unit_cost ?? 0),
    storage_location: spare.storage_location,
    description: spare.description,
  };
}

function SpareRequestStatusBadge({
  status,
  statuses,
}: {
  status: SpareRequestStatus;
  statuses?: Array<{ value: SpareRequestStatus; label: string }>;
}) {
  return (
    <Badge variant="outline" className={REQUEST_STATUS_CLASSES[status]}>
      {choiceLabel(statuses, status)}
    </Badge>
  );
}

function SpareFormDialog({
  open,
  spare,
  categories,
  assets,
  isSubmitting,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  spare?: MaintenanceSpare | null;
  categories: Array<{ id: number; name: string }>;
  assets: MaintenanceAsset[];
  isSubmitting?: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: MaintenanceSparePayload) => Promise<void> | void;
}) {
  const [form, setForm] = useState<SpareFormState>(() => formFromSpare(spare));

  const setField = <TKey extends keyof SpareFormState>(
    key: TKey,
    value: SpareFormState[TKey],
  ) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const assetOptions = assets.map((asset) => ({
    label: `${asset.asset_code} - ${asset.name}`,
    value: String(asset.id),
  }));

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await onSubmit({
      category: Number(form.category),
      name: form.name.trim(),
      part_number: form.part_number.trim(),
      sap_item_code: form.sap_item_code.trim(),
      uom: form.uom.trim() || 'NOS',
      compatible_assets: form.compatible_assets.map(Number),
      is_critical: form.is_critical,
      minimum_stock: form.minimum_stock || 0,
      reorder_level: form.reorder_level || 0,
      // Opening stock is only set on create; on an existing spare, on-hand
      // changes go through the adjust-stock action so the ledger stays accurate.
      ...(spare ? {} : { current_stock: form.current_stock || 0 }),
      unit_cost: form.unit_cost || 0,
      storage_location: form.storage_location.trim(),
      description: form.description.trim(),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{spare ? 'Edit Spare' : 'New Spare'}</DialogTitle>
        </DialogHeader>
        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="spare_category">Category</Label>
              <NativeSelect
                id="spare_category"
                value={form.category}
                onChange={(event) => setField('category', event.target.value)}
                required
              >
                <SelectOption value="">Select category</SelectOption>
                {categories.map((category) => (
                  <SelectOption key={category.id} value={String(category.id)}>
                    {category.name}
                  </SelectOption>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="spare_name">Spare Name</Label>
              <Input
                id="spare_name"
                value={form.name}
                onChange={(event) => setField('name', event.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="spare_part_number">Part Number</Label>
              <Input
                id="spare_part_number"
                value={form.part_number}
                onChange={(event) => setField('part_number', event.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="spare_sap_item">SAP Item Code</Label>
              <Input
                id="spare_sap_item"
                value={form.sap_item_code}
                onChange={(event) => setField('sap_item_code', event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="spare_uom">UOM</Label>
              <Input
                id="spare_uom"
                value={form.uom}
                onChange={(event) => setField('uom', event.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="spare_min_stock">Minimum Stock</Label>
              <Input
                id="spare_min_stock"
                type="number"
                min="0"
                step="0.001"
                value={form.minimum_stock}
                onChange={(event) => setField('minimum_stock', event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="spare_reorder_level">Reorder Level</Label>
              <Input
                id="spare_reorder_level"
                type="number"
                min="0"
                step="0.001"
                value={form.reorder_level}
                onChange={(event) => setField('reorder_level', event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="spare_current_stock">
                {spare ? 'Current Stock (read-only)' : 'Opening Stock'}
              </Label>
              <Input
                id="spare_current_stock"
                type="number"
                min="0"
                step="0.001"
                value={form.current_stock}
                onChange={(event) => setField('current_stock', event.target.value)}
                disabled={Boolean(spare)}
              />
              {spare && (
                <p className="text-xs text-muted-foreground">
                  Use “Adjust Stock” to change on-hand quantity so the movement ledger stays accurate.
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="spare_unit_cost">Unit Cost</Label>
              <Input
                id="spare_unit_cost"
                type="number"
                min="0"
                step="0.01"
                value={form.unit_cost}
                onChange={(event) => setField('unit_cost', event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="spare_storage">Storage Location</Label>
              <Input
                id="spare_storage"
                value={form.storage_location}
                onChange={(event) => setField('storage_location', event.target.value)}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="spare_assets">Compatible Assets</Label>
              <MultiSelect
                id="spare_assets"
                options={assetOptions}
                selected={form.compatible_assets}
                onChange={(values) => setField('compatible_assets', values)}
                placeholder="All assets"
                className="w-full"
              />
            </div>
            <div className="flex items-center gap-2 pt-8">
              <Checkbox
                id="spare_critical"
                checked={form.is_critical}
                onCheckedChange={(checked) => setField('is_critical', checked)}
              />
              <Label htmlFor="spare_critical">Critical spare</Label>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="spare_description">Description</Label>
            <Textarea
              id="spare_description"
              value={form.description}
              onChange={(event) => setField('description', event.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              <PackageCheck className="h-4 w-4" />
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SpareCategoryDialog({
  open,
  isSubmitting,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  isSubmitting?: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: SpareCategoryPayload) => Promise<void> | void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await onSubmit({ name: name.trim(), description: description.trim() });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Spare Category</DialogTitle>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="spare_category_name">Name</Label>
            <Input
              id="spare_category_name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="spare_category_description">Description</Label>
            <Textarea
              id="spare_category_description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              <Plus className="h-4 w-4" />
              Add
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SpareActionDialog({
  open,
  action,
  request,
  isSubmitting,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  action: SpareActionKind;
  request?: SpareRequest | null;
  isSubmitting?: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (action: SpareActionKind, payload: SpareIssuePayload | SpareRequestActionPayload) => Promise<void> | void;
}) {
  const initialQuantity =
    action === 'issue' ? request?.pending_issue_qty : request?.available_to_consume_qty;
  const [quantity, setQuantity] = useState(initialQuantity ? String(initialQuantity) : '');
  const [unitCost, setUnitCost] = useState('');
  const [remarks, setRemarks] = useState('');

  const actionLabel =
    action === 'issue' ? 'Issue Spare' : action === 'consume' ? 'Consume Spare' : 'Return Unused';
  const maxLabel =
    action === 'issue'
      ? `Pending issue: ${formatQty(request?.pending_issue_qty)}`
      : `Unused issued: ${formatQty(request?.available_to_consume_qty)}`;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (action === 'issue') {
      await onSubmit(action, {
        quantity,
        remarks: remarks.trim(),
        unit_cost: unitCost === '' ? null : unitCost,
      });
      return;
    }
    await onSubmit(action, { quantity, remarks: remarks.trim() });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{actionLabel}</DialogTitle>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="rounded-md border bg-muted/30 p-3 text-sm">
            <div className="font-medium">{request?.spare_part_number}</div>
            <div className="text-muted-foreground">{request?.spare_name}</div>
            <div className="mt-2 text-xs text-muted-foreground">{maxLabel}</div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="spare_action_quantity">Quantity</Label>
            <Input
              id="spare_action_quantity"
              type="number"
              min="0.001"
              step="0.001"
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
              required
            />
          </div>
          {action === 'issue' && (
            <div className="space-y-2">
              <Label htmlFor="spare_action_unit_cost">Unit Cost Override</Label>
              <Input
                id="spare_action_unit_cost"
                type="number"
                min="0"
                step="0.01"
                value={unitCost}
                onChange={(event) => setUnitCost(event.target.value)}
                placeholder="Use spare master cost"
              />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="spare_action_remarks">Remarks</Label>
            <Textarea
              id="spare_action_remarks"
              value={remarks}
              onChange={(event) => setRemarks(event.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              <PackageCheck className="h-4 w-4" />
              Confirm
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SpareAdjustDialog({
  open,
  spare,
  isSubmitting,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  spare?: MaintenanceSpare | null;
  isSubmitting?: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: SpareStockAdjustPayload) => Promise<void> | void;
}) {
  const [newStock, setNewStock] = useState('');
  const [reason, setReason] = useState('');

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await onSubmit({ new_stock: newStock, reason: reason.trim() });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adjust Stock</DialogTitle>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="rounded-md border bg-muted/30 p-3 text-sm">
            <div className="font-medium">{spare?.part_number}</div>
            <div className="text-muted-foreground">{spare?.name}</div>
            <div className="mt-2 text-xs text-muted-foreground">
              Current on-hand: {formatQty(spare?.current_stock)} {spare?.uom}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="spare_adjust_new_stock">New counted stock</Label>
            <Input
              id="spare_adjust_new_stock"
              type="number"
              min="0"
              step="0.001"
              value={newStock}
              onChange={(event) => setNewStock(event.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="spare_adjust_reason">Reason</Label>
            <Textarea
              id="spare_adjust_reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="e.g. Physical cycle count correction"
              required
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              <SlidersHorizontal className="h-4 w-4" />
              Adjust
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function MaintenanceSparesPage() {
  const { hasPermission } = usePermission();
  const canManageSpare = hasPermission(MAINTENANCE_PERMISSIONS.MANAGE_SPARE);
  const canReceiveIndent = hasPermission(MAINTENANCE_PERMISSIONS.RECEIVE_MATERIAL_INDENT);

  const [filters, setFilters] = useState<MaintenanceSpareFilters>({
    search: '',
    category: 'ALL',
    is_critical: 'ALL',
    is_active: true,
  });
  const [requestStatus, setRequestStatus] = useState<SpareRequestStatus | 'ALL'>('ALL');
  const [requestSearch, setRequestSearch] = useState('');
  const [spareDialogOpen, setSpareDialogOpen] = useState(false);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [editingSpare, setEditingSpare] = useState<MaintenanceSpare | null>(null);
  const [adjustDialogOpen, setAdjustDialogOpen] = useState(false);
  const [adjustSpare, setAdjustSpare] = useState<MaintenanceSpare | null>(null);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [actionKind, setActionKind] = useState<SpareActionKind>('issue');
  const [actionRequest, setActionRequest] = useState<SpareRequest | null>(null);

  const dashboardQuery = useMaintenanceDashboard();
  const optionsQuery = useMaintenanceOptions();
  const assetsQuery = useMaintenanceAssets({ is_active: true });
  const sparesQuery = useMaintenanceSpares(filters);
  const requestFilters = useMemo(
    () => ({
      status: requestStatus,
      search: requestSearch,
      is_active: true,
    }),
    [requestSearch, requestStatus],
  );
  const requestsQuery = useSpareRequests(requestFilters);
  // Purchased material indents that have been gated in and await store receipt.
  const pendingReceiptsQuery = useMaterialIndents({ status: 'GATE_IN' }, canReceiveIndent);
  const receiveIndent = useReceiveMaterialIndent();
  const pendingReceipts = pendingReceiptsQuery.data ?? [];

  const createSpare = useCreateMaintenanceSpare();
  const updateSpare = useUpdateMaintenanceSpare();
  const adjustStock = useAdjustSpareStock();
  const createCategory = useCreateSpareCategory();
  const issueRequest = useIssueSpareRequest();
  const consumeRequest = useConsumeSpareRequest();
  const returnRequest = useReturnUnusedSpareRequest();

  const spares = sparesQuery.data ?? [];
  const requests = requestsQuery.data ?? [];
  const pendingRequests = requests.filter(
    (request) => request.status !== 'CLOSED' && request.status !== 'CANCELLED',
  ).length;

  const refresh = () => {
    void dashboardQuery.refetch();
    void optionsQuery.refetch();
    void sparesQuery.refetch();
    void requestsQuery.refetch();
  };

  const openCreateSpare = () => {
    setEditingSpare(null);
    setSpareDialogOpen(true);
  };

  const openEditSpare = (spare: MaintenanceSpare) => {
    setEditingSpare(spare);
    setSpareDialogOpen(true);
  };

  const openAdjustSpare = (spare: MaintenanceSpare) => {
    setAdjustSpare(spare);
    setAdjustDialogOpen(true);
  };

  const openAction = (request: SpareRequest, action: SpareActionKind) => {
    setActionRequest(request);
    setActionKind(action);
    setActionDialogOpen(true);
  };

  const handleSpareSubmit = async (payload: MaintenanceSparePayload) => {
    if (editingSpare) {
      await updateSpare.mutateAsync({ spareId: editingSpare.id, payload });
      toast.success('Spare updated');
    } else {
      await createSpare.mutateAsync(payload);
      toast.success('Spare created');
    }
    setSpareDialogOpen(false);
  };

  const handleAdjustSubmit = async (payload: SpareStockAdjustPayload) => {
    if (!adjustSpare) return;
    await adjustStock.mutateAsync({ spareId: adjustSpare.id, payload });
    toast.success('Stock adjusted');
    setAdjustDialogOpen(false);
  };

  const handleCategorySubmit = async (payload: SpareCategoryPayload) => {
    await createCategory.mutateAsync(payload);
    toast.success('Spare category created');
    setCategoryDialogOpen(false);
  };

  const handleActionSubmit = async (
    action: SpareActionKind,
    payload: SpareIssuePayload | SpareRequestActionPayload,
  ) => {
    if (!actionRequest) return;
    if (action === 'issue') {
      await issueRequest.mutateAsync({
        requestId: actionRequest.id,
        payload: payload as SpareIssuePayload,
      });
      toast.success('Spare issued');
    } else if (action === 'consume') {
      await consumeRequest.mutateAsync({
        requestId: actionRequest.id,
        payload: payload as SpareRequestActionPayload,
      });
      toast.success('Spare consumed');
    } else {
      await returnRequest.mutateAsync({
        requestId: actionRequest.id,
        payload: payload as SpareRequestActionPayload,
      });
      toast.success('Unused spare returned');
    }
    setActionDialogOpen(false);
  };

  return (
    <div className="space-y-6 p-6">
      <DashboardHeader title="Store / Spares" description="Maintenance spare stock and issue control">
        <Button
          variant="outline"
          size="sm"
          onClick={refresh}
          disabled={sparesQuery.isFetching || requestsQuery.isFetching || dashboardQuery.isFetching}
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCategoryDialogOpen(true)}
          disabled={!canManageSpare}
        >
          <Plus className="h-4 w-4" />
          Category
        </Button>
        <Button size="sm" onClick={openCreateSpare} disabled={!canManageSpare}>
          <PackagePlus className="h-4 w-4" />
          New Spare
        </Button>
      </DashboardHeader>

      {canReceiveIndent && pendingReceipts.length > 0 && (
        <Card className="border-cyan-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <PackageCheck className="h-4 w-4 text-cyan-700" />
              Pending Receipts ({pendingReceipts.length})
            </CardTitle>
            <CardDescription>
              Purchased material indents gated in and awaiting collection. Collecting adds the
              items to stock.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {pendingReceipts.map((indent) => (
              <div
                key={indent.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm"
              >
                <div>
                  <span className="font-medium">{indent.indent_no}</span>
                  <span className="ml-2 text-muted-foreground">
                    {indent.items.map((i) => i.particulars).join(', ')}
                  </span>
                  <MaterialIndentStatusBadge status={indent.status} />
                </div>
                <Button
                  size="sm"
                  onClick={async () => {
                    await receiveIndent.mutateAsync({ indentId: indent.id, payload: {} });
                    toast.success(`Collected ${indent.indent_no} into stock`);
                  }}
                  disabled={receiveIndent.isPending}
                >
                  <PackageCheck className="h-4 w-4" />
                  Collect into Stock
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <SummaryCard
          title="Spares"
          value={dashboardQuery.data?.spares.total ?? spares.length}
          icon={Boxes}
        />
        <SummaryCard
          title="Critical"
          value={dashboardQuery.data?.spares.critical ?? spares.filter((item) => item.is_critical).length}
          icon={AlertTriangle}
        />
        <SummaryCard
          title="Low Stock"
          value={
            dashboardQuery.data?.spares.low_stock ??
            spares.filter((item) => item.is_low_stock).length
          }
          icon={Package}
          onClick={() => setFilters((current) => ({ ...current, low_stock: true }))}
        />
        <SummaryCard
          title="Below Minimum"
          value={dashboardQuery.data?.spares.below_minimum ?? 0}
          icon={AlertTriangle}
        />
        <SummaryCard title="Open Requests" value={pendingRequests} icon={ClipboardList} />
      </div>

      <Tabs defaultValue="spares" className="space-y-4">
        <TabsList>
          <TabsTrigger value="spares">Spare Master</TabsTrigger>
          <TabsTrigger value="requests">Requests</TabsTrigger>
        </TabsList>

        <TabsContent value="spares" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Spare Filters</CardTitle>
              <CardDescription>Search by part number, SAP item, name, or bin location</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                <div className="space-y-2 xl:col-span-2">
                  <Label htmlFor="spare_search">Search</Label>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="spare_search"
                      value={filters.search ?? ''}
                      onChange={(event) =>
                        setFilters((current) => ({ ...current, search: event.target.value }))
                      }
                      className="pl-9"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="spare_filter_category">Category</Label>
                  <NativeSelect
                    id="spare_filter_category"
                    value={filters.category ?? 'ALL'}
                    onChange={(event) =>
                      setFilters((current) => ({
                        ...current,
                        category:
                          event.target.value === 'ALL' ? 'ALL' : Number(event.target.value),
                      }))
                    }
                  >
                    <SelectOption value="ALL">All</SelectOption>
                    {optionsQuery.data?.spare_categories.map((category) => (
                      <SelectOption key={category.id} value={String(category.id)}>
                        {category.name}
                      </SelectOption>
                    ))}
                  </NativeSelect>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="spare_filter_critical">Critical</Label>
                  <NativeSelect
                    id="spare_filter_critical"
                    value={String(filters.is_critical ?? 'ALL')}
                    onChange={(event) =>
                      setFilters((current) => ({
                        ...current,
                        is_critical:
                          event.target.value === 'ALL' ? 'ALL' : event.target.value === 'true',
                      }))
                    }
                  >
                    <SelectOption value="ALL">All</SelectOption>
                    <SelectOption value="true">Critical</SelectOption>
                    <SelectOption value="false">Non-critical</SelectOption>
                  </NativeSelect>
                </div>
                <div className="flex items-end">
                  <Button
                    type="button"
                    variant={filters.low_stock ? 'default' : 'outline'}
                    className="w-full"
                    onClick={() =>
                      setFilters((current) => ({
                        ...current,
                        low_stock: current.low_stock ? undefined : true,
                      }))
                    }
                  >
                    <AlertTriangle className="h-4 w-4" />
                    Low Stock
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="overflow-x-auto rounded-md border">
            <table className="w-full min-w-[1120px] text-sm">
              <thead className="border-b bg-muted/40">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Spare</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Category</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Stock</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Reorder</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Minimum</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Unit Cost</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Store Bin</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Flags</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sparesQuery.isLoading ? (
                  <tr>
                    <td colSpan={9} className="h-28 px-4 py-3 text-center text-muted-foreground">
                      Loading spares...
                    </td>
                  </tr>
                ) : spares.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="h-28 px-4 py-3 text-center text-muted-foreground">
                      <SlidersHorizontal className="mx-auto mb-2 h-5 w-5" />
                      No spares found.
                    </td>
                  </tr>
                ) : (
                  spares.map((spare) => (
                    <tr key={spare.id} className="border-b last:border-b-0 hover:bg-muted/40">
                      <td className="px-4 py-3">
                        <div className="font-semibold">{spare.part_number}</div>
                        <div className="text-xs text-muted-foreground">{spare.name}</div>
                        {spare.sap_item_code && (
                          <div className="text-xs text-muted-foreground">SAP {spare.sap_item_code}</div>
                        )}
                      </td>
                      <td className="px-4 py-3">{spare.category_name}</td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {formatQty(spare.current_stock)} {spare.uom}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {formatQty(spare.reorder_level)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {formatQty(spare.minimum_stock)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {formatMoney(spare.unit_cost)}
                      </td>
                      <td className="px-4 py-3">{spare.storage_location || '-'}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {spare.is_critical && (
                            <Badge variant="outline" className="border-rose-200 bg-rose-50 text-rose-700">
                              Critical
                            </Badge>
                          )}
                          {spare.is_low_stock && (
                            <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">
                              Low
                            </Badge>
                          )}
                          {spare.is_below_minimum && (
                            <Badge variant="outline" className="border-red-200 bg-red-50 text-red-700">
                              Minimum
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap justify-end gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openAdjustSpare(spare)}
                            disabled={!canManageSpare}
                          >
                            <SlidersHorizontal className="h-4 w-4" />
                            Adjust
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditSpare(spare)}
                            disabled={!canManageSpare}
                          >
                            <Edit className="h-4 w-4" />
                            Edit
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="requests" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Request Filters</CardTitle>
              <CardDescription>Track spare requests raised from maintenance work orders</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <div className="space-y-2 xl:col-span-2">
                  <Label htmlFor="spare_request_search">Search</Label>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="spare_request_search"
                      value={requestSearch}
                      onChange={(event) => setRequestSearch(event.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="spare_request_status">Status</Label>
                  <NativeSelect
                    id="spare_request_status"
                    value={requestStatus}
                    onChange={(event) =>
                      setRequestStatus(event.target.value as SpareRequestStatus | 'ALL')
                    }
                  >
                    <SelectOption value="ALL">All</SelectOption>
                    {optionsQuery.data?.spare_request_statuses.map((status) => (
                      <SelectOption key={status.value} value={status.value}>
                        {status.label}
                      </SelectOption>
                    ))}
                  </NativeSelect>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="overflow-x-auto rounded-md border">
            <table className="w-full min-w-[1220px] text-sm">
              <thead className="border-b bg-muted/40">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Work</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Spare</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Requested</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Issued</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Consumed</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Returned</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Cost</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {requestsQuery.isLoading ? (
                  <tr>
                    <td colSpan={9} className="h-28 px-4 py-3 text-center text-muted-foreground">
                      Loading spare requests...
                    </td>
                  </tr>
                ) : requests.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="h-28 px-4 py-3 text-center text-muted-foreground">
                      <SlidersHorizontal className="mx-auto mb-2 h-5 w-5" />
                      No spare requests found.
                    </td>
                  </tr>
                ) : (
                  requests.map((request) => {
                    const canIssue =
                      canManageSpare &&
                      request.status !== 'CLOSED' &&
                      request.status !== 'CANCELLED' &&
                      decimalNumber(request.pending_issue_qty) > 0;
                    const canUseIssued =
                      canManageSpare && decimalNumber(request.available_to_consume_qty) > 0;
                    return (
                      <tr key={request.id} className="border-b last:border-b-0 hover:bg-muted/40">
                        <td className="px-4 py-3">
                          <div className="font-semibold">{request.work_order_no}</div>
                          <div className="max-w-[260px] truncate text-xs text-muted-foreground">
                            {request.asset_code} - {request.work_order_title}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div>{request.spare_part_number}</div>
                          <div className="text-xs text-muted-foreground">{request.spare_name}</div>
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {formatQty(request.requested_qty)}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {formatQty(request.issued_qty)}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {formatQty(request.consumed_qty)}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {formatQty(request.returned_qty)}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {formatMoney(request.total_cost)}
                        </td>
                        <td className="px-4 py-3">
                          <SpareRequestStatusBadge
                            status={request.status}
                            statuses={optionsQuery.data?.spare_request_statuses}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openAction(request, 'issue')}
                              disabled={!canIssue}
                            >
                              <PackageCheck className="h-4 w-4" />
                              Issue
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openAction(request, 'consume')}
                              disabled={!canUseIssued}
                            >
                              <CheckCircle2 className="h-4 w-4" />
                              Consume
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openAction(request, 'return')}
                              disabled={!canUseIssued}
                            >
                              <RotateCcw className="h-4 w-4" />
                              Return
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>

      {spareDialogOpen && (
        <SpareFormDialog
          open={spareDialogOpen}
          onOpenChange={setSpareDialogOpen}
          spare={editingSpare}
          categories={optionsQuery.data?.spare_categories ?? []}
          assets={assetsQuery.data ?? []}
          isSubmitting={createSpare.isPending || updateSpare.isPending}
          onSubmit={handleSpareSubmit}
        />
      )}
      {adjustDialogOpen && (
        <SpareAdjustDialog
          open={adjustDialogOpen}
          onOpenChange={setAdjustDialogOpen}
          spare={adjustSpare}
          isSubmitting={adjustStock.isPending}
          onSubmit={handleAdjustSubmit}
        />
      )}
      {categoryDialogOpen && (
        <SpareCategoryDialog
          open={categoryDialogOpen}
          onOpenChange={setCategoryDialogOpen}
          isSubmitting={createCategory.isPending}
          onSubmit={handleCategorySubmit}
        />
      )}
      {actionDialogOpen && (
        <SpareActionDialog
          open={actionDialogOpen}
          onOpenChange={setActionDialogOpen}
          action={actionKind}
          request={actionRequest}
          isSubmitting={issueRequest.isPending || consumeRequest.isPending || returnRequest.isPending}
          onSubmit={handleActionSubmit}
        />
      )}
    </div>
  );
}
