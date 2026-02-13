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
  Checkbox,
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
  useCreateQCParameter,
  useDeleteQCParameter,
  useQCParametersByMaterialType,
  useUpdateQCParameter,
} from '../../api/qcParameter/qcParameter.queries';
import { MaterialTypeSelect } from '../../components';
import { PARAMETER_TYPE_LABELS } from '../../constants';
import type { CreateQCParameterRequest, ParameterType, QCParameter } from '../../types';

export default function QCParametersPage() {
  const navigate = useNavigate();
  const [selectedMaterialType, setSelectedMaterialType] = useState<number | null>(null);
  const { data: parameters = [], isLoading: isLoadingParams } =
    useQCParametersByMaterialType(selectedMaterialType);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingParam, setEditingParam] = useState<QCParameter | null>(null);
  const [formData, setFormData] = useState<CreateQCParameterRequest>({
    parameter_code: '',
    parameter_name: '',
    standard_value: '',
    parameter_type: 'TEXT',
    uom: '',
    sequence: 1,
    is_mandatory: true,
  });
  const [apiErrors, setApiErrors] = useState<Record<string, string>>({});

  // Scroll to first error when errors occur
  useScrollToError(apiErrors);

  const createParameter = useCreateQCParameter();
  const updateParameter = useUpdateQCParameter();
  const deleteParameter = useDeleteQCParameter();

  const handleOpenDialog = (param?: QCParameter) => {
    if (param) {
      setEditingParam(param);
      setFormData({
        parameter_code: param.parameter_code,
        parameter_name: param.parameter_name,
        standard_value: param.standard_value,
        parameter_type: param.parameter_type,
        min_value: param.min_value || undefined,
        max_value: param.max_value || undefined,
        uom: param.uom,
        sequence: param.sequence,
        is_mandatory: param.is_mandatory,
      });
    } else {
      setEditingParam(null);
      setFormData({
        parameter_code: '',
        parameter_name: '',
        standard_value: '',
        parameter_type: 'TEXT',
        uom: '',
        sequence: parameters.length + 1,
        is_mandatory: true,
      });
    }
    setApiErrors({});
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingParam(null);
    setApiErrors({});
  };

  const handleSave = async () => {
    if (!selectedMaterialType && !editingParam) {
      setApiErrors({ general: 'Please select a material type first' });
      return;
    }
    if (!formData.parameter_code.trim()) {
      setApiErrors({ parameter_code: 'Code is required' });
      return;
    }
    if (!formData.parameter_name.trim()) {
      setApiErrors({ parameter_name: 'Name is required' });
      return;
    }

    try {
      setApiErrors({});
      if (editingParam) {
        await updateParameter.mutateAsync({ id: editingParam.id, data: formData });
      } else {
        await createParameter.mutateAsync({
          materialTypeId: selectedMaterialType!,
          data: formData,
        });
      }
      handleCloseDialog();
    } catch (error) {
      const apiError = error as ApiError;
      setApiErrors({ general: apiError.message || 'Failed to save parameter' });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this parameter?')) return;

    try {
      await deleteParameter.mutateAsync(id);
    } catch (error) {
      const apiError = error as ApiError;
      alert(apiError.message || 'Failed to delete parameter');
    }
  };

  const isSaving = createParameter.isPending || updateParameter.isPending;

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
              QC Parameters
            </h2>
          </div>
          <p className="text-muted-foreground">
            Configure inspection parameters for each material type
          </p>
        </div>
      </div>

      {/* Material Type Filter */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <Label className="min-w-fit">Material Type:</Label>
            <div className="w-full max-w-xs">
              <MaterialTypeSelect
                value={selectedMaterialType || undefined}
                onChange={(mt) => setSelectedMaterialType(mt ? mt.id : null)}
                placeholder="Select Material Type"
              />
            </div>
            {selectedMaterialType && (
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Add Parameter
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Parameters Table */}
      {selectedMaterialType && (
        <Card>
          <CardHeader>
            <CardTitle>Parameters ({parameters.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingParams ? (
              <div className="py-8 flex justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              </div>
            ) : parameters.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                No parameters found. Click "Add Parameter" to create one.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-3 font-medium">#</th>
                      <th className="text-left p-3 font-medium">Code</th>
                      <th className="text-left p-3 font-medium">Name</th>
                      <th className="text-left p-3 font-medium">Standard Value</th>
                      <th className="text-left p-3 font-medium">Type</th>
                      <th className="text-left p-3 font-medium">UOM</th>
                      <th className="text-center p-3 font-medium">Mandatory</th>
                      <th className="text-center p-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parameters.map((param) => (
                      <tr key={param.id} className="border-b hover:bg-muted/50">
                        <td className="p-3">{param.sequence}</td>
                        <td className="p-3 font-medium">{param.parameter_code}</td>
                        <td className="p-3">{param.parameter_name}</td>
                        <td className="p-3">{param.standard_value}</td>
                        <td className="p-3 text-muted-foreground">
                          {PARAMETER_TYPE_LABELS[param.parameter_type]}
                        </td>
                        <td className="p-3">{param.uom || '-'}</td>
                        <td className="p-3 text-center">{param.is_mandatory ? 'Yes' : 'No'}</td>
                        <td className="p-3 text-center">
                          <div className="flex justify-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleOpenDialog(param)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDelete(param.id)}
                              disabled={deleteParameter.isPending}
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

      {/* No Material Type Selected */}
      {!selectedMaterialType && (
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center justify-center gap-4 text-center">
              <AlertCircle className="h-12 w-12 text-muted-foreground" />
              <div>
                <p className="font-medium">Select a Material Type</p>
                <p className="text-sm text-muted-foreground">
                  Choose a material type above to view and manage its QC parameters.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingParam ? 'Edit Parameter' : 'Add Parameter'}</DialogTitle>
          </DialogHeader>

          {apiErrors.general && (
            <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
              {apiErrors.general}
            </div>
          )}

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Code</Label>
                <Input
                  value={formData.parameter_code}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, parameter_code: e.target.value }))
                  }
                  placeholder="e.g., WEIGHT"
                  disabled={isSaving}
                />
                {apiErrors.parameter_code && (
                  <p className="text-sm text-destructive">{apiErrors.parameter_code}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Sequence</Label>
                <Input
                  type="number"
                  value={formData.sequence}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, sequence: parseInt(e.target.value) || 1 }))
                  }
                  disabled={isSaving}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={formData.parameter_name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, parameter_name: e.target.value }))
                }
                placeholder="e.g., Weight"
                disabled={isSaving}
              />
              {apiErrors.parameter_name && (
                <p className="text-sm text-destructive">{apiErrors.parameter_name}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Standard Value</Label>
              <Input
                value={formData.standard_value}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, standard_value: e.target.value }))
                }
                placeholder="e.g., 1.35±0.10"
                disabled={isSaving}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={formData.parameter_type}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      parameter_type: e.target.value as ParameterType,
                    }))
                  }
                  disabled={isSaving}
                >
                  {Object.entries(PARAMETER_TYPE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label>UOM</Label>
                <Input
                  value={formData.uom}
                  onChange={(e) => setFormData((prev) => ({ ...prev, uom: e.target.value }))}
                  placeholder="e.g., grams"
                  disabled={isSaving}
                />
              </div>
            </div>

            {formData.parameter_type === 'RANGE' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Min Value</Label>
                  <Input
                    type="number"
                    step="0.0001"
                    value={formData.min_value || ''}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        min_value: e.target.value ? parseFloat(e.target.value) : undefined,
                      }))
                    }
                    disabled={isSaving}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Max Value</Label>
                  <Input
                    type="number"
                    step="0.0001"
                    value={formData.max_value || ''}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        max_value: e.target.value ? parseFloat(e.target.value) : undefined,
                      }))
                    }
                    disabled={isSaving}
                  />
                </div>
              </div>
            )}

            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_mandatory"
                checked={formData.is_mandatory}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({ ...prev, is_mandatory: checked === true }))
                }
                disabled={isSaving}
              />
              <Label htmlFor="is_mandatory" className="font-normal cursor-pointer">
                Mandatory parameter
              </Label>
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
