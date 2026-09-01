/**
 * Turns a pasted testing procedure into the exact record that will be stored.
 *
 * QA keeps procedures as printed SOPs — a header block, then numbered
 * sections, then bullets / numbered steps / a two-column observation table.
 * Analysts paste that text straight out of Word, a PDF, or an email, so the
 * parser has to cope with the punctuation those sources produce (curly
 * quotes, en/em dashes, `•`/`o`/`-` bullets, tab- or pipe-separated table
 * rows) without the analyst cleaning it up first.
 *
 * The output is deliberately the API payload itself, not an intermediate
 * shape: what the Analysis panel renders is byte-for-byte what gets POSTed,
 * so the preview cannot drift from what is stored.
 */

import type {
  LineKind,
  ProcedureSectionKey,
  ProcedureType,
  SaveTestingProcedureRequest,
  TestingProcedureLine,
  TestingProcedureSection,
} from '../types/testingProcedure.types';

/** A problem worth showing the analyst before they save. */
export interface ParseIssue {
  level: 'error' | 'warning';
  field: string;
  message: string;
}

export interface ParsedProcedure {
  data: SaveTestingProcedureRequest;
  issues: ParseIssue[];
  /** Lines that could not be attached to any section (text before section 1). */
  preamble: string[];
}

// ---------------------------------------------------------------------------
// Normalisation
// ---------------------------------------------------------------------------

/**
 * Flatten the typography that Word/PDF copy-paste injects.
 *
 * Curly quotes and dashes are normalised so heading and label matching below
 * can use plain ASCII patterns. Non-breaking spaces (U+00A0) become real
 * spaces too -- otherwise a `Revision No. : 00` label whose colon is preceded
 * by one silently fails to match.
 */
function normalise(raw: string): string {
  return raw
    .replace(/\r\n?/g, '\n')
    .replace(/[‘’‛]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/\u00A0/g, ' ')
    .replace(/[ \t]+$/gm, '');
}

/** Strip a leading bullet glyph, returning the text and whether one was found. */
function stripBullet(line: string): { text: string; isBullet: boolean } {
  const match = line.match(/^\s*([•▪◦‣*·]|o\s|-\s)\s*(.*)$/);
  if (match) return { text: match[2].trim(), isBullet: true };
  return { text: line.trim(), isBullet: false };
}

/** Match `3. Take a clean test tube` / `3) Take …`, but not `3.5 mL of acid`. */
function matchStep(line: string): { marker: string; text: string } | null {
  const match = line.match(/^\s*(\d{1,2})[.)]\s+(\S.*)$/);
  if (!match) return null;
  return { marker: match[1], text: match[2].trim() };
}

// ---------------------------------------------------------------------------
// Section heading recognition
// ---------------------------------------------------------------------------

/**
 * Heading text -> stored section key. Order matters: the first entry whose
 * pattern matches wins, so more specific patterns are listed first
 * ("Sample Requirement" before a bare "Sample").
 */
const SECTION_PATTERNS: Array<{ key: ProcedureSectionKey; pattern: RegExp }> = [
  { key: 'SCOPE', pattern: /^scope\b/i },
  { key: 'PRINCIPLE', pattern: /^principle\b/i },
  { key: 'RESPONSIBILITY', pattern: /^responsibilit(y|ies)\b/i },
  { key: 'APPARATUS', pattern: /^(apparatus|glassware|equipment|materials?\s+required)\b/i },
  { key: 'REAGENT', pattern: /^(reagents?|chemicals?)\b/i },
  { key: 'SAMPLE_REQUIREMENT', pattern: /^sample\s*(requirements?|preparation|size)?\b/i },
  { key: 'OBSERVATION', pattern: /^observation/i },
  { key: 'ACCEPTANCE_CRITERIA', pattern: /^(acceptance|criteria|limits?|specification)/i },
  { key: 'PRECAUTIONS', pattern: /^(precautions?|cautions?)\b/i },
  { key: 'SAFETY', pattern: /^safety\b/i },
  { key: 'CALCULATION', pattern: /^calculations?\b/i },
  { key: 'REFERENCE', pattern: /^(references?|annexures?)\b/i },
  // Last: "Procedure" would otherwise swallow "Testing Procedure" headings.
  { key: 'PROCEDURE', pattern: /^(test\s+)?(procedure|method|test\s+method)\b/i },
];

