export const LABEL_WIDTH = '60mm';
export const LABEL_HEIGHT = '40mm';

export const LABEL_PRINT_PAGE_STYLE = `
  @page {
    size: A4 portrait;
    margin: 5mm;
  }

  @media print {
    html,
    body {
      margin: 0 !important;
      padding: 0 !important;
      background: #fff !important;
    }

    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    .barcode-print-sheet {
      width: 100%;
      margin: 0;
      padding: 0;
      background: #fff;
      display: grid;
      grid-template-columns: repeat(3, 60mm);
      grid-auto-rows: 40mm;
      gap: 1mm;
      align-content: start;
      justify-content: start;
    }

    .barcode-label {
      width: 60mm;
      height: 40mm;
      page-break-inside: avoid;
      break-inside: avoid;
    }
  }
`;
