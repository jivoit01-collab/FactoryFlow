import { describe, expect, it } from 'vitest';

import { countLines, parseProcedureText } from '../../utils/procedureParser';

/**
 * The Argemone SOP exactly as it comes off the printed document
 * (QA-TST-INH-14-02-10), including the page furniture that repeats on the
 * scan and the tab-separated observation table.
 */
const ARGEMONE_SOP = `JIVO WELLNESS PVT.LTD.
INHOUSE TESTING PROCEDURE
ARGEMONE OIL ADULTERATION TESTING
DOCUMENT CODE: QA-TST-INH-14-02-10

1. Scope
This method is applicable for the qualitative detection of Argemone Oil adulteration in edible oil samples received, processed, packed or stored at the facility.
2. Principle
Argemone oil contains certain alkaloidal constituents that react with concentrated nitric acid and produce a characteristic pink to reddish colour in the acid layer.
The development of a pink/reddish colour in the acid layer is considered a positive indication of possible Argemone Oil adulteration.
3. Responsibility
QA Analyst is responsible for performing the test, recording the observations, and reporting the result.
The QA In-charge shall review the test results wherever required.
4. Apparatus / Glassware
• Clean and dry graduated test tube with stopper
• Test tube stand
• Measuring pipette / graduated pipette
5. Reagent
• Nitric Acid – concentrated laboratory-grade nitric acid
Safety: Nitric acid is highly corrosive and an oxidizing chemical. Handle only by trained laboratory personnel using appropriate PPE and preferably under a fume hood.
6. Sample Requirement
Take a representative and homogenous oil sample for analysis.
Ensure that the test tube and glassware are clean, dry and free from contamination before starting the test.
7. Procedure
1. Take a clean and dry test tube with stopper.
2. Transfer 5 mL of the oil sample into the test tube.
3. Carefully add 5 mL of nitric acid to the test tube.
4. Close the test tube with the stopper.
5. Shake the test tube carefully to ensure proper contact between the oil and the acid layers.
6. Keep the test tube undisturbed and allow the mixture to settle and form separate layers.
7. Observe the acid layer for any colour development.
8. Record the observation in the laboratory test record.
Revision No.:00/15-10-2023
Classified: Business Confidential
Controlled Document
Page 1 of 2
8. Observation and Interpretation
Observation in Acid Layer\tInterpretation
No pink/reddish colour observed\tNegative for Argemone Oil adulteration by this qualitative screening test
Pink to reddish colour observed\tPositive / Suspected presence of Argemone Oil
9. Acceptance Criteria
The sample shall be considered PASS when no pink or reddish colour develops in the acid layer under the specified test conditions.
If a pink/reddish colour develops, the sample shall be treated as suspected positive and shall be immediately reported to the QA In-charge for confirmation/testing as per the applicable approved standard or regulatory method.
10. Precautions
• Use clean, dry glassware.
• Use a representative and properly mixed sample.
• Do not interchange or contaminate reagents.
• Nitric acid shall be handled carefully due to its corrosive and oxidizing nature.
• Wear laboratory coat, chemical-resistant gloves, safety goggles/face protection.
• Avoid direct inhalation of fumes.
• Perform the test in a properly ventilated area/fume hood.
• Do not directly touch or smell the reaction mixture.
• Dispose of the reaction mixture as per the laboratory chemical-waste disposal procedure.
• Record the result immediately after observation.
Page 2 of 2`;

describe('parseProcedureText — header', () => {
  const { data } = parseProcedureText(ARGEMONE_SOP);

  it('reads the document code from the DOCUMENT CODE label', () => {
    expect(data.document_code).toBe('QA-TST-INH-14-02-10');
  });

  it('picks the title over the banner line', () => {
    expect(data.title).toBe('ARGEMONE OIL ADULTERATION TESTING');
    expect(data.heading).toBe('INHOUSE TESTING PROCEDURE');
  });

  it('reads the organisation', () => {
    expect(data.organisation).toBe('JIVO WELLNESS PVT.LTD.');
  });

  it('derives IN-HOUSE from the INH segment of the code', () => {
    expect(data.procedure_type).toBe('INHOUSE');
  });

  it('splits the revision into number and ISO date', () => {
    expect(data.revision_number).toBe('00');
    expect(data.revision_date).toBe('2023-10-15');
  });

  it('reads total pages and classification', () => {
    expect(data.total_pages).toBe(2);
    expect(data.classification).toBe('Business Confidential');
  });

  it('keeps the raw paste for re-analysis', () => {
    expect(data.source_text).toBe(ARGEMONE_SOP);
  });
});

