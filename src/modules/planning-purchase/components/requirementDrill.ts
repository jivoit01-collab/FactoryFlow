import type { MaterialType } from '../types';

/**
 * What a click on a requirement headline card narrows the table to.
 *
 * In its own file rather than beside the component: exporting a constant from a
 * module that also exports components breaks Fast Refresh, and the drill shape is
 * shared between the cards and the page that owns the filter state anyway.
 */
export interface RequirementDrill {
  materialType: MaterialType | '';
  shortagesOnly: boolean;
  /** Client-side narrowing the server filters cannot express. */
  extra: 'NONE' | 'NO_LEAD_TIME' | 'BY_VALUE';
}

/** The unfiltered view. Every card is a toggle, so pressing the active one lands here. */
export const NO_DRILL: RequirementDrill = {
  materialType: '',
  shortagesOnly: false,
  extra: 'NONE',
};

export function sameDrill(a: RequirementDrill, b: RequirementDrill): boolean {
  return (
    a.materialType === b.materialType &&
    a.shortagesOnly === b.shortagesOnly &&
    a.extra === b.extra
  );
}
