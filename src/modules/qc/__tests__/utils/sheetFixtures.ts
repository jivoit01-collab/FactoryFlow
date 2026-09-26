import type { CellFields, SheetLayout } from '../../types/qcRecord.types';

/**
 * A 4 x 4 sheet shaped like the QA forms: a title merged across the top, a
 * boxed header row and reading row, and a loose 'Remarks:' line.
 *
 *        A          B        C        D
 *   1  [ OIL PLANT RECORD (A1:D1)          ]
 *   2  [Param]  [Time]   [Time]   [Time]     <- boxed
 *   3  [FFA  ]  [    ]   [    ]   [    ]     <- boxed readings
 *   4   Remarks:  ____     ____     ____     <- no borders
 */
export function sampleLayout(): SheetLayout {
  const boxed = { bl: 'thin', br: 'thin', bt: 'thin', bb: 'thin' };
  return {
    version: 1,
    sheet: 'Form',
    range: 'A1:D4',
    cols: [{ w: 100 }, { w: 50 }, { w: 50 }, { w: 50 }],
    rows: [{ h: 40 }, { h: 20 }, { h: 20 }, { h: 20 }],
    styles: [
      { ff: 'Times New Roman', fs: 24, b: true, ha: 'center', va: 'middle' },
      { ff: 'Times New Roman', fs: 12, ...boxed },
      { ff: 'Calibri', fs: 11 },
    ],
    cells: {
      A1: { s: 0, v: 'OIL PLANT RECORD' },
      A2: { s: 1, v: 'Param' },
      B2: { s: 1, v: 'Time' },
      C2: { s: 1, v: 'Time' },
      D2: { s: 1, v: 'Time' },
      A3: { s: 1, v: 'FFA' },
      B3: { s: 1 },
      C3: { s: 1 },
      D3: { s: 1 },
      A4: { s: 2, v: 'Remarks:' },
      B4: { s: 2 },
      C4: { s: 2 },
      D4: { s: 2 },
    },
    merges: ['A1:D1'],
    images: [{ src: 'data:image/png;base64,AAAA', x: 5, y: 0, w: 30, h: 30 }],
    header: { left: '', center: 'JIVO WELLNESS PVT.LTD.', right: '' },
    footer: { left: 'Revision No.:02/22-05-2026', center: '', right: 'QA-FRM-1' },
    orientation: 'landscape',
  };
}

export const sampleFields: CellFields = {
  B3: { type: 'NUMBER', min: '0', max: '0.5', label: 'FFA · Time 1' },
  C3: { type: 'NUMBER', label: 'FFA · Time 2' },
  D3: { type: 'CHOICE', options: ['Absent', 'Present'], ok: ['Absent'] },
  B4: { type: 'REMARKS', label: 'Remarks' },
};
