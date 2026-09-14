import { FileText, History, Loader2, Paintbrush } from 'lucide-react';
import { toast } from 'sonner';

import type { ArtworkRecord } from '@/modules/artwork/api';
import { useArtworkRevisions, useOpenArtworkFile } from '@/modules/artwork/api';
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui';
import { getErrorMessage } from '@/shared/utils';

export interface ArtworkHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record: ArtworkRecord | null;
}

/**
 * Every superseded state of one artwork, newest first.
 *
 * The files are the point: an artwork that was replaced is still the artwork
 * that was printed on everything produced before the change, so the old PDF
 * and CDR stay downloadable from here rather than being overwritten.
 */
export function ArtworkHistoryDialog({ open, onOpenChange, record }: ArtworkHistoryDialogProps) {
  const { data: revisions, isLoading } = useArtworkRevisions(open ? (record?.id ?? null) : null);
  const openFile = useOpenArtworkFile();

  async function download(revisionId: number, kind: 'pdf' | 'cdr', filename: string) {
    try {
      await openFile.mutateAsync({ revisionId, kind, filename });
    } catch (err) {
      toast.error(getErrorMessage(err, 'That file could not be opened.'));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            <History className="mr-2 inline h-4 w-4" />
            Revision history — {record?.item_code}
          </DialogTitle>
          <DialogDescription>
            {record?.item_name}. Currently {record?.document_number || 'not yet numbered'} rev{' '}
            {record?.revision_label}.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-10 text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading the history…
          </div>
        ) : !revisions?.length ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            Nothing superseded yet — this is the first artwork filed for the item.
          </p>
        ) : (
          <div className="max-h-[60vh] space-y-3 overflow-y-auto">
            {revisions.map((revision) => (
              <div key={revision.id} className="rounded-md border p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">rev {revision.revision_label}</Badge>
                  <span
                    className={
                      revision.document_number ? 'font-medium' : 'text-sm text-muted-foreground'
                    }
                  >
                    {revision.document_number || 'Not yet numbered'}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    issued {revision.revision_date}
                  </span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    replaced {new Date(revision.superseded_at).toLocaleString()}
                    {revision.superseded_by_name ? ` by ${revision.superseded_by_name}` : ''}
                  </span>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-4 text-sm">
                  <span className="text-muted-foreground">
                    Barcode: <span className="font-mono">{revision.barcode || '—'}</span>
                  </span>
                  {revision.pdf_download_url && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs"
                      onClick={() =>
                        download(revision.id, 'pdf', revision.pdf_original_name || 'artwork.pdf')
                      }
                    >
                      <FileText className="mr-1 h-3.5 w-3.5" />
                      {revision.pdf_original_name || 'PDF'}
                    </Button>
                  )}
                  {revision.cdr_download_url && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs"
                      onClick={() =>
                        download(revision.id, 'cdr', revision.cdr_original_name || 'artwork.cdr')
                      }
                    >
                      <Paintbrush className="mr-1 h-3.5 w-3.5" />
                      {revision.cdr_original_name || 'CDR'}
                    </Button>
                  )}
                </div>

                {revision.remarks && (
                  <p className="mt-2 text-xs text-muted-foreground">{revision.remarks}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
