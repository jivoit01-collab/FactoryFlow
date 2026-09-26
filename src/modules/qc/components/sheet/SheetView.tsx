import type { CSSProperties, MouseEvent } from 'react';
import { useMemo } from 'react';

import type { CellFields, SheetLayout } from '../../types/qcRecord.types';
import {
  cellCss,
  FIELD_TYPE_HINT,
  FIELD_TYPE_LABEL,
  FIELD_TYPE_TINT,
  fontPx,
  type GridCell,
  isValueField,
  type SheetGrid,
  toDDMMYYYY,
} from '../../utils/sheetLayout';

/** What bound cells show: the record's own date, shift, remarks and sign-offs. */
export interface SheetBoundValues {
  recordDate?: string;
  shift?: string;
  remarks?: string;
  submittedBy?: string;
  approvedBy?: string;
}

export type SheetMode = 'design' | 'fill' | 'print';

interface SheetViewProps {
  layout: SheetLayout;
  grid: SheetGrid;
  fields: CellFields;
  mode: SheetMode;
  /** 1 = Excel's 100% zoom. */
  scale: number;
  /**
   * Vertical zoom, when a printout stretches the sheet to fill the page.
   * Defaults to `scale`. Text follows the smaller of the two, so it still
   * fits its rows.
   */
  scaleY?: number;

  /** fill / print: cell values, drafts already merged in by the caller. */
  values?: Record<string, string>;
  /** fill: cells edited but not saved yet. */
  dirty?: Set<string>;
  /** fill / print: the server's verdict per judged cell. */
  checks?: Record<string, boolean>;
  bound?: SheetBoundValues;
  readOnly?: boolean;
  onChange?: (ref: string, value: string) => void;
  onRemarksChange?: (value: string) => void;

  /** design: highlighted cells. */
  selected?: Set<string>;
  onCellMouseDown?: (ref: string, event: MouseEvent) => void;
  onCellMouseEnter?: (ref: string) => void;
}

const DIRTY_TINT = 'rgba(245, 158, 11, 0.22)';
const OUT_OF_SPEC_TINT = 'rgba(239, 68, 68, 0.16)';
const OUT_OF_SPEC_TEXT = '#b91c1c';

/** Layer a tint over whatever fill the cell already has. */
function tint(colour: string): CSSProperties {
  return { backgroundImage: `linear-gradient(${colour}, ${colour})` };
}

/**
 * An uploaded Excel form, drawn as the sheet looks: its column widths, row
 * heights, merges, borders, fonts and pictures, scaled as a whole.
 *
 * The same drawing serves three jobs. `design` lets the QA manager pick the
 * cells that get filled in; `fill` puts inputs in those cells for the day's
 * record; `print` draws the filled sheet as the controlled document.
 *
 * It is always drawn as paper -- white, black ink -- whatever the app theme,
 * because it is a picture of a printed form.
 */
