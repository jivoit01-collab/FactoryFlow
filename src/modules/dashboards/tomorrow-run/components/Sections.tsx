import { Fragment, type ReactNode } from 'react';

import type { Held, InputRow, Pending, PileRow, Plan, PlanCheck } from '../types';
import {
  cap,
  dayName,
  dShort,
  GROUPS,
  grp,
  n0,
  nice,
  pct,
  SHAPE,
  T,
  Tl,
  when,
} from '../utils/format';
import { ICON, WAIT_ICON } from './Icons';
import { Legend, Masonry, Pk } from './parts';

// ---------------------------------------------------------------------------
// Waiting for another day — one card per reason, the lines inside grouped by
// what they share: the missing oil or packaging item, or the pack size.
// ---------------------------------------------------------------------------

const WAIT = [
  {
    k: 'oil',
    title: 'Short of oil',
    says: 'The oil on hand tonight does not cover these.',
    test: (w: string) => w === 'no oil',
    by: 'material',
    unit: ['oil', 'oils'],
  },
  {
    k: 'pack',
    title: 'Short of packaging',
    says: 'A bottle, carton, cap, label, tin or film ran out.',
    test: (w: string) =>
      /^no (bottles|cartons|caps|labels|pouch film|packaging|tins?|film)$/.test(w),
    by: 'material',
    unit: ['packaging item', 'packaging items'],
  },
  {
    k: 'time',
    title: 'Machines are full',
    says: 'The machines that make these are full tomorrow.',
    test: (w: string) => w === 'no time',
    by: 'pack',
    unit: ['pack size', 'pack sizes'],
  },
  {
    k: 'machine',
    title: 'No machine makes it',
    says: 'No machine on the board fills this pack or this oil.',
    test: (w: string) => w === 'no machine',
    by: 'pack',
    unit: ['pack size', 'pack sizes'],
  },
  {
    k: 'other',
    title: 'Other reasons',
    says: '',
    test: () => true,
    by: 'reason',
    unit: ['reason', 'reasons'],
  },
] as const;

/** "REFINED SUNFLOWER OIL — 20,000 L on hand (…)" -> what ran short, its code, how much is on hand */
function matOf(p: Pending) {
  const [head, rest = ''] = String(p.reason_detail || '').split(' — ');
  const code = (head.match(/\(((?:PM|RM)\d+)\)/) || [])[1] || '';
  const have =
    ((rest.match(/^.*?on hand/) || [rest.split(' (')[0]])[0] || '') +
    (/not on the Raw Material Stock page/.test(rest) ? ', not on the stock page' : '');
  return {
    key: head,
    name: nice(head.replace(/\s*\((?:PM|RM)\d+\)/, '')),
    sub: [have, code].filter(Boolean).join(' · '),
  };
}

const tonsOf = (p: Pending) => p.tons || 0;
const amt = (p: Pending) => (p.tons != null ? Tl(p.tons * 1000) : `${n0(p.pcs)} pcs`);

