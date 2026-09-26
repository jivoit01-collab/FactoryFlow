import type { ReactNode } from 'react';

import type { MachineMenu, MachinePlan, MenuRow, Plan } from '../types';
import { cap, finTxt, GROUPS, grp, hOf, nice, SHAPE, T, Tl } from '../utils/format';
import { machineGroup, menuOf, whatOf } from '../utils/plan';
import { ICON } from './Icons';

/** The coloured pack word: "5 L tin", "1 L combo". */
export function Pk({ r }: { r: { pack?: string | null; type?: string | null } }) {
  const g = grp(r);
  const extra =
    r.type && r.type !== 'bottle' && !/tin|pouch|combo/.test(r.pack || '') ? ` ${r.type}` : '';
  return <span className={`pk ${g.cls}`}>{`${r.pack || '?'}${extra}`}</span>;
}

export function Legend() {
  return (
    <div className="legend">
      {GROUPS.slice(0, 8).map((g) => (
        <span key={g.k} className={`pk ${g.cls}`}>
          {g.title.split(' · ')[0]}
        </span>
      ))}
    </div>
  );
}

export function MachineIcon({ plan, m, lg }: { plan: Plan; m: string; lg?: boolean }) {
  const g = machineGroup(plan, m);
  return <span className={`ico ${lg ? 'lg ' : ''}${g.cls}`}>{ICON[SHAPE[g.k]]}</span>;
}

/** The day on one bar: 7:30 am at the left, 7:30 pm at the right, one piece per job. */
export function DayBar({ plan, v }: { plan: Plan; v: MachinePlan }) {
  return (
    <span className="day" aria-hidden="true">
      {v.jobs.map((mj, i) => {
        const j = plan.jobs.find((x) => x.code === mj.code) || { pack: '', type: '' };
        const left = (hOf(mj.start) / 12) * 100;
        const width = Math.min(100, (((mj.change_h + mj.run_h) * 1.2) / 12) * 100);
        return (
          <i
            key={i}
            className={grp(j).cls}
            style={{ left: `${left.toFixed(1)}%`, width: `${width.toFixed(1)}%` }}
          />
        );
      })}
    </span>
  );
}

/** One card per machine; the whole card opens its panel. */
export function MachineCard({
  plan,
  m,
  onOpen,
}: {
  plan: Plan;
  m: string;
  onOpen: (m: string) => void;
}) {
  const v = plan.machines[m];
  const menu = menuOf(plan, m);
  const n = menu.rows.length;
  const on = v.jobs.length > 0;
  return (
    <button
      type="button"
      className={`mc${on ? '' : ' idle'}`}
      data-open={m}
      aria-haspopup="dialog"
      onClick={() => onOpen(m)}
    >
      <span className="mc-head">
        <MachineIcon plan={plan} m={m} />
        {menu.picked ? (
          <span className="mc-flag">{ICON.check}Picked</span>
        ) : (
          <span className="mc-go" aria-hidden="true">
            {ICON.go}
          </span>
        )}
      </span>
      <span className="mc-name">{m}</span>
      <span className="mc-what">
        {on ? v.jobs.map((j) => nice(j.name)).join(', then ') : 'Nothing planned tomorrow'}
      </span>
      <span className="mc-num">
        <span className="mc-t">{on ? T(v.litres) : 'Idle'}</span>
        <span className="mc-by">{on ? `done by ${finTxt(v.finish)}` : ''}</span>
      </span>
      <DayBar plan={plan} v={v} />
      <span className="mc-btn">
        {n === 0 ? 'Say what should run' : n === 1 ? 'See the 1 option' : `See all ${n} options`}
      </span>
    </button>
  );
}

/** One thing that can run on a machine: name, tons, when, and at most two tags. */
export function OptionBox({
  plan,
  r,
  menu,
  onPick,
}: {
  plan: Plan;
  r: MenuRow;
  menu: MachineMenu;
  onPick?: (r: MenuRow) => void;
}) {
  const on = r.on_plan_here_l > 0;
  const picked = !!menu.picked && menu.picked.job === r.job;
  const what = whatOf(r);
  const tons = r.held ? r.could_l : on ? r.on_plan_here_l : r.first_l;
  const tags: ReactNode[] = [];
  let whenTxt: string | null | undefined;
  if (r.held) {
    tags.push(
      <span key="w" className="tg warn">
        {cap(r.reason_word || `no ${what}`)}
      </span>,
    );
    whenTxt = r.can_pick ? `If it gets the ${what} first` : r.blocked;
  } else if (on) {
    tags.push(
      <span key="p" className="tg plan">
        On the plan
      </span>,
    );
    whenTxt = `${finTxt(r.start)} to ${finTxt(r.finish)}`;
  } else if (r.can_pick) {
    whenTxt = `${finTxt(plan.rules.start)} to ${r.first_fits ? finTxt(r.first_finish) : '7:30 pm'}`;
  } else {
    whenTxt = r.blocked;
  }
  if (r.can_pick && r.change_h != null) {
    tags.push(
      <span key="c" className="tg">
        {r.change_h === 0 ? 'No changeover' : `${r.change_h} h changeover`}
      </span>,
    );
  }
  if (r.sheet_left_l > 0.5)
    tags.push(<span key="s" className="tg">{`${Tl(r.sheet_left_l)} left on the sheet`}</span>);
  if (r.sheet_says_here)
    tags.push(
      <span key="h" className="tg">
        Sheet says this machine
      </span>,
    );
  if (picked)
    tags.unshift(
      <span key="k" className="tg ok">
        Picked
      </span>,
    );
  const cls = `opt${on ? ' on' : ''}${r.held ? ' held' : ''}${picked ? ' picked' : ''}${r.can_pick ? '' : ' off'}`;
  const inner = (
    <>
      <span className="o-top">
        <span className="rk">{r.rank}</span>
        <Pk r={r} />
      </span>
      <span className="o-name">{nice(r.name)}</span>
      <span className="o-t">{tons ? Tl(tons) : '—'}</span>
      <span className="o-foot">
        <span className="o-when">{cap(whenTxt || '')}</span>
        {tags.length ? <span className="o-tags">{tags}</span> : null}
      </span>
    </>
  );
  return r.can_pick && onPick ? (
    <button type="button" className={cls} onClick={() => onPick(r)}>
      {inner}
    </button>
  ) : (
    <div className={cls}>{inner}</div>
  );
}

/** Two columns that stack straight down: each card to the shorter column, biggest first. */
export function Masonry({ cards }: { cards: { key: string; tot: number; node: ReactNode }[] }) {
  const cols: { key: string; order: number; node: ReactNode }[][] = [[], []];
  const hgt = [0, 0];
  [...cards]
    .sort((a, b) => b.tot - a.tot)
    .forEach((c, i) => {
      const k = hgt[0] <= hgt[1] ? 0 : 1;
      cols[k].push({ key: c.key, order: i, node: c.node });
      hgt[k] += 1;
    });
  return (
    <div className="wgrid">
      {cols
        .filter((c) => c.length)
        .map((c, i) => (
          <div className="wcol" key={i}>
            {c.map((x) => (
              <div key={x.key} style={{ order: x.order }}>
                {x.node}
              </div>
            ))}
          </div>
        ))}
    </div>
  );
}