function classifySection(title: string): ProcedureSectionKey {
  const cleaned = title.replace(/[:-]\s*$/, '').trim();
  const found = SECTION_PATTERNS.find((entry) => entry.pattern.test(cleaned));
  return found ? found.key : 'OTHER';
}

/**
 * A numbered section heading, e.g. `7. Procedure` or `8. Observation and
 * Interpretation`.
 *
 * A heading is short and has no sentence-ending punctuation — that is what
 * separates `7. Procedure` from a numbered *step* like `7. Shake the tube
 * carefully.`. Steps inside section 7 are re-parsed as steps, not headings,
 * because they only ever appear after a heading has opened a section.
 */
function matchSectionHeading(line: string): { number: string; title: string } | null {
  const match = line.match(/^\s*(\d{1,2})\s*[.)]\s*([A-Za-z][^.!?]*?)\s*:?\s*$/);
  if (!match) return null;
  const title = match[2].trim();
  // Headings are terse. Anything long is prose that happens to start with a number.
  if (title.length > 60) return null;
  if (title.split(/\s+/).length > 7) return null;
  return { number: match[1], title };
}

// ---------------------------------------------------------------------------
// Header block
// ---------------------------------------------------------------------------

/** Pull `QA-TST-INH-14-02-10` out of a `DOCUMENT CODE:` label or bare text. */
function findDocumentCode(text: string): string {
  const labelled = text.match(/document\s*code\s*[:-]?\s*([A-Z0-9][A-Z0-9/-]{4,})/i);
  if (labelled) return labelled[1].trim().toUpperCase().replace(/[.,;]$/, '');

  // Fall back to the shape itself: 2+ alpha groups then numeric groups.
  const bare = text.match(/\b([A-Z]{2,5}(?:-[A-Z]{2,5}){1,3}(?:-\d{2}){2,4})\b/);
  return bare ? bare[1].toUpperCase() : '';
}

/**
 * In-house vs standard.
 *
 * The document code segment is the authority — `QA-TST-INH-…` is in-house,
 * `-STD-` is standard — because the banner wording varies between documents
 * while the code is controlled. Falls back to the banner text, then in-house,
 * which is the common case for the procedures QA writes themselves.
 */
function detectProcedureType(text: string, documentCode: string): ProcedureType {
  const code = documentCode.toUpperCase();
  if (/(^|-)INH(-|$)/.test(code)) return 'INHOUSE';
  if (/(^|-)STD(-|$)/.test(code)) return 'STANDARD';
  if (/\bin[\s-]?house\b/i.test(text)) return 'INHOUSE';
  if (/\bstandard\s+(testing\s+)?procedure\b/i.test(text)) return 'STANDARD';
  return 'INHOUSE';
}

/** `Revision No.:00/15-10-2023` -> revision `00`, date `2023-10-15`. */
function findRevision(text: string): { number: string; date: string | null } {
  const match = text.match(
    /revision\s*(?:no\.?|number)?\s*[:-]?\s*(\d{1,3})\s*(?:[/,]\s*(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4}))?/i,
  );
  if (!match) return { number: '', date: null };

  const number = match[1];
  if (!match[2]) return { number, date: null };

  const day = match[2].padStart(2, '0');
  const month = match[3].padStart(2, '0');
  const rawYear = match[4];
  const year = rawYear.length === 2 ? `20${rawYear}` : rawYear;
  const iso = `${year}-${month}-${day}`;
  // Guard against a transposed date (e.g. month 15) rather than storing junk.
  return Number(month) >= 1 && Number(month) <= 12 && Number(day) >= 1 && Number(day) <= 31
    ? { number, date: iso }
    : { number, date: null };
}

function findTotalPages(text: string): number | null {
  const match = text.match(/page\s*\d+\s*of\s*(\d+)/i);
  return match ? Number(match[1]) : null;
}

function findClassification(text: string): string {
  const match = text.match(/classified\s*[:-]?\s*(.+)/i);
  if (match) return match[1].trim().replace(/[.,;]$/, '');
  return /business\s+confidential/i.test(text) ? 'Business Confidential' : '';
}

function findOrganisation(lines: string[]): string {
  const match = lines.find((line) => /\b(pvt|private|ltd|limited|llp|inc)\b/i.test(line));
  return match ? match.trim().replace(/^[|\s]+/, '') : '';
}

/**
 * The document title — the printed heading above the document code.
 *
 * Header lines are scanned for the most title-like candidate: upper-case,
 * not the company name, not a label, not the banner. `ARGEMONE OIL
 * ADULTERATION TESTING` wins over `INHOUSE TESTING PROCEDURE` because the
 * banner is recognised and excluded.
 */
