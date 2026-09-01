import {
  ArrowLeft,
  FileText,
  Loader2,
  Search,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { QC_PERMISSIONS } from '@/config/permissions';
import type { ApiError } from '@/core/api/types';
import { usePermission } from '@/core/auth';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
} from '@/shared/components/ui';
import { cn } from '@/shared/utils';

import {
  useDeleteQCDocumentFile,
  useQCDocumentFiles,
  useUploadQCDocumentFile,
} from '../../api/qcDocumentFile';
import type { QCDocumentFile } from '../../types/qcDocumentFile.types';
import PdfViewerDialog from './PdfViewerDialog';

const MAX_BYTES = 25 * 1024 * 1024;

function formatSize(bytes: number | null): string {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** A PDF by MIME type, or by extension when the browser is vague about it. */
function isPdf(file: File): boolean {
  return (
    file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
  );
}

/**
 * QC → PDF Documents.
 *
 * Drop, choose or paste a PDF, give it a document code, title and revision,
 * and it is stored as-is. Clicking a row opens the original file unchanged —
 * these are documents that must be read exactly as issued.
 */
export default function QCPdfLibraryPage() {
  const navigate = useNavigate();
  const { hasAnyPermission } = usePermission();
  const canManage = hasAnyPermission([QC_PERMISSIONS.DOCUMENT_FILE.MANAGE]);

  const [search, setSearch] = useState('');
  const { data: documents = [], isLoading } = useQCDocumentFiles();
  const uploadDocument = useUploadQCDocumentFile();
  const deleteDocument = useDeleteQCDocumentFile();

  const [file, setFile] = useState<File | null>(null);
  const [documentCode, setDocumentCode] = useState('');
  const [title, setTitle] = useState('');
  const [revision, setRevision] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [viewing, setViewing] = useState<QCDocumentFile | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const acceptFile = (candidate: File | null | undefined) => {
    if (!candidate) return;
    if (!isPdf(candidate)) {
      toast.error('Only PDF files can be stored here.');
      return;
    }
    if (candidate.size > MAX_BYTES) {
      toast.error('That PDF is larger than 25 MB.');
      return;
    }
    setFile(candidate);
    setErrors((current) => ({ ...current, file: '' }));
    // The file name is usually the best first guess at the title.
    if (!title) setTitle(candidate.name.replace(/\.pdf$/i, ''));
  };

  // Ctrl+V anywhere on the page drops a copied PDF straight into the form.
  useEffect(() => {
    if (!canManage) return undefined;
    const onPaste = (event: ClipboardEvent) => {
      const pasted = Array.from(event.clipboardData?.files ?? []);
      const pdf = pasted.find(isPdf);
      if (pdf) {
        event.preventDefault();
        acceptFile(pdf);
        toast.success('PDF pasted.');
      }
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canManage, title]);

  const resetForm = () => {
    setFile(null);
    setDocumentCode('');
    setTitle('');
    setRevision('');
    setErrors({});
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleUpload = async () => {
    const nextErrors: Record<string, string> = {};
    if (!documentCode.trim()) nextErrors.document_code = 'Document code is required.';
    if (!title.trim()) nextErrors.title = 'Title is required.';
    if (!file) nextErrors.file = 'Attach the PDF.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    try {
      const saved = await uploadDocument.mutateAsync({
        document_code: documentCode.trim().toUpperCase(),
        title: title.trim(),
        revision: revision.trim(),
        file: file!,
      });
      toast.success(`Stored ${saved.document_code}.`);
      resetForm();
    } catch (error) {
      const failure = error as ApiError;
      if (failure.errors) {
        setErrors(
          Object.fromEntries(
            Object.entries(failure.errors).map(([field, messages]) => [
              field,
              messages[0],
            ]),
          ),
        );
      } else {
        setErrors({ general: failure.message || 'Failed to store the PDF.' });
      }
      toast.error(failure.message || 'Failed to store the PDF.');
    }
  };

  const handleDelete = async (document: QCDocumentFile) => {
    if (!confirm(`Retire ${document.document_code}? It drops out of this list.`)) return;
    try {
      await deleteDocument.mutateAsync(document.id);
      toast.success(`${document.document_code} retired.`);
    } catch (error) {
      toast.error((error as ApiError).message || 'Failed to retire the document.');
    }
  };

  const term = search.trim().toLowerCase();
  const visible = term
    ? documents.filter(
        (document) =>
          document.title.toLowerCase().includes(term) ||
          document.document_code.toLowerCase().includes(term),
      )
    : documents;

  return (
    <div className="space-y-6 pb-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate('/qc')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="space-y-1">
          <h2 className="flex items-center gap-3 text-3xl font-bold tracking-tight">
            <FileText className="h-8 w-8" />
            PDF Documents
          </h2>
          <p className="text-sm text-muted-foreground">
            Controlled documents kept as the original PDF, shown exactly as issued.
          </p>
        </div>
      </div>

      {canManage && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Add a document</CardTitle>
            <CardDescription>
              Drop a PDF below, choose one, or copy a PDF file and press Ctrl+V anywhere
              on this page.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* ---- drop zone ---- */}
            <div
              onDragOver={(event) => {
                event.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(event) => {
                event.preventDefault();
                setIsDragging(false);
                acceptFile(event.dataTransfer.files?.[0]);
              }}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                'flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-4 py-8 text-center transition-colors',
                isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/30',
                errors.file && 'border-red-400 bg-red-50',
              )}
            >
              {file ? (
                <div className="flex items-center gap-3">
                  <FileText className="h-6 w-6 text-primary" />
                  <div className="text-left">
                    <p className="font-medium">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatSize(file.size)}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(event) => {
                      event.stopPropagation();
                      setFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <>
                  <Upload className="h-7 w-7 text-muted-foreground" />
                  <p className="mt-2 text-sm font-medium">
                    Drop a PDF here, or click to choose
                  </p>
                  <p className="text-xs text-muted-foreground">
                    You can also paste one with Ctrl+V · max 25 MB
                  </p>
                </>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf,.pdf"
                className="hidden"
                onChange={(event) => acceptFile(event.target.files?.[0])}
              />
            </div>
            {errors.file && <p className="text-sm text-red-600">{errors.file}</p>}

            {/* ---- the three fields ---- */}
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="document_code">Document code</Label>
                <Input
                  id="document_code"
                  value={documentCode}
                  onChange={(event) => setDocumentCode(event.target.value)}
                  placeholder="QA-TST-INH-14-02-10"
                  className="font-mono"
                />
                {errors.document_code && (
                  <p className="text-xs text-red-600">{errors.document_code}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="ARGEMONE OIL ADULTERATION TESTING"
                />
                {errors.title && <p className="text-xs text-red-600">{errors.title}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="revision">Revision</Label>
                <Input
                  id="revision"
                  value={revision}
                  onChange={(event) => setRevision(event.target.value)}
                  placeholder="00/15-10-2023"
                />
              </div>
            </div>

            {errors.general && (
              <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                {errors.general}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={handleUpload} disabled={uploadDocument.isPending}>
                {uploadDocument.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="mr-2 h-4 w-4" />
                )}
                Save document
              </Button>
              <Button variant="outline" onClick={resetForm}>
                Clear
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ---- the library ---- */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Stored documents ({documents.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by title or document code…"
              className="pl-9"
            />
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : visible.length === 0 ? (
            <div className="rounded-lg border border-dashed py-12 text-center">
              <FileText className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">
                {documents.length === 0
                  ? 'No PDFs stored yet.'
                  : 'No document matches that search.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-3 py-2 font-medium">Document code</th>
                    <th className="px-3 py-2 font-medium">Title</th>
                    <th className="px-3 py-2 font-medium">Revision</th>
                    <th className="px-3 py-2 font-medium">Size</th>
                    <th className="w-10 px-3 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {visible.map((document) => (
                    <tr
                      key={document.id}
                      className="cursor-pointer border-b last:border-0 hover:bg-muted/40"
                      onClick={() => setViewing(document)}
                    >
                      <td className="px-3 py-2 font-mono text-xs">
                        {document.document_code}
                      </td>
                      <td className="px-3 py-2 font-medium">{document.title}</td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {document.revision || '—'}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        <Badge variant="outline">{formatSize(document.file_size)}</Badge>
                      </td>
                      <td className="px-3 py-2">
                        {canManage && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleDelete(document);
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <PdfViewerDialog document={viewing} onClose={() => setViewing(null)} />
    </div>
  );
}
