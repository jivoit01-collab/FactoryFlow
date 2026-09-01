import { ExternalLink } from 'lucide-react';

import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui';

import type { QCDocumentFile } from '../../types/qcDocumentFile.types';

interface PdfViewerDialogProps {
  document: QCDocumentFile | null;
  onClose: () => void;
}

/**
 * Shows the stored PDF exactly as uploaded.
 *
 * An `<iframe>` on the file's own URL hands rendering to the browser's built-in
 * PDF viewer — no conversion, no re-layout, so what appears is the document as
 * issued, with its own zoom, search and print controls.
 */
export default function PdfViewerDialog({ document, onClose }: PdfViewerDialogProps) {
  return (
    <Dialog open={document !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex h-[90vh] max-w-5xl flex-col">
        {document && (
          <>
            <DialogHeader className="shrink-0">
              <DialogTitle className="text-lg">{document.title}</DialogTitle>
              <DialogDescription className="flex flex-wrap items-center gap-2 pt-1">
                <span className="font-mono">{document.document_code}</span>
                {document.revision && <Badge variant="outline">Rev {document.revision}</Badge>}
                {document.uploaded_by_name && (
                  <span>Uploaded by {document.uploaded_by_name}</span>
                )}
                {document.url && (
                  <a
                    href={document.url}
                    target="_blank"
                    rel="noreferrer"
                    className="ml-auto inline-flex items-center gap-1 text-primary hover:underline"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Open in new tab
                  </a>
                )}
              </DialogDescription>
            </DialogHeader>

            {document.url ? (
              <iframe
                src={document.url}
                title={`${document.document_code} — ${document.title}`}
                className="min-h-0 w-full flex-1 rounded-md border"
              />
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
                <p className="text-sm text-muted-foreground">
                  This document has no file attached.
                </p>
                <Button variant="outline" onClick={onClose}>
                  Close
                </Button>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