const BANNER_PATTERN = /^(in[\s-]?house|standard)\s+testing\s+procedure$/i;

function findHeaderParts(headerLines: string[]): { title: string; heading: string } {
  const candidates = headerLines
    .map((line) => line.replace(/^[|\s]+|[|\s]+$/g, '').trim())
    .filter(Boolean)
    .filter((line) => !/document\s*code/i.test(line))
    .filter((line) => !/revision|classified|page\s*\d+\s*of|controlled\s*document/i.test(line))
    .filter((line) => !/\b(pvt|private|ltd|limited|llp|inc)\b/i.test(line));

  const heading = candidates.find((line) => BANNER_PATTERN.test(line)) ?? '';
  const title =
    candidates.find((line) => !BANNER_PATTERN.test(line) && line.length > 4) ?? '';

  return { title: title.trim(), heading: heading.trim() };
}

// ---------------------------------------------------------------------------
// Table rows
// ---------------------------------------------------------------------------

/**
 * A two-column row of the observation table.
 *
 * Word and PDF copy-paste separate cells with a tab or a run of spaces;
 * markdown-style pastes use a pipe. All three are accepted. A single-space
 * split is deliberately *not* accepted — it would shred ordinary prose.
 */
function matchTableRow(line: string): { text: string; interpretation: string } | null {
  const trimmed = line.trim();
  if (!trimmed) return null;

  if (trimmed.includes('|')) {
    const cells = trimmed
      .split('|')
      .map((cell) => cell.trim())
      .filter(Boolean);
    if (cells.length >= 2) return { text: cells[0], interpretation: cells.slice(1).join(' ') };
  }

  if (trimmed.includes('\t')) {
    const cells = trimmed
      .split('\t')
      .map((cell) => cell.trim())
      .filter(Boolean);
    if (cells.length >= 2) return { text: cells[0], interpretation: cells.slice(1).join(' ') };
  }

  const spaced = trimmed.split(/\s{3,}/).map((cell) => cell.trim()).filter(Boolean);
  if (spaced.length >= 2) return { text: spaced[0], interpretation: spaced.slice(1).join(' ') };

  return null;
}

/** Header row of the observation table — captured as a heading, not data. */
function isTableHeaderRow(text: string, interpretation: string): boolean {
  return /observation/i.test(text) && /interpretation/i.test(interpretation);
}

// ---------------------------------------------------------------------------
// Main parse
// ---------------------------------------------------------------------------

interface DraftSection {
  section_number: string;
  title: string;
  section_key: ProcedureSectionKey;
  bodyLines: string[];
  lines: Array<{ kind: LineKind; marker: string; text: string; interpretation: string }>;
}

function finaliseSection(draft: DraftSection, sequence: number): TestingProcedureSection {
  const lines: TestingProcedureLine[] = draft.lines.map((line, index) => ({
    sequence: index,
    kind: line.kind,
    marker: line.marker,
    text: line.text,
    interpretation: line.interpretation,
  }));

  return {
    sequence,
    section_number: draft.section_number,
    section_key: draft.section_key,
    title: draft.title,
    body: draft.bodyLines.join('\n').trim(),
    lines,
  };
}

