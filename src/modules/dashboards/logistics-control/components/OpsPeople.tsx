import type { WorkforceStrip } from '../types';

export interface OpsPeopleProps {
  strip: WorkforceStrip;
}

/** Indian-grouped rupees, compacted. A board has no room for paise. */
function money(value: number | null): string | null {
  if (value === null) return null;
  if (Math.abs(value) >= 1_00_00_000) return `₹${(value / 1_00_00_000).toFixed(2)} Cr`;
  if (Math.abs(value) >= 1_00_000) return `₹${(value / 1_00_000).toFixed(1)} L`;
  if (Math.abs(value) >= 1_000) return `₹${(value / 1_000).toFixed(1)}k`;
  return `₹${Math.round(value)}`;
}

/** One role: headcount over the daily cost behind it. */
function Role({
  label,
  count,
  cost,
  dot,
}: {
  label: string;
  count: number | null;
  cost: number | null;
  dot: string;
}) {
  const rendered = money(cost);

  return (
    <div className="ops-prole" style={{ ['--pk' as string]: dot }}>
      <div className="r">
        <span className="k">{label}</span>
        <span className="n">
          {count === null ? <span className="ops-nil">—</span> : count}
        </span>
      </div>
      <div className="s">{rendered ? `${rendered} a day` : 'Cost unavailable'}</div>
    </div>
  );
}

/**
 * Who is on the band, pinned to its right.
 *
 * Both costs are per day — the employee one is an annual salary divided down, a
 * rate of burn that reconciles with no payslip, which is why it sits small under
 * the headcount rather than reading as payroll.
 *
 * A missing figure is a rule, never a zero — three different things hollow this
 * panel out (salary withheld by permission, no configured labour rate, a
 * section with nobody assigned) and all three would otherwise show as ₹0 to
 * somebody walking past. The em-dash on a role's own row is what reports that
 * now: the reason line underneath was dropped at the floor's request, so the
 * caption reads "On shift" whichever halves are known and the headline counts
 * only the halves that are.
 *
 * The split bar is drawn only when both headcounts are known: a bar showing one
 * half of a pair would misstate the ratio it exists to show.
 */
export function OpsPeople({ strip }: OpsPeopleProps) {
  const employees = strip.employees;
  const labour = strip.labour;
  const bothKnown = employees !== null && labour !== null;
  const onShift = bothKnown ? employees + labour : (labour ?? employees);
  const total = bothKnown ? employees + labour : 0;

  return (
    <div className="ops-people">
      <div className="ops-pcap">
        <svg viewBox="0 0 24 24" aria-hidden>
          <circle cx="9" cy="8" r="3" />
          <path d="M3 19c0-3.2 2.7-4.8 6-4.8s6 1.6 6 4.8" />
          <path d="M16.5 11.5a2.6 2.6 0 1 0 0-5.2" />
          <path d="M17 14.4c2.4.4 4 1.9 4 4.6" />
        </svg>
        On shift
        <b>{onShift === null ? <span className="ops-nil">—</span> : onShift}</b>
      </div>

      <Role label="Employees" count={employees} cost={strip.employeeCostPerDay} dot="var(--d1)" />
      <Role label="Labour" count={labour} cost={strip.labourCostPerDay} dot="var(--d3)" />

      {bothKnown && total > 0 && (
        <div className="ops-psplit">
          <i className="ops-f-main" style={{ width: `${(employees / total) * 100}%` }} />
          <i className="ops-f-light" style={{ width: `${(labour / total) * 100}%` }} />
        </div>
      )}
    </div>
  );
}
