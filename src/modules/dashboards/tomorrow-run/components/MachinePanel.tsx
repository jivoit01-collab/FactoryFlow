import { useEffect, useRef } from 'react';

import type { MenuRow, Plan } from '../types';
import { finTxt, nice, T } from '../utils/format';
import { menuOf, ranTxt } from '../utils/plan';
import { ICON } from './Icons';
import { DayBar, MachineIcon, OptionBox } from './parts';

/**
 * The machine panel: opens over the page, never bigger than the screen; our
 * top three on the left, everything else that fits on the right.
 */
export function MachinePanel({
  plan,
  m,
  canPick,
  busy,
  onClose,
  onPick,
  onOther,
  onClear,
}: {
  plan: Plan;
  m: string;
  canPick: boolean;
  busy: boolean;
  onClose: () => void;
  onPick: (r: MenuRow) => void;
  onOther: () => void;
  onClear: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    closeRef.current?.focus({ preventScroll: true });
  }, [m]);

  const v = plan.machines[m];
  const menu = menuOf(plan, m);
  const on = v.jobs.length > 0;
  const pkd = menu.picked;
  const top = menu.top3
    .map((id) => menu.rows.find((r) => r.job === id))
    .filter(Boolean) as MenuRow[];
  const rest = menu.rows.filter((r) => !menu.top3.includes(r.job));
  const pick = canPick && !busy ? onPick : undefined;

  let status = '';
  if (pkd && !pkd.on_plan) {
    status =
      pkd.job === 'other'
        ? 'Typed in, not on tomorrow’s list. Kept for the learning; the machine runs as suggested until the plan knows it.'
        : 'It could not go on this machine. The reason is on its box.';
  }

  return (
    <div className="tr-panel" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="panel-box" role="dialog" aria-modal="true" aria-labelledby="tr-panel-t">
        <div className="p-head">
          <MachineIcon plan={plan} m={m} lg />
          <div className="p-ttl">
            <h2 id="tr-panel-t">{m}</h2>
            <p>
              {on
                ? `${T(v.litres)} tomorrow, done by ${finTxt(v.finish)}`
                : 'Nothing planned tomorrow'}
            </p>
            <p className="small">Last run: {ranTxt(v)}</p>
          </div>
          <button
            ref={closeRef}
            type="button"
            className="x"
            aria-label={`Close ${m}`}
            onClick={onClose}
          >
            {ICON.close}
          </button>
        </div>
        <div className="p-day">
          <DayBar plan={plan} v={v} />
          <div className="p-scale">
            <span>7:30 am</span>
            <span>7:30 pm</span>
          </div>
        </div>
        <div className={`p-body${menu.rows.length ? '' : ' one'}`}>
          <section className="p-col p-main" aria-labelledby="tr-p-top">
            {pkd ? (
              <div className="p-pick">
                <div className="who">
                  {ICON.check}
                  <span>
                    {pkd.by || 'Gurvinder veerji'} {pkd.job === 'other' ? 'wants' : 'picked'}{' '}
                    {pkd.job === 'other' ? pkd.other || pkd.name : nice(pkd.name)}
                    {pkd.rank ? ` (our #${pkd.rank})` : ''}
                  </span>
                </div>
                <div className="why-row">
                  {pkd.why ? (
                    <q>{pkd.why}</q>
                  ) : (
                    <span className="small">Tapped before the page asked why.</span>
                  )}
                  {canPick ? (
                    <button type="button" className="link" disabled={busy} onClick={onClear}>
                      Go back to our suggestion
                    </button>
                  ) : null}
                </div>
                {status ? <div className="small">{status}</div> : null}
              </div>
            ) : null}
            <h3 id="tr-p-top">Our top three</h3>
            {!menu.rows.length ? (
              <p className="empty">Nothing on tomorrow&rsquo;s list can run on this machine.</p>
            ) : top.length ? (
              <>
                <div className="top3">
                  {top.map((r) => (
                    <OptionBox key={r.job} plan={plan} r={r} menu={menu} onPick={pick} />
                  ))}
                </div>
                {top.length < 3 ? (
                  <p className="small">
                    Only {top.length === 1 ? 'one is' : 'two are'} worth running here.
                  </p>
                ) : null}
              </>
            ) : (
              <p className="empty">Nothing here is worth its changeover tomorrow.</p>
            )}
            {canPick ? (
              <button type="button" className="p-other" disabled={busy} onClick={onOther}>
                None of these? Type what should run first
              </button>
            ) : (
              <p className="small tr-readonly">
                You can see the plan; picking what runs first needs the picking right.
              </p>
            )}
          </section>
          {menu.rows.length ? (
            <section className="p-col p-rest" aria-labelledby="tr-p-rest">
              <h3 id="tr-p-rest">
                Everything else that fits <span className="count">{rest.length}</span>
              </h3>
              {rest.length ? (
                <div className="opt-grid">
                  {rest.map((r) => (
                    <OptionBox key={r.job} plan={plan} r={r} menu={menu} onPick={pick} />
                  ))}
                </div>
              ) : (
                <p className="empty">Nothing else fits this machine tomorrow.</p>
              )}
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}