export function parseProcedureText(raw: string): ParsedProcedure {
  const text = normalise(raw);
  const allLines = text.split('\n');
  const issues: ParseIssue[] = [];

  // --- header: everything before the first numbered section heading --------
  let firstSectionIndex = allLines.findIndex((line) => matchSectionHeading(line) !== null);
  if (firstSectionIndex === -1) firstSectionIndex = allLines.length;

  const headerLines = allLines.slice(0, firstSectionIndex);
  const headerText = headerLines.join('\n');

  const documentCode = findDocumentCode(text);
  const { title, heading } = findHeaderParts(headerLines);
  const revision = findRevision(text);
  const procedureType = detectProcedureType(text, documentCode);

  // --- sections ------------------------------------------------------------
  const drafts: DraftSection[] = [];
  let current: DraftSection | null = null;
  const preamble: string[] = [];

  for (let index = firstSectionIndex; index < allLines.length; index += 1) {
    const rawLine = allLines[index];
    const trimmed = rawLine.trim();
    if (!trimmed) continue;

    // Page furniture repeats on every page of a scanned SOP — never content.
    if (/^(page\s*\d+\s*of\s*\d+|controlled\s*document|classified\s*:)/i.test(trimmed)) {
      continue;
    }
    if (/^revision\s*no/i.test(trimmed)) continue;

    const sectionHeading = matchSectionHeading(rawLine);
    if (sectionHeading) {
      if (current) drafts.push(current);
      current = {
        section_number: sectionHeading.number,
        title: sectionHeading.title,
        section_key: classifySection(sectionHeading.title),
        bodyLines: [],
        lines: [],
      };
      continue;
    }

    if (!current) {
      preamble.push(trimmed);
      continue;
    }

    // The observation section is a table; elsewhere a wide gap is just layout.
    if (current.section_key === 'OBSERVATION') {
      const row = matchTableRow(rawLine);
      if (row) {
        if (isTableHeaderRow(row.text, row.interpretation)) continue;
        current.lines.push({
          kind: 'TABLE_ROW',
          marker: '',
          text: row.text,
          interpretation: row.interpretation,
        });
        continue;
      }
    }

    const bullet = stripBullet(rawLine);
    if (bullet.isBullet && bullet.text) {
      current.lines.push({
        kind: 'BULLET',
        marker: '',
        text: bullet.text,
        interpretation: '',
      });
      continue;
    }

    const step = matchStep(rawLine);
    if (step) {
      current.lines.push({
        kind: 'STEP',
        marker: step.marker,
        text: step.text,
        interpretation: '',
      });
      continue;
    }

    // Prose. A continuation of the previous bullet/step (a wrapped line from a
    // PDF) is appended to it rather than orphaned into the section body.
    const last = current.lines[current.lines.length - 1];
    const looksLikeContinuation =
      last !== undefined &&
      current.bodyLines.length === 0 &&
      /^[a-z(]/.test(trimmed) &&
      last.kind !== 'TABLE_ROW';

    if (looksLikeContinuation) {
      last.text = `${last.text} ${trimmed}`.replace(/\s+/g, ' ').trim();
    } else if (current.lines.length === 0) {
      current.bodyLines.push(trimmed);
    } else {
      current.bodyLines.push(trimmed);
    }
  }
  if (current) drafts.push(current);

  const sections = drafts.map(finaliseSection);

  // --- issues worth surfacing before the analyst saves ----------------------
  if (!documentCode) {
    issues.push({
      level: 'error',
      field: 'document_code',
      message:
        'No document code found. Add a line like "DOCUMENT CODE: QA-TST-INH-14-02-10", or type it in below.',
    });
  }
  if (!title) {
    issues.push({
      level: 'error',
      field: 'title',
      message: 'No title found in the header. Type the procedure title in below.',
    });
  }
  if (sections.length === 0) {
    issues.push({
      level: 'error',
      field: 'sections',
      message:
        'No numbered sections found. Sections must start like "1. Scope" on their own line.',
    });
  }
  if (!revision.number) {
    issues.push({
      level: 'warning',
      field: 'revision_number',
      message: 'No revision number found — the document will be stored without one.',
    });
  }
  if (revision.number && !revision.date) {
    issues.push({
      level: 'warning',
      field: 'revision_date',
      message: 'Revision number found but no readable date (expected DD-MM-YYYY).',
    });
  }
  if (preamble.length > 0) {
    issues.push({
      level: 'warning',
      field: 'sections',
      message: `${preamble.length} line(s) sat between sections and were not stored. Check the preview.`,
    });
  }
  const emptySections = sections.filter(
    (section) => !section.body && section.lines.length === 0,
  );
  if (emptySections.length > 0) {
    issues.push({
      level: 'warning',
      field: 'sections',
      message: `${emptySections.length} section(s) have no content: ${emptySections
        .map((section) => `${section.section_number}. ${section.title}`)
        .join(', ')}.`,
    });
  }

  return {
    data: {
      document_code: documentCode,
      title,
      procedure_type: procedureType,
      heading,
      organisation: findOrganisation(headerLines),
      revision_number: revision.number,
      revision_date: revision.date,
      total_pages: findTotalPages(text),
      // The header block is the authority, but on a scanned SOP the
      // classification is often printed in the page footer instead, so fall
      // back to a whole-document search rather than storing nothing.
      classification: findClassification(headerText) || findClassification(text),
      status: 'ACTIVE',
      source_text: raw,
      notes: '',
      sections,
    },
    issues,
    preamble,
  };
}

/** Total stored lines across every section — shown as an Analysis stat. */
export function countLines(sections: TestingProcedureSection[]): number {
  return sections.reduce((total, section) => total + section.lines.length, 0);
}
