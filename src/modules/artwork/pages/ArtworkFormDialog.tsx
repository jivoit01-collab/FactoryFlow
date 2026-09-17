import { ChevronDown, FileText, Loader2, Paintbrush, Upload } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import type { ArtworkItemRow, ArtworkRecord } from '@/modules/artwork/api';
import { useArtworkOptions, useCaptureArtwork, useReviseArtwork } from '@/modules/artwork/api';
import { SearchableSelect } from '@/shared/components';
import {
  Badge,
  Button,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Textarea,
} from '@/shared/components/ui';
import { getErrorMessage } from '@/shared/utils';

export interface ArtworkFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * The artwork being revised. Null for a capture, which is the case that also
   * needs `pendingItems` so an item can be picked.
   */
  record: ArtworkRecord | null;
  /** Items with no artwork yet — what a capture may be filed against. */
  pendingItems: ArtworkItemRow[];
  /** Pre-selected item, when the capture was started from a row. */
  presetItem?: ArtworkItemRow | null;
}

const today = () => new Date().toISOString().slice(0, 10);

const mb = (bytes: number) => `${Math.round(bytes / (1024 * 1024))} MB`;

function fileTooBig(file: File | null, limit: number | undefined): boolean {
  return !!file && !!limit && file.size > limit;
}

/**
 * Captures a new artwork, or revises one already on file.
 *
 * One dialog for both because the fields are the same four things — document
 * number, revision, barcode, files — and only the rules around them differ.
 * On a capture both files are required, because a record that names a document
 * without holding it is a promise rather than a record. On a revision they are
 * optional: correcting a mistyped barcode must not demand that the artwork be
 * re-attached, and anything left alone keeps the file it already has.
 *
 * What the form asks for up front is only what it insists on — the item, the
 * revision date, the barcode and the two files. The document number, the
 * revision and the remarks sit under "More info", because none of them stops
 * the artwork being filed. Hidden is not forgotten: the section says what it
 * is holding and opens itself whenever any of it is filled in, so a revision
 * never buries the document number already on file.
 *
 * The previous state is never lost either way — the server writes it to the
 * revision history before applying the change.
 */
