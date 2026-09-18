/**
 * The accounts dashboard payload, as `accounts_board/services.py` sends it.
 *
 * Every band is `T | null`. Null means the band is missing and `meta` says why
 * — `withheld` for "you may not see this", `degraded` for "we could not read
 * it". The two never share a list, because one sends a reader to an
 * administrator and the other to the server room. A band is never `{}` and
 * never silently zero.
 */

/** A money figure and how many rows it came from. */
export interface AccountsAmount {
  amount: number;
  count: number;
}

/** One named G/L head under a breakdown line. */
export interface AccountsHead {
  code: string;
  name: string;
  amount: number;
  count: number;
}

/**
 * The four headline figures.
 *
 * THE THREE FLOWS FOLLOW THE PERIOD. `cash_in_hand` DOES NOT — it is a closing
 * balance, and the drawer does not reset on the first of the month. They sit in
 * one column on screen, so only their labels stop somebody subtracting one from
 * another. Do not "fix" this by filtering the balance.
 */
export interface AccountsHeadline {
  /** Everything that arrived in the box, inside the period. */
  imprest_issued: number;
  imprest_count: number;
  /** Everything paid out of it, inside the period, agreed or not. */
  cash_issued: number;
  cash_issued_count: number;
  /** Vouchers not yet gone to head office. Never period-filtered. */
  pending_ho: number;
  pending_ho_count: number;
  /** What should physically be in the drawer, right now. Never period-filtered. */
  cash_in_hand: number;
  /** Pre-computed so every consumer treats a negative the same way. */
  in_hand_negative: boolean;
  reconciliation: {
    cash_in: number;
    cash_out: number;
    awaiting_approval: number;
    advance_given: number;
    owed_to_people: number;
    /** Should always be 0. Sent so the screen can show the book balances. */
    difference: number;
    balances: boolean;
  };
}

/** One imprest card, and what has been loaded onto it. */
export interface AccountsCard {
  id: number;
  /** The card's own name. Printed on the card, so never masked. */
  name: string;
  amount: number;
  count: number;
  last_updated: string | null;
}

export interface AccountsImprest {
  /** Money into the DRAWER. Never the sum of the card loads — see the service. */
  total: number;
  count: number;
  holders: number;
  rows: AccountsCard[];
  sources: Array<{ key: string; label: string; amount: number; count: number }>;
  span: { from: string | null; to: string | null };
}

/**
 * One person and what they are holding.
 *
 * `name` is already masked server-side when the reader may not see it, so the
 * client never has to decide — it renders whatever it is given. `meta.names_visible`
 * is for labelling the panel, not for hiding anything the API already sent.
 */
export interface AccountsPerson {
  name: string;
  amount: number;
  count?: number;
  /** When they last explained some of it. Null means they never have. */
  last_updated: string | null;
}

export interface AccountsPersonGroup {
  rows: AccountsPerson[];
  people: number;
  total: number;
}

export interface AccountsCashIssued {
  total: number;
  /** The whiteboard's "how many debits": one per payment voucher. */
  debits: number;
  states: Array<{ key: string; label: string; amount: number; count: number }>;
  by_branch: Array<{ label: string; amount: number; count: number }>;
  handouts: { total: number; count: number; people: number };
  /**
   * Holding and owed are NOT netted, and must not be added together on screen.
   * One is our cash in somebody's pocket; the other is their cash in our till.
   */
  holders: { holding: AccountsPersonGroup; owed: AccountsPersonGroup };
  span: { from: string | null; to: string | null };
}

/** One voucher still waiting to go to head office. */
export interface AccountsPendingRow {
  id: number;
  /** What was bought. Falls back to the G/L head, then the narrative. */
  item: string;
  amount: number;
  entry_date: string;
  gl_account_name: string;
  branch: string | null;
  approval_state: string;
  bunch: number | null;
  detail: string;
}

export interface AccountsPendingHo {
  total: number;
  count: number;
  rows: AccountsPendingRow[];
  truncated: boolean;
  unsent_bunches: number;
  /**
   * Why a zero is an answer: "nothing waiting, 47 already gone" is a different
   * statement from "no data", and the two look identical without this.
   */
  sent_bunches: number;
}

/** One line of the outstanding breakdown. */
export interface AccountsBucket {
  key: string;
  label: string;
  /** The caveat travels with the number. Render it — it is not decoration. */
  note: string;
  /**
   * False means the register keeps no source for this line. Show "not kept",
   * never a confident 0.00 — the two look identical and mean opposite things.
   */
  has_source: boolean;
  amount: number;
  count: number;
  heads: AccountsHead[];
}

export interface AccountsDetail {
  buckets: AccountsBucket[];
  other: AccountsAmount & { heads: AccountsHead[] };
  total: number;
  debits: number;
}

export interface AccountsSalary {
  total: number;
  count: number;
  people: number;
  rows: AccountsPerson[];
  /** On a salary head but naming nobody the app can resolve. In the total. */
  unattributed: AccountsAmount;
  heads: AccountsHead[];
  span: { from: string | null; to: string | null };
}

export interface AccountsPeriod {
  year: number;
  month: number;
  label?: string;
  from?: string;
  to?: string;
}

export interface AccountsBoardMeta {
  company: string;
  as_of: string;
  generated_at: string;
  refresh_seconds: number;
  /** Null when the whole book is being shown. */
  period: (AccountsPeriod & { from: string; to: string }) | null;
  /** Only months the book actually traded in, newest first. */
  periods: Array<AccountsPeriod & { label: string }>;
  /** Whether this reader may see who is holding the money. */
  names_visible: boolean;
  degraded: string[];
  withheld: string[];
  warnings: string[];
}

export interface AccountsBoardResponse {
  headline: AccountsHeadline | null;
  imprest: AccountsImprest | null;
  cash_issued: AccountsCashIssued | null;
  pending_ho: AccountsPendingHo | null;
  detail: AccountsDetail | null;
  salary: AccountsSalary | null;
  meta: AccountsBoardMeta;
}

/** What the Details panel is currently showing. */
export type AccountsSelection =
  | { kind: 'imprest'; row: AccountsCard }
  | { kind: 'pending'; row: AccountsPendingRow }
  | { kind: 'salary'; row: AccountsPerson }
  | { kind: 'holder'; row: AccountsPerson; owed: boolean }
  | { kind: 'bucket'; row: AccountsBucket }
  | null;