export function WaitCards({ list }: { list: Pending[] }) {
  const left = new Set(list);
  const cards: { key: string; tot: number; node: ReactNode }[] = [];
  for (const c of WAIT) {
    const rows = [...left].filter((p) => c.test(p.reason_word || ''));
    if (!rows.length) continue;
    rows.forEach((p) => left.delete(p));
    const groups: Record<string, { key: string; name: string; sub: string; rows: Pending[] }> = {};
    rows.forEach((p) => {
      const g =
        c.by === 'material'
          ? matOf(p)
          : c.by === 'pack'
            ? {
                key: grp(p).k,
                name: grp(p).k === 'other' ? 'Other packs' : grp(p).title.split(' · ')[0],
                sub: '',
              }
            : { key: p.reason_word, name: cap(p.reason_word || 'other'), sub: '' };
      (groups[g.key] = groups[g.key] || { ...g, rows: [] }).rows.push(p);
    });
    const gs = Object.values(groups).sort(
      (a, b) =>
        b.rows.reduce((x, p) => x + tonsOf(p), 0) - a.rows.reduce((x, p) => x + tonsOf(p), 0),
    );
    if (c.by === 'pack') {
      gs.forEach((g) => {
        const sizes = [...new Set(g.rows.map((p) => String(p.pack || '?')))];
        g.sub = sizes.every((s) => g.name.toLowerCase().includes(s.toLowerCase()))
          ? ''
          : sizes.join(', ');
      });
    }
    const tot = rows.reduce((a, p) => a + tonsOf(p), 0);
    cards.push({
      key: c.k,
      tot,
      node: (
        <section className="wcard" aria-labelledby={`wc-${c.k}`}>
          <div className="wc-head">
            <span className={`wc-ico ${c.k}`}>{WAIT_ICON[c.k]}</span>
            <span className="wc-t">{T(tot * 1000)}</span>
          </div>
          <h3 className="wc-name" id={`wc-${c.k}`}>
            {c.title}
          </h3>
          <p className="wc-says">
            {rows.length} line{rows.length > 1 ? 's' : ''}
            {c.says ? `. ${c.says}` : ''}
          </p>
          <details className="sh-list">
            <summary>Show the {gs.length === 1 ? c.unit[0] : `${gs.length} ${c.unit[1]}`}</summary>
            <div className="wc-groups">
              {gs.map((g) => {
                const gt = g.rows.reduce((a, p) => a + tonsOf(p), 0);
                return (
                  <details className="wg" key={g.key}>
                    <summary>
                      <span className="wg-name">{g.name}</span>
                      <span className="wg-t">{T(gt * 1000)}</span>
                      <span className="wg-sub">
                        {[g.sub, `${g.rows.length} item${g.rows.length > 1 ? 's' : ''}`]
                          .filter(Boolean)
                          .join(' · ')}
                      </span>
                    </summary>
                    <ul className="wg-items">
                      {[...g.rows]
                        .sort((a, b) => tonsOf(b) - tonsOf(a))
                        .map((p, i) => (
                          <li key={`${p.code}-${i}`}>
                            <Pk r={p} />
                            <span className="wi-n">
                              {nice(p.name)}
                              {p.partial ? <span className="tag part">part made</span> : null}
                            </span>
                            <span className="wi-t">{amt(p)}</span>
                          </li>
                        ))}
                    </ul>
                  </details>
                );
              })}
            </div>
          </details>
        </section>
      ),
    });
  }
  return <Masonry cards={cards} />;
}

// ---------------------------------------------------------------------------
// How we got here
// ---------------------------------------------------------------------------

