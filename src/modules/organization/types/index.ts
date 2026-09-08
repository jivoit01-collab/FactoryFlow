/**
 * Types for the department ownership chart.
 *
 * Two shapes on purpose: what the API returns (every row has an `id`) and what
 * the editor holds (`*Draft` — a row being added has no id yet, and carries a
 * `key` so React keeps track of it while it is still nameless).
 */

export interface OrgFunctionRow {
  id: number;
  /** Section. Blank for a department that is not sub-divided. */
  name: string;
  /** Second line under the section — "Storage / OIL" vs "Storage / Packing material". */
  subtitle: string;
  owners: string[];
  level_1: string[];
  level_2: string[];
  sort_order: number;
}

export interface OrgDepartmentBlock {
  id: number;
  name: string;
  /** Who heads the whole department. Blank when the chart names nobody. */
  head: string;
  sort_order: number;
  functions: OrgFunctionRow[];
}

export interface OrgChart {
  /** Title of the chart, e.g. "Oil Plant". */
  plant_name: string;
  /** Who heads the plant. Blank when the chart names nobody. */
  plant_head: string;
  departments: OrgDepartmentBlock[];
  /** Whether this user may edit the chart (`org_chart.can_manage_org_chart`). */
  can_manage: boolean;
}

export interface OrgFunctionDraft {
  /** Stable React key for the lifetime of the edit — not sent to the API. */
  key: string;
  id?: number;
  name: string;
  subtitle: string;
  owners: string[];
  level_1: string[];
  level_2: string[];
}

export interface OrgDepartmentDraft {
  key: string;
  id?: number;
  name: string;
  head: string;
  functions: OrgFunctionDraft[];
}

/** The chart as the API takes it back: order is position in the array. */
export interface OrgChartSavePayload {
  plant_name: string;
  plant_head: string;
  departments: {
    id?: number;
    name: string;
    head: string;
    functions: {
      id?: number;
      name: string;
      subtitle: string;
      owners: string[];
      level_1: string[];
      level_2: string[];
    }[];
  }[];
}

/** The three people columns, in chart order. */
export type OrgLevelKey = 'owners' | 'level_1' | 'level_2';
