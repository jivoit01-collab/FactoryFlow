import { AlertCircle, Edit, ListChecks, Loader2, Plus, Search, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

import type { ApiError } from '@/core/api/types';
import { confirmDialog } from '@/shared/components';
import {
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
} from '@/shared/components/ui';
import { useDebounce } from '@/shared/hooks/useDebounce';
import { cn } from '@/shared/utils';

import {
  useCreateProductionParameterType,
  useDeleteProductionParameterType,
  useProductionParameterTypes,
  useUpdateProductionParameterType,
} from '../../api/productionQC/productionQC.queries';
import { ProductionQCTabs } from '../../components/qcSections';
import type { ProductionParameterType } from '../../types/productionQC.types';
import { type Errors, readApiErrors, upperCode, withoutKey } from '../../utils/productionQCMaster';
import { Field } from './MasterField';

/** The report types, and nothing else: each one opens on its own page. */
export default function ProductionParameterTypesPage() {
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const searchTerm = useDebounce(search.trim(), 350);
  const {
    data: types = [],
    isLoading,
    isFetching,
    error,
  } = useProductionParameterTypes(searchTerm ? { search: searchTerm } : undefined);

  const navigate = useNavigate();
  // An address from the earlier layout, ?type=<id>, opens that type's page.
  const legacyTypeId = Number(searchParams.get('type')) || null;

  const createType = useCreateProductionParameterType();
  const updateType = useUpdateProductionParameterType();
  const deleteType = useDeleteProductionParameterType();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState<ProductionParameterType | null>(null);
  const [form, setForm] = useState({
    code: '',
    name: '',
    description: '',
    print_document_id: '',
    revision: '',
    revision_date: '',
  });
  const [errors, setErrors] = useState<Errors>({});
  const [pageError, setPageError] = useState('');

  const openType = (id: number) => navigate(`/qc/qa-reports/types/${id}`);

  const openDialog = (type?: ProductionParameterType) => {
    setEditingType(type ?? null);
    setForm({
      code: type?.code ?? '',
      name: type?.name ?? '',
      description: type?.description ?? '',
      print_document_id: type?.print_document_id ?? '',
      revision: type?.revision ?? '',
      revision_date: type?.revision_date ?? '',
    });
    setErrors({});
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingType(null);
    setErrors({});
  };

  const handleSave = async () => {
    const next: Errors = {};
    if (!form.code.trim()) next.code = 'Code is required';
    if (!form.name.trim()) next.name = 'Name is required';
    if (Object.keys(next).length > 0) {
      setErrors(next);
      return;
    }
    const data = {
      code: form.code.trim(),
      name: form.name.trim(),
      description: form.description.trim(),
      print_document_id: form.print_document_id.trim(),
      revision: form.revision.trim(),
      revision_date: form.revision_date || null,
    };
    try {
      if (editingType) {
        await updateType.mutateAsync({ id: editingType.id, data });
        toast.success(`${data.code} saved`);
      } else {
        const created = await createType.mutateAsync(data);
        toast.success(`${created.code} added — now add its parameters`);
        openType(created.id);
      }
      closeDialog();
    } catch (err) {
      setErrors(readApiErrors(err, 'Failed to save the report type'));
    }
  };

  const handleDelete = async (type: ProductionParameterType) => {
    const confirmed = await confirmDialog({
      title: `Remove ${type.code} - ${type.name}?`,
      description:
        'It is no longer offered for new entries. Entries already saved keep their readings.',
      confirmLabel: 'Remove',
      destructive: true,
    });
    if (!confirmed) return;
    try {
      setPageError('');
      await deleteType.mutateAsync(type.id);
      toast.success(`${type.code} removed`);
    } catch (err) {
      setPageError((err as ApiError)?.message || 'Failed to remove the report type');
    }
  };

  const isSaving = createType.isPending || updateType.isPending;
  const isSearching = !isLoading && (search.trim() !== searchTerm || isFetching);

  if (legacyTypeId) {
    return <Navigate to={`/qc/qa-reports/types/${legacyTypeId}`} replace />;
  }

  return (
    <div className="space-y-6 pb-6">
      <ProductionQCTabs />

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h2 className="flex items-center gap-3 text-3xl font-bold tracking-tight">
            <ListChecks className="h-8 w-8" />
            Report Types
          </h2>
          <p className="text-muted-foreground">
            The reports QC fills, each with the parameters it records
          </p>
        </div>
        <Button onClick={() => openDialog()}>
          <Plus className="mr-2 h-4 w-4" />
          Add Report Type
        </Button>
      </div>

      {(error || pageError) && (
        <div className="flex items-center gap-2 rounded-md bg-destructive/15 p-4 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          {pageError || 'Failed to load report types. Please try again.'}
        </div>
      )}

      {!error && (
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle>Report Types ({types.length})</CardTitle>
              <div className="relative w-full sm:max-w-sm">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  inputMode="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Escape' && search) setSearch('');
                  }}
                  placeholder="Search types"
                  aria-label="Search report types by code or name"
                  className={cn('pl-9', search || isSearching ? 'pr-16' : 'pr-3')}
                />
                {isSearching && (
                  <span className="pointer-events-none absolute right-10 top-0 flex h-full items-center">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </span>
                )}
                {search && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setSearch('')}
                    className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2 p-0"
                    aria-label="Clear search"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              </div>
            ) : types.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                {searchTerm
                  ? 'No report types match your search.'
                  : 'No report types yet. Click "Add Report Type" to create one.'}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="p-3 text-left font-medium">Code</th>
                      <th className="p-3 text-left font-medium">Name</th>
                      <th className="p-3 text-center font-medium">Parameters</th>
                      <th className="p-3 text-center font-medium">Defaults</th>
                      <th className="p-3 text-center font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {types.map((type) => (
                      <tr
                        key={type.id}
                        onClick={() => openType(type.id)}
                        className="cursor-pointer border-b hover:bg-muted/50"
                      >
                        <td className="p-3 font-medium">
                          {/* A real link, so the row opens from the keyboard too. */}
                          <Link
                            to={`/qc/qa-reports/types/${type.id}`}
                            onClick={(event) => event.stopPropagation()}
                            className="hover:underline"
                          >
                            {type.code}
                          </Link>
                        </td>
                        <td className="p-3">{type.name}</td>
                        <td
                          className={cn(
                            'p-3 text-center',
                            type.parameter_count === 0 && 'text-amber-600 dark:text-amber-400',
                          )}
                          title={
                            type.parameter_count === 0
                              ? 'No parameters yet: cannot be filled'
                              : undefined
                          }
                        >
                          {type.parameter_count}
                        </td>
                        <td className="p-3 text-center">{type.default_count}</td>
                        <td className="p-3 text-center">
                          <div className="flex justify-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              aria-label={`Edit ${type.code}`}
                              onClick={(event) => {
                                event.stopPropagation();
                                openDialog(type);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              aria-label={`Remove ${type.code}`}
                              disabled={deleteType.isPending}
                              onClick={(event) => {
                                event.stopPropagation();
                                handleDelete(type);
                              }}
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

      {/* Add / edit type */}
      <Dialog open={dialogOpen} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingType ? 'Edit Report Type' : 'Add Report Type'}</DialogTitle>
          </DialogHeader>
          {errors.general && (
            <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
              {errors.general}
            </div>
          )}
          <div className="space-y-4">
            <Field label="Code" required error={errors.code} htmlFor="production-type-code">
              <Input
                id="production-type-code"
                value={form.code}
                onChange={(event) => {
                  setForm((prev) => ({ ...prev, code: upperCode(event.target.value) }));
                  setErrors((prev) => withoutKey(prev, 'code'));
                }}
                placeholder="e.g., PET_1L_OIL"
                disabled={isSaving}
              />
            </Field>
            <Field label="Name" required error={errors.name} htmlFor="production-type-name">
              <Input
                id="production-type-name"
                value={form.name}
                onChange={(event) => {
                  setForm((prev) => ({ ...prev, name: event.target.value }));
                  setErrors((prev) => withoutKey(prev, 'name'));
                }}
                placeholder="e.g., 1 L PET Oil"
                disabled={isSaving}
              />
            </Field>
            <Field
              label="Description"
              error={errors.description}
              htmlFor="production-type-description"
            >
              <Input
                id="production-type-description"
                value={form.description}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, description: event.target.value }))
                }
                placeholder="Optional"
                disabled={isSaving}
              />
            </Field>
            {/* The paper form this type is, as printed on the sheet. The number is the
                type's Print Documents row: edit it here or in Master Data. */}
            <Field
              label="Document number"
              error={errors.print_document_id}
              hint="The same number as in Master Data › Print Documents — changing it here changes it there."
              htmlFor="production-type-document-number"
            >
              <Input
                id="production-type-document-number"
                value={form.print_document_id}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, print_document_id: event.target.value }))
                }
                placeholder="e.g., QA-FRM-14-01-05-02"
                disabled={isSaving}
              />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Revision" error={errors.revision} htmlFor="production-type-revision">
                <Input
                  id="production-type-revision"
                  value={form.revision}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, revision: event.target.value }))
                  }
                  placeholder="e.g., 02"
                  disabled={isSaving}
                />
              </Field>
              <Field
                label="Revision date"
                error={errors.revision_date}
                htmlFor="production-type-revision-date"
              >
                <Input
                  id="production-type-revision-date"
                  type="date"
                  value={form.revision_date}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, revision_date: event.target.value }))
                  }
                  disabled={isSaving}
                />
              </Field>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
