// Kept in its own module so the parameter queries can invalidate set caches
// (a parameter change moves the count shown on the set's tab) without the two
// query modules importing each other.
export const PARAMETER_SET_QUERY_KEYS = {
  all: ['qcParameterSets'] as const,
  byMaterialType: (materialTypeId: number) =>
    [...PARAMETER_SET_QUERY_KEYS.all, 'byMaterialType', materialTypeId] as const,
  detail: (id: number) => [...PARAMETER_SET_QUERY_KEYS.all, 'detail', id] as const,
};
