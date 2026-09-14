import {
  AlertTriangle,
  FileText,
  History,
  Image as ImageIcon,
  Loader2,
  Paintbrush,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { ARTWORK_PERMISSIONS } from '@/config/permissions';
import { usePermission } from '@/core/auth/hooks/usePermission';
import type { ArtworkItemRow, ArtworkStatus, ArtworkSubGroup } from '@/modules/artwork/api';
import {
  artworkApi,
  useArtworkItems,
  useOpenArtworkFile,
  useRetireArtwork,
} from '@/modules/artwork/api';
import { confirmDialog } from '@/shared/components';
import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import { PaginationControls } from '@/shared/components/PaginationControls';
import {
  Badge,
  Button,
  Card,
  CardContent,
  Input,
  Label,
  NativeSelect,
  SelectOption,
} from '@/shared/components/ui';
import { useDebounce } from '@/shared/hooks';
import { getErrorMessage } from '@/shared/utils';

import { ArtworkFormDialog } from './ArtworkFormDialog';
import { ArtworkHistoryDialog } from './ArtworkHistoryDialog';

const ALL = 'ALL';

/** Matches the smallest option PaginationControls offers. */
const DEFAULT_PAGE_SIZE = 25;

/**
 * The label and carton artwork register.
 *
 * One row per SAP packaging item that carries artwork — sub-group LABEL or
 * CARTON, nothing else — whether or not anything has been filed for it. That
 * is the whole design: the list is driven by SAP's item master rather than by
 * what happens to be captured, so an item with no artwork on file is a PENDING
 * row somebody can act on instead of an absence nobody notices.
 *
 * Four things are held per item: the document number, the revision it is at
 * with its date, the barcode printed on it, and the two files (print-ready PDF
 * and the CorelDRAW source). None of it is posted anywhere — SAP has no field
 * for any of it, and in particular holds no barcode for a label or a carton.
 *
 * Viewers read and download; editors capture, revise and retire.
 */
export default function ArtworkRegisterPage() {
  const { hasPermission } = usePermission();
  const canManage = hasPermission(ARTWORK_PERMISSIONS.MANAGE);

  const [kind, setKind] = useState<ArtworkSubGroup | typeof ALL>(ALL);
  const [status, setStatus] = useState<ArtworkStatus | typeof ALL>(ALL);
  const [searchInput, setSearchInput] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [activeRow, setActiveRow] = useState<ArtworkItemRow | null>(null);
  const [activeRecordId, setActiveRecordId] = useState<number | null>(null);
  const [dialogSeq, setDialogSeq] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  const search = useDebounce(searchInput);
  const { data, isLoading } = useArtworkItems({
    ...(kind === ALL ? {} : { subGroup: kind }),
    ...(status === ALL ? {} : { status }),
    ...(search.trim() ? { search: search.trim() } : {}),
  });
  const retire = useRetireArtwork();
  const openFile = useOpenArtworkFile();

  const rows = useMemo(() => data?.rows ?? [], [data]);
  const summary = data?.summary;

  // What a capture may be filed against. Taken from the loaded list rather
  // than fetched again: the whole item master for a company is a few hundred
  // rows and is already here.
  //
  // Deliberately over every row, not just the page on screen. The picker in
  // the capture dialog has to offer any item without artwork, and one that
  // only listed page 1 would make the other 500 unfileable.
  const pendingItems = useMemo(() => rows.filter((row) => row.status === 'PENDING'), [rows]);

  // Paged in the browser, not on the server. The merge that produces these
  // rows needs the whole item master in hand anyway (that is how an item with
  // nothing on file becomes a visible PENDING row), so the list is already
  // here — a few hundred rows per company. Paging it server-side would cost a
  // round trip per page and buy nothing.
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));

  // A filter that shortens the list can strand the viewer past the end of it.
  // Clamped here rather than written back through setState, so the page number
  // stays derived from the list instead of chasing it a render behind.
  const safePage = Math.min(page, totalPages);

  const pagedRows = useMemo(
    () => rows.slice((safePage - 1) * pageSize, safePage * pageSize),
    [rows, safePage, pageSize],
  );

  // The revise/history dialogs need the full record, which the row does not
  // carry. Fetched on demand so the list stays one request.
  const [activeRecord, setActiveRecord] = useState<
    Awaited<ReturnType<typeof artworkApi.detail>> | null
  >(null);

  async function loadRecord(recordId: number) {
    try {
      const record = await artworkApi.detail(recordId);
      setActiveRecord(record);
      setActiveRecordId(recordId);
      return record;
    } catch (err) {
      toast.error(getErrorMessage(err, 'That artwork could not be loaded.'));
      return null;
    }
  }

  function openCapture(row: ArtworkItemRow | null) {
    setActiveRow(row);
    setActiveRecord(null);
    setActiveRecordId(null);
    // Remounts the dialog, which is how its fields are reset — a cancelled
    // capture must not leak into the next one.
    setDialogSeq((n) => n + 1);
    setFormOpen(true);
  }

  async function openRevise(row: ArtworkItemRow) {
    if (row.record_id == null) return;
    const record = await loadRecord(row.record_id);
    if (!record) return;
    setActiveRow(row);
    setDialogSeq((n) => n + 1);
    setFormOpen(true);
  }

  async function openHistory(row: ArtworkItemRow) {
    if (row.record_id == null) return;
    const record = await loadRecord(row.record_id);
    if (!record) return;
    setHistoryOpen(true);
  }

  async function download(row: ArtworkItemRow, fileKind: 'pdf' | 'cdr') {
    if (row.record_id == null) return;
    try {
      await openFile.mutateAsync({
        recordId: row.record_id,
        kind: fileKind,
        filename: `${row.item_code}.${fileKind}`,
      });
    } catch (err) {
      toast.error(getErrorMessage(err, 'That file could not be opened.'));
    }
  }

  async function handleRetire(row: ArtworkItemRow) {
    if (row.record_id == null) return;
    const ok = await confirmDialog({
      title: `Take the artwork for ${row.item_code} off the register?`,
      description: `${row.document_number} rev ${row.revision_label} will stop being listed. The files and the revision history are kept, and the item goes back to pending so a replacement can be filed.`,
      confirmLabel: 'Retire',
      destructive: true,
    });
    if (!ok) return;
    try {
      await retire.mutateAsync(row.record_id);
      toast.success(`Artwork for ${row.item_code} retired`);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not retire the artwork.'));
    }
  }

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Label & Carton Artwork"
        description="The document number, barcode and files held for every label and carton in SAP"
        {...(canManage
          ? {
              primaryAction: {
                label: 'Capture artwork',
                icon: <Plus className="mr-2 h-4 w-4" />,
                onClick: () => openCapture(null),
              },
            }
          : {})}
      />

      {data && !data.sap_available && (
        <Card className="border-amber-300 bg-amber-50">
          <CardContent className="flex items-start gap-2 p-4 text-sm text-amber-900">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              SAP could not be reached, so only the artwork already on file is listed — the
              items with nothing filed for them are not known right now. Artwork cannot be
              captured until SAP is back. {data.sap_error}
            </span>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label htmlFor="artwork-filter-kind">Kind</Label>
          <NativeSelect
            id="artwork-filter-kind"
            className="w-[180px]"
            value={kind}
            onChange={(e) => {
              setKind(e.target.value as ArtworkSubGroup | typeof ALL);
              setPage(1);
            }}
          >
            <SelectOption value={ALL}>Labels and cartons</SelectOption>
            <SelectOption value="LABEL">Labels</SelectOption>
            <SelectOption value="CARTON">Cartons</SelectOption>
          </NativeSelect>
        </div>

        <div className="space-y-1">
          <Label htmlFor="artwork-filter-status">Status</Label>
          <NativeSelect
            id="artwork-filter-status"
            className="w-[180px]"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as ArtworkStatus | typeof ALL);
              setPage(1);
            }}
          >
            <SelectOption value={ALL}>All items</SelectOption>
            <SelectOption value="CAPTURED">Artwork on file</SelectOption>
            <SelectOption value="PENDING">Nothing filed</SelectOption>
          </NativeSelect>
        </div>

        <div className="space-y-1">
          <Label htmlFor="artwork-filter-search">Search</Label>
          <Input
            id="artwork-filter-search"
            className="w-[280px]"
            placeholder="Item code, name, document no. or barcode…"
            value={searchInput}
            onChange={(e) => {
              setSearchInput(e.target.value);
              setPage(1);
            }}
          />
        </div>

        {summary && (
          <p className="ml-auto pb-2 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{summary.captured}</span> of{' '}
            {summary.total} on file
            {summary.pending > 0 && <> · {summary.pending} still to capture</>}
          </p>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading the register…
        </div>
      ) : rows.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ImageIcon className="mb-2 h-10 w-10 text-muted-foreground" />
            <p className="text-muted-foreground">
              {search || kind !== ALL || status !== ALL
                ? 'No label or carton matches those filters.'
                : 'SAP has no label or carton items for this company.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="px-3 py-2">Item</th>
                <th className="px-3 py-2">Kind</th>
                <th className="px-3 py-2">Document no.</th>
                <th className="px-3 py-2">Rev</th>
                <th className="px-3 py-2">Revision date</th>
                <th className="px-3 py-2">Barcode</th>
                <th className="px-3 py-2">Files</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pagedRows.map((row) => {
                const captured = row.status === 'CAPTURED';
                return (
                  <tr
                    key={`${row.sub_group}-${row.item_code}`}
                    className={`border-b align-top hover:bg-muted/50 ${
                      captured ? '' : 'bg-muted/20'
                    }`}
                  >
                    <td className="px-3 py-2">
                      <p className="font-mono text-xs font-medium">{row.item_code}</p>
                      <p className="text-sm">{row.item_name}</p>
                      {!row.in_sap && (
                        <Badge variant="outline" className="mt-1 text-[10px]">
                          Not in SAP any more
                        </Badge>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <Badge variant="outline" className="text-xs">
                        {row.sub_group || '—'}
                      </Badge>
                    </td>
                    <td className="px-3 py-2">
                      {captured ? (
                        <span className="font-medium">{row.document_number}</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">Nothing filed</span>
                      )}
                    </td>
                    <td className="px-3 py-2 tabular-nums">
                      {captured ? row.revision_label : '—'}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2">
                      {captured ? row.revision_date : '—'}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">
                      {captured ? row.barcode || '—' : '—'}
                    </td>
                    <td className="px-3 py-2">
                      {captured ? (
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-xs"
                            disabled={!row.has_pdf}
                            onClick={() => download(row, 'pdf')}
                            title="Open the print-ready PDF"
                          >
                            <FileText className="mr-1 h-3.5 w-3.5" /> PDF
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-xs"
                            disabled={!row.has_cdr}
                            onClick={() => download(row, 'cdr')}
                            title="Download the CorelDRAW source"
                          >
                            <Paintbrush className="mr-1 h-3.5 w-3.5" /> CDR
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex gap-1">
                        {captured ? (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 text-xs"
                              onClick={() => openHistory(row)}
                              title="Revision history"
                            >
                              <History className="h-3.5 w-3.5" />
                            </Button>
                            {canManage && (
                              <>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 px-2 text-xs"
                                  onClick={() => openRevise(row)}
                                  title="Revise"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 px-2 text-xs text-destructive"
                                  onClick={() => handleRetire(row)}
                                  title="Retire"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </>
                            )}
                          </>
                        ) : (
                          canManage && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs"
                              onClick={() => openCapture(row)}
                            >
                              <Plus className="mr-1 h-3.5 w-3.5" /> Capture
                            </Button>
                          )
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <PaginationControls
            page={safePage}
            pageSize={pageSize}
            // The filtered set, not the page — "Showing 1-25 of 592" is the
            // sentence somebody reads to know how much is left to work through.
            total={rows.length}
            totalPages={totalPages}
            isLoading={isLoading}
            onPageChange={setPage}
            onPageSizeChange={(next) => {
              setPageSize(next);
              // Row 400 is on a different page once the page size changes, so
              // the old page number means nothing.
              setPage(1);
            }}
          />
        </div>
      )}

      {canManage && (
        <ArtworkFormDialog
          key={`artwork-form-${dialogSeq}`}
          open={formOpen}
          onOpenChange={setFormOpen}
          record={activeRecordId != null ? activeRecord : null}
          pendingItems={pendingItems}
          presetItem={activeRow?.status === 'PENDING' ? activeRow : null}
        />
      )}

      <ArtworkHistoryDialog
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        record={activeRecord}
      />
    </div>
  );
}
