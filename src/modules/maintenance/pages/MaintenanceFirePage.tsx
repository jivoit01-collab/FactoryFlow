import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Edit,
  Flame,
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
  useAdjustFireStock,
  useConsumeFireRequest,
  useCreateFireCategory,
  useCreateFireItem,
  useFireCategories,
  useFireItems,
  useFireRequests,
  useIssueFireRequest,
  useMaintenanceAssets,
  useMaintenanceOptions,
  useReturnUnusedFireRequest,
  useUpdateFireItem,
} from '../api';
import type {
  FireCategoryPayload,
  FireIssuePayload,
  FireItem,
  FireItemFilters,
  FireItemPayload,
  FireRequest,
  FireRequestActionPayload,
  FireRequestStatus,
  FireStockAdjustPayload,
  MaintenanceAsset,
  MaintenanceDecimal,
} from '../types';

type FireActionKind = 'issue' | 'consume' | 'return';

interface FireItemFormState {
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

const EMPTY_FIRE_FORM: FireItemFormState = {
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

const REQUEST_STATUS_CLASSES: Record<FireRequestStatus, string> = {
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

function formFromItem(item?: FireItem | null): FireItemFormState {
  if (!item) return EMPTY_FIRE_FORM;
  return {
    category: String(item.category),
    name: item.name,
    part_number: item.part_number,
    sap_item_code: item.sap_item_code,
    uom: item.uom,
    compatible_assets: item.compatible_assets.map(String),
    is_critical: item.is_critical,
    minimum_stock: String(item.minimum_stock ?? 0),
    reorder_level: String(item.reorder_level ?? 0),
    current_stock: String(item.current_stock ?? 0),
    unit_cost: String(item.unit_cost ?? 0),
    storage_location: item.storage_location,
    description: item.description,
  };
}

function FireRequestStatusBadge({
  status,
  statuses,
}: {
  status: FireRequestStatus;
  statuses?: Array<{ value: FireRequestStatus; label: string }>;
}) {
  return (
    <Badge variant="outline" className={REQUEST_STATUS_CLASSES[status]}>
      {choiceLabel(statuses, status)}
    </Badge>
  );
}

function FireItemFormDialog({
  open,
  item,
  categories,
  assets,
  isSubmitting,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  item?: FireItem | null;
  categories: Array<{ id: number; name: string }>;
  assets: MaintenanceAsset[];
  isSubmitting?: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: FireItemPayload) => Promise<void> | void;
}) {
  const [form, setForm] = useState<FireItemFormState>(() => formFromItem(item));

  const setField = <TKey extends keyof FireItemFormState>(
    key: TKey,
    value: FireItemFormState[TKey],
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
      // Opening stock is only set on create; on an existing item, on-hand
      // changes go through the adjust-stock action so the ledger stays accurate.
      ...(item ? {} : { current_stock: form.current_stock || 0 }),
      unit_cost: form.unit_cost || 0,
      storage_location: form.storage_location.trim(),
      description: form.description.trim(),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{item ? 'Edit Fire Item' : 'New Fire Item'}</DialogTitle>
        </DialogHeader>
        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="fire_category">Category</Label>
              <NativeSelect
                id="fire_category"
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
              <Label htmlFor="fire_name">Item Name</Label>
              <Input
                id="fire_name"
                value={form.name}
                onChange={(event) => setField('name', event.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fire_part_number">Part Number</Label>
              <Input
                id="fire_part_number"
                value={form.part_number}
                onChange={(event) => setField('part_number', event.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fire_sap_item">SAP Item Code</Label>
              <Input
                id="fire_sap_item"
                value={form.sap_item_code}
                onChange={(event) => setField('sap_item_code', event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fire_uom">UOM</Label>
              <Input
                id="fire_uom"
                value={form.uom}
                onChange={(event) => setField('uom', event.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fire_min_stock">Minimum Stock</Label>
              <Input
                id="fire_min_stock"
                type="number"
                min="0"
                step="0.001"
                value={form.minimum_stock}
                onChange={(event) => setField('minimum_stock', event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fire_reorder_level">Reorder Level</Label>
              <Input
                id="fire_reorder_level"
                type="number"
                min="0"
                step="0.001"
                value={form.reorder_level}
                onChange={(event) => setField('reorder_level', event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fire_current_stock">
                {item ? 'Current Stock (read-only)' : 'Opening Stock'}
              </Label>
              <Input
                id="fire_current_stock"
                type="number"
                min="0"
                step="0.001"
                value={form.current_stock}
                onChange={(event) => setField('current_stock', event.target.value)}
                disabled={Boolean(item)}
              />
              {item && (
                <p className="text-xs text-muted-foreground">
                  Use “Adjust Stock” to change on-hand quantity so the movement ledger stays accurate.
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="fire_unit_cost">Unit Cost</Label>
              <Input
                id="fire_unit_cost"
                type="number"
                min="0"
                step="0.01"
                value={form.unit_cost}
                onChange={(event) => setField('unit_cost', event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fire_storage">Storage Location</Label>
              <Input
                id="fire_storage"
                value={form.storage_location}
                onChange={(event) => setField('storage_location', event.target.value)}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="fire_assets">Compatible Assets</Label>
              <MultiSelect
                id="fire_assets"
                options={assetOptions}
                selected={form.compatible_assets}
                onChange={(values) => setField('compatible_assets', values)}
                placeholder="All assets"
                className="w-full"
              />
            </div>
            <div className="flex items-center gap-2 pt-8">
              <Checkbox
                id="fire_critical"
                checked={form.is_critical}
                onCheckedChange={(checked) => setField('is_critical', checked)}
              />
              <Label htmlFor="fire_critical">Critical item</Label>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="fire_description">Description</Label>
            <Textarea
              id="fire_description"
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

function FireCategoryDialog({
  open,
  isSubmitting,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  isSubmitting?: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: FireCategoryPayload) => Promise<void> | void;
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
          <DialogTitle>New Fire Category</DialogTitle>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="fire_category_name">Name</Label>
            <Input
              id="fire_category_name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fire_category_description">Description</Label>
            <Textarea
              id="fire_category_description"
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

function FireActionDialog({
  open,
  action,
  request,
  isSubmitting,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  action: FireActionKind;
  request?: FireRequest | null;
  isSubmitting?: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (action: FireActionKind, payload: FireIssuePayload | FireRequestActionPayload) => Promise<void> | void;
}) {
  const initialQuantity =
    action === 'issue' ? request?.pending_issue_qty : request?.available_to_consume_qty;
  const [quantity, setQuantity] = useState(initialQuantity ? String(initialQuantity) : '');
  const [unitCost, setUnitCost] = useState('');
  const [remarks, setRemarks] = useState('');

  const actionLabel =
    action === 'issue' ? 'Issue Item' : action === 'consume' ? 'Consume Item' : 'Return Unused';
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
            <div className="font-medium">{request?.fire_item_part_number}</div>
            <div className="text-muted-foreground">{request?.fire_item_name}</div>
            <div className="mt-2 text-xs text-muted-foreground">{maxLabel}</div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="fire_action_quantity">Quantity</Label>
            <Input
              id="fire_action_quantity"
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
              <Label htmlFor="fire_action_unit_cost">Unit Cost Override</Label>
              <Input
                id="fire_action_unit_cost"
                type="number"
                min="0"
                step="0.01"
                value={unitCost}
                onChange={(event) => setUnitCost(event.target.value)}
                placeholder="Use item master cost"
              />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="fire_action_remarks">Remarks</Label>
            <Textarea
              id="fire_action_remarks"
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

function FireAdjustDialog({
  open,
  item,
  isSubmitting,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  item?: FireItem | null;
  isSubmitting?: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: FireStockAdjustPayload) => Promise<void> | void;
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
            <div className="font-medium">{item?.part_number}</div>
            <div className="text-muted-foreground">{item?.name}</div>
            <div className="mt-2 text-xs text-muted-foreground">
              Current on-hand: {formatQty(item?.current_stock)} {item?.uom}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="fire_adjust_new_stock">New counted stock</Label>
            <Input
              id="fire_adjust_new_stock"
              type="number"
              min="0"
              step="0.001"
              value={newStock}
              onChange={(event) => setNewStock(event.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fire_adjust_reason">Reason</Label>
            <Textarea
              id="fire_adjust_reason"
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

export default function MaintenanceFirePage() {
  const { hasPermission } = usePermission();
  const canManageFire = hasPermission(MAINTENANCE_PERMISSIONS.MANAGE_FIRE);

  const [filters, setFilters] = useState<FireItemFilters>({
    search: '',
    category: 'ALL',
    is_critical: 'ALL',
    is_active: true,
  });
  const [requestStatus, setRequestStatus] = useState<FireRequestStatus | 'ALL'>('ALL');
  const [requestSearch, setRequestSearch] = useState('');
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<FireItem | null>(null);
  const [adjustDialogOpen, setAdjustDialogOpen] = useState(false);
  const [adjustItem, setAdjustItem] = useState<FireItem | null>(null);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [actionKind, setActionKind] = useState<FireActionKind>('issue');
  const [actionRequest, setActionRequest] = useState<FireRequest | null>(null);

  const optionsQuery = useMaintenanceOptions();
  const categoriesQuery = useFireCategories();
  const assetsQuery = useMaintenanceAssets({ is_active: true });
  const itemsQuery = useFireItems(filters);
  const requestFilters = useMemo(
    () => ({
      status: requestStatus,
      search: requestSearch,
      is_active: true,
    }),
    [requestSearch, requestStatus],
  );
  const requestsQuery = useFireRequests(requestFilters);

  const createItem = useCreateFireItem();
  const updateItem = useUpdateFireItem();
  const adjustStock = useAdjustFireStock();
  const createCategory = useCreateFireCategory();
  const issueRequest = useIssueFireRequest();
  const consumeRequest = useConsumeFireRequest();
  const returnRequest = useReturnUnusedFireRequest();

  const items = itemsQuery.data ?? [];
  const categories = categoriesQuery.data ?? [];
  const requests = requestsQuery.data ?? [];
  const pendingRequests = requests.filter(
    (request) => request.status !== 'CLOSED' && request.status !== 'CANCELLED',
  ).length;

  const refresh = () => {
    void optionsQuery.refetch();
    void categoriesQuery.refetch();
    void itemsQuery.refetch();
    void requestsQuery.refetch();
  };

  const openCreateItem = () => {
    setEditingItem(null);
    setItemDialogOpen(true);
  };

  const openEditItem = (item: FireItem) => {
    setEditingItem(item);
    setItemDialogOpen(true);
  };

  const openAdjustItem = (item: FireItem) => {
    setAdjustItem(item);
    setAdjustDialogOpen(true);
  };

  const openAction = (request: FireRequest, action: FireActionKind) => {
    setActionRequest(request);
    setActionKind(action);
    setActionDialogOpen(true);
  };

  const handleItemSubmit = async (payload: FireItemPayload) => {
    if (editingItem) {
      await updateItem.mutateAsync({ itemId: editingItem.id, payload });
      toast.success('Fire item updated');
    } else {
      await createItem.mutateAsync(payload);
      toast.success('Fire item created');
    }
    setItemDialogOpen(false);
  };

  const handleAdjustSubmit = async (payload: FireStockAdjustPayload) => {
    if (!adjustItem) return;
    await adjustStock.mutateAsync({ itemId: adjustItem.id, payload });
    toast.success('Stock adjusted');
    setAdjustDialogOpen(false);
  };

  const handleCategorySubmit = async (payload: FireCategoryPayload) => {
    await createCategory.mutateAsync(payload);
    toast.success('Fire category created');
    setCategoryDialogOpen(false);
  };

  const handleActionSubmit = async (
    action: FireActionKind,
    payload: FireIssuePayload | FireRequestActionPayload,
  ) => {
    if (!actionRequest) return;
    if (action === 'issue') {
      await issueRequest.mutateAsync({
        requestId: actionRequest.id,
        payload: payload as FireIssuePayload,
      });
      toast.success('Item issued');
    } else if (action === 'consume') {
      await consumeRequest.mutateAsync({
        requestId: actionRequest.id,
        payload: payload as FireRequestActionPayload,
      });
      toast.success('Item consumed');
    } else {
      await returnRequest.mutateAsync({
        requestId: actionRequest.id,
        payload: payload as FireRequestActionPayload,
      });
      toast.success('Unused item returned');
    }
    setActionDialogOpen(false);
  };

  return (
    <div className="space-y-6 p-6">
      <DashboardHeader title="Store / Fire" description="Fire department store stock and issue control">
        <Button
          variant="outline"
          size="sm"
          onClick={refresh}
          disabled={itemsQuery.isFetching || requestsQuery.isFetching || categoriesQuery.isFetching}
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCategoryDialogOpen(true)}
          disabled={!canManageFire}
        >
          <Plus className="h-4 w-4" />
          Category
        </Button>
        <Button size="sm" onClick={openCreateItem} disabled={!canManageFire}>
          <PackagePlus className="h-4 w-4" />
          New Fire Item
        </Button>
      </DashboardHeader>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <SummaryCard title="Fire Items" value={items.length} icon={Flame} />
        <SummaryCard
          title="Critical"
          value={items.filter((item) => item.is_critical).length}
          icon={AlertTriangle}
        />
        <SummaryCard
          title="Low Stock"
          value={items.filter((item) => item.is_low_stock).length}
          icon={Package}
          onClick={() => setFilters((current) => ({ ...current, low_stock: true }))}
        />
        <SummaryCard
          title="Below Minimum"
          value={items.filter((item) => item.is_below_minimum).length}
          icon={AlertTriangle}
        />
        <SummaryCard title="Open Requests" value={pendingRequests} icon={ClipboardList} />
      </div>

      <Tabs defaultValue="items" className="space-y-4">
        <TabsList>
          <TabsTrigger value="items">Fire Master</TabsTrigger>
          <TabsTrigger value="requests">Requests</TabsTrigger>
        </TabsList>

        <TabsContent value="items" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Fire Item Filters</CardTitle>
              <CardDescription>Search by part number, SAP item, name, or bin location</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                <div className="space-y-2 xl:col-span-2">
                  <Label htmlFor="fire_search">Search</Label>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="fire_search"
                      value={filters.search ?? ''}
                      onChange={(event) =>
                        setFilters((current) => ({ ...current, search: event.target.value }))
                      }
                      className="pl-9"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fire_filter_category">Category</Label>
                  <NativeSelect
                    id="fire_filter_category"
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
                    {categories.map((category) => (
                      <SelectOption key={category.id} value={String(category.id)}>
                        {category.name}
                      </SelectOption>
                    ))}
                  </NativeSelect>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fire_filter_critical">Critical</Label>
                  <NativeSelect
                    id="fire_filter_critical"
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
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Item</th>
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
                {itemsQuery.isLoading ? (
                  <tr>
                    <td colSpan={9} className="h-28 px-4 py-3 text-center text-muted-foreground">
                      Loading fire items...
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="h-28 px-4 py-3 text-center text-muted-foreground">
                      <SlidersHorizontal className="mx-auto mb-2 h-5 w-5" />
                      No fire items found.
                    </td>
                  </tr>
                ) : (
                  items.map((item) => (
                    <tr key={item.id} className="border-b last:border-b-0 hover:bg-muted/40">
                      <td className="px-4 py-3">
                        <div className="font-semibold">{item.part_number}</div>
                        <div className="text-xs text-muted-foreground">{item.name}</div>
                        {item.sap_item_code && (
                          <div className="text-xs text-muted-foreground">SAP {item.sap_item_code}</div>
                        )}
                      </td>
                      <td className="px-4 py-3">{item.category_name}</td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {formatQty(item.current_stock)} {item.uom}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {formatQty(item.reorder_level)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {formatQty(item.minimum_stock)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {formatMoney(item.unit_cost)}
                      </td>
                      <td className="px-4 py-3">{item.storage_location || '-'}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {item.is_critical && (
                            <Badge variant="outline" className="border-rose-200 bg-rose-50 text-rose-700">
                              Critical
                            </Badge>
                          )}
                          {item.is_low_stock && (
                            <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">
                              Low
                            </Badge>
                          )}
                          {item.is_below_minimum && (
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
                            onClick={() => openAdjustItem(item)}
                            disabled={!canManageFire}
                          >
                            <SlidersHorizontal className="h-4 w-4" />
                            Adjust
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditItem(item)}
                            disabled={!canManageFire}
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
              <CardDescription>Track fire item requests raised from maintenance work orders</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <div className="space-y-2 xl:col-span-2">
                  <Label htmlFor="fire_request_search">Search</Label>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="fire_request_search"
                      value={requestSearch}
                      onChange={(event) => setRequestSearch(event.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fire_request_status">Status</Label>
                  <NativeSelect
                    id="fire_request_status"
                    value={requestStatus}
                    onChange={(event) =>
                      setRequestStatus(event.target.value as FireRequestStatus | 'ALL')
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
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Item</th>
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
                      Loading fire requests...
                    </td>
                  </tr>
                ) : requests.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="h-28 px-4 py-3 text-center text-muted-foreground">
                      <SlidersHorizontal className="mx-auto mb-2 h-5 w-5" />
                      No fire requests found.
                    </td>
                  </tr>
                ) : (
                  requests.map((request) => {
                    const canIssue =
                      canManageFire &&
                      request.status !== 'CLOSED' &&
                      request.status !== 'CANCELLED' &&
                      decimalNumber(request.pending_issue_qty) > 0;
                    const canUseIssued =
                      canManageFire && decimalNumber(request.available_to_consume_qty) > 0;
                    return (
                      <tr key={request.id} className="border-b last:border-b-0 hover:bg-muted/40">
                        <td className="px-4 py-3">
                          <div className="font-semibold">{request.work_order_no}</div>
                          <div className="max-w-[260px] truncate text-xs text-muted-foreground">
                            {request.asset_code} - {request.work_order_title}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div>{request.fire_item_part_number}</div>
                          <div className="text-xs text-muted-foreground">{request.fire_item_name}</div>
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
                          <FireRequestStatusBadge
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

      {itemDialogOpen && (
        <FireItemFormDialog
          open={itemDialogOpen}
          onOpenChange={setItemDialogOpen}
          item={editingItem}
          categories={categories}
          assets={assetsQuery.data ?? []}
          isSubmitting={createItem.isPending || updateItem.isPending}
          onSubmit={handleItemSubmit}
        />
      )}
      {adjustDialogOpen && (
        <FireAdjustDialog
          open={adjustDialogOpen}
          onOpenChange={setAdjustDialogOpen}
          item={adjustItem}
          isSubmitting={adjustStock.isPending}
          onSubmit={handleAdjustSubmit}
        />
      )}
      {categoryDialogOpen && (
        <FireCategoryDialog
          open={categoryDialogOpen}
          onOpenChange={setCategoryDialogOpen}
          isSubmitting={createCategory.isPending}
          onSubmit={handleCategorySubmit}
        />
      )}
      {actionDialogOpen && (
        <FireActionDialog
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
