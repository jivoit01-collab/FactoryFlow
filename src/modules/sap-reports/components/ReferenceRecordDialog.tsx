import { TransferRequestRecordView } from '@/modules/warehouse/components/TransferRequestRecordView';
import { BSTDetailView } from '@/modules/warehouse/pages/bst/BSTDetailView';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/shared/components/ui';

import type { SapReportReferenceMatch } from '../api';

export interface ReferenceRecordDialogProps {
  /** The SAP document number the row carried. */
  reference: string;
  /** Everything that document resolved to — never empty while open. */
  matches: SapReportReferenceMatch[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * The app record behind a report row, opened over the report.
 *
 * One SAP document can be two records here — the transfer request that raised
 * it and the branch stock transfer that carried it are the same movement seen
 * from two sides — so when both match they get a tab each rather than an
 * arbitrary winner.
 */
export function ReferenceRecordDialog({
  reference,
  matches,
  open,
  onOpenChange,
}: ReferenceRecordDialogProps) {
  const first = matches[0];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="grid max-h-[92vh] w-[96vw] max-w-5xl grid-rows-[auto_minmax(0,1fr)] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="pr-6">
            {first ? first.entry_no : reference}
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              SAP document {reference}
            </span>
          </DialogTitle>
        </DialogHeader>
        <DialogBody>
          {!open || !first ? null : matches.length === 1 ? (
            <RecordView match={first} />
          ) : (
            <Tabs defaultValue={`${first.kind}-${first.id}`}>
              <TabsList>
                {matches.map((match) => (
                  <TabsTrigger
                    key={`${match.kind}-${match.id}`}
                    value={`${match.kind}-${match.id}`}
                  >
                    {match.entry_no}
                  </TabsTrigger>
                ))}
              </TabsList>
              {matches.map((match) => (
                <TabsContent key={`${match.kind}-${match.id}`} value={`${match.kind}-${match.id}`}>
                  <RecordView match={match} />
                </TabsContent>
              ))}
            </Tabs>
          )}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}

function RecordView({ match }: { match: SapReportReferenceMatch }) {
  if (match.kind === 'BST') {
    // Read-only: a report row is a trail to follow, not a place to cancel a
    // transfer from. The full page is one click away for that.
    return <BSTDetailView transferId={match.id} mode="dialog" readOnly />;
  }
  return <TransferRequestRecordView requestId={match.id} />;
}