export default function SheetView({
  layout,
  grid,
  fields,
  mode,
  scale,
  scaleY,
  values = {},
  dirty,
  checks = {},
  bound = {},
  readOnly = false,
  onChange,
  onRemarksChange,
  selected,
  onCellMouseDown,
  onCellMouseEnter,
}: SheetViewProps) {
  const yScale = scaleY ?? scale;
  const textScale = Math.min(scale, yScale);

  // One datalist per distinct option list, rendered outside the table: an id
  // must be unique in the document.
  const optionLists = useMemo(() => {
    const lists = new Map<string, { id: string; options: string[] }>();
    Object.values(fields).forEach((field) => {
      if (field.type !== 'CHOICE' || !field.options?.length) return;
      const key = JSON.stringify(field.options);
      if (!lists.has(key)) {
        lists.set(key, { id: `qc-sheet-options-${lists.size}`, options: field.options });
      }
    });
    return lists;
  }, [fields]);

  const boundText = (gridCell: GridCell): string => {
    switch (gridCell.field?.type) {
      case 'RECORD_DATE':
        return toDDMMYYYY(bound.recordDate);
      case 'SHIFT':
        return bound.shift ?? '';
      case 'REMARKS':
        return bound.remarks ?? '';
      case 'SIGN_SUBMITTED':
        return bound.submittedBy ?? '';
      case 'SIGN_APPROVED':
        return bound.approvedBy ?? '';
      default:
        return '';
    }
  };

  const renderContent = (gridCell: GridCell, css: CSSProperties) => {
    const { field, ref, cell } = gridCell;
    if (!field) return cell?.v ?? '';

    if (mode === 'design') {
      return (
        <span style={{ color: '#6b7280', fontStyle: 'italic', fontWeight: 400 }}>
          {FIELD_TYPE_HINT[field.type]}
        </span>
      );
    }

    const inputStyle: CSSProperties = {
      position: 'absolute',
      inset: 0,
      width: '100%',
      height: '100%',
      border: 0,
      margin: 0,
      padding: css.padding,
      background: 'transparent',
      font: 'inherit',
      color: 'inherit',
      textAlign: css.textAlign,
      outline: 'none',
    };
    const inputClass = 'focus:bg-blue-50/60 focus:ring-2 focus:ring-inset focus:ring-blue-600';
    // Free text wraps inside its box, as it would be written on the paper
    // form (a product name runs over two or three lines of the tall PRODUCT
    // box). The area grows with its text and sits in the middle of the cell,
    // where the printout puts it too.
    const areaStyle: CSSProperties = {
      position: 'absolute',
      left: 0,
      top: '50%',
      transform: 'translateY(-50%)',
      width: '100%',
      maxHeight: '100%',
      fieldSizing: 'content',
      resize: 'none',
      overflow: 'auto',
      border: 0,
      margin: 0,
      padding: css.padding,
      background: 'transparent',
      font: 'inherit',
      lineHeight: 1.15,
      color: 'inherit',
      textAlign: css.textAlign,
      whiteSpace: 'pre-wrap',
      overflowWrap: 'break-word',
      outline: 'none',
    };

    if (field.type === 'REMARKS' && mode === 'fill' && !readOnly) {
      return (
        <textarea
          rows={1}
          aria-label={field.label || 'Remarks'}
          value={bound.remarks ?? ''}
          onChange={(event) => onRemarksChange?.(event.target.value)}
          style={{ ...areaStyle, textAlign: 'left' }}
          className={inputClass}
        />
      );
    }

    if (!isValueField(field)) return boundText(gridCell);

    const value = values[ref] ?? '';
    if (mode === 'print' || readOnly) {
      const out = checks[ref] === false;
      return out && mode === 'print' ? `${value} ✗` : value;
    }

    if (field.type === 'TEXT') {
      return (
        <textarea
          rows={1}
          aria-label={field.label || ref}
          value={value}
          onChange={(event) => onChange?.(ref, event.target.value)}
          style={areaStyle}
          className={inputClass}
        />
      );
    }

    const list =
      field.type === 'CHOICE' && field.options?.length
        ? optionLists.get(JSON.stringify(field.options))?.id
        : undefined;
    return (
      <input
        aria-label={field.label || ref}
        value={value}
        list={list}
        type={field.type === 'DATE' ? 'date' : 'text'}
        inputMode={field.type === 'NUMBER' ? 'decimal' : field.type === 'TIME' ? 'numeric' : 'text'}
        placeholder={field.type === 'TIME' ? 'hh:mm' : undefined}
        onChange={(event) => onChange?.(ref, event.target.value)}
        style={inputStyle}
        className={inputClass}
      />
    );
  };

  const renderCell = (gridCell: GridCell) => {
    const { field, ref } = gridCell;
    const css: CSSProperties = cellCss(gridCell, textScale);
    const hasInput =
      mode === 'fill' && !readOnly && !!field && (isValueField(field) || field.type === 'REMARKS');

    if (hasInput) {
      css.position = 'relative';
      css.overflow = 'hidden';
    }

    if (field && mode === 'design') {
      Object.assign(css, tint(FIELD_TYPE_TINT[field.type]));
    }
    if (field && isValueField(field)) {
      // An entry sits in the centre of its box, both ways, whatever the
      // sheet's own alignment for the blank cell -- the designer's hint too,
      // so it previews where the reading will go.
      css.textAlign = 'center';
      css.verticalAlign = 'middle';
    }
    if (field && mode !== 'design' && isValueField(field)) {
      if (dirty?.has(ref)) {
        Object.assign(css, tint(DIRTY_TINT));
      } else if (checks[ref] === false) {
        Object.assign(css, mode === 'fill' ? tint(OUT_OF_SPEC_TINT) : {});
        css.color = OUT_OF_SPEC_TEXT;
        css.fontWeight = 700;
      }
    }
    if (field && mode !== 'design') {
      // A filled cell must stay readable even when the sheet gave it no font
      // of its own (Excel's 11pt default shrinks to nothing at 15% zoom).
      const scaled = fontPx(gridCell.style, textScale);
      const minimum = mode === 'print' ? 8 : 12;
      if (isValueField(field) || field.type === 'REMARKS') {
        css.fontSize = `${Math.max(scaled, minimum)}px`;
        // What was typed wraps inside its box instead of being cut off at the
        // edge, and sits in the middle of it -- a blank form is still drawn
        // exactly as the sheet, only the entries are placed like handwriting.
        css.whiteSpace = 'pre-wrap';
        css.overflowWrap = 'break-word';
        css.verticalAlign = 'middle';
        css.lineHeight = 1.15;
      } else {
        // A bound cell's text is the record's, not the sheet's heading style;
        // a signature runs to two lines (name, then date and time).
        css.fontSize = `${Math.min(Math.max(scaled, minimum), fontPx({ fs: 11 }, 1))}px`;
        css.fontWeight = 600;
        css.whiteSpace = 'pre-wrap';
        css.lineHeight = 1.1;
      }
    }

    if (mode === 'design') {
      css.cursor = 'cell';
      css.userSelect = 'none';
      if (selected?.has(ref)) css.boxShadow = 'inset 0 0 0 2px #2563eb';
    }

    const title =
      mode === 'design'
        ? [ref, field && FIELD_TYPE_LABEL[field.type], field?.label].filter(Boolean).join(' · ')
        : field?.label;

    return (
      <td
        key={ref}
        rowSpan={gridCell.rowSpan > 1 ? gridCell.rowSpan : undefined}
        colSpan={gridCell.colSpan > 1 ? gridCell.colSpan : undefined}
        style={css}
        title={title || undefined}
        data-ref={ref}
        onMouseDown={
          mode === 'design'
            ? (event) => onCellMouseDown?.(ref, event)
            : hasInput
              ? (event) => {
                  // The text area only covers its lines; a click anywhere in
                  // the box should still start typing in it.
                  if (event.target !== event.currentTarget) return;
                  event.preventDefault();
                  event.currentTarget.querySelector<HTMLElement>('textarea, input')?.focus();
                }
              : undefined
        }
        onMouseEnter={mode === 'design' ? () => onCellMouseEnter?.(ref) : undefined}
      >
        {renderContent(gridCell, css)}
      </td>
    );
  };

  // The table and each picture share one grid cell, so a picture sits over
  // the sheet by its margins. Absolute positioning would do the same on
  // screen, but Chrome misplaces it when it paginates a table for printing.
  return (
    <div
      style={{
        display: 'grid',
        width: grid.width * scale,
        minHeight: grid.height * yScale,
        background: '#ffffff',
        color: '#000000',
      }}
    >
      {mode === 'fill' &&
        [...optionLists.values()].map((list) => (
          <datalist key={list.id} id={list.id}>
            {list.options.map((option) => (
              <option key={option} value={option} />
            ))}
          </datalist>
        ))}

      <table
        style={{
          gridArea: '1 / 1',
          tableLayout: 'fixed',
          borderCollapse: 'collapse',
          width: grid.width * scale,
        }}
      >
        <colgroup>
          {grid.cols.map((col) => (
            <col key={col.col} style={{ width: col.width * scale }} />
          ))}
        </colgroup>
        <tbody>
          {grid.rows.map((row) => (
            <tr key={row.row} style={{ height: row.height * yScale }}>
              {row.cells.map(renderCell)}
            </tr>
          ))}
        </tbody>
      </table>

      {layout.images.map((image, index) => (
        <div
          key={index}
          style={{
            gridArea: '1 / 1',
            alignSelf: 'start',
            justifySelf: 'start',
            zIndex: 1,
            pointerEvents: 'none',
          }}
        >
          <img
            src={image.src}
            alt=""
            draggable={false}
            style={{
              display: 'block',
              marginLeft: image.x * scale,
              marginTop: image.y * yScale,
              // Sized by the smaller zoom, so a logo is never stretched.
              width: image.w * textScale,
              height: image.h * textScale,
            }}
          />
        </div>
      ))}
    </div>
  );
}