export function Steps({ plan }: { plan: Plan }) {
  const S = plan.sheet;
  const heldT = plan.held_at_step5.reduce((a, x) => a + (x.tons_wanted || 0), 0);
  return (
    <div className="steps">
      <div className="step" style={{ flexBasis: 300 }}>
        <div className="k">1 · The planning sheet</div>
        <div className="v num">{T(S.need_l)}</div>
        <div className="s">
          Net Req: the month&rsquo;s plan + ecom − the stock in BH-PF and BH-BT on{' '}
          {S.stock_date ? dShort(S.stock_date) : '—'}
        </div>
      </div>
      <div className="step">
        <div className="k">2 · Made since {dShort(S.from_date)}</div>
        <div className="v num">{T(S.made_l)}</div>
        <div className="s">finished goods received into BH-PF, sheet items only</div>
      </div>
      <div className="step">
        <div className="k">3 · Left to make</div>
        <div className="v num">{T(plan.to_make.litres)}</div>
        <div className="s">{plan.to_make.skus} items</div>
      </div>
      <div className="step">
        <div className="k">5 · Held: no oil, packaging or room</div>
        <div className="v num">{T(heldT * 1000)}</div>
        <div className="s">{plan.held_at_step5.length} lines</div>
      </div>
      <div className="step">
        <div className="k">6 · Final list</div>
        <div className="v num">{T(plan.final_list.litres)}</div>
        <div className="s">{plan.final_list.skus} items to the machines</div>
      </div>
      <div className="step">
        <div className="k">Placed on machines</div>
        <div className="v num">{T(plan.total_l)}</div>
        <div className="s">the rest waits: no time</div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// The planning sheet: what the month still needs, one card per pack
// ---------------------------------------------------------------------------

export function SheetSection({ plan }: { plan: Plan }) {
  const S = plan.sheet;
  const P = plan.pile;
  const off = new Set((S.sheet_vs_board || []).map((x) => x.code));
  const leftTxt = (r: PileRow) =>
    r.net_l < 0 ? (
      <span className="sh-tag">over-stocked</span>
    ) : r.left_l <= 0 ? (
      <span className="sh-tag ok">done</span>
    ) : (
      T(r.left_l)
    );
  const cards = GROUPS.map((g) => ({ g, rows: P.rows.filter((r) => grp(r) === g) }))
    .filter((x) => x.rows.length)
    .map(({ g, rows }) => {
      const need = rows.reduce((a, r) => a + (r.need_l || 0), 0);
      const made = rows.reduce((a, r) => a + (r.made_l || 0), 0);
      const left = rows.reduce((a, r) => a + (r.left_l || 0), 0);
      const [name, sizes] = g.title.split(' · ');
      return {
        key: g.k,
        tot: left,
        node: (
          <section
            className={`wcard sh-card ${g.cls}`}
            aria-label={`${name} on the planning sheet`}
          >
            <div className="wc-head">
              <span className="ico">{ICON[SHAPE[g.k]]}</span>
              <span className="wc-t">
                {T(left)}
                <small>left</small>
              </span>
            </div>
            <h3 className="wc-name">{name}</h3>
            <p className="wc-says">
              {rows.length} item{rows.length > 1 ? 's' : ''}
              {sizes ? `, ${sizes}` : ''}. Made {T(made)} of {T(need)}.
            </p>
            <span className="sh-bar" aria-hidden="true">
              <i style={{ width: `${pct(made, need).toFixed(1)}%` }} />
            </span>
            <details className="sh-list">
              <summary>Show the {rows.length === 1 ? 'item' : `${rows.length} items`}</summary>
              <ul className="sh-items">
                {[...rows]
                  .sort((a, b) => (b.left_l || 0) - (a.left_l || 0))
                  .map((r) => (
                    <li className="sh-item" key={r.code}>
                      <span className="sh-n">{nice(r.name)}</span>
                      <span className="sh-left">{leftTxt(r)}</span>
                      <span className="sh-meta">
                        <span className="sh-m">
                          {(r.sheet_machine || []).join(' / ') || 'no machine on the sheet'}
                        </span>
                        {off.has(r.code) ? (
                          <span className="sh-m board">
                            board: {(r.board_machines || []).join(' / ') || 'no machine'}
                          </span>
                        ) : null}
                        <span className="sh-nums">
                          on the sheet {T(r.need_l)} · made {T(r.made_l)}
                        </span>
                      </span>
                      {r.via ? <span className="sh-via">{r.via}</span> : null}
                    </li>
                  ))}
              </ul>
            </details>
          </section>
        ),
      };
    });
  return (
    <>
      <h2>
        The planning sheet{' '}
        <span className="sub">
          · {P.rows.length} items · {T(S.left_l)} left
        </span>
      </h2>
      <div className="sh-sum">
        <div className="sh-big">
          <div className="k">Left on the sheet</div>
          <div className="v num">{T(S.left_l)}</div>
          <div className="s">
            of {T(S.need_l)} on the sheet. {T(S.made_l)} made since {dShort(S.from_date)}.
          </div>
          <span className="sh-bar big" aria-hidden="true">
            <i style={{ width: `${pct(S.made_l, S.need_l).toFixed(1)}%` }} />
          </span>
        </div>
        <dl className="facts sh-facts">
          <div>
            <dt>File</dt>
            <dd>{S.file || 'no sheet'}</dd>
          </div>
          <div>
            <dt>Stock</dt>
            <dd>Taken off as at {dShort(S.stock_date)}</dd>
          </div>
          <div>
            <dt>Made</dt>
            <dd>What the plant made counts from {dShort(S.from_date)}</dd>
          </div>
          <div>
            <dt>Machine</dt>
            <dd>
              Each item shows what the sheet says. The machines are still chosen by the
              board&rsquo;s rules
              {(S.sheet_vs_board || []).length
                ? `; ${S.sheet_vs_board.length} items differ, marked "board"`
                : ''}
              .
            </dd>
          </div>
        </dl>
      </div>
      <Masonry cards={cards} />
      {(S.made_not_on_sheet || []).length ? (
        <div className="sh-extra">
          <b>Made since {dShort(S.from_date)} but not on the sheet</b>
          <ul>
            {S.made_not_on_sheet.map((x) => (
              <li key={x.code}>
                <span>{nice(x.name)}</span>
                <b>{T(x.litres)}</b>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </>
  );
}

// ---------------------------------------------------------------------------
// What was picked, and why
// ---------------------------------------------------------------------------

export function Learning({ plan }: { plan: Plan }) {
  const L = plan.learning || { picks: [], n: 0, was_first: 0, in_top3: 0 };
  return (
    <>
      <h2>What was picked, and why</h2>
      <p className="sub">
        {L.n
          ? `${L.n} pick${L.n > 1 ? 's' : ''} so far. The pick was already our #1 in ${L.was_first} of them, and in our top three in ${L.in_top3}.`
          : 'No picks yet.'}{' '}
        Each pick is kept with the three we offered and the reason given. When the same reason keeps
        coming back, it can become a rule in the ranking.
      </p>
      {L.n ? (
        <div className="tw">
          <table>
            <thead>
              <tr>
                <th>Day</th>
                <th>Machine</th>
                <th>Picked</th>
                <th className="r">Our #</th>
                <th>We offered</th>
                <th>Why</th>
                <th>By</th>
              </tr>
            </thead>
            <tbody>
              {L.picks.map((p, i) => (
                <tr key={i}>
                  <td className="small">{dShort(p.for_date)}</td>
                  <td>{p.machine}</td>
                  <td>{p.job === 'other' ? p.other || p.name : nice(p.name)}</td>
                  <td className="r">
                    <b>{p.rank ?? '—'}</b>
                  </td>
                  <td className="small">
                    {(p.top3 || []).map((t) => (
                      <div key={t.job}>
                        #{t.rank} {nice(t.name)}
                      </div>
                    ))}
                  </td>
                  <td>{p.why}</td>
                  <td className="small">{p.by || ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </>
  );
}

// ---------------------------------------------------------------------------
// The folding sections
// ---------------------------------------------------------------------------

export function Rooms({ plan }: { plan: Plan }) {
  const R = plan.have.rooms;
  return (
    <details>
      <summary>
        Room in the two godowns{' '}
        <span>
          {Object.entries(R)
            .map(([r, v]) => `${r} ${T(v.free_l)} free`)
            .join(' · ')}
        </span>
      </summary>
      <div className="tw">
        <table>
          <thead>
            <tr>
              <th>Room</th>
              <th className="r">Stock tonight</th>
              <th className="r">Leaves in a day</th>
              <th className="r">Standing tomorrow</th>
              <th className="r">Your limit</th>
              <th className="r">Free</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(R).map(([r, v]) => (
              <tr key={r}>
                <td>{r}</td>
                <td className="r">{T(v.stock_tonight_l)}</td>
                <td className="r">
                  {T(v.left_tomorrow_l)}
                  <div className="small">{v.left_basis}</div>
                </td>
                <td className="r">{T(v.standing_tomorrow_l)}</td>
                <td className="r">{T(v.limit_l)}</td>
                <td className="r">
                  <b>{T(v.free_l)}</b>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {(plan.have.left_days || []).length ? (
        <p className="small">
          What left BH-BT + BH-PF each working day — stock the night before + received into BH-PF
          that day − stock that night:{' '}
          {plan.have.left_days.map((x) => `${dShort(x.date)} ${T(x.left_l)}`).join(' · ')} ·{' '}
          <b>average {T(plan.have.left_avg_l)}</b>. It counts every way goods leave: trucks at the
          gate and transfers to Gupta.
        </p>
      ) : null}
    </details>
  );
}

export function Oil({ plan }: { plan: Plan }) {
  const oil = plan.limits.oil || [];
  return (
    <details>
      <summary>
        Oil on the floor, from the Raw Material Stock page{' '}
        <span>{T(oil.reduce((a, o) => a + o.have_l, 0))}</span>
      </summary>
      <div className="tw">
        <table>
          <thead>
            <tr>
              <th>Oil</th>
              <th className="r">Tonight</th>
              <th className="r">Left after the plan</th>
              <th>From</th>
            </tr>
          </thead>
          <tbody>
            {oil.slice(0, 16).map((o) => (
              <tr key={o.rm}>
                <td>{nice(o.name)}</td>
                <td className="r">{T(o.have_l)}</td>
                <td className={`r${o.left_l < 1000 ? ' why red' : ''}`}>{T(o.left_l)}</td>
                <td className="small">{o.source}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

const wordCls = (w: string | null | undefined) => (/time/.test(w || '') ? 'amber' : 'red');

/** Held at the material check, grouped by pack, then by what is stopping it. */
export function HeldTable({ plan }: { plan: Plan }) {
  const held = plan.held_at_step5;
  const heldT = held.reduce((a, x) => a + (x.tons_wanted || 0), 0);
  const body: ReactNode[] = [];
  for (const g of GROUPS) {
    const rs = held.filter((r) => grp(r) === g);
    if (!rs.length) continue;
    const tons = rs.reduce((a, r) => a + (r.tons_wanted || 0), 0);
    body.push(
      <tr className="g" key={`g-${g.k}`}>
        <td colSpan={4} className={g.cls}>
          {g.title}
          <span className="gs">
            {rs.length} item{rs.length > 1 ? 's' : ''} · {T(tons * 1000)}
          </span>
        </td>
      </tr>,
    );
    const buckets: Record<string, Held[]> = {};
    rs.forEach((r) =>
      (buckets[r.reason_word || 'other'] = buckets[r.reason_word || 'other'] || []).push(r),
    );
    const order = Object.entries(buckets).sort(
      (a, b) =>
        b[1].reduce((x, r) => x + (r.tons_wanted || 0), 0) -
        a[1].reduce((x, r) => x + (r.tons_wanted || 0), 0),
    );
    for (const [word, brs] of order) {
      const bt = brs.reduce((a, r) => a + (r.tons_wanted || 0), 0);
      body.push(
        <tr className="sg" key={`s-${g.k}-${word}`}>
          <td colSpan={4}>
            <span className={`why ${wordCls(word)}`}>{word}</span>
            <span className="gs">
              {brs.length} item{brs.length > 1 ? 's' : ''} · {T(bt * 1000)}
            </span>
          </td>
        </tr>,
      );
      [...brs]
        .sort((a, b) => (b.tons_wanted || 0) - (a.tons_wanted || 0))
        .forEach((x, i) =>
          body.push(
            <tr key={`r-${g.k}-${word}-${x.code}-${i}`}>
              <td>
                <Pk r={x} />
                {nice(x.name)}
                {x.partial ? <span className="tag part">part made</span> : null}
              </td>
              <td className="r">
                <b>{x.tons_wanted != null ? T(x.tons_wanted * 1000) : `${n0(x.want_pcs)} pcs`}</b>
              </td>
              <td>
                <span className={`why ${wordCls(x.reason_word)}`}>{x.reason_word}</span>
              </td>
              <td className="small">
                {x.reason_detail || ''}
                {x.via ? <div className="via">{x.via}</div> : null}
              </td>
            </tr>,
          ),
        );
    }
  }
  return (
    <details>
      <summary>
        Held at the material check{' '}
        <span>
          {held.length} lines · {T(heldT * 1000)}
        </span>
      </summary>
      <Legend />
      <div className="tw">
        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th className="r">Wanted</th>
              <th>Why</th>
              <th>In one line</th>
            </tr>
          </thead>
          <tbody>{body}</tbody>
        </table>
      </div>
    </details>
  );
}

function Numbers({ v }: { v: unknown }) {
  if (v == null) return <>—</>;
  if (typeof v !== 'object') return <>{typeof v === 'number' ? n0(v) : String(v)}</>;
  return (
    <>
      {Object.entries(v as Record<string, unknown>).map(([k, x]) => (
        <div key={k}>
          {k.replace(/_/g, ' ')}:{' '}
          {x !== null && typeof x === 'object'
            ? Array.isArray(x)
              ? x
                  .map((y) =>
                    typeof y === 'object' && y ? Object.values(y as object).join(' ') : String(y),
                  )
                  .join(', ')
              : Object.entries(x as Record<string, unknown>)
                  .map(
                    ([k2, y]) =>
                      `${k2.replace(/_/g, ' ')} ${typeof y === 'number' ? n0(y) : String(y)}`,
                  )
                  .join(', ')
            : typeof x === 'number'
              ? n0(x)
              : String(x)}
        </div>
      ))}
    </>
  );
}

export function Inputs({ inputs }: { inputs: InputRow[] }) {
  return (
    <details>
      <summary>
        The inputs it read{' '}
        <span>
          {inputs.filter((i) => i.ok).length} of {inputs.length} rows live
        </span>
      </summary>
      <div className="tw">
        <table>
          <thead>
            <tr>
              <th>Input</th>
              <th>App · page</th>
              <th>Number tonight</th>
              <th>Read at</th>
            </tr>
          </thead>
          <tbody>
            {inputs.map((i, n) => (
              <tr key={n}>
                <td>{i.input}</td>
                <td>
                  {i.app || ''}
                  {i.url ? <div className="small">{i.url.replace(/^https?:\/\//, '')}</div> : null}
                </td>
                <td className="small num">
                  <Numbers v={i.number} />
                </td>
                <td className={i.ok === false ? 'why red' : 'small'}>
                  {i.ok === false
                    ? `FAILED: ${i.error}`
                    : i.error
                      ? i.error
                      : i.fetched_at
                        ? i.fetched_at.length > 12
                          ? when(i.fetched_at)
                          : i.fetched_at
                        : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

export function Assumed({ plan }: { plan: Plan }) {
  return (
    <details>
      <summary>
        What is assumed <span>{plan.assumed.length} lines</span>
      </summary>
      <ul>
        {plan.assumed.map((a, i) => (
          <li className="small" key={i}>
            {a}
          </li>
        ))}
      </ul>
      {plan.warnings.length ? (
        <ul>
          {plan.warnings.map((w, i) => (
            <li className="why red" key={i}>
              {w}
            </li>
          ))}
        </ul>
      ) : null}
    </details>
  );
}

/** The 7 pm check: last night's plan for today, beside what really happened. */
export function Check({ check }: { check: PlanCheck | null }) {
  if (!check || !check.rows) return null;
  const red = check.rows.filter((r) => r.state === 'red');
  const word: Record<string, string> = {
    red: 'red',
    green: 'ok',
    running: 'still running',
    'no record': 'no record',
  };
  const cls: Record<string, string> = {
    red: 'red',
    green: 'green',
    running: 'amber',
    'no record': '',
  };
  return (
    <div className="tr-check">
      <details>
        <summary>
          Plan vs plant on {dShort(check.for_date)}{' '}
          <span>
            {red.length} of {check.rows.length} different · checked {when(check.run_at)}
          </span>
        </summary>
        <p className="small">
          Last night&rsquo;s plan for {dayName(check.for_date)}, beside what the plant really did up
          to 7 pm. 10% off is red; some lines are red the moment they happen at all. It only tells
          you — the plan never reads it.
        </p>
        <div className="tw">
          <table>
            <thead>
              <tr>
                <th />
                <th>What</th>
                <th>The plan</th>
                <th>What happened</th>
              </tr>
            </thead>
            <tbody>
              {check.rows.map((r, i) => (
                <Fragment key={i}>
                  <tr>
                    <td>
                      <span className={`why ${cls[r.state] || ''}`}>
                        {word[r.state] || r.state}
                      </span>
                    </td>
                    <td>{r.what}</td>
                    <td className="small">{r.plan}</td>
                    <td>{r.actual}</td>
                  </tr>
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
