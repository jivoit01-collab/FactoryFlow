/**
 * Tomorrow's run — the payload of `GET /tomorrow-run/plan/`.
 *
 * The shape is the engine's (factory_app `tomorrow_run/engine/planner.py`),
 * the same one the Vercel page this replaced read from `plan.json`.
 */

export interface MachineJob {
  code: string;
  name: string;
  kind: string;
  pcs: number;
  litres: number;
  change_h: number;
  change: string;
  run_h: number;
  start: string;
  finish: string;
}

export interface RunningNow {
  code: string | null;
  name: string;
  date?: string;
  status?: string;
  basis?: string;
}

export interface MachinePlan {
  running_now: RunningNow;
  jobs: MachineJob[];
  hours_used: number;
  finish: string | null;
  litres: number;
  pcs: number;
}

export interface Material {
  kind: 'oil' | 'packaging' | 'room';
  code: string;
  name: string;
  unit: string;
  left: number;
  went_to: { code: string; name: string; picked: boolean }[];
}

export interface MenuRow {
  job: string;
  code: string;
  name: string;
  pack: string;
  type: string;
  via: string | null;
  rank: number;
  held: boolean;
  want_l: number;
  waits_l: number;
  on_plan_here_l: number;
  made_elsewhere_on: string[];
  change_h: number;
  change: string;
  speed: number;
  start: string | null;
  finish: string | null;
  can_pick: boolean;
  first_l: number;
  first_fits: boolean | null;
  first_finish: string | null;
  fresh_l: number;
  sheet_left_l: number;
  sheet_says: string[];
  sheet_says_here: boolean;
  picked_here: boolean;
  small: boolean;
  material: Material | null;
  more_if_first_l?: number | null;
  could_l?: number;
  reason_word?: string | null;
  reason_detail?: string | null;
  blocked?: string | null;
}

export interface Picked {
  job: string;
  name: string;
  rank: number | null;
  why: string;
  by: string;
  at: string | null;
  other: string;
  on_plan: boolean;
}

export interface MachineMenu {
  rows: MenuRow[];
  top3: string[];
  picked: Picked | null;
}

export interface Job {
  id: string;
  code: string;
  name: string;
  kind: string;
  pack: string;
  type: string;
  lp: number;
  make_pcs: number;
  want_pcs: number;
  placed_pcs: number;
}

export interface Pending {
  code: string;
  name: string;
  pcs: number;
  kind: string;
  reason: string;
  partial: boolean;
  lp: number;
  reason_word: string;
  reason_detail: string;
  tons: number;
  pack: string;
  type: string;
  via?: string | null;
}

export interface Held {
  code: string;
  name: string;
  kind: string;
  want_pcs: number;
  pack: string;
  type: string;
  reason_word: string;
  reason_detail: string;
  partial: boolean;
  tons_wanted: number;
  via?: string | null;
}

export interface PileRow {
  code: string;
  name: string;
  pack: string;
  type: string;
  lp: number;
  need_l: number;
  made_l: number;
  left_l: number;
  net_l: number;
  sheet_machine: string[];
  board_machines: string[];
  via: string | null;
}

export interface Room {
  limit_l: number;
  stock_tonight_l: number;
  left_tomorrow_l: number;
  left_basis: string;
  standing_tomorrow_l: number;
  free_l: number;
}

export interface LearningPick {
  for_date: string;
  machine: string;
  job: string;
  name: string;
  rank: number | null;
  why: string;
  by: string;
  other: string;
  top3: { job: string; name: string; rank: number }[];
}

export interface InputRow {
  input: string;
  app: string;
  url: string | null;
  what: string;
  ok: boolean | null;
  error: string | null;
  fetched_at: string | null;
  number: unknown;
}

export interface SheetFacts {
  id: number | null;
  file: string | null;
  tab: string | null;
  title: string | null;
  stock_date: string | null;
  from_date: string | null;
  month_end: string;
  work_days_left: number;
  sheet_net_l: number;
  need_l: number;
  made_l: number;
  left_l: number;
  per_day_needed_l: number | null;
  made_not_on_sheet: { code: string; name: string; litres: number }[];
  sheet_vs_board: {
    code: string;
    name: string;
    sheet: string[];
    board: string[];
    left_l: number;
  }[];
}

export interface Plan {
  for_date: string;
  run_at: string;
  rules: { start: string; target_l: number; good_l: number; min_run_h: number };
  sheet: SheetFacts;
  pile: { skus: number; pcs: number; litres: number; rows: PileRow[] };
  have: {
    rooms: Record<string, Room>;
    left_days: { date: string; left_l: number }[];
    left_avg_l: number;
  };
  to_make: { skus: number; pcs: number; litres: number };
  limits: { oil: { rm: string; name: string; have_l: number; left_l: number; source: string }[] };
  final_list: { skus: number; pcs: number; litres: number };
  jobs: Job[];
  held_at_step5: Held[];
  machines: Record<string, MachinePlan>;
  /** The board's machine order (the database's JSON does not keep key order). */
  machine_order?: string[];
  machine_menu: Record<string, MachineMenu>;
  learning: { picks: LearningPick[]; n: number; was_first: number; in_top3: number };
  total_l: number;
  target: { target_l: number; good_l: number };
  pending: Pending[];
  inputs: InputRow[];
  assumed: string[];
  warnings: string[];
}

export interface CheckRow {
  n: number;
  what: string;
  state: 'red' | 'green' | 'running' | 'no record';
  plan: string;
  actual: string;
  line: string;
}

export interface PlanCheck {
  for_date: string;
  run_at: string;
  red: number;
  rows: CheckRow[];
}

export interface PlanEnvelope {
  plan: Plan | null;
  check: PlanCheck | null;
  meta: {
    plan_id: number | null;
    read_at: string | null;
    trigger: string | null;
    built_by: string;
    can_pick: boolean;
    can_manage: boolean;
    reasons: string[];
    you: string;
  };
}

export interface ChoiceBody {
  for_date: string;
  machine: string;
  job: string;
  why: string;
  other?: string;
}

export interface PlanningSheet {
  id: number;
  file_name: string;
  file_url: string | null;
  tab: string;
  title: string;
  stock_date: string;
  date_basis: string;
  header_row: number;
  columns: Record<string, string>;
  line_count: number;
  net_req_l: string;
  uploaded_by: string;
  uploaded_at: string;
  in_charge: boolean;
}
