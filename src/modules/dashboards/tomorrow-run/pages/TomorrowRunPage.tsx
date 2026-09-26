import '../styles/tomorrow-run.css';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { useChoose, useRebuild, useTomorrowRunPlan } from '../api';
import { Layer } from '../components/Layer';
import { MachinePanel } from '../components/MachinePanel';
import { Legend, MachineCard } from '../components/parts';
import { PickSheet } from '../components/PickSheet';
import {
  Assumed,
  Check,
  HeldTable,
  Inputs,
  Learning,
  Oil,
  Rooms,
  SheetSection,
  Steps,
  WaitCards,
} from '../components/Sections';
import { SheetUpload } from '../components/SheetUpload';
import type { MenuRow, Plan } from '../types';
import { dayName, dShort, T, when } from '../utils/format';

/**
 * Tomorrow's run — the Oil machine plan for the next working day.
 *
 * Read once at 7 pm the evening before from the factory app's own pages (the
 * planning sheet put in here, the production check, stock, the Raw Material
 * Stock page, the Packing Material dashboard, the recipes, the production log)
 * and built by factory_app `tomorrow_run`. Gurvinder veerji taps a machine,
 * picks what should go first and says why; what he leaves alone runs as
 * suggested. Every pick is kept with the three we offered: that is how the
 * plan learns.
 */
export default function TomorrowRunPage() {
  const q = useTomorrowRunPlan();
  const choose = useChoose();
  const rebuild = useRebuild();
  const [openM, setOpenM] = useState<string | null>(null);
  const [sheet, setSheet] = useState<{ m: string; row: MenuRow | null } | null>(null);
  const [upload, setUpload] = useState(false);

  const closeAll = useCallback(() => {
    if (sheet) setSheet(null);
    else if (upload) setUpload(false);
    else setOpenM(null);
  }, [sheet, upload]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closeAll();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [closeAll]);

  useEffect(() => {
    const locked = !!(openM || sheet || upload);
    document.documentElement.classList.toggle('tr-locked', locked);
    return () => document.documentElement.classList.remove('tr-locked');
  }, [openM, sheet, upload]);

  if (q.isLoading) {
    return (
      <div className="tr">
        <div className="tr-wrap">
          <p className="sub">Loading tonight&rsquo;s run…</p>
        </div>
      </div>
    );
  }
  if (q.isError || !q.data) {
    const status = (q.error as { status?: number } | null)?.status;
    return (
      <div className="tr">
        <div className="tr-wrap">
          <h1>Tomorrow&rsquo;s run</h1>
          <p className="sub">
            {status === 403
              ? 'You need the Tomorrow’s run permission to see this page.'
              : `Could not load the run: ${(q.error as { message?: string } | null)?.message || 'unknown error'}.`}
          </p>
        </div>
      </div>
    );
  }

  const { plan, meta, check } = q.data;
  const busy = choose.isPending;

  const readAgain = () =>
    rebuild.mutate(undefined, {
      onSuccess: () => {
        setUpload(false);
        toast.success('Read again: the plan is built from tonight’s numbers.');
      },
    });

  const save = (m: string, job: string, why: string, other = '') => {
    if (!plan) return;
    choose.mutate(
      { for_date: plan.for_date, machine: m, job, why, other },
      {
        onSuccess: () => {
          setSheet(null);
          toast.success(
            job === 'other'
              ? `Saved. ${m}: "${other}" is kept with your reason; the machine runs as suggested until the plan knows it.`
              : job
                ? `Saved. ${m} runs it first; the day is re-timed.`
                : `${m} is back to the suggestion.`,
          );
        },
      },
    );
  };

  const actions = meta.can_manage ? (
    <div className="tr-actions">
      <button type="button" className="btn" onClick={() => setUpload(true)}>
        Put in a planning sheet
      </button>
      <button type="button" className="btn" disabled={rebuild.isPending} onClick={readAgain}>
        {rebuild.isPending ? 'Reading…' : 'Read again now'}
      </button>
    </div>
  ) : null;

  const uploadWindow = upload ? (
    <Layer>
      <SheetUpload
        onClose={() => setUpload(false)}
        onReadAgain={readAgain}
        reading={rebuild.isPending}
      />
    </Layer>
  ) : null;

  if (!plan) {
    return (
      <div className="tr">
        <div className="tr-wrap">
          <h1>Tomorrow&rsquo;s run</h1>
          <p className="sub">
            No plan has been read yet. The plan is read at 7 pm each evening from the newest
            planning sheet put in on this page
            {meta.can_manage
              ? ': put the sheet in, then read the plan now.'
              : '; the planning team puts the sheet in.'}
          </p>
          {actions}
        </div>
        {uploadWindow}
      </div>
    );
  }

  return (
    <div className="tr">
      <div className="tr-wrap" inert={openM || upload ? true : undefined}>
        <PlanBody
          plan={plan}
          onOpen={setOpenM}
          actions={actions}
          builtBy={meta.built_by}
          readAt={meta.read_at}
        />
        <Check check={check} />
        <p className="small">
          Every number here is read from a source named above or computed from those. Speeds are
          running speeds from the PDF, not shift output.
        </p>
      </div>
      {openM ? (
        <Layer>
          <div inert={sheet ? true : undefined}>
            <MachinePanel
              plan={plan}
              m={openM}
              canPick={meta.can_pick}
              busy={busy}
              onClose={() => setOpenM(null)}
              onPick={(r) => setSheet({ m: openM, row: r })}
              onOther={() => setSheet({ m: openM, row: null })}
              onClear={() => save(openM, '', '')}
            />
          </div>
        </Layer>
      ) : null}
      {sheet ? (
        <Layer>
          <PickSheet
            key={`${sheet.m}-${sheet.row?.job || 'other'}`}
            plan={plan}
            m={sheet.m}
            row={sheet.row}
            reasons={meta.reasons}
            you={meta.you}
            busy={busy}
            onCancel={() => setSheet(null)}
            onSave={(why, other) => save(sheet.m, sheet.row ? sheet.row.job : 'other', why, other)}
          />
        </Layer>
      ) : null}
      {uploadWindow}
    </div>
  );
}

