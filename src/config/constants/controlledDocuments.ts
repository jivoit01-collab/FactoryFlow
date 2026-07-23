/**
 * Controlled-document registry for documents the app GENERATES / prints.
 *
 * Per the Jivo Wellness "Document Management Procedure" (DOC-SOP-04-02-00-01)
 * and coding programme (DOC-PGM-04-02-00), every controlled document carries a
 * code in the header + a revision / issue date / classification in the footer.
 *
 * Each generated document TYPE has ONE fixed code (it is a controlled form/
 * format). Edit codes / revisions / issue dates here — single source of truth
 * for every print template.
 *
 * Code format: {FUNCTION}-{DOCTYPE}-{CC}-{SS}-{GG}[-{NN}]
 *   FUNCTION — department/function nomenclature (DOC, QA, WH, STR, MTC, ...)
 *   DOCTYPE  — SOP, LST, FRM, WI, PGM, CHK, JWPL-MAN, FLW
 *   CC-SS-GG — ISO 22000 clause / sub-clause the document belongs to
 */

export const ORGANIZATION_NAME = 'JIVO WELLNESS PVT. LTD.';
export const DEFAULT_CLASSIFICATION = 'Business Confidential';

export interface ControlledDocumentMeta {
  /** Document name shown in the header's middle row. */
  name: string;
  /** Controlled-document code, e.g. "QA-FRM-08-06-00-01". */
  code: string;
  /** Revision number, zero-padded, e.g. "00". */
  revision: string;
  /** Issue date of this revision (the FORM's date), DD-MM-YYYY. */
  issueDate: string;
  /** Footer classification; defaults to Business Confidential. */
  classification?: string;
}

export const CONTROLLED_DOCUMENTS = {
  QC_INSPECTION_REPORT: {
    name: 'QC INSPECTION REPORT',
    code: 'QA-FRM-08-06-00-01',
    revision: '00',
    issueDate: '23-07-2026',
  },
  SALES_DISPATCH_GATE_PASS: {
    name: 'SALES DISPATCH GATE PASS',
    code: 'WH-FRM-08-05-00-01',
    revision: '00',
    issueDate: '23-07-2026',
  },
  VEHICLE_ARRIVAL_GATE_PASS: {
    name: 'VEHICLE ARRIVAL GATE PASS',
    code: 'WH-FRM-08-05-00-02',
    revision: '00',
    issueDate: '23-07-2026',
  },
  MAINTENANCE_RETURNABLE_GATE_PASS: {
    name: 'RETURNABLE GATE PASS',
    code: 'MTC-FRM-08-05-00-01',
    revision: '00',
    issueDate: '23-07-2026',
  },
  GRPO_DOCUMENT: {
    name: 'GRPO DOCUMENT',
    code: 'STR-FRM-08-05-00-01',
    revision: '00',
    issueDate: '23-07-2026',
  },
} as const satisfies Record<string, ControlledDocumentMeta>;

export type ControlledDocumentKey = keyof typeof CONTROLLED_DOCUMENTS;
