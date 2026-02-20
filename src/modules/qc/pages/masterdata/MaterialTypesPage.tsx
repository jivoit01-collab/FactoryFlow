import { AlertCircle, ArrowLeft, Edit, FlaskConical, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import type { ApiError } from '@/core/api/types';
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
  Label,
} from '@/shared/components/ui';
import { useScrollToError } from '@/shared/hooks';

import {
  useCreateMaterialType,
  useDeleteMaterialType,
  useMaterialTypes,
  useUpdateMaterialType,
} from '../../api/materialType/materialType.queries';
import type { CreateMaterialTypeRequest, MaterialType } from '../../types';

export default function MaterialTypesPage() {
  const navigate = useNavigate();
  const { data: materialTypes = [], isLoading, error } = useMaterialTypes();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState<MaterialType | null>(null);
  const [formData, setFormData] = useState<CreateMaterialTypeRequest>({
    code: '',
    name: '',
    description: '',
  });
  const [apiErrors, setApiErrors] = useState<Record<string, string>>({});

  // Scroll to first error when errors occur
  useScrollToError(apiErrors);

  const createMaterialType = useCreateMaterialType();
  const updateMaterialType = useUpdateMaterialType();
  const deleteMaterialType = useDeleteMaterialType();

  const handleOpenDialog = (type?: MaterialType) => {
    if (type) {
      setEditingType(type);
      setFormData({
        code: type.code,
        name: type.name,
        description: type.description || '',
      });
    } else {
      setEditingType(null);
      setFormData({ code: '', name: '', description: '' });
    }
    setApiErrors({});
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingType(null);
    setFormData({ code: '', name: '', description: '' });
    setApiErrors({});
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
    if (Object.keys(errors).length > 0) {
      setApiErrors(errors);
      return;
    }

    try {
      setApiErrors({});
      if (editingType) {
        await updateMaterialType.mutateAsync({ id: editingType.id, data: formData });
      } else {
        await createMaterialType.mutateAsync(formData);
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
    if (!confirm('Are you sure you want to delete this material type?')) return;

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

      {/* Loading State */}
      {isLoading && (
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center justify-center gap-4">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              <p className="text-muted-foreground">Loading...</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Material Types Table */}
      {!isLoading && !error && (
        <Card>
          <CardHeader>
            <CardTitle>Material Types ({materialTypes.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {materialTypes.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                No material types found. Click "Add Material Type" to create one.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-3 font-medium">Code</th>
                      <th className="text-left p-3 font-medium">Name</th>
                      <th className="text-left p-3 font-medium">Description</th>
                      <th className="text-center p-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {materialTypes.map((type) => (
                      <tr key={type.id} className="border-b hover:bg-muted/50">
                        <td className="p-3 font-medium">{type.code}</td>
                        <td className="p-3">{type.name}</td>
                        <td className="p-3 text-muted-foreground">{type.description || '-'}</td>
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
      <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) handleCloseDialog() }}>
        <DialogContent>
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
              <Label>Code <span className="text-destructive">*</span></Label>
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
                className={apiErrors.code ? 'border-destructive focus-visible:ring-destructive' : ''}
              />
              {apiErrors.code && <p className="text-sm text-destructive">{apiErrors.code}</p>}
            </div>

            <div className="space-y-2">
              <Label>Name <span className="text-destructive">*</span></Label>
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
                className={apiErrors.name ? 'border-destructive focus-visible:ring-destructive' : ''}
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
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog} disabled={isSaving}>
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