describe('parseProcedureText — sections', () => {
  const { data } = parseProcedureText(ARGEMONE_SOP);

  it('finds all ten sections in printed order', () => {
    expect(data.sections).toHaveLength(10);
    expect(data.sections.map((s) => s.section_number)).toEqual([
      '1', '2', '3', '4', '5', '6', '7', '8', '9', '10',
    ]);
  });

  it('classifies each heading onto a stored key', () => {
    expect(data.sections.map((s) => s.section_key)).toEqual([
      'SCOPE',
      'PRINCIPLE',
      'RESPONSIBILITY',
      'APPARATUS',
      'REAGENT',
      'SAMPLE_REQUIREMENT',
      'PROCEDURE',
      'OBSERVATION',
      'ACCEPTANCE_CRITERIA',
      'PRECAUTIONS',
    ]);
  });

  it('keeps multi-paragraph prose in the section body', () => {
    const principle = data.sections[1];
    expect(principle.body).toContain('alkaloidal constituents');
    expect(principle.body).toContain('positive indication');
    expect(principle.lines).toHaveLength(0);
  });
});

describe('parseProcedureText — lines', () => {
  const { data } = parseProcedureText(ARGEMONE_SOP);
  const section = (key: string) => data.sections.find((s) => s.section_key === key)!;

  it('stores apparatus bullets without the bullet glyph', () => {
    const apparatus = section('APPARATUS');
    expect(apparatus.lines).toHaveLength(3);
    expect(apparatus.lines.every((line) => line.kind === 'BULLET')).toBe(true);
    expect(apparatus.lines[0].text).toBe('Clean and dry graduated test tube with stopper');
    expect(apparatus.lines[2].text).toBe('Measuring pipette / graduated pipette');
  });

  it('keeps a reagent bullet separate from the trailing safety prose', () => {
    const reagent = section('REAGENT');
    expect(reagent.lines).toHaveLength(1);
    expect(reagent.lines[0].text).toContain('Nitric Acid');
    expect(reagent.body).toContain('highly corrosive');
  });

  it('numbers the eight procedure steps and keeps their markers', () => {
    const procedure = section('PROCEDURE');
    expect(procedure.lines).toHaveLength(8);
    expect(procedure.lines.every((line) => line.kind === 'STEP')).toBe(true);
    expect(procedure.lines.map((line) => line.marker)).toEqual([
      '1', '2', '3', '4', '5', '6', '7', '8',
    ]);
    expect(procedure.lines[2].text).toBe('Carefully add 5 mL of nitric acid to the test tube.');
  });

  it('does not mistake a numbered step for a new section heading', () => {
    // "7. Observe the acid layer…" is a step of section 7, not section 7 again.
    const procedure = section('PROCEDURE');
    expect(procedure.lines[6].text).toBe('Observe the acid layer for any colour development.');
    expect(data.sections.filter((s) => s.section_number === '7')).toHaveLength(1);
  });

  it('splits the observation table into two columns and drops its header row', () => {
    const observation = section('OBSERVATION');
    expect(observation.lines).toHaveLength(2);
    expect(observation.lines.every((line) => line.kind === 'TABLE_ROW')).toBe(true);
    expect(observation.lines[0].text).toBe('No pink/reddish colour observed');
    expect(observation.lines[0].interpretation).toBe(
      'Negative for Argemone Oil adulteration by this qualitative screening test',
    );
    expect(observation.lines[1].interpretation).toBe(
      'Positive / Suspected presence of Argemone Oil',
    );
  });

  it('stores all ten precautions', () => {
    expect(section('PRECAUTIONS').lines).toHaveLength(10);
  });

  it('drops repeated page furniture instead of storing it as content', () => {
    const everyText = data.sections.flatMap((s) => [s.body, ...s.lines.map((l) => l.text)]).join(' ');
    expect(everyText).not.toMatch(/Page \d of 2/i);
    expect(everyText).not.toMatch(/Controlled Document/i);
    expect(everyText).not.toMatch(/Revision No/i);
  });

  it('counts every stored line', () => {
    // 3 apparatus + 1 reagent + 8 steps + 2 table rows + 10 precautions
    expect(countLines(data.sections)).toBe(24);
  });
});

