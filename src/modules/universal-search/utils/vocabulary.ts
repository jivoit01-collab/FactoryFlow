/**
 * What this factory calls its screens, as opposed to what the sidebar calls them.
 *
 * Nobody searching for the GRPO page types "Goods Receipt PO" — they type GRN,
 * or "material receipt", or "where do I put the material GRPO". The sidebar
 * title is the only text a page carries, so on its own the search only answers
 * people who already know where they are going, which is the one group that
 * does not need it.
 *
 * Two lists do the work:
 *
 * `STOP_WORDS` throws away the question wrapped around the query, so "where do
 * I put the material GRPO" is matched as "material grpo".
 *
 * `ALIASES` maps a spoken word onto the words a title actually uses. It is
 * deliberately one-way and deliberately hand-written: this is factory
 * vocabulary, not English, and no general-purpose stemmer knows that a bilty
 * is a transporter's consignment note.
 */

/**
 * Words that carry no target. Dropped from the query before matching, never
 * from the page titles — a title is three words long and every one counts.
 */
export const STOP_WORDS: ReadonlySet<string> = new Set([
  'a',
  'an',
  'and',
  'are',
  'at',
  'can',
  'do',
  'does',
  'find',
  'for',
  'from',
  'get',
  'go',
  'how',
  'i',
  'in',
  'is',
  'it',
  'list',
  'me',
  'my',
  'of',
  'on',
  'open',
  'page',
  'put',
  'screen',
  'see',
  'show',
  'the',
  'to',
  'view',
  'want',
  'was',
  'what',
  'where',
  'which',
  'who',
]);

/**
 * Spoken word -> the words that appear in a title.
 *
 * Every entry earns its place by being something a person here actually says.
 * Add freely; a wrong alias costs a stray result, a missing one costs the
 * whole search for whoever uses that word.
 */
export const ALIASES: Readonly<Record<string, readonly string[]>> = {
  // Receiving
  grn: ['grpo', 'goods', 'receipt'],
  gr: ['grpo', 'goods', 'receipt'],
  receipt: ['grpo', 'receipt'],
  receiving: ['grpo', 'gate', 'receipt'],
  inward: ['gate', 'grpo', 'receipt'],
  unload: ['gate', 'grpo'],
  po: ['purchase', 'order'],
  purchase: ['purchase', 'po'],

  // Selling and sending out
  bill: ['invoice', 'bill'],
  bills: ['invoice', 'bill'],
  invoice: ['invoice', 'bill'],
  billing: ['invoice', 'bill'],
  outward: ['dispatch', 'gate'],
  loading: ['dispatch', 'loading'],
  truck: ['vehicle', 'gate', 'dispatch'],
  vehicle: ['vehicle', 'truck'],
  lorry: ['vehicle', 'gate'],
  bilty: ['bilty', 'transporter', 'dispatch'],
  challan: ['dispatch', 'delivery', 'gate'],
  gatepass: ['gate', 'pass', 'dispatch'],
  ewaybill: ['dispatch', 'invoice'],
  docking: ['docking', 'dispatch'],

  // Stock and movement
  stock: ['stock', 'inventory'],
  inventory: ['stock', 'inventory'],
  bst: ['bst', 'branch', 'transfer'],
  transfer: ['transfer', 'bst'],
  itr: ['transfer', 'inventory'],
  godown: ['godown', 'warehouse'],
  warehouse: ['warehouse', 'godown', 'store'],
  store: ['warehouse', 'store'],
  rm: ['raw', 'material'],
  pm: ['packing', 'material'],
  fg: ['finished', 'goods'],
  material: ['material', 'raw'],
  batch: ['batch', 'stock'],
  pallet: ['pallet', 'wms'],
  box: ['box', 'barcode', 'pallet'],
  barcode: ['barcode', 'box', 'scan'],
  scan: ['scan', 'barcode'],

  // Returns
  return: ['return', 'returns'],
  returns: ['return', 'returns'],
  rejection: ['return', 'rejected', 'qc'],
  short: ['short', 'dispatch'],
  dismantle: ['dismantle', 'return'],

  // Making things
  production: ['production', 'run'],
  run: ['run', 'production'],
  blowing: ['blowing', 'bottle', 'preform'],
  filling: ['production', 'run'],
  bom: ['bom', 'bill', 'material'],
  planning: ['planning', 'plan'],

  // People and the gate
  labour: ['labour', 'worker'],
  worker: ['labour', 'worker'],
  attendance: ['attendance', 'labour'],
  visitor: ['visitor', 'person', 'gate'],
  employee: ['employee', 'people', 'directory'],
  staff: ['employee', 'people'],

  // Quality and plant
  qc: ['qc', 'quality'],
  quality: ['qc', 'quality'],
  qa: ['qa', 'quality'],
  etp: ['etp', 'stp', 'plant'],
  stp: ['stp', 'etp', 'plant'],
  maintenance: ['maintenance', 'repair'],
  repair: ['maintenance', 'repair'],
  electricity: ['electricity', 'meter'],
  meter: ['meter', 'electricity'],

  // Money and the office
  expense: ['expense', 'cost'],
  cost: ['cost', 'expense'],
  cash: ['cash', 'book'],
  petty: ['cash', 'book'],
  budget: ['budget', 'approval'],
  approval: ['approval', 'approvals'],
  approvals: ['approval', 'approvals'],
  credit: ['credit', 'note'],
  debit: ['debit', 'note'],

  // The app's own furniture
  dashboard: ['dashboard', 'board'],
  dashboards: ['dashboard', 'board'],
  board: ['board', 'dashboard'],
  report: ['report', 'reports'],
  reports: ['report', 'reports'],
  setting: ['settings'],
  settings: ['settings'],
  bug: ['issue', 'issues'],
  issue: ['issue', 'issues'],
  permission: ['settings', 'admin'],
  user: ['settings', 'admin', 'employee'],
};

/** Split a phrase into lowercase word tokens. */
export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/i)
    .filter(Boolean);
}

/**
 * The query as words worth matching on.
 *
 * Stop words go first, then each surviving word contributes itself plus
 * anything it is known by. If the query is nothing BUT stop words ("how do I"),
 * the originals are kept rather than returning nothing to match on.
 */
export function queryTerms(query: string): string[] {
  const tokens = tokenize(query);
  const meaningful = tokens.filter((token) => !STOP_WORDS.has(token));
  const kept = meaningful.length ? meaningful : tokens;

  const terms = new Set<string>();
  for (const token of kept) {
    terms.add(token);
    for (const alias of ALIASES[token] ?? []) {
      terms.add(alias);
    }
  }
  return [...terms];
}

/** The words of the query that must be accounted for, before aliasing. */
export function requiredTerms(query: string): string[] {
  const tokens = tokenize(query);
  const meaningful = tokens.filter((token) => !STOP_WORDS.has(token));
  return meaningful.length ? meaningful : tokens;
}

/**
 * Whether a term is worth asking SAP about.
 *
 * A sentence is somebody looking for a screen, and sending it to three company
 * databases buys nothing but latency. One or two words still go -- item codes
 * and batch numbers are words, and "FG0000030" must reach the item master.
 *
 * It lives here rather than beside the page ranking because it is a fact about
 * the QUERY, not about pages -- and because this module touches nothing else.
 * The ranking reaches the module registry, and the dialog must be able to ask
 * this question without dragging every module config in behind it.
 */
export const MAX_SAP_QUERY_WORDS = 3;

export function isWorthAskingSap(query: string): boolean {
  return tokenize(query).length <= MAX_SAP_QUERY_WORDS;
}
