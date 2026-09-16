/**
 * The printed chart's palette, in one place.
 *
 * These are the colours off the wall chart itself — the deep green header band,
 * the mint department rail, the gold used for whoever leads a section — rather
 * than the app's semantic tokens, because the whole point of this page is that
 * it looks like the chart people already know. Each one carries a dark-mode
 * counterpart so the page is readable in both themes.
 */

export const CHART = {
  /** The cream sheet the chart is printed on. */
  sheet: 'bg-[#faf8f4] dark:bg-card border-[#e7e0d4] dark:border-border',
  /** "Organizational structure" above the plant name. */
  eyebrow: 'text-[#a9761a] dark:text-amber-400',
  /** The rule under the masthead. */
  rule: 'border-[#123f35] dark:border-emerald-500/40',
  /** The dark band carrying the column headings. */
  headerBand: 'bg-[#123f35] text-white dark:bg-[#0c2b24]',
  /** The department rail down the left. */
  departmentCell: 'bg-[#e6f0ec] dark:bg-emerald-500/15',
  departmentName: 'text-[#123f35] dark:text-emerald-300',
  /** Every other section row, so the eye can track across five columns. */
  stripe: 'bg-[#f6f2ea] dark:bg-muted/40',
  /** Whoever leads the section. */
  leader: 'text-[#a9761a] dark:text-amber-300',
  /** L2 and L3 — read as plain text, not as chips. */
  people: 'text-[#2f3a36] dark:text-foreground',
  /** Borders inside the table. */
  line: 'border-[#e7e0d4] dark:border-border',
} as const;