export function ArtworkFormDialog({
  open,
  onOpenChange,
  record,
  pendingItems,
  presetItem = null,
}: ArtworkFormDialogProps) {
  const isRevision = record != null;
  const { data: options } = useArtworkOptions();
  const capture = useCaptureArtwork();
  const revise = useReviseArtwork();

  const [itemCode, setItemCode] = useState(presetItem?.item_code ?? '');
  const [documentNumber, setDocumentNumber] = useState(record?.document_number ?? '');
  const [revisionNumber, setRevisionNumber] = useState(
    String(record ? record.next_revision_number : 0),
  );
  const [revisionDate, setRevisionDate] = useState(today());
  const [barcode, setBarcode] = useState(record?.barcode ?? '');
  const [remarks, setRemarks] = useState(record?.remarks ?? '');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [cdrFile, setCdrFile] = useState<File | null>(null);
  const [itemSearch, setItemSearch] = useState('');

  // What the optional fields held when the dialog opened, so the section can
  // say which of them this edit has actually touched.
  const initialExtras = useMemo(
    () => ({
      documentNumber: record?.document_number ?? '',
      revisionNumber: String(record ? record.next_revision_number : 0),
      remarks: record?.remarks ?? '',
    }),
    [record],
  );

  /** The optional fields, in the order they are shown, with what each holds. */
  const extras = [
    {
      value: documentNumber.trim(),
      summary: documentNumber.trim(),
      changed: documentNumber.trim() !== initialExtras.documentNumber.trim(),
    },
    {
      // Revision zero is the default rather than something somebody typed, so
      // it is not worth announcing on a capture.
      value: Number(revisionNumber) > 0 ? revisionNumber : '',
      summary: `rev ${String(Number(revisionNumber) || 0).padStart(2, '0')}`,
      changed: revisionNumber !== initialExtras.revisionNumber,
    },
    {
      value: remarks.trim(),
      summary: 'remarks',
      changed: remarks.trim() !== initialExtras.remarks.trim(),
    },
  ].filter((field) => field.value.length > 0 || field.changed);

  const touchedExtras = extras.some((field) => field.changed);

  // Open from the start when there is something in there to see — on a
  // revision that is the document number and remarks already on file.
  const [moreOpen, setMoreOpen] = useState(extras.length > 0);

  const selectedItem = useMemo(
    () => pendingItems.find((row) => row.item_code === itemCode) ?? presetItem ?? null,
    [pendingItems, itemCode, presetItem],
  );

  const saving = capture.isPending || revise.isPending;

  // Capture demands both files; a revision keeps whatever is not replaced.
  const missingFiles = !isRevision && (!pdfFile || !cdrFile);
  const oversizePdf = fileTooBig(pdfFile, options?.max_pdf_bytes);
  const oversizeCdr = fileTooBig(cdrFile, options?.max_cdr_bytes);
  const canSave =
    !saving &&
    !missingFiles &&
    !oversizePdf &&
    !oversizeCdr &&
    revisionDate.length > 0 &&
    (isRevision || itemCode.length > 0);

  async function handleSave() {
    try {
      if (isRevision && record) {
        await revise.mutateAsync({
          id: record.id,
          payload: {
            document_number: documentNumber.trim(),
            revision_number: Number(revisionNumber) || 0,
            revision_date: revisionDate,
            barcode: barcode.trim(),
            remarks: remarks.trim(),
            ...(pdfFile ? { pdf_file: pdfFile } : {}),
            ...(cdrFile ? { cdr_file: cdrFile } : {}),
          },
        });
        toast.success(
          documentNumber.trim()
            ? `${record.item_code} revised to ${documentNumber.trim()}`
            : `${record.item_code} revised`,
        );
      } else {
        await capture.mutateAsync({
          item_code: itemCode,
          document_number: documentNumber.trim(),
          revision_number: Number(revisionNumber) || 0,
          revision_date: revisionDate,
          barcode: barcode.trim(),
          remarks: remarks.trim(),
          pdf_file: pdfFile as File,
          cdr_file: cdrFile as File,
        });
        toast.success(`Artwork filed for ${itemCode}`);
      }
      onOpenChange(false);
    } catch (err) {
      toast.error(getErrorMessage(err, 'The artwork could not be saved.'));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="grid-rows-[auto_minmax(0,1fr)_auto] max-h-[85vh] max-w-2xl overflow-hidden">
        <DialogHeader>
          <DialogTitle>
            {isRevision ? `Revise ${record?.item_code}` : 'Capture artwork'}
          </DialogTitle>
          <DialogDescription>
            {isRevision
              ? 'The state you are replacing is kept in the revision history, files included.'
              : 'Record the barcode and both files for one label or carton. The document number can follow later.'}
          </DialogDescription>
        </DialogHeader>

        {/* Scrolls on its own: with both file pickers and the collapsible open
            the form is taller than a laptop screen, and a dialog that grows
            past it puts "File artwork" out of reach. */}
        <DialogBody className="space-y-4">
          {isRevision ? (
            <div className="rounded-md border bg-muted/40 p-3">
              <p className="font-mono text-xs font-medium">{record?.item_code}</p>
              <p className="text-sm">{record?.item_name}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Currently {record?.document_number || 'not yet numbered'} rev{' '}
                {record?.revision_label} of {record?.revision_date}
              </p>
            </div>
          ) : (
            <SearchableSelect
              inputId="artwork-item"
              label="Label or carton"
              required
              value={itemCode}
              items={pendingItems}
              isLoading={false}
              placeholder="Search by item code or name…"
              defaultDisplayText={
                presetItem ? `${presetItem.item_code} — ${presetItem.item_name}` : undefined
              }
              getItemKey={(item) => item.item_code}
              getItemLabel={(item) => `${item.item_code} — ${item.item_name}`}
              onSearchChange={setItemSearch}
              filterFn={(item, search) =>
                `${item.item_code} ${item.item_name}`.toLowerCase().includes(search.toLowerCase())
              }
              renderItem={(item) => (
                <div className="flex w-full items-center justify-between gap-2">
                  <span>
                    <span className="font-mono text-xs">{item.item_code}</span>{' '}
                    <span className="text-sm">{item.item_name}</span>
                  </span>
                  <Badge variant="outline" className="text-[10px]">
                    {item.sub_group}
                  </Badge>
                </div>
              )}
              loadingText="Loading items…"
              // Only items with nothing on file are offered: an item that
              // already has artwork is revised, never captured a second time.
              emptyText="Every label and carton already has artwork on file."
              notFoundText={`No label or carton matches “${itemSearch}”.`}
              onItemSelect={(item) => setItemCode(item.item_code)}
              onClear={() => setItemCode('')}
            />
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="artwork-date">Revision date *</Label>
              <Input
                id="artwork-date"
                type="date"
                value={revisionDate}
                onChange={(e) => setRevisionDate(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="artwork-barcode">Barcode on the label</Label>
              <Input
                id="artwork-barcode"
                placeholder="e.g. 8906104570123"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Leave blank for a carton that carries none. SAP holds no barcode for these items, so
                this is the only place it is recorded.
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="artwork-pdf">
                <FileText className="mr-1 inline h-3.5 w-3.5" />
                PDF {isRevision ? '' : '*'}
              </Label>
              <Input
                id="artwork-pdf"
                type="file"
                accept={options?.accepted_pdf ?? '.pdf'}
                onChange={(e) => setPdfFile(e.target.files?.[0] ?? null)}
              />
              <p
                className={`text-xs ${oversizePdf ? 'text-destructive' : 'text-muted-foreground'}`}
              >
                {oversizePdf
                  ? `Too large — the limit is ${mb(options?.max_pdf_bytes ?? 0)}.`
                  : isRevision
                    ? 'Leave empty to keep the PDF already on file.'
                    : `Print-ready PDF, up to ${mb(options?.max_pdf_bytes ?? 0)}.`}
              </p>
            </div>
            <div className="space-y-1">
              <Label htmlFor="artwork-cdr">
                <Paintbrush className="mr-1 inline h-3.5 w-3.5" />
                CDR source {isRevision ? '' : '*'}
              </Label>
              <Input
                id="artwork-cdr"
                type="file"
                accept={options?.accepted_cdr ?? '.cdr'}
                onChange={(e) => setCdrFile(e.target.files?.[0] ?? null)}
              />
              <p
                className={`text-xs ${oversizeCdr ? 'text-destructive' : 'text-muted-foreground'}`}
              >
                {oversizeCdr
                  ? `Too large — the limit is ${mb(options?.max_cdr_bytes ?? 0)}.`
                  : isRevision
                    ? 'Leave empty to keep the CDR already on file.'
                    : `CorelDRAW file, up to ${mb(options?.max_cdr_bytes ?? 0)}.`}
              </p>
            </div>
          </div>

          <Collapsible open={moreOpen} onOpenChange={setMoreOpen}>
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-md border bg-muted/30 px-3 py-2 text-left text-sm hover:bg-muted/60"
              >
                <ChevronDown
                  className={`h-4 w-4 shrink-0 transition-transform ${moreOpen ? '' : '-rotate-90'}`}
                />
                <span className="font-medium">More info</span>
                {/* What is inside, said out loud — a field nobody can see is a
                    field nobody knows they have already filled in. */}
                {extras.length > 0 && !moreOpen && (
                  <span className="truncate text-xs text-muted-foreground">
                    {extras.map((field) => field.summary).join(' · ')}
                  </span>
                )}
                {touchedExtras && (
                  <Badge variant="outline" className="ml-auto text-[10px]">
                    Edited
                  </Badge>
                )}
                {!touchedExtras && (
                  <span className="ml-auto text-xs text-muted-foreground">Optional</span>
                )}
              </button>
            </CollapsibleTrigger>

            <CollapsibleContent className="space-y-4 pt-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-1 sm:col-span-2">
                  <Label htmlFor="artwork-doc">Document number</Label>
                  <Input
                    id="artwork-doc"
                    placeholder="As printed on the artwork"
                    value={documentNumber}
                    onChange={(e) => setDocumentNumber(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Leave blank if the artwork has not been given one yet — it can be added by
                    revising later.
                  </p>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="artwork-rev">Revision no.</Label>
                  <Input
                    id="artwork-rev"
                    type="number"
                    min={0}
                    max={999}
                    value={revisionNumber}
                    onChange={(e) => setRevisionNumber(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="artwork-remarks">Remarks</Label>
                <Textarea
                  id="artwork-remarks"
                  rows={2}
                  placeholder="What changed, who approved it…"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                />
              </div>
            </CollapsibleContent>
          </Collapsible>

          {selectedItem && !isRevision && (
            <p className="text-xs text-muted-foreground">
              Filing against {selectedItem.sub_group.toLowerCase()} {selectedItem.item_code}.
            </p>
          )}
        </DialogBody>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!canSave}>
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Upload className="mr-2 h-4 w-4" />
            )}
            {isRevision ? 'Save revision' : 'File artwork'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