function PlanBody({
  plan: d,
  onOpen,
  actions,
  builtBy,
  readAt,
}: {
  plan: Plan;
  onOpen: (m: string) => void;
  actions: React.ReactNode;
  builtBy: string;
  readAt: string | null;
}) {
  const S = d.sheet;
  const order = d.machine_order?.length ? d.machine_order : Object.keys(d.machines);
  const tot = d.total_l;
  const cls = tot >= d.target.good_l ? 'good' : tot >= d.target.target_l ? '' : 'warn';
  const running = order.filter((m) => d.machines[m]?.jobs.length).length;
  const po = d.pending.filter((p) => p.kind === 'order');
  const poT = po.reduce((a, p) => a + (p.tons || 0), 0);

  return (
    <>
      <header className="hero">
        <div>
          <h1>Tomorrow&rsquo;s run</h1>
          <p className="date">{dayName(d.for_date)}</p>
          {actions}
        </div>
        <dl className="facts">
          <div>
            <dt>Read</dt>
            <dd>
              {when(readAt || d.run_at)}
              {builtBy && builtBy !== 'the 7 pm read' ? ` by ${builtBy}` : ''}, once a day at 7 pm
              the evening before. It stands all day.
            </dd>
          </div>
          <div>
            <dt>Sheet</dt>
            <dd>
              What to make comes from{' '}
              {S.file ? S.file.replace(/\.xlsx$/i, '') : 'the planning sheet'}
            </dd>
          </div>
          <div>
            <dt>Clock</dt>
            <dd>Every machine starts 7:30 am. 1 T = 1,000 L.</dd>
          </div>
        </dl>
      </header>
      {d.warnings.length ? (
        <ul className="tr-warn">
          {d.warnings.map((w, i) => (
            <li key={i}>{w}</li>
          ))}
        </ul>
      ) : null}
      <div className="row">
        <div className={`tile ${cls}`}>
          <div className="k">Tomorrow we make</div>
          <div className="v num">{T(tot)}</div>
          <div className="s">
            target {T(d.target.target_l)} · good {T(d.target.good_l)}
          </div>
        </div>
        <div className="tile">
          <div className="k">Left on the sheet</div>
          <div className="v num">{T(S.left_l)}</div>
          <div className="s">
            of {T(S.need_l)} · made {T(S.made_l)} since {dShort(S.from_date)}
          </div>
        </div>
        <div className={`tile ${S.per_day_needed_l && tot < S.per_day_needed_l ? 'warn' : ''}`}>
          <div className="k">Needed a day</div>
          <div className="v num">{S.per_day_needed_l ? T(S.per_day_needed_l) : '—'}</div>
          <div className="s">
            {S.work_days_left || 0} working days to{' '}
            {S.month_end ? dShort(S.month_end) : 'month end'}, Sundays off
          </div>
        </div>
        <div className="tile">
          <div className="k">Machines running</div>
          <div className="v num">
            {running} of {order.length}
          </div>
          <div className="s">every machine starts 7:30 am · one session = till 7:30 pm</div>
        </div>
      </div>

      <h2>The machines</h2>
      <p className="sub">
        Tap a machine to see everything it can run tomorrow. Pick what should go first and say why;
        what you leave alone runs as suggested. Every pick is kept with the three we offered, and
        that is how the plan learns.
      </p>
      <Legend />
      <div className="mgrid">
        {order.map((m) => (
          <MachineCard key={m} plan={d} m={m} onOpen={onOpen} />
        ))}
      </div>

      <Learning plan={d} />

      <h2>
        Waiting for another day{' '}
        <span className="sub">
          · {po.length} lines · {T(poT * 1000)} · still on the sheet tomorrow night
        </span>
      </h2>
      <WaitCards list={po} />

      <h2>
        How we got here <span className="sub">· the board, step by step, in tons</span>
      </h2>
      <Steps plan={d} />
      <Rooms plan={d} />

      <SheetSection plan={d} />

      <Oil plan={d} />
      <HeldTable plan={d} />
      <Inputs inputs={d.inputs} />
      <Assumed plan={d} />
    </>
  );
}
