import {
  AlertCircle,
  ArrowLeft,
  Edit,
  FlaskConical,
  Loader2,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { QC_PERMISSIONS } from '@/config/permissions';
import type { ApiError } from '@/core/api/types';
import { usePermission } from '@/core/auth';
import { confirmDialog } from '@/shared/components';
import { SearchableSelect } from '@/shared/components/SearchableSelect';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
} from '@/shared/components/ui';
import { useScrollToError } from '@/shared/hooks';

import {
  useCreateMaterialType,
  useDeleteMaterialType,
  useMaterialTypes,
  useSAPItems,
  useUpdateMaterialType,
} from '../../api/materialType/materialType.queries';
import type { CreateMaterialTypeRequest, MaterialType, SAPItemMasterOption } from '../../types';

const getSAPItemLabel = (item: SAPItemMasterOption) =>
  item.item_name ? `${item.item_code} - ${item.item_name}` : item.item_code;

const getLinkedSAPItemLabel = (item: { item_code: string; item_name?: string }) =>
  item.item_name ? `${item.item_code} - ${item.item_name}` : item.item_code;

const getMaterialTypeLabel = (type: MaterialType) => `${type.code} - ${type.name}`;

const emptyMaterialTypeForm: CreateMaterialTypeRequest = {
  code: '',
  name: '',
  description: '',
  sap_items: [],
};

