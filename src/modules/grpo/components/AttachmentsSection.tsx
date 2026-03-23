import { AlertCircle, ExternalLink, FileText, Paperclip, RefreshCw, Trash2, Upload } from 'lucide-react';
import { useRef, useState } from 'react';

import type { ApiError } from '@/core/api/types';
import { Button, Card, CardContent } from '@/shared/components/ui';

import { useDeleteGRPOAttachment, useRetryGRPOAttachment, useUploadGRPOAttachment } from '../api';
import { ATTACHMENT_STATUS_CONFIG } from '../constants';
import type { GRPOAttachment } from '../types';

interface AttachmentsSectionProps {
  postingId: number;
  attachments: GRPOAttachment[];
  canManage: boolean;
}

const formatDateTime = (dateTime?: string | null) => {
  if (!dateTime) return '-';
  try {
    const date = new Date(dateTime);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateTime;
  }
};

export function AttachmentsSection({ postingId, attachments, canManage }: AttachmentsSectionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [retryingId, setRetryingId] = useState<number | null>(null);

  const uploadAttachment = useUploadGRPOAttachment(postingId);
  const deleteAttachment = useDeleteGRPOAttachment(postingId);
  const retryAttachment = useRetryGRPOAttachment(postingId);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setError(null);
    for (const file of Array.from(files)) {
      try {
        await uploadAttachment.mutateAsync(file);
      } catch (err) {
        const apiError = err as ApiError;
        setError(apiError.message || `Failed to upload ${file.name}`);
      }
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (attachmentId: number) => {
    setDeletingId(attachmentId);
    try {
      await deleteAttachment.mutateAsync(attachmentId);
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.message || 'Failed to delete attachment');
    } finally {
      setDeletingId(null);
    }
  };

  const handleRetry = async (attachmentId: number) => {
    setRetryingId(attachmentId);
    setError(null);
    try {
      await retryAttachment.mutateAsync(attachmentId);
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.message || 'Failed to retry attachment upload');
    } finally {
      setRetryingId(null);
    }
  };

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold flex items-center gap-2">
            <Paperclip className="h-4 w-4" />
            Attachments
            {attachments.length > 0 && (
              <span className="text-xs text-muted-foreground font-normal">
                ({attachments.length})
              </span>
            )}
          </h3>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/5 border border-destructive/20">
            <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {/* Upload Area */}
        {canManage && (
          <>
            <div
              className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/25 p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Click to upload files</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Invoices, challans, and other documents
                </p>
              </div>
              {uploadAttachment.isPending && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Uploading...
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={handleFileSelect}
            />
          </>
        )}

        {/* Attachment List */}
        {attachments.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-2">
            No attachments uploaded.
          </p>
        )}

        {attachments.length > 0 && (
          <div className="space-y-2">
            {attachments.map((attachment) => {
              const statusConfig =
                ATTACHMENT_STATUS_CONFIG[
                  attachment.sap_attachment_status as keyof typeof ATTACHMENT_STATUS_CONFIG
                ];
              const isFailed = attachment.sap_attachment_status === 'FAILED';
              const isDeleting = deletingId === attachment.id;
              const isRetrying = retryingId === attachment.id;

              return (
                <div
                  key={attachment.id}
                  className="flex items-start gap-3 p-3 rounded-md border bg-muted/30"
                >
                  <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <a
                        href={attachment.file}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium truncate hover:underline flex items-center gap-1"
                      >
                        {attachment.original_filename}
                        <ExternalLink className="h-3 w-3 flex-shrink-0" />
                      </a>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {statusConfig && (
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${statusConfig.bgColor} ${statusConfig.color}`}
                        >
                          <statusConfig.icon className="h-3 w-3" />
                          {statusConfig.label}
                        </span>
                      )}
                      <span className="text-[10px] text-muted-foreground">
                        {formatDateTime(attachment.uploaded_at)}
                      </span>
                    </div>
                    {/* SAP error message for failed attachments */}
                    {isFailed && attachment.sap_error_message && (
                      <p className="text-xs text-destructive">{attachment.sap_error_message}</p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {isFailed && canManage && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => handleRetry(attachment.id)}
                        disabled={isRetrying}
                        title="Retry SAP upload"
                      >
                        <RefreshCw
                          className={`h-3.5 w-3.5 ${isRetrying ? 'animate-spin' : ''}`}
                        />
                      </Button>
                    )}
                    {canManage && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(attachment.id)}
                        disabled={isDeleting}
                        title="Delete attachment"
                      >
                        {isDeleting ? (
                          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