describe('parseProcedureText — variations', () => {
  it('derives STANDARD from a -STD- document code', () => {
    const { data } = parseProcedureText(
      'STANDARD TESTING PROCEDURE\nPEROXIDE VALUE\nDOCUMENT CODE: QA-TST-STD-14-02-11\n1. Scope\nApplies to all oils.',
    );
    expect(data.procedure_type).toBe('STANDARD');
    expect(data.document_code).toBe('QA-TST-STD-14-02-11');
  });

  it('accepts a pipe-separated observation table', () => {
    const { data } = parseProcedureText(
      'DOCUMENT CODE: QA-TST-INH-14-02-12\nTITLE LINE HERE\n8. Observation and Interpretation\nObservation in Acid Layer | Interpretation\nNo colour | Negative\nPink | Positive',
    );
    const observation = data.sections[0];
    expect(observation.lines).toHaveLength(2);
    expect(observation.lines[0]).toMatchObject({ text: 'No colour', interpretation: 'Negative' });
  });

  it('normalises curly quotes and en dashes from a Word paste', () => {
    const { data } = parseProcedureText(
      'DOCUMENT CODE: QA-TST-INH-14-02-13\nTITLE LINE\n5. Reagent\n• Nitric Acid – concentrated grade\n',
    );
    expect(data.sections[0].lines[0].text).toBe('Nitric Acid - concentrated grade');
  });

  it('finds a bare document code with no label', () => {
    const { data } = parseProcedureText('SOME TITLE\nQA-TST-INH-14-02-14\n1. Scope\nText.');
    expect(data.document_code).toBe('QA-TST-INH-14-02-14');
  });

  it('joins a PDF-wrapped continuation onto the bullet above it', () => {
    const { data } = parseProcedureText(
      'DOCUMENT CODE: QA-TST-INH-14-02-15\nTITLE LINE\n10. Precautions\n• Wear laboratory coat, chemical-resistant gloves, safety\ngoggles/face protection.',
    );
    expect(data.sections[0].lines).toHaveLength(1);
    expect(data.sections[0].lines[0].text).toBe(
      'Wear laboratory coat, chemical-resistant gloves, safety goggles/face protection.',
    );
  });

  it('treats a dash bullet like a glyph bullet', () => {
    const { data } = parseProcedureText(
      'DOCUMENT CODE: QA-TST-INH-14-02-16\nTITLE LINE\n4. Apparatus\n- Test tube\n- Pipette',
    );
    expect(data.sections[0].lines.map((l) => l.text)).toEqual(['Test tube', 'Pipette']);
  });
});

describe('parseProcedureText — issues', () => {
  it('reports a clean paste as having no errors', () => {
    const { issues } = parseProcedureText(ARGEMONE_SOP);
    expect(issues.filter((issue) => issue.level === 'error')).toHaveLength(0);
  });

  it('errors when there is no document code', () => {
    const { issues } = parseProcedureText('SOME TITLE\n1. Scope\nText.');
    expect(issues.some((i) => i.level === 'error' && i.field === 'document_code')).toBe(true);
  });

  it('errors when nothing is numbered as a section', () => {
    const { issues } = parseProcedureText('DOCUMENT CODE: QA-TST-INH-14-02-17\nTITLE\nJust prose.');
    expect(issues.some((i) => i.level === 'error' && i.field === 'sections')).toBe(true);
  });

  it('warns when a section came through empty', () => {
    const { issues } = parseProcedureText(
      'DOCUMENT CODE: QA-TST-INH-14-02-18\nTITLE LINE\n1. Scope\nText.\n2. Principle',
    );
    expect(issues.some((i) => i.level === 'warning' && /no content/i.test(i.message))).toBe(true);
  });

  it('warns when a revision number has no readable date', () => {
    const { issues } = parseProcedureText(
      'DOCUMENT CODE: QA-TST-INH-14-02-19\nTITLE LINE\nRevision No.: 02\n1. Scope\nText.',
    );
    expect(issues.some((i) => i.field === 'revision_date')).toBe(true);
  });

  it('returns an empty, error-flagged result for empty input', () => {
    const { data, issues } = parseProcedureText('');
    expect(data.sections).toHaveLength(0);
    expect(issues.filter((i) => i.level === 'error').length).toBeGreaterThan(0);
  });
});
