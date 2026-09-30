/**
 * The price sheet as it stands, before it is saved: EXIM's Fetch, as a preview
 * beside what is already saved for today, with Save as today's for those
 * allowed to add prices (or rates).
 *
 * The server reads the sheet every night; this is for a day the purchase team
 * changes it after that, or a night the read failed. The sheet is Google's:
 * when it cannot be read the reason is shown here, where the figures would be.
 * Saving reads the sheet once more and keeps what it shows then; it replaces
 * today's figures and never touches an earlier day.
 */
import { AlertTriangle, ExternalLink, RefreshCw, Save } from 'lucide-react';
import { type ReactNode, useState } from 'react';
import { toast } from 'sonner';

import { StatusPill, TABLE_CLASSES, Td, Th, THEAD_CLASSES } from '@/shared/components';
import {
  Button,
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui';
import { cn, getErrorMessage } from '@/shared/utils';

import {
  usePriceDay,
  usePriceSheet,
  useRateDay,
  useRateSheet,
  useSavePriceSheet,
  useSaveRateSheet,
} from '../../api';
import { fmtMoney, todayISO } from '../../utils';
import { ChangeMark } from './PriceBits';
import {
  changeOf,
  FIGURES,
  longDay,
  orderPacks,
  orderRateCommodities,
  plural,
  PRICE_SHEET_URL,
} from './priceFormat';

/** Header and buttons stay put while the middle scrolls. */
const FRAME = 'grid max-h-[90vh] grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden sm:max-w-4xl';

const SAME = 0.005;

type Standing = 'unsaved' | 'new' | 'same' | 'changed';

function SheetFailure({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-rose-300 bg-rose-50 px-3 py-2.5 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

/** The buttons both dialogs end with: open the sheet, read it again, close, save. */
function SheetFooter({
  sheetUrl,
  canSave,
  saving,
  reading,
  saveDisabled,
  saveLabel,
  onReread,
  onSave,
  onClose,
}: {
  /** The server's link to the sheet; EXIM's published one until it answers. */
  sheetUrl?: string;
  canSave: boolean;
  saving: boolean;
  reading: boolean;
  saveDisabled: boolean;
  saveLabel: string;
  onReread: () => void;
  onSave: () => void;
  onClose: () => void;
}) {
  return (
    <DialogFooter className="gap-2 sm:items-center sm:justify-between sm:space-x-0">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" size="sm" asChild>
          <a href={sheetUrl || PRICE_SHEET_URL} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
            Open the sheet
          </a>
        </Button>
        <Button variant="ghost" size="sm" onClick={onReread} disabled={reading || saving}>
          <RefreshCw className={cn('mr-1.5 h-3.5 w-3.5', reading && 'animate-spin')} />
          {reading ? 'Reading…' : 'Read again'}
        </Button>
      </div>
      <div className="flex flex-col-reverse gap-2 sm:flex-row">
        <Button variant="outline" onClick={onClose} disabled={saving}>
          Close
        </Button>
        {canSave && (
          <Button onClick={onSave} disabled={saveDisabled || saving}>
            <Save className="mr-1.5 h-4 w-4" />
            {saving ? 'Saving…' : saveLabel}
          </Button>
        )}
      </div>
    </DialogFooter>
  );
}

function StandingPill({ standing }: { standing: Standing }) {
  if (standing === 'same') return <StatusPill tone="done">Same</StatusPill>;
  if (standing === 'changed') return <StatusPill tone="warn">Changed</StatusPill>;
  if (standing === 'new') return <StatusPill tone="info">New today</StatusPill>;
  return <StatusPill tone="neutral">Not saved</StatusPill>;
}

function Tally({ children }: { children: ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>;
}

// ---------------------------------------------------------------------------
// Commodity prices
// ---------------------------------------------------------------------------

/** Mounted only while the dialog is open, so the sheet is read afresh each time. */
function PriceSheetBody({
  sheetUrl,
  canSave,
  onSaved,
  onClose,
}: {
  sheetUrl?: string;
  canSave: boolean;
  onSaved: () => void;
  onClose: () => void;
}) {
  const today = todayISO();
  const sheet = usePriceSheet(true);
  const saved = usePriceDay(today);
  const save = useSavePriceSheet();
  const [saveError, setSaveError] = useState('');

  const savedToday = saved.data?.date === today ? saved.data.prices : [];
  const savedBy = new Map(savedToday.map((p) => [p.commodity, p]));
  const onSheet = sheet.data?.prices ?? [];
  const onSheetNames = new Set(onSheet.map((p) => p.commodity));
  const notOnSheet = savedToday.filter((p) => !onSheetNames.has(p.commodity));

  const rows = onSheet.map((p) => {
    const kept = savedBy.get(p.commodity);
    let standing: Standing = 'unsaved';
    if (savedToday.length && !kept) standing = 'new';
    else if (kept)
      standing = FIGURES.every((f) => Math.abs(p[f.key] - kept[f.key]) < SAME) ? 'same' : 'changed';
    return { p, kept, standing };
  });
  const differ = rows.filter((r) => r.standing === 'changed' || r.standing === 'new').length;

  async function onSave() {
    setSaveError('');
    try {
      const result = await save.mutateAsync();
      toast.success(
        `Today's prices saved: ${plural(result.created, 'commodity', 'commodities')} added, ${result.updated} updated`,
      );
      onSaved();
      onClose();
    } catch (error) {
      setSaveError(getErrorMessage(error, 'The prices could not be saved.'));
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>The price sheet, as it stands</DialogTitle>
        <DialogDescription>
          What the purchase team&apos;s sheet shows now, beside what is saved for today,{' '}
          {longDay(today)}.{' '}
          {canSave
            ? 'Nothing changes until you save it as today’s.'
            : 'Saving it as today’s needs the right to add prices.'}
        </DialogDescription>
      </DialogHeader>

      <DialogBody className="space-y-3">
        {sheet.isLoading ? (
          <Tally>Reading the sheet…</Tally>
        ) : sheet.isError ? (
          <SheetFailure
            message={getErrorMessage(sheet.error, 'The price sheet could not be read.')}
          />
        ) : (
          <>
            <Tally>
              {plural(onSheet.length, 'commodity', 'commodities')} on the sheet ·{' '}
              {saved.isLoading
                ? 'reading what is saved for today…'
                : savedToday.length === 0
                  ? 'nothing is saved for today yet'
                  : differ === 0
                    ? 'all as saved for today'
                    : `${differ} differ from what is saved for today`}
            </Tally>
            <div className="overflow-x-auto rounded-lg border">
              <table className={TABLE_CLASSES}>
                <thead className={THEAD_CLASSES}>
                  <tr>
                    <Th>Commodity</Th>
                    {FIGURES.map((f) => (
                      <Th key={f.key} align="right">
                        {f.label} ({f.unit})
                      </Th>
                    ))}
                    <Th align="right">Saved today (factory)</Th>
                    <Th>Against today</Th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(({ p, kept, standing }) => (
                    <tr key={p.commodity} className="border-b last:border-0">
                      <Td className="whitespace-nowrap font-medium">{p.commodity}</Td>
                      {FIGURES.map((f) => (
                        <Td key={f.key} numeric>
                          {fmtMoney(p[f.key])}
                        </Td>
                      ))}
                      <Td numeric className="whitespace-nowrap">
                        {kept ? (
                          <>
                            <span className="block">{fmtMoney(kept.factory_price_kg)}</span>
                            {standing === 'changed' && (
                              <ChangeMark
                                change={changeOf(p.factory_price_kg, kept.factory_price_kg)}
                              />
                            )}
                          </>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </Td>
                      <Td>
                        <StandingPill standing={standing} />
                      </Td>
                    </tr>
                  ))}
                  {notOnSheet.map((p) => (
                    <tr key={p.commodity} className="border-b last:border-0">
                      <Td className="whitespace-nowrap font-medium">{p.commodity}</Td>
                      <Td colSpan={FIGURES.length} className="text-muted-foreground">
                        Not on the sheet now: saving leaves today&apos;s figure as it is
                      </Td>
                      <Td numeric>{fmtMoney(p.factory_price_kg)}</Td>
                      <Td>
                        <StatusPill tone="neutral">Kept</StatusPill>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted-foreground">
              Changed against today is what the sheet shows now minus what was saved, on the factory
              price; the other three figures follow it.
            </p>
          </>
        )}
        {saveError && <SheetFailure message={saveError} />}
      </DialogBody>

      <SheetFooter
        sheetUrl={sheetUrl}
        canSave={canSave}
        saving={save.isPending}
        reading={sheet.isFetching}
        saveDisabled={sheet.isLoading || sheet.isError || onSheet.length === 0}
        saveLabel="Save as today’s"
        onReread={() => void sheet.refetch()}
        onSave={onSave}
        onClose={onClose}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// Jivo's pack rates
// ---------------------------------------------------------------------------

function RateSheetBody({
  sheetUrl,
  canSave,
  onSaved,
  onClose,
}: {
  sheetUrl?: string;
  canSave: boolean;
  onSaved: () => void;
  onClose: () => void;
}) {
  const today = todayISO();
  const sheet = useRateSheet(true);
  const saved = useRateDay(today);
  const save = useSaveRateSheet();
  const [saveError, setSaveError] = useState('');

  const savedToday = saved.data?.date === today ? saved.data.rates : [];
  const savedBy = new Map(savedToday.map((r) => [`${r.pack_type}|${r.commodity}`, r.rate]));
  const onSheet = sheet.data?.rates ?? [];
  const sheetBy = new Map(onSheet.map((r) => [`${r.pack_type}|${r.commodity}`, r.rate]));
  const packs = orderPacks(onSheet.map((r) => r.pack_type));
  const commodities = orderRateCommodities(onSheet.map((r) => r.commodity));
  const notOnSheet = savedToday.filter((r) => !sheetBy.has(`${r.pack_type}|${r.commodity}`));

  const standings = onSheet.map((r): Standing => {
    const kept = savedBy.get(`${r.pack_type}|${r.commodity}`);
    if (!savedToday.length) return 'unsaved';
    if (kept === undefined) return 'new';
    return Math.abs(r.rate - kept) < SAME ? 'same' : 'changed';
  });
  const differ = standings.filter((s) => s === 'changed' || s === 'new').length;

  async function onSave() {
    setSaveError('');
    try {
      const result = await save.mutateAsync();
      toast.success(
        `Today's rates saved: ${plural(result.created, 'rate')} added, ${result.updated} updated`,
      );
      onSaved();
      onClose();
    } catch (error) {
      setSaveError(getErrorMessage(error, 'The rates could not be saved.'));
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Jivo&apos;s rates on the sheet, as they stand</DialogTitle>
        <DialogDescription>
          The sheet&apos;s JIVO RATE table now, a rupee rate a pack, beside what is saved for today,{' '}
          {longDay(today)}.{' '}
          {canSave
            ? 'Nothing changes until you save it as today’s.'
            : 'Saving it as today’s needs the right to add rates.'}
        </DialogDescription>
      </DialogHeader>

      <DialogBody className="space-y-3">
        {sheet.isLoading ? (
          <Tally>Reading the sheet…</Tally>
        ) : sheet.isError ? (
          <SheetFailure
            message={getErrorMessage(sheet.error, 'The price sheet could not be read.')}
          />
        ) : onSheet.length === 0 ? (
          <SheetFailure message="The sheet's JIVO RATE table has no rates in it now." />
        ) : (
          <>
            <Tally>
              {plural(onSheet.length, 'rate')} on the sheet ·{' '}
              {saved.isLoading
                ? 'reading what is saved for today…'
                : savedToday.length === 0
                  ? 'nothing is saved for today yet'
                  : differ === 0
                    ? 'all as saved for today'
                    : `${differ} differ from what is saved for today`}
            </Tally>
            <div className="overflow-x-auto rounded-lg border">
              <table className={TABLE_CLASSES}>
                <thead className={THEAD_CLASSES}>
                  <tr>
                    <Th>Pack</Th>
                    {commodities.map((c) => (
                      <Th key={c} align="right">
                        {c}
                      </Th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {packs.map((pack) => (
                    <tr key={pack} className="border-b last:border-0">
                      <Td className="whitespace-nowrap font-medium">{pack}</Td>
                      {commodities.map((c) => {
                        const rate = sheetBy.get(`${pack}|${c}`);
                        const kept = savedBy.get(`${pack}|${c}`);
                        return (
                          <Td key={c} numeric className="whitespace-nowrap">
                            {rate === undefined ? (
                              <span className="text-muted-foreground">—</span>
                            ) : (
                              <>
                                <span className="block font-medium">{fmtMoney(rate)}</span>
                                {savedToday.length > 0 &&
                                  (kept === undefined ? (
                                    <span className="text-xs text-sky-700 dark:text-sky-300">
                                      new today
                                    </span>
                                  ) : Math.abs(rate - kept) >= SAME ? (
                                    <span
                                      className="text-xs text-amber-700 dark:text-amber-300"
                                      title={`Saved for today at ${fmtMoney(kept)}`}
                                    >
                                      saved {fmtMoney(kept)}
                                    </span>
                                  ) : null)}
                              </>
                            )}
                          </Td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {notOnSheet.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {plural(notOnSheet.length, 'rate')} saved for today{' '}
                {notOnSheet.length === 1 ? 'is' : 'are'} not on the sheet now (
                {notOnSheet.map((r) => `${r.pack_type} ${r.commodity}`).join(', ')}): saving leaves{' '}
                {notOnSheet.length === 1 ? 'it' : 'them'} as saved.
              </p>
            )}
          </>
        )}
        {saveError && <SheetFailure message={saveError} />}
      </DialogBody>

      <SheetFooter
        sheetUrl={sheetUrl}
        canSave={canSave}
        saving={save.isPending}
        reading={sheet.isFetching}
        saveDisabled={sheet.isLoading || sheet.isError || onSheet.length === 0}
        saveLabel="Save as today’s"
        onReread={() => void sheet.refetch()}
        onSave={onSave}
        onClose={onClose}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// The dialogs
// ---------------------------------------------------------------------------

interface SheetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Allowed to save the sheet as today's; without it the dialog only previews. */
  canSave: boolean;
  /** After a save: the page goes back to the latest day, which is now today. */
  onSaved: () => void;
  /** The server's link to the sheet (a day response's `sheet_url`). */
  sheetUrl?: string;
}

export function PriceSheetDialog({
  open,
  onOpenChange,
  canSave,
  onSaved,
  sheetUrl,
}: SheetDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={FRAME}>
        <PriceSheetBody
          sheetUrl={sheetUrl}
          canSave={canSave}
          onSaved={onSaved}
          onClose={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

export function RateSheetDialog({
  open,
  onOpenChange,
  canSave,
  onSaved,
  sheetUrl,
}: SheetDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={FRAME}>
        <RateSheetBody
          sheetUrl={sheetUrl}
          canSave={canSave}
          onSaved={onSaved}
          onClose={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
