import { AlertCircle, ArrowLeft, Edit, FileText, Plus, Trash2 } from 'lucide-react';
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
  Textarea,
} from '@/shared/components/ui';
import { useScrollToError } from '@/shared/hooks';

import {
  useCreatePrintDocument,
  useDeletePrintDocument,
  usePrintDocuments,
  useUpdatePrintDocument,
} from '../../api/printDocument';
import type { QCPrintDocument, QCPrintDocumentKey, SaveQCPrintDocumentRequest } from '../../types';

const PRINT_DOCUMENT_OPTIONS: Array<{ value: QCPrintDocumentKey; label: string }> = [
  { value: 'RAW_MATERIAL_INSPECTION', label: 'Raw Material Inspection Print' },
  { value: 'QC_PARAMETERS', label: 'QC Parameters Print' },
];

const emptyForm: SaveQCPrintDocumentRequest = {
  document_key: 'RAW_MATERIAL_INSPECTION',
  document_id: '',
  notes: '',
};

export default function PrintDocumentsPage() {
  const navigate = useNavigate();
  const { data: printDocuments = [], isLoading, error } = usePrintDocuments();
  const createPrintDocument = useCreatePrintDocument();
  const updatePrintDocument = useUpdatePrintDocument();
  const deletePrintDocument = useDeletePrintDocument();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDocument, setEditingDocument] = useState<QCPrintDocument | null>(null);
  const [formData, setFormData] = useState<SaveQCPrintDocumentRequest>(emptyForm);
  const [apiErrors, setApiErrors] = useState<Record<string, string>>({});

  useScrollToError(apiErrors);

  const usedDocumentKeys = new Set(printDocuments.map((document) => document.document_key));
  const canAddDocument = PRINT_DOCUMENT_OPTIONS.some((option) => !usedDocumentKeys.has(option.value));
  const isSaving = createPrintDocument.isPending || updatePrintDocument.isPending;

  const handleOpenDialog = (document?: QCPrintDocument) => {
    if (document) {
      setEditingDocument(document);
      setFormData({
        document_key: document.document_key,
        document_id: document.document_id,
        notes: document.notes || '',
      });
    } else {
      setEditingDocument(null);
      const unusedOption =
        PRINT_DOCUMENT_OPTIONS.find((option) => !usedDocumentKeys.has(option.value)) ||
        PRINT_DOCUMENT_OPTIONS[0];
      setFormData({
        ...emptyForm,
        document_key: unusedOption.value,
      });
    }
    setApiErrors({});
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingDocument(null);
    setFormData(emptyForm);
    setApiErrors({});
  };

  const handleSave = async () => {
    const errors: Record<string, string> = {};
    const documentId = formData.document_id.trim();

    if (!documentId) {
      errors.document_id = 'Document ID is required';
    }
    if (Object.keys(errors).length > 0) {
      setApiErrors(errors);
      return;
    }

    const payload: SaveQCPrintDocumentRequest = {
      document_key: formData.document_key,
      document_id: documentId,
      notes: formData.notes?.trim() || '',
    };

    try {
      setApiErrors({});
      if (editingDocument) {
        await updatePrintDocument.mutateAsync({ id: editingDocument.id, data: payload });
      } else {
        await createPrintDocument.mutateAsync(payload);
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
        setApiErrors({ general: apiError.message || 'Failed to save print document' });
      }
    }
  };

  const handleDelete = async (document: QCPrintDocument) => {
    if (!confirm(`Remove document ID for ${document.document_key_label}?`)) return;

    try {
      await deletePrintDocument.mutateAsync(document.id);
    } catch (error) {
      const apiError = error as ApiError;
      setApiErrors({ general: apiError.message || 'Failed to delete print document' });
    }
  };

  return (
    <div className="space-y-6 pb-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate('/qc')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h2 className="flex items-center gap-3 text-3xl font-bold tracking-tight">
              <FileText className="h-8 w-8" />
              Print Documents
            </h2>
          </div>
          <p className="text-muted-foreground">
            Manage document IDs printed at the bottom of QC reports
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()} disabled={!canAddDocument}>
          <Plus className="mr-2 h-4 w-4" />
          Add Document ID
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-md bg-destructive/15 p-4 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          Failed to load print documents. Please try again.
        </div>
      )}

      {apiErrors.general && !isDialogOpen && (
        <div className="flex items-center gap-2 rounded-md bg-destructive/15 p-4 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          {apiErrors.general}
        </div>
      )}

      {isLoading ? (
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center justify-center gap-4">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              <p className="text-muted-foreground">Loading...</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Configured Documents ({printDocuments.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {printDocuments.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                No print document IDs configured. Click "Add Document ID" to create one.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="p-3 text-left font-medium">Document</th>
                      <th className="p-3 text-left font-medium">Document ID</th>
                      <th className="p-3 text-left font-medium">Notes</th>
                      <th className="p-3 text-left font-medium">Updated</th>
                      <th className="p-3 text-center font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {printDocuments.map((document) => (
                      <tr key={document.id} className="border-b hover:bg-muted/50">
                        <td className="p-3 font-medium">{document.document_key_label}</td>
                        <td className="p-3 font-mono">{document.document_id}</td>
                        <td className="p-3 text-muted-foreground">{document.notes || '-'}</td>
                        <td className="p-3 text-muted-foreground">
                          {new Date(document.updated_at).toLocaleDateString()}
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex justify-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleOpenDialog(document)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDelete(document)}
                              disabled={deletePrintDocument.isPending}
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

      <Dialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          if (!open) handleCloseDialog();
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingDocument ? 'Edit Document ID' : 'Add Document ID'}</DialogTitle>
          </DialogHeader>

          {apiErrors.general && (
            <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
              {apiErrors.general}
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Document</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={formData.document_key}
                onChange={(event) =>
                  setFormData((prev) => ({
                    ...prev,
                    document_key: event.target.value as QCPrintDocumentKey,
                  }))
                }
                disabled={isSaving || !!editingDocument}
              >
                {PRINT_DOCUMENT_OPTIONS.map((option) => (
                  <option
                    key={option.value}
                    value={option.value}
                    disabled={!editingDocument && usedDocumentKeys.has(option.value)}
                  >
                    {option.label}
                  </option>
                ))}
              </select>
              {apiErrors.document_key && (
                <p className="text-sm text-destructive">{apiErrors.document_key}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>
                Document ID <span className="text-destructive">*</span>
              </Label>
              <Input
                value={formData.document_id}
                onChange={(event) => {
                  setFormData((prev) => ({ ...prev, document_id: event.target.value }));
                  if (apiErrors.document_id) {
                    setApiErrors((prev) => {
                      const next = { ...prev };
                      delete next.document_id;
                      return next;
                    });
                  }
                }}
                placeholder="e.g., QC-FRM-001"
                disabled={isSaving}
                className={
                  apiErrors.document_id ? 'border-destructive focus-visible:ring-destructive' : ''
                }
              />
              {apiErrors.document_id && (
                <p className="text-sm text-destructive">{apiErrors.document_id}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={formData.notes || ''}
                onChange={(event) =>
                  setFormData((prev) => ({ ...prev, notes: event.target.value }))
                }
                placeholder="Optional"
                rows={3}
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
