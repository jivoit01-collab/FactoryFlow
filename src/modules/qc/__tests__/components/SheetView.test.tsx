import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import SheetView from '../../components/sheet/SheetView';
import { buildSheetGrid } from '../../utils/sheetLayout';
import { sampleFields, sampleLayout } from '../utils/sheetFixtures';

function renderSheet(props: Partial<Parameters<typeof SheetView>[0]> = {}) {
  const layout = sampleLayout();
  const fields = props.fields ?? sampleFields;
  return render(
    <SheetView
      layout={layout}
      grid={buildSheetGrid(layout, fields)}
      fields={fields}
      mode="fill"
      scale={1}
      {...props}
    />,
  );
}

describe('SheetView', () => {
  it('draws the sheet text, merges and pictures', () => {
    const { container } = renderSheet({ mode: 'print' });
    const title = screen.getByText('OIL PLANT RECORD');
    expect(title.getAttribute('colspan')).toBe('4');
    expect(container.querySelector('img')?.getAttribute('src')).toBe('data:image/png;base64,AAAA');
  });

  it('puts an input in each fillable cell and reports edits by cell', () => {
    const onChange = vi.fn();
    renderSheet({ values: { B3: '0.2' }, onChange });
    const first = screen.getByLabelText('FFA · Time 1') as HTMLInputElement;
    expect(first.value).toBe('0.2');
    fireEvent.change(screen.getByLabelText('FFA · Time 2'), { target: { value: '0.31' } });
    expect(onChange).toHaveBeenCalledWith('C3', '0.31');
  });

  it('lets free text wrap in its box instead of being cut off', () => {
    const fields = { ...sampleFields, C3: { type: 'TEXT' as const, label: 'Product' } };
    renderSheet({ fields, values: { C3: 'SUNFLOWER 1 LTR 20 PCS' } });
    const area = screen.getByLabelText('Product');
    expect(area.tagName).toBe('TEXTAREA');
    expect((area as HTMLTextAreaElement).value).toBe('SUNFLOWER 1 LTR 20 PCS');
    expect(area.style.whiteSpace).toBe('pre-wrap');
  });

  it('prints a long entry wrapped in its box', () => {
    const fields = { ...sampleFields, C3: { type: 'TEXT' as const } };
    const { container } = renderSheet({
      fields,
      mode: 'print',
      values: { C3: 'SUNFLOWER 1 LTR 20 PCS' },
    });
    const cell = container.querySelector('[data-ref="C3"]') as HTMLElement;
    expect(cell.textContent).toBe('SUNFLOWER 1 LTR 20 PCS');
    expect(cell.style.whiteSpace).toBe('pre-wrap');
    expect(cell.style.verticalAlign).toBe('middle');
    expect(cell.style.textAlign).toBe('center');
  });

  it('centres what is typed in its box, whatever the sheet aligned', () => {
    // The sample's reading cells are left/bottom aligned in the sheet itself.
    const fields = { ...sampleFields, C3: { type: 'TEXT' as const, label: 'Product' } };
    renderSheet({ fields });
    expect((screen.getByLabelText('FFA · Time 1') as HTMLElement).style.textAlign).toBe('center');
    expect((screen.getByLabelText('Product') as HTMLElement).style.textAlign).toBe('center');
    const remarks = screen.getByLabelText('Remarks') as HTMLElement;
    expect(remarks.style.textAlign).toBe('left');
  });

  it('stretches columns and rows apart for a printout, text by the smaller', () => {
    const { container } = renderSheet({ mode: 'print', scale: 2, scaleY: 1 });
    expect(container.querySelector('col')?.style.width).toBe('200px');
    expect(container.querySelector('tr')?.style.height).toBe('40px');
    // 24pt title at the vertical zoom of 1.
    expect(screen.getByText('OIL PLANT RECORD').style.fontSize).toBe('32px');
    // The logo keeps its proportions.
    const logo = container.querySelector('img') as HTMLElement;
    expect([logo.style.width, logo.style.height]).toEqual(['30px', '30px']);
  });

  it('offers a choice cell its options', () => {
    const { container } = renderSheet();
    const choice = screen.getByLabelText('D3');
    const listId = choice.getAttribute('list');
    expect(listId).toBeTruthy();
    const options = [...container.querySelectorAll(`#${listId} option`)].map((o) =>
      o.getAttribute('value'),
    );
    expect(options).toEqual(['Absent', 'Present']);
  });

  it('edits the remarks through its own callback', () => {
    const onRemarksChange = vi.fn();
    renderSheet({ bound: { remarks: 'ok' }, onRemarksChange });
    fireEvent.change(screen.getByLabelText('Remarks'), { target: { value: 'Line 2 high' } });
    expect(onRemarksChange).toHaveBeenCalledWith('Line 2 high');
  });

  it('shows the record date and sign-offs in bound cells', () => {
    const fields = { ...sampleFields, D4: { type: 'SIGN_SUBMITTED' as const } };
    renderSheet({
      fields,
      readOnly: true,
      bound: { submittedBy: 'Rajesh Kumar\n26-09-2026 08:10' },
    });
    const signed = screen.getByText(/Rajesh Kumar/);
    expect(signed.textContent).toBe('Rajesh Kumar\n26-09-2026 08:10');
    expect(signed.style.whiteSpace).toBe('pre-wrap');
  });

  it('marks an out-of-spec reading on the printout without colour alone', () => {
    renderSheet({ mode: 'print', values: { B3: '0.9' }, checks: { B3: false } });
    const cell = screen.getByText('0.9 ✗');
    expect(cell.style.fontWeight).toBe('700');
  });

  it('reports clicks by cell in the designer', () => {
    const onCellMouseDown = vi.fn();
    const { container } = renderSheet({
      mode: 'design',
      selected: new Set(['B3']),
      onCellMouseDown,
    });
    const cell = container.querySelector('[data-ref="C3"]') as HTMLElement;
    fireEvent.mouseDown(cell);
    expect(onCellMouseDown).toHaveBeenCalledWith('C3', expect.anything());
    const chosen = container.querySelector('[data-ref="B3"]') as HTMLElement;
    expect(chosen.style.boxShadow).toContain('#2563eb');
    // No inputs while laying the form out.
    expect(container.querySelector('input')).toBeNull();
  });
});