export default function MaterialTypesPage() {
  const navigate = useNavigate();
  const { hasAnyPermission } = usePermission();
  const canCopyQCParameters = hasAnyPermission([QC_PERMISSIONS.MASTER_DATA.MANAGE_QC_PARAMETERS]);
  const [materialTypeSearch, setMaterialTypeSearch] = useState('');
  const [debouncedMaterialTypeSearch, setDebouncedMaterialTypeSearch] = useState('');
  const normalizedMaterialTypeSearch = materialTypeSearch.trim();
  const materialTypeSearchTerm = debouncedMaterialTypeSearch.trim();
  const {
    data: materialTypes = [],
    isFetching: isMaterialTypesFetching,
    isLoading,
    error,
  } = useMaterialTypes(materialTypeSearchTerm ? { search: materialTypeSearchTerm } : undefined);
  const {
    data: copySourceMaterialTypes = [],
    isLoading: isCopySourceMaterialTypesLoading,
    isError: isCopySourceMaterialTypesError,
  } = useMaterialTypes();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState<MaterialType | null>(null);
  const [formData, setFormData] = useState<CreateMaterialTypeRequest>(emptyMaterialTypeForm);
  const [apiErrors, setApiErrors] = useState<Record<string, string>>({});
  const [sapItemSearch, setSapItemSearch] = useState('');
  const [createCopySourceMaterialTypeId, setCreateCopySourceMaterialTypeId] = useState('');
  const {
    data: sapItemOptions = [],
    isLoading: isSAPItemsLoading,
    isError: isSAPItemsError,
  } = useSAPItems(sapItemSearch);

  // Scroll to first error when errors occur
  useScrollToError(apiErrors);

  const createMaterialType = useCreateMaterialType();
  const updateMaterialType = useUpdateMaterialType();
  const deleteMaterialType = useDeleteMaterialType();

  useEffect(() => {
    const debounceTimer = window.setTimeout(() => {
      setDebouncedMaterialTypeSearch(normalizedMaterialTypeSearch);
    }, 350);

    return () => window.clearTimeout(debounceTimer);
  }, [normalizedMaterialTypeSearch]);

  const handleOpenDialog = (type?: MaterialType) => {
    setSapItemSearch('');
    if (type) {
      setEditingType(type);
      setFormData({
        code: type.code,
        name: type.name,
        description: type.description || '',
        sap_items: (type.sap_items || []).map((item) => ({
          item_code: item.item_code,
          item_name: item.item_name || '',
        })),
      });
    } else {
      setEditingType(null);
      setFormData(emptyMaterialTypeForm);
    }
    setCreateCopySourceMaterialTypeId('');
    setApiErrors({});
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingType(null);
    setFormData(emptyMaterialTypeForm);
    setSapItemSearch('');
    setCreateCopySourceMaterialTypeId('');
    setApiErrors({});
  };

  const clearSapItemError = () => {
    if (apiErrors.sap_items) {
      setApiErrors((prev) => {
        const next = { ...prev };
        delete next.sap_items;
        return next;
      });
    }
  };

  const clearCopySourceError = () => {
    if (apiErrors.copy_parameters_from_material_type_id) {
      setApiErrors((prev) => {
        const next = { ...prev };
        delete next.copy_parameters_from_material_type_id;
        return next;
      });
    }
  };

  const handleSapItemSelect = (index: number, item: SAPItemMasterOption) => {
    setFormData((prev) => {
      const sapItems = [...(prev.sap_items || [])];
      sapItems[index] = {
        ...sapItems[index],
        item_code: item.item_code.trim().toUpperCase(),
        item_name: item.item_name.trim(),
      };
      return { ...prev, sap_items: sapItems };
    });
    clearSapItemError();
  };

  const handleSapItemClear = (index: number) => {
    setFormData((prev) => {
      const sapItems = [...(prev.sap_items || [])];
      sapItems[index] = { item_code: '', item_name: '' };
      return { ...prev, sap_items: sapItems };
    });
    clearSapItemError();
  };

  const handleAddSapItem = () => {
    setFormData((prev) => ({
      ...prev,
      sap_items: [...(prev.sap_items || []), { item_code: '', item_name: '' }],
    }));
  };

  const handleRemoveSapItem = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      sap_items: (prev.sap_items || []).filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const handleSave = async () => {
    const errors: Record<string, string> = {};
    if (!formData.code.trim()) {
      errors.code = 'Code is required';
    } else if (!/^[A-Z0-9_]+$/.test(formData.code)) {
      errors.code = 'Code must be uppercase letters, numbers, and underscores only';
    }
    if (!formData.name.trim()) {
      errors.name = 'Name is required';
    }
    const sapItems = (formData.sap_items || [])
      .map((item) => ({
        item_code: item.item_code.trim().toUpperCase(),
        item_name: item.item_name?.trim() || '',
      }))
      .filter((item) => item.item_code || item.item_name);
    if (sapItems.some((item) => !item.item_code)) {
      errors.sap_items = 'SAP item code is required for every linked item';
    }
    const duplicateSapItem = sapItems.find(
      (item, index) =>
        sapItems.findIndex((candidate) => candidate.item_code === item.item_code) !== index,
    );
    if (duplicateSapItem) {
      errors.sap_items = `SAP item ${duplicateSapItem.item_code} is duplicated`;
    }
    if (Object.keys(errors).length > 0) {
      setApiErrors(errors);
      return;
    }

    try {
      setApiErrors({});
      const payload: CreateMaterialTypeRequest = {
        ...formData,
        sap_items: sapItems,
      };
      if (!editingType && createCopySourceMaterialTypeId) {
        payload.copy_parameters_from_material_type_id = Number(createCopySourceMaterialTypeId);
      }
      if (editingType) {
        await updateMaterialType.mutateAsync({ id: editingType.id, data: payload });
      } else {
        await createMaterialType.mutateAsync(payload);
      }
      handleCloseDialog();
    } catch (error) {
      const apiError = error as ApiError;
      if (apiError.errors) {
        const fieldErrors: Record<string, string> = {};
        Object.entries(apiError.errors).forEach(([field, messages]) => {
          fieldErrors[field] = messages[0];
        });
        setApiErrors(fieldErrors);
      } else {
        setApiErrors({ general: apiError.message || 'Failed to save material type' });
      }
    }
  };

  const handleDelete = async (id: number) => {
    const confirmed = await confirmDialog({
      title: 'Delete this material type?',
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!confirmed) return;

    try {
      await deleteMaterialType.mutateAsync(id);
    } catch (error) {
      const apiError = error as ApiError;
      if (apiError.errors) {
        const fieldErrors: Record<string, string> = {};
        Object.entries(apiError.errors).forEach(([field, messages]) => {
          fieldErrors[field] = messages[0];
        });
        setApiErrors(fieldErrors);
      } else {
        setApiErrors({ general: apiError.message || 'Failed to delete material type' });
      }
    }
  };

  const isSaving = createMaterialType.isPending || updateMaterialType.isPending;
  const isSearchDebouncing = normalizedMaterialTypeSearch !== materialTypeSearchTerm;
  const isInitialLoading = isLoading && materialTypes.length === 0;
  const isSearchUpdating = !isInitialLoading && (isSearchDebouncing || isMaterialTypesFetching);

  return (
    <div className="space-y-6 pb-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate('/qc')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h2 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              <FlaskConical className="h-8 w-8" />
              Material Types
            </h2>
          </div>
          <p className="text-muted-foreground">
            Manage material type definitions for QC inspections
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="h-4 w-4 mr-2" />
          Add Material Type
        </Button>
      </div>

      {/* Error State */}
      {error && (
        <div className="rounded-md bg-destructive/15 p-4 text-sm text-destructive flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          Failed to load material types. Please try again.
        </div>
      )}

      {/* API Error */}
      {apiErrors.general && !isDialogOpen && (
        <div className="rounded-md bg-destructive/15 p-4 text-sm text-destructive flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          {apiErrors.general}
        </div>
      )}

      {/* Material Types Table */}
      {!error && (
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <CardTitle>Material Types ({materialTypes.length})</CardTitle>
              <div className="relative w-full lg:max-w-md">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  inputMode="search"
                  value={materialTypeSearch}
                  onChange={(event) => setMaterialTypeSearch(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Escape' && materialTypeSearch) {
                      setMaterialTypeSearch('');
                    }
                  }}
                  placeholder="Search code, name, or SAP item..."
                  aria-label="Search material types"
                  className="pl-9 pr-16"
                />
                {isSearchUpdating && (
                  <span className="pointer-events-none absolute right-10 top-0 flex h-full items-center">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </span>
                )}
                {materialTypeSearch && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setMaterialTypeSearch('')}
                    className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2 p-0"
                    aria-label="Clear material type search"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
                <span className="sr-only" aria-live="polite">
                  {isSearchUpdating ? 'Updating material type results' : ''}
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isInitialLoading ? (
              <div className="overflow-x-auto">
                <table className="w-full table-fixed text-sm">
                  <colgroup>
                    <col className="w-[26%]" />
                    <col className="w-[24%]" />
                    <col className="w-[16%]" />
                    <col className="w-[24%]" />
                    <col className="w-[10%]" />
                  </colgroup>
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-3 font-medium">Code</th>
                      <th className="text-left p-3 font-medium">Name</th>
                      <th className="text-left p-3 font-medium">SAP Items</th>
                      <th className="text-left p-3 font-medium">Description</th>
                      <th className="text-center p-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: 6 }).map((_, index) => (
                      <tr key={index} className="border-b">
                        <td className="p-3">
                          <div className="h-4 w-40 animate-pulse rounded bg-muted" />
                        </td>
                        <td className="p-3">
                          <div className="h-4 w-56 animate-pulse rounded bg-muted" />
                        </td>
                        <td className="p-3">
                          <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                        </td>
                        <td className="p-3">
                          <div className="h-4 w-48 animate-pulse rounded bg-muted" />
                        </td>
                        <td className="p-3">
                          <div className="mx-auto h-8 w-12 animate-pulse rounded bg-muted" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : materialTypes.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                {materialTypeSearchTerm
                  ? 'No material types match your search.'
                  : 'No material types found. Click "Add Material Type" to create one.'}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full table-fixed text-sm">
                  <colgroup>
                    <col className="w-[26%]" />
                    <col className="w-[24%]" />
                    <col className="w-[16%]" />
                    <col className="w-[24%]" />
                    <col className="w-[10%]" />
                  </colgroup>
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-3 font-medium">Code</th>
                      <th className="text-left p-3 font-medium">Name</th>
                      <th className="text-left p-3 font-medium">SAP Items</th>
                      <th className="text-left p-3 font-medium">Description</th>
                      <th className="text-center p-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {materialTypes.map((type) => (
                      <tr key={type.id} className="border-b hover:bg-muted/50">
                        <td className="p-3 font-medium">
                          <div className="truncate" title={type.code}>
                            {type.code}
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="truncate" title={type.name}>
                            {type.name}
                          </div>
                        </td>
                        <td className="p-3">
                          {type.sap_items?.length ? (
                            <div className="flex flex-wrap gap-1 overflow-hidden">
                              {type.sap_items.slice(0, 4).map((item) => (
                                <span
                                  key={item.item_code}
                                  className="max-w-full truncate rounded border px-2 py-0.5 text-xs font-medium"
                                  title={item.item_name || item.item_code}
                                >
                                  {item.item_code}
                                </span>
                              ))}
                              {type.sap_items.length > 4 && (
                                <span className="text-xs text-muted-foreground">
                                  +{type.sap_items.length - 4}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="p-3 text-muted-foreground">
                          <div className="truncate" title={type.description || '-'}>
                            {type.description || '-'}
                          </div>
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex justify-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleOpenDialog(type)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDelete(type.id)}
                              disabled={deleteMaterialType.isPending}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Add/Edit Dialog */}
      <Dialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          if (!open) handleCloseDialog();
        }}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingType ? 'Edit Material Type' : 'Add Material Type'}</DialogTitle>
          </DialogHeader>

          {apiErrors.general && (
            <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
              {apiErrors.general}
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>
                Code <span className="text-destructive">*</span>
              </Label>
              <Input
                value={formData.code}
                onChange={(e) => {
                  const val = e.target.value.toUpperCase().replace(/\s+/g, '_');
                  setFormData((prev) => ({ ...prev, code: val }));
                  if (apiErrors.code) {
                    setApiErrors((prev) => {
                      const next = { ...prev };
                      delete next.code;
                      return next;
                    });
                  }
                }}
                placeholder="e.g., CAP_BLUE"
                disabled={isSaving}
                className={
                  apiErrors.code ? 'border-destructive focus-visible:ring-destructive' : ''
                }
              />
              {apiErrors.code && <p className="text-sm text-destructive">{apiErrors.code}</p>}
            </div>

            <div className="space-y-2">
              <Label>
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                value={formData.name}
                onChange={(e) => {
                  const val = e.target.value
                    .split(' ')
                    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
                    .join(' ');
                  setFormData((prev) => ({ ...prev, name: val }));
                  if (apiErrors.name) {
                    setApiErrors((prev) => {
                      const next = { ...prev };
                      delete next.name;
                      return next;
                    });
                  }
                }}
                placeholder="e.g., Cap Blue Plain"
                disabled={isSaving}
                className={
                  apiErrors.name ? 'border-destructive focus-visible:ring-destructive' : ''
                }
              />
              {apiErrors.name && <p className="text-sm text-destructive">{apiErrors.name}</p>}
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                value={formData.description || ''}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Optional description"
                disabled={isSaving}
              />
            </div>

            {!editingType &&
              canCopyQCParameters &&
              (isCopySourceMaterialTypesLoading || copySourceMaterialTypes.length > 0) && (
                <div className="space-y-2 rounded-md border p-3">
                  <SearchableSelect<MaterialType>
                    value={createCopySourceMaterialTypeId || undefined}
                    items={copySourceMaterialTypes}
                    isLoading={isCopySourceMaterialTypesLoading}
                    isError={isCopySourceMaterialTypesError}
                    getItemKey={(type) => type.id}
                    getItemLabel={getMaterialTypeLabel}
                    renderItem={(type) => (
                      <div className="min-w-0">
                        <div className="font-mono text-xs font-medium">{type.code}</div>
                        <div className="truncate text-sm">{type.name}</div>
                      </div>
                    )}
                    filterFn={(type, search) => {
                      const term = search.toLowerCase();
                      return [type.code, type.name, type.description]
                        .filter(Boolean)
                        .some((value) => String(value).toLowerCase().includes(term));
                    }}
                    label="Copy QC Parameters From"
                    placeholder="Do not copy parameters"
                    inputId="qc-copy-parameters-from-material-type"
                    loadingText="Loading material types..."
                    emptyText="No material types available"
                    notFoundText="No matching material type"
                    errorText="Unable to load material types"
                    error={apiErrors.copy_parameters_from_material_type_id}
                    onItemSelect={(type) => {
                      setCreateCopySourceMaterialTypeId(String(type.id));
                      clearCopySourceError();
                    }}
                    onClear={() => {
                      setCreateCopySourceMaterialTypeId('');
                      clearCopySourceError();
                    }}
                    disabled={isSaving}
                  />
                </div>
              )}

            <div className="space-y-3 rounded-md border p-3">
              <div className="flex items-center justify-between gap-3">
                <Label>Linked SAP Items</Label>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleAddSapItem}
                  disabled={isSaving}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Item
                </Button>
              </div>

              {(formData.sap_items || []).length === 0 ? (
                <p className="text-sm text-muted-foreground">No SAP items linked</p>
              ) : (
                <div className="space-y-2">
                  {(formData.sap_items || []).map((item, index) => (
                    <div
                      key={`${item.item_code}-${index}`}
                      className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]"
                    >
                      <SearchableSelect<SAPItemMasterOption>
                        items={sapItemOptions}
                        isLoading={isSAPItemsLoading}
                        isError={isSAPItemsError}
                        getItemKey={(sapItem) => sapItem.item_code}
                        getItemLabel={getSAPItemLabel}
                        renderItem={(sapItem) => (
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 text-xs">
                              <span className="font-mono font-medium">{sapItem.item_code}</span>
                              {sapItem.uom && <Badge variant="secondary">{sapItem.uom}</Badge>}
                            </div>
                            <div className="truncate text-sm">{sapItem.item_name}</div>
                          </div>
                        )}
                        filterFn={(sapItem, search) => {
                          const term = search.toLowerCase();
                          return [sapItem.item_code, sapItem.item_name, sapItem.uom]
                            .filter(Boolean)
                            .some((value) => String(value).toLowerCase().includes(term));
                        }}
                        placeholder="Search and select SAP item..."
                        inputId={`qc-material-type-sap-item-${index}`}
                        loadingText="Loading SAP items..."
                        emptyText="Type at least 2 characters to search SAP items"
                        notFoundText="No matching SAP item"
                        errorText="Unable to load SAP items"
                        value={item.item_code || ''}
                        defaultDisplayText={item.item_code ? getLinkedSAPItemLabel(item) : ''}
                        onItemSelect={(selectedItem) => handleSapItemSelect(index, selectedItem)}
                        onClear={() => handleSapItemClear(index)}
                        onSearchChange={(search) => {
                          const selectedLabel = item.item_code ? getLinkedSAPItemLabel(item) : '';
                          if (search !== selectedLabel) setSapItemSearch(search);
                        }}
                        disabled={isSaving}
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => handleRemoveSapItem(index)}
                        disabled={isSaving}
                        aria-label="Remove SAP item"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              {apiErrors.sap_items && (
                <p className="text-sm text-destructive">{apiErrors.sap_items}</p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving
                ? 'Saving...'
                : !editingType && createCopySourceMaterialTypeId
                  ? 'Save & Copy Parameters'
                  : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
