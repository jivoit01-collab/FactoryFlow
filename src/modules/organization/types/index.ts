/**
 * Types for the department ownership chart.
 *
 * Two shapes on purpose: what the API returns (every row has an `id`) and what
 * the editor holds (`*Draft` — a row being added has no id yet, and carries a
 * `key` so React keeps track of it while it is still nameless).
 */

export interface OrgFunctionRow {
  id: number;
  /** Sub-department. Blank for a department that is not sub-divided. */
  name: string;
  owners: string[];
  level_1: string[];
  level_2: string[];
  sort_order: number;
}

export interface OrgDepartmentBlock {
  id: number;
  name: string;
  sort_order: number;
  functions: OrgFunctionRow[];
}

export interface OrgChart {
  departments: OrgDepartmentBlock[];
  /** Whether this user may edit the chart (`org_chart.can_manage_org_chart`). */
  can_manage: boolean;
}

export interface OrgFunctionDraft {
  /** Stable React key for the lifetime of the edit — not sent to the API. */
  key: string;
  id?: number;
  name: string;
  owners: string[];
  level_1: string[];
  level_2: string[];
}

export interface OrgDepartmentDraft {
  key: string;
  id?: number;
  name: string;
  functions: OrgFunctionDraft[];
}

/** The chart as the API takes it back: order is position in the array. */
export interface OrgChartSavePayload {
  departments: {
    id?: number;
    name: string;
    functions: {
      id?: number;
      name: string;
      owners: string[];
      level_1: string[];
      level_2: string[];
    }[];
  }[];
}

/** The three people columns, in chart order. */
export type OrgLevelKey = 'owners' | 'level_1' | 'level_2';
