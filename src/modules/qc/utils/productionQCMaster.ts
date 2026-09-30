/** Form helpers shared by the production QC master pages. */

import type { ApiError } from '@/core/api/types';

import type { ParameterType } from '../types/qc.types';

export type Errors = Record<string, string>;

/** DRF field errors as one message per field; anything else as `general`. */
export function readApiErrors(error: unknown, fallback: string): Errors {
  const apiError = error as ApiError;
  if (apiError?.errors) {
    const errors: Errors = {};
    Object.entries(apiError.errors).forEach(([field, messages]) => {
      errors[field] = messages.join(' ');
    });
    return errors;
  }
  return { general: apiError?.message || fallback };
}

export const withoutKey = (errors: Errors, key: string): Errors => {
  if (!errors[key]) return errors;
  const next = { ...errors };
  delete next[key];
  return next;
};

export const upperCode = (value: string) => value.toUpperCase().replace(/\s+/g, '_');

export const hasBounds = (valueType: ParameterType) =>
  valueType === 'NUMERIC' || valueType === 'RANGE';
