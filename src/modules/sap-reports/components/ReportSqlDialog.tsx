import { Copy } from 'lucide-react';
import { toast } from 'sonner';

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui';

import { useSapReportSql } from '../api';

interface Props {
  slug: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * The saved query behind a report, for whoever has to fix it.
 *
 * When a report fails, the fix is almost always in SAP's Query Manager rather
 * than in this app, so an admin needs to see the statement — and to be able to
 * paste it straight into SAP.
 */
export function ReportSqlDialog({ slug, open, onOpenChange }: Props) {
  const query = useSapReportSql(slug, open);

  async function copy() {
    if (!query.data) return;
    try {
      await navigator.clipboard.writeText(query.data.sql_text);
      toast.success('SQL copied.');
    } catch {
      toast.error('Could not copy — select the text instead.');
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-[calc(100vw-2rem)] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>SAP query</DialogTitle>
          <DialogDescription>
            Read-only. Edit it in SAP&apos;s Query Manager, then sync.
          </DialogDescription>
        </DialogHeader>

        {query.isLoading ? (
          <div className="h-40 animate-pulse rounded bg-muted/40" />
        ) : query.isError ? (
          <p className="text-sm text-muted-foreground">The SQL could not be loaded.</p>
        ) : (
          <pre className="max-h-[55vh] overflow-auto rounded-md bg-muted p-3 text-xs leading-relaxed">
            {query.data?.sql_text}
          </pre>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={copy} disabled={!query.data}>
            <Copy className="mr-1.5 h-4 w-4" />
            Copy SQL
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
