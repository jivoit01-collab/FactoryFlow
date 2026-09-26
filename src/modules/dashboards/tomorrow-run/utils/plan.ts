import type { MachineMenu, MachinePlan, MenuRow, Plan } from '../types';
import { cap, finTxt, GROUPS, grp, nice, type PackGroup, Tl } from './format';

export const menuOf = (plan: Plan, m: string): MachineMenu =>
  plan.machine_menu[m] || { rows: [], top3: [], picked: null };

/** The pack a machine runs first tomorrow, else the first thing it could run, else its name. */
export function machineGroup(plan: Plan, m: string): PackGroup {
  const v = plan.machines[m];
  const menu = menuOf(plan, m);
  const first = v.jobs[0] && plan.jobs.find((x) => x.code === v.jobs[0].code);
  if (first) return grp(first);
  if (menu.rows[0]) return grp(menu.rows[0]);
  const k = /pouch/i.test(m) ? 'pouch' : /tin/i.test(m) ? 'tin' : 'other';
  return GROUPS.find((g) => g.k === k) as PackGroup;
}

export const ranTxt = (v: MachinePlan): string => {
  const r = v.running_now || { name: '' };
  return r.name && r.name !== 'no run in the MES log this week' && r.code
    ? `${nice(r.name)}${r.date ? ` (${new Date(`${r.date}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })})` : ''}`
    : 'nothing logged this week';
};

export const whatOf = (r: MenuRow) =>
  (r.material || { kind: '' }).kind === 'oil' ? 'oil' : 'packaging';

/** The whole story of one option, shown before anything is saved. */
export function facts(plan: Plan, r: MenuRow): string[] {
  const on = r.on_plan_here_l > 0;
  const w: string[] = [];
  const wentTo = (mt: MenuRow['material']) =>
    (mt?.went_to || []).map((x) => nice(x.name) + (x.picked ? ' (your pick)' : '')).join(', ');
  if (r.held) {
    const mt = r.material;
    const what = whatOf(r);
    const went = wentTo(mt);
    w.push(
      `no ${what} for it. ${nice(mt?.name)}: ${went ? `went to ${went}` : 'none tonight'}` +
        (mt && mt.left > 0
          ? `, ${Math.round(mt.left).toLocaleString('en-IN')} ${mt.unit} left`
          : ''),
    );
    if (r.change_h != null)
      w.push(r.change_h === 0 ? 'already on it, no changeover' : `${r.change_h} h changeover`);
    w.push(`${Tl(r.waits_l)} of it waits`);
  } else {
    if (r.material && (r.more_if_first_l || 0) > 0) {
      const mt = r.material;
      const what = mt.kind === 'oil' ? 'oil' : 'packaging';
      const went = wentTo(mt);
      w.push(
        `${Tl(r.more_if_first_l)} more if it gets the ${what} first${went ? ` (${nice(mt.name)} went to ${went})` : ''}`,
      );
    }
    if (on) w.push(`on the plan: ${finTxt(r.start)} to ${finTxt(r.finish)}`);
    else if (r.can_pick)
      w.push(
        r.first_fits
          ? `if it goes first: ${finTxt(plan.rules.start)} to ${finTxt(r.first_finish)}`
          : `if it goes first: ${Tl(r.first_l)}, ${finTxt(plan.rules.start)} to 7:30 pm`,
      );
    w.push(
      r.change_h === 0
        ? 'already on it, no changeover'
        : `${r.change_h} h changeover, inside these times`,
    );
    if (r.waits_l > 0.5) w.push(`${Tl(r.waits_l)} of it still waits`);
    if (r.made_elsewhere_on.length)
      w.push(
        on
          ? `shares it with ${r.made_elsewhere_on.join(' + ')}`
          : `the plan makes it on ${r.made_elsewhere_on.join(' + ')}, picking it here moves it`,
      );
  }
  if (r.sheet_left_l > 0.5) w.push(`the sheet still needs ${Tl(r.sheet_left_l)} of it`);
  if ((r.sheet_says || []).length)
    w.push(
      r.sheet_says_here
        ? 'the sheet puts it on this machine'
        : `the sheet puts it on ${r.sheet_says.join(' / ')}`,
    );
  if (r.via) w.push(r.via);
  return w.filter(Boolean).map(cap);
}
