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
    name: 'MATERIAL ARRIVAL INSPECTION REPORT',
    code: 'QA-FRM-08-06-00-01',
    revision: '00',
    issueDate: '23-07-2026',
  },
  QC_PARAMETERS_REPORT: {
    name: 'QC PARAMETERS REPORT',
    code: 'QA-FRM-08-06-00-02',
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
  ONLINE_QUALITY_RECORD: {
    name: 'ON LINE MONITORING QUALITY RECORD',
    code: 'QA-FRM-14-00-05-04',
    revision: '00',
    issueDate: '23-07-2026',
  },

  // --- ETP / STP plant registers -------------------------------------------
  // Revisions and issue dates read off photographs of the FILLED registers
  // (Aug 2026 set), so these are the forms as the plant actually keeps them.
  // Two codes are still open:
  //   * ETP_DAILY_RECORD - illegible on both photos, left BLANK on purpose. It
  //     used to carry QA-FRM-14-00-08-01, which is really the Shelf Life Study
  //     Record's number, so printing it stamped another form's controlled code
  //     on this register.
  //   * ETP_MONITORING_RECORD - the footer confirms the QA-FRM-14-00-08- group
  //     but the last segment is lost in the curl of the page.
  // ETP_CHEMICAL_CONSUMPTION is the "A" variant of the STP sheet's number, read
  // off a blurred footer - worth one confirmation from QA.
  // These are only the fallback: a row in ETP Settings always wins.
  ETP_DAILY_RECORD: {
    name: 'EFFLUENT TREATMENT PLANT RECORD',
    code: '',
    revision: '01',
    issueDate: '01-06-2024',
  },
  ETP_MONITORING_RECORD: {
    name: 'ETP ON LINE MONITORING RECORD',
    code: 'QA-FRM-14-00-08-02',
    revision: '00',
    issueDate: '05-10-2023',
  },
  ETP_CHEMICAL_CONSUMPTION: {
    name: 'CHEMICAL CONSUMPTION RECORD FOR ETP PLANT',
    code: 'QA-FRM-14-00-08-04 A',
    revision: '01',
    issueDate: '01-07-2024',
  },
  STP_CHEMICAL_CONSUMPTION: {
    name: 'CHEMICAL CONSUMPTION RECORD FOR STP PLANT',
    code: 'QA-FRM-14-00-08-04',
    revision: '01',
    issueDate: '01-07-2024',
  },
  ETP_SLUDGE_GENERATION: {
    name: 'SLUDGE GENERATION RECORD',
    code: 'QA-FRM-14-00-08-06',
    revision: '00',
    issueDate: '01-01-2025',
  },
  ETP_BACKWASH_RECORD: {
    name: 'DAILY BACK WASHING RECORD',
    code: 'QA-FRM-14-09-00-03',
    revision: '00',
    issueDate: '05-10-2023',
  },
  ETP_CALIBRATION_RECORD: {
    name: 'CALIBRATION RECORD',
    code: 'CAL-FRM-08-03-00-01',
    revision: '01',
    issueDate: '06-09-2023',
  },
} as const satisfies Record<string, ControlledDocumentMeta>;

export type ControlledDocumentKey = keyof typeof CONTROLLED_DOCUMENTS;
