/**
 * What each kind of licence and each direction of line is called on screen.
 *
 * An Advance Authorisation imports first and owes exports; a DFIA exports first
 * and earns imports. The screens are the same, so the words are what changes.
 */
import type { LicenceKind, LineDirection } from '../types';

export const KIND_COPY: Record<
  LicenceKind,
  {
    title: string;
    plural: string;
    numberLabel: string;
    authorisedLabel: string;
    obligationLabel: string;
    blurb: string;
  }
> = {
  ADVANCE: {
    title: 'Advance Authorisation',
    plural: 'Advance Authorisations',
    numberLabel: 'Licence no.',
    authorisedLabel: 'Valid import (MT)',
    obligationLabel: 'Export obligation (MT)',
    blurb: 'Imported duty free first; the imports create an obligation to export.',
  },
  DFIA: {
    title: 'DFIA',
    plural: 'DFIA licences',
    numberLabel: 'File no.',
    authorisedLabel: 'Valid export (MT)',
    obligationLabel: 'Import entitlement (MT)',
    blurb: 'Exported first; the exports earn an entitlement to import duty free.',
  },
};

export const DIRECTION_COPY: Record<
  LineDirection,
  {
    title: string;
    one: string;
    docLabel: string;
    dateLabel: string;
    valueLabel: string;
    qtyLabel: string;
  }
> = {
  IMPORT: {
    title: 'Imports',
    one: 'bill of entry',
    docLabel: 'BOE no.',
    dateLabel: 'BOE date',
    valueLabel: 'BOE value (USD)',
    qtyLabel: 'Imported (MT)',
  },
  EXPORT: {
    title: 'Exports',
    one: 'shipping bill',
    docLabel: 'Shipping bill no.',
    dateLabel: 'SB date',
    valueLabel: 'SB value (USD)',
    qtyLabel: 'Exported (MT)',
  },
};

export function secondLeg(kind: LicenceKind): LineDirection {
  return kind === 'ADVANCE' ? 'EXPORT' : 'IMPORT';
}

export function firstLeg(kind: LicenceKind): LineDirection {
  return kind === 'ADVANCE' ? 'IMPORT' : 'EXPORT';
}
