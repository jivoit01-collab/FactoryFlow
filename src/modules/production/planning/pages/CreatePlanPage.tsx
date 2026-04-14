import { zodResolver } from '@hookform/resolvers/zod';
import { AlertTriangle, ArrowLeft, Loader2, Plus, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';

import type { ApiError } from '@/core/api/types';
import { SearchableSelect } from '@/shared/components/SearchableSelect';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Separator, Textarea } from '@/shared/components/ui';
import { useDebounce, useScrollToError } from '@/shared/hooks';
import { cn } from '@/shared/utils';

import { useBOMDropdown, useCreatePlan, useItemsDropdown, usePlanDetail, useUpdatePlan, useWarehousesDropdown } from '../api';
import type { CreatePlanFormData } from '../schemas';
import { createPlanSchema } from '../schemas';
import type { BOMComponent, ItemDropdown, UpdatePlanRequest, WarehouseDropdown } from '../types';

export default function CreatePlanPage() {
  const navigate = useNavigate();
  const { planId: planIdParam } = useParams<{ planId: string }>();
  const isEditMode = !!planIdParam;
  const planId = planIdParam ? Number(planIdParam) : 0;

  const [apiError, setApiError] = useState<string | null>(null);
  const [bomStockInfo, setBomStockInfo] = useState<Map<string, BOMComponent>>(new Map());
  const bomPopulatedRef = useRef(false);
  const editPopulatedRef = useRef(false);

  const createPlan = useCreatePlan();
  const updatePlan = useUpdatePlan(planId);
  const mutation = isEditMode ? updatePlan : createPlan;

  // Load existing plan data in edit mode
  const { data: existingPlan, isLoading: planLoading } = usePlanDetail(isEditMode ? planId : null);

  // Dropdown queries
  const { data: finishedItems = [], isLoading: itemsLoading, isError: itemsError } = useItemsDropdown('finished');
  const { data: rawItems = [], isLoading: rawItemsLoading, isError: rawItemsError } = useItemsDropdown('raw');
  const { data: warehouses = [], isLoading: warehousesLoading, isError: warehousesError } = useWarehousesDropdown();

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<CreatePlanFormData>({
    resolver: zodResolver(createPlanSchema),
    defaultValues: {
      item_code: '',
      item_name: '',
      uom: '',
      warehouse_code: '',
      planned_qty: undefined,
      target_start_date: '',
      due_date: '',
      branch_id: null,
      remarks: '',
      materials: [],
    },
  });

  useScrollToError(errors);

  const { fields, append, remove, replace } = useFieldArray({
    control,
    name: 'materials',
  });

  // Populate form when existing plan loads (edit mode)
  useEffect(() => {
    if (!isEditMode || !existingPlan || editPopulatedRef.current) return;
    editPopulatedRef.current = true;

    reset({
      item_code: existingPlan.item_code,
      item_name: existingPlan.item_name,
      uom: existingPlan.uom,
      warehouse_code: existingPlan.warehouse_code || '',
      planned_qty: Number(existingPlan.planned_qty),
      target_start_date: existingPlan.target_start_date,
      due_date: existingPlan.due_date,
      branch_id: existingPlan.branch_id ?? null,
      remarks: existingPlan.remarks || '',
      materials: existingPlan.materials.map((m) => ({
        component_code: m.component_code,
        component_name: m.component_name,
        required_qty: Number(m.required_qty),
        uom: m.uom || '',
        warehouse_code: m.warehouse_code || '',
      })),
    });
    bomPopulatedRef.current = true;
  }, [isEditMode, existingPlan, reset]);

  const selectedItemCode = watch('item_code');
  const plannedQty = watch('planned_qty');
  const debouncedQty = useDebounce(plannedQty, 500);

  // BOM auto-detect query — skip in edit mode (plan already has materials)
  const {
    data: bomData,
    isLoading: bomLoading,
    isFetching: bomFetching,
  } = useBOMDropdown(
    !isEditMode ? selectedItemCode : '',
    debouncedQty && debouncedQty > 0 ? debouncedQty : undefined,
  );

  // Auto-populate materials when BOM data arrives (create mode only)
  useEffect(() => {
    if (isEditMode) return;
    if (!bomData || !bomData.bom_found || bomData.components.length === 0) {
      return;
    }

    const stockMap = new Map<string, BOMComponent>();
    bomData.components.forEach((comp) => stockMap.set(comp.component_code, comp));
    setBomStockInfo(stockMap);

    const newMaterials = bomData.components.map((comp) => ({
      component_code: comp.component_code,
      component_name: comp.component_name,
      required_qty: comp.required_qty,
      uom: comp.uom,
      warehouse_code: '',
    }));
    replace(newMaterials);
    bomPopulatedRef.current = true;
  }, [bomData, replace, isEditMode]);

  const handleItemSelect = useCallback(
    (item: ItemDropdown) => {
      setValue('item_code', item.item_code, { shouldValidate: true });
      setValue('item_name', item.item_name, { shouldValidate: true });
      setValue('uom', item.uom);
      bomPopulatedRef.current = false;
      setBomStockInfo(new Map());
    },
    [setValue],
  );

  const handleItemClear = useCallback(() => {
    setValue('item_code', '');
    setValue('item_name', '');
    setValue('uom', '');
    replace([]);
    setBomStockInfo(new Map());
    bomPopulatedRef.current = false;
  }, [setValue, replace]);

  const handleWarehouseSelect = useCallback(
    (wh: WarehouseDropdown) => {
      setValue('warehouse_code', wh.warehouse_code, { shouldValidate: true });
    },
    [setValue],
  );

  const handleWarehouseClear = useCallback(() => {
    setValue('warehouse_code', '');
  }, [setValue]);

  const handleMaterialSelect = useCallback(
    (index: number, item: ItemDropdown) => {
      setValue(`materials.${index}.component_code`, item.item_code, { shouldValidate: true });
      setValue(`materials.${index}.component_name`, item.item_name, { shouldValidate: true });
      setValue(`materials.${index}.uom`, item.uom);
    },
    [setValue],
  );

  const handleMaterialClear = useCallback(
    (index: number) => {
      setValue(`materials.${index}.component_code`, '');
      setValue(`materials.${index}.component_name`, '');
      setValue(`materials.${index}.uom`, '');
    },
    [setValue],
  );

  const onSubmit = async (data: CreatePlanFormData) => {
    setApiError(null);
    try {
      if (isEditMode) {
        const updateData: UpdatePlanRequest = {
          item_code: data.item_code,
          item_name: data.item_name,
          uom: data.uom,
          warehouse_code: data.warehouse_code,
          planned_qty: data.planned_qty,
          target_start_date: data.target_start_date,
          due_date: data.due_date,
          branch_id: data.branch_id,
          remarks: data.remarks,
        };
        await updatePlan.mutateAsync(updateData);
        navigate(`/production/planning/${planId}`);
      } else {
        const result = await createPlan.mutateAsync(data);
        navigate(`/production/planning/${result.id}`);
      }
    } catch (error) {
      const err = error as ApiError;
      setApiError(err.message || `Failed to ${isEditMode ? 'update' : 'create'} production plan`);
    }
  };

  const hasAnyShortage = bomData?.has_shortage ?? false;
  const bomNotFound = !isEditMode && selectedItemCode && bomData && !bomData.bom_found;
  const backPath = isEditMode ? `/production/planning/${planId}` : '/production/planning';

  // Show loading while fetching existing plan in edit mode
  if (isEditMode && planLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Guard: only DRAFT plans can be edited
  if (isEditMode && existingPlan && existingPlan.status !== 'DRAFT') {
    return (
      <div className="flex h-[50vh] flex-col items-center justify-center gap-4">
        <AlertTriangle className="h-10 w-10 text-amber-500" />
        <p className="text-lg font-medium">This plan cannot be edited</p>
        <p className="text-sm text-muted-foreground">Only plans in DRAFT status can be edited.</p>
        <Button variant="outline" onClick={() => navigate(backPath)}>
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" aria-label="Go back" onClick={() => navigate(backPath)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">
            {isEditMode ? 'Edit Production Plan' : 'Create Production Plan'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isEditMode
              ? `Editing plan #${planId} — ${existingPlan?.item_code}`
              : 'Create a new plan for a finished good item'}
          </p>
        </div>
      </div>

      {apiError && (
        <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">{apiError}</div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Item Details Card */}
        <Card>
          <CardHeader>
            <CardTitle>Item Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Item Search */}
              <div className="md:col-span-2">
                <Controller
                  name="item_code"
                  control={control}
                  render={({ field }) => (
                    <SearchableSelect<ItemDropdown>
                      value={field.value}
                      items={finishedItems}
                      isLoading={itemsLoading}
                      isError={itemsError}
                      label="Finished Good Item"
                      required
                      inputId="item_code"
                      placeholder="Search by item code or name..."
                      disabled={isEditMode}
                      defaultDisplayText={
                        isEditMode && existingPlan
                          ? `${existingPlan.item_code} - ${existingPlan.item_name}`
                          : undefined
                      }
                      getItemKey={(item) => item.item_code}
                      getItemLabel={(item) => `${item.item_code} - ${item.item_name}`}
                      filterFn={(item, search) => {
                        const s = search.toLowerCase();
                        return (
                          item.item_code.toLowerCase().includes(s) ||
                          item.item_name.toLowerCase().includes(s)
                        );
                      }}
                      renderItem={(item) => (
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">{item.item_code}</span>
                          <span className="text-xs text-muted-foreground">{item.item_name}</span>
                        </div>
                      )}
                      onItemSelect={handleItemSelect}
                      onClear={handleItemClear}
                      loadingText="Loading items..."
                      emptyText="No finished goods found"
                      notFoundText="No matching items"
                      error={errors.item_code?.message}
                    />
                  )}
                />
              </div>

              {/* UoM (auto-filled, read-only) */}
              <div className="space-y-2">
                <Label htmlFor="uom">Unit of Measure</Label>
                <Input
                  id="uom"
                  {...register('uom')}
                  disabled
                  placeholder="Auto-filled from item"
                  className="bg-muted"
                />
              </div>

              {/* Warehouse */}
              <div>
                <Controller
                  name="warehouse_code"
                  control={control}
                  render={({ field }) => (
                    <SearchableSelect<WarehouseDropdown>
                      value={field.value}
                      items={warehouses}
                      isLoading={warehousesLoading}
                      isError={warehousesError}
                      label="Warehouse"
                      inputId="warehouse_code"
                      placeholder="Select warehouse..."
                      defaultDisplayText={
                        isEditMode && existingPlan?.warehouse_code
                          ? existingPlan.warehouse_code
                          : undefined
                      }
                      getItemKey={(wh) => wh.warehouse_code}
                      getItemLabel={(wh) => `${wh.warehouse_code} - ${wh.warehouse_name}`}
                      filterFn={(wh, search) => {
                        const s = search.toLowerCase();
                        return (
                          wh.warehouse_code.toLowerCase().includes(s) ||
                          wh.warehouse_name.toLowerCase().includes(s)
                        );
                      }}
                      onItemSelect={handleWarehouseSelect}
                      onClear={handleWarehouseClear}
                      loadingText="Loading warehouses..."
                      emptyText="No warehouses found"
                      notFoundText="No matching warehouses"
                      error={errors.warehouse_code?.message}
                    />
                  )}
                />
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Planned Quantity */}
              <div className="space-y-2">
                <Label htmlFor="planned_qty">
                  Planned Quantity <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="planned_qty"
                  type="number"
                  step="any"
                  min="0"
                  placeholder="Enter quantity"
                  {...register('planned_qty', { valueAsNumber: true })}
                  disabled={mutation.isPending}
                  className={errors.planned_qty ? 'border-destructive' : ''}
                />
                {errors.planned_qty && (
                  <p className="text-sm text-destructive">{errors.planned_qty.message}</p>
                )}
              </div>

              {/* Start Date */}
              <div className="space-y-2">
                <Label htmlFor="target_start_date">
                  Start Date <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="target_start_date"
                  type="date"
                  {...register('target_start_date')}
                  disabled={mutation.isPending}
                  className={errors.target_start_date ? 'border-destructive' : ''}
                />
                {errors.target_start_date && (
                  <p className="text-sm text-destructive">{errors.target_start_date.message}</p>
                )}
              </div>

              {/* Due Date */}
              <div className="space-y-2">
                <Label htmlFor="due_date">
                  Due Date <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="due_date"
                  type="date"
                  {...register('due_date')}
                  disabled={mutation.isPending}
                  className={errors.due_date ? 'border-destructive' : ''}
                />
                {errors.due_date && (
                  <p className="text-sm text-destructive">{errors.due_date.message}</p>
                )}
              </div>
            </div>

            {/* Remarks */}
            <div className="space-y-2">
              <Label htmlFor="remarks">Remarks</Label>
              <Textarea
                id="remarks"
                placeholder="Optional notes about this plan..."
                {...register('remarks')}
                disabled={mutation.isPending}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Materials (BOM) Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="flex items-center gap-2">
                Bill of Materials
                {bomFetching && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {isEditMode
                  ? 'Materials from this plan. Manage materials from the detail page after saving.'
                  : selectedItemCode
                    ? 'Auto-populated from SAP BOM. You can adjust quantities or add more materials.'
                    : 'Select a finished good item to auto-detect BOM from SAP.'}
              </p>
            </div>
            {!isEditMode && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!selectedItemCode || mutation.isPending}
                onClick={() =>
                  append({
                    component_code: '',
                    component_name: '',
                    required_qty: 0,
                    uom: '',
                    warehouse_code: '',
                  })
                }
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Material
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {/* BOM not found warning */}
            {bomNotFound && (
              <div className="rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-amber-800 dark:text-amber-300">
                  No production BOM found for this item in SAP. You can add materials manually.
                </p>
              </div>
            )}

            {/* Shortage warning banner */}
            {hasAnyShortage && (
              <div className="rounded-md bg-destructive/10 border border-destructive/30 p-3 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                <p className="text-sm text-destructive">
                  Some materials have insufficient stock. Review highlighted rows before posting to SAP.
                </p>
              </div>
            )}

            {fields.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                {bomLoading
                  ? 'Loading BOM from SAP...'
                  : selectedItemCode
                    ? 'No materials added yet. Click "Add Material" to add raw materials.'
                    : 'Select a finished good item first to add materials.'}
              </p>
            ) : (
              <div className="space-y-4">
                {fields.map((field, index) => {
                  const stockInfo = bomStockInfo.get(watch(`materials.${index}.component_code`));
                  const hasShortage = stockInfo?.has_shortage ?? false;

                  return (
                    <div
                      key={field.id}
                      className={cn(
                        'rounded-lg border p-4 space-y-3',
                        hasShortage && 'border-destructive/50 bg-destructive/5',
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-muted-foreground">
                            Material #{index + 1}
                          </span>
                          {hasShortage && (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-destructive">
                              <AlertTriangle className="h-3 w-3" />
                              Shortage
                            </span>
                          )}
                        </div>
                        {!isEditMode && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label="Delete plan line"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => remove(index)}
                            disabled={mutation.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {/* Raw material search */}
                        <div className="md:col-span-2">
                          <Controller
                            name={`materials.${index}.component_code`}
                            control={control}
                            render={({ field: controllerField }) => (
                              <SearchableSelect<ItemDropdown>
                                value={controllerField.value}
                                items={rawItems}
                                isLoading={rawItemsLoading}
                                isError={rawItemsError}
                                label="Raw Material"
                                required
                                disabled={isEditMode}
                                inputId={`material_${index}_code`}
                                placeholder="Search raw material..."
                                defaultDisplayText={
                                  watch(`materials.${index}.component_code`)
                                    ? `${watch(`materials.${index}.component_code`)} - ${watch(`materials.${index}.component_name`)}`
                                    : undefined
                                }
                                getItemKey={(item) => item.item_code}
                                getItemLabel={(item) => `${item.item_code} - ${item.item_name}`}
                                filterFn={(item, search) => {
                                  const s = search.toLowerCase();
                                  return (
                                    item.item_code.toLowerCase().includes(s) ||
                                    item.item_name.toLowerCase().includes(s)
                                  );
                                }}
                                renderItem={(item) => (
                                  <div className="flex flex-col">
                                    <span className="text-sm font-medium">{item.item_code}</span>
                                    <span className="text-xs text-muted-foreground">
                                      {item.item_name}
                                    </span>
                                  </div>
                                )}
                                onItemSelect={(item) => handleMaterialSelect(index, item)}
                                onClear={() => handleMaterialClear(index)}
                                loadingText="Loading materials..."
                                emptyText="No raw materials found"
                                notFoundText="No matching materials"
                                error={errors.materials?.[index]?.component_code?.message}
                              />
                            )}
                          />
                        </div>

                        {/* Required Qty */}
                        <div className="space-y-2">
                          <Label htmlFor={`material_${index}_qty`}>
                            Required Quantity <span className="text-destructive">*</span>
                          </Label>
                          <Input
                            id={`material_${index}_qty`}
                            type="number"
                            step="any"
                            min="0"
                            placeholder="Quantity"
                            {...register(`materials.${index}.required_qty`, { valueAsNumber: true })}
                            disabled={isEditMode || mutation.isPending}
                            className={
                              errors.materials?.[index]?.required_qty ? 'border-destructive' : ''
                            }
                          />
                          {errors.materials?.[index]?.required_qty && (
                            <p className="text-sm text-destructive">
                              {errors.materials[index].required_qty.message}
                            </p>
                          )}
                        </div>

                        {/* UoM (auto-filled) */}
                        <div className="space-y-2">
                          <Label>UoM</Label>
                          <Input
                            {...register(`materials.${index}.uom`)}
                            disabled
                            placeholder="Auto-filled"
                            className="bg-muted"
                          />
                        </div>
                      </div>

                      {/* Stock info from BOM */}
                      {stockInfo && (
                        <div className="flex items-center gap-4 text-xs pt-1 border-t">
                          <span className="text-muted-foreground">
                            Qty/unit: <span className="font-medium text-foreground">{stockInfo.qty_per_unit}</span>
                          </span>
                          <span className="text-muted-foreground">
                            Available stock: <span className="font-medium text-foreground">{stockInfo.available_stock.toLocaleString()}</span>
                          </span>
                          {hasShortage && (
                            <span className="text-destructive font-medium">
                              Shortage: {stockInfo.shortage_qty.toLocaleString()}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Form Actions */}
        <div className="flex items-center justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(backPath)}
            disabled={mutation.isPending}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {mutation.isPending
              ? isEditMode ? 'Saving...' : 'Creating...'
              : isEditMode ? 'Save Changes' : 'Create Plan'}
          </Button>
        </div>
      </form>
    </div>
  );
}
