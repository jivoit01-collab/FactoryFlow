import { AlertCircle, Download, History, Loader2 } from 'lucide-react';
import { useEffect, useMemo } from 'react';

import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui';

import { useQCDocumentFileBlob } from '../../api/qcDocumentFile';
import type { QCDocumentFile } from '../../types/qcDocumentFile.types';

interface PdfViewerDialogProps {
  document: QCDocumentFile | null;
  onClose: () => void;
  /**
   * Opens this document's change trail. Passed only when the reader holds the
   * audit permission, so the button is absent rather than disabled for
   * everyone else.
   */
  onShowHistory?: () => void;
}

/**
 * Shows the stored PDF exactly as uploaded.
 *
 * The bytes are fetched through the authenticated API and rendered from an
 * object URL rather than framing the media URL directly. Two reasons: the
 * media URL needs no login, and every Django response carries
 * `X-Frame-Options: DENY`, so a frame pointed at it renders nothing at all.
 * A blob URL is same-origin to this page, so the browser's own PDF viewer
 * handles it — real zoom, search, scroll and print, document unchanged.
 */
export default function PdfViewerDialog({
  document,
  onClose,
  onShowHistory,
}: PdfViewerDialogProps) {
  const documentId = document?.id ?? null;
  const { data: blob, isLoading, error: fetchError } = useQCDocumentFileBlob(documentId);

  const blobUrl = useMemo(() => {
    if (!blob) return null;
    // Force the PDF type: a blob typed application/octet-stream is downloaded
    // by the browser instead of rendered.
    const pdf =
      blob.type === 'application/pdf' ? blob : new Blob([blob], { type: 'application/pdf' });
    return URL.createObjectURL(pdf);
  }, [blob]);

  // Release the object URL once it is replaced or the dialog closes, so the
  // file is not held in memory for the rest of the session.
  useEffect(() => {
    if (!blobUrl) return undefined;
    return () => URL.revokeObjectURL(blobUrl);
  }, [blobUrl]);

  const error = fetchError ? fetchError.message || 'Could not load this PDF.' : '';

  // Save under the name it was uploaded with; fall back to the document code
  // so the file is still identifiable if the original name was lost.
  const downloadName =
    document?.original_name || (document ? `${document.document_code}.pdf` : 'document.pdf');

  return (
    <Dialog open={document !== null} onOpenChange={(open) => !open && onClose()}>
      {/* Full-screen: a controlled document is read at full size, not in a
          window. `100dvh` rather than `vh` so mobile browser chrome does not
          push the bottom of the page out of view. */}
      <DialogContent className="flex h-[100dvh] w-screen max-w-none flex-col gap-3 rounded-none border-0 p-4 sm:rounded-none">
        {document && (
          <>
            <DialogHeader className="shrink-0">
              <DialogTitle className="text-lg">{document.title}</DialogTitle>
              <DialogDescription className="flex flex-wrap items-center gap-2 pt-1">
                <span className="font-mono">{document.document_code}</span>
                {document.revision && <Badge variant="outline">Rev {document.revision}</Badge>}
                {document.uploaded_by_name && <span>Uploaded by {document.uploaded_by_name}</span>}
                <span className="ml-auto flex items-center gap-2">
                  {onShowHistory && (
                    <button
                      type="button"
                      onClick={onShowHistory}
                      className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted"
                    >
                      <History className="h-3.5 w-3.5" />
                      History
                    </button>
                  )}
                  {blobUrl && (
                    <a
                      href={blobUrl}
                      download={downloadName}
                      className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Download
                    </a>
                  )}
                </span>
              </DialogDescription>
            </DialogHeader>

            {isLoading && (
              <div className="flex flex-1 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            )}

            {error && (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
                <AlertCircle className="h-8 w-8 text-destructive" />
                <p className="text-sm text-destructive">{error}</p>
                <Button variant="outline" onClick={onClose}>
                  Close
                </Button>
              </div>
            )}

            {blobUrl && !error && (
              <iframe
                // `#toolbar=0&navpanes=0` hides the built-in PDF toolbar and
                // sidebar, so the page is shown on its own. Saving is offered
                // by the Download button above instead.
                src={`${blobUrl}#toolbar=0&navpanes=0`}
                title={`${document.document_code} — ${document.title}`}
                className="min-h-0 w-full flex-1 rounded-md border"
              />
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
