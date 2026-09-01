import { ClipboardPaste, Loader2, RotateCcw, Save, ScanSearch } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import type { ApiError } from '@/core/api/types';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  NativeSelect,
  SelectOption,
  Textarea,
} from '@/shared/components/ui';

import { useCreateTestingProcedure } from '../../api/testingProcedure';
import type {
  ProcedureType,
  SaveTestingProcedureRequest,
} from '../../types/testingProcedure.types';
import { type ParseIssue, parseProcedureText } from '../../utils/procedureParser';
import ProcedureAnalysisPreview from './ProcedureAnalysisPreview';

interface AnalysisState {
  data: SaveTestingProcedureRequest;
  issues: ParseIssue[];
  preamble: string[];
}

const SAMPLE = `JIVO WELLNESS PVT.LTD.
INHOUSE TESTING PROCEDURE
ARGEMONE OIL ADULTERATION TESTING
DOCUMENT CODE: QA-TST-INH-14-02-10

1. Scope
This method is applicable for the qualitative detection of Argemone Oil adulteration in edible oil samples received, processed, packed or stored at the facility.
2. Principle
Argemone oil contains certain alkaloidal constituents that react with concentrated nitric acid and produce a characteristic pink to reddish colour in the acid layer.
3. Responsibility
QA Analyst is responsible for performing the test, recording the observations, and reporting the result.
4. Apparatus / Glassware
• Clean and dry graduated test tube with stopper
• Test tube stand
• Measuring pipette / graduated pipette
5. Reagent
• Nitric Acid – concentrated laboratory-grade nitric acid
6. Sample Requirement
Take a representative and homogenous oil sample for analysis.
7. Procedure
1. Take a clean and dry test tube with stopper.
2. Transfer 5 mL of the oil sample into the test tube.
3. Carefully add 5 mL of nitric acid to the test tube.
4. Close the test tube with the stopper.
8. Observation and Interpretation
Observation in Acid Layer\tInterpretation
No pink/reddish colour observed\tNegative for Argemone Oil adulteration by this qualitative screening test
Pink to reddish colour observed\tPositive / Suspected presence of Argemone Oil
9. Acceptance Criteria
The sample shall be considered PASS when no pink or reddish colour develops in the acid layer under the specified test conditions.
10. Precautions
• Use clean, dry glassware.
• Do not interchange or contaminate reagents.
Revision No.:00/15-10-2023
Classified: Business Confidential
Page 1 of 2`;

/**
 * Paste → Analyse → review → Save.
 *
 * The analysis is deliberately a separate, explicit step: the analyst sees the
 * exact record that will be written and can correct a mis-read header field
 * before anything is stored.
 */
export default function ProcedurePasteAnalyzer() {
  const [text, setText] = useState('');
  const [analysis, setAnalysis] = useState<AnalysisState | null>(null);
  const [apiError, setApiError] = useState<string>('');

  const createProcedure = useCreateTestingProcedure();

  const handleAnalyse = () => {
    if (!text.trim()) {
      toast.error('Paste a procedure first.');
      return;
    }
    setApiError('');
    setAnalysis(parseProcedureText(text));
  };

  const handleReset = () => {
    setText('');
    setAnalysis(null);
    setApiError('');
  };

  /** Header corrections apply to the same object that gets POSTed. */
  const patchHeader = (patch: Partial<SaveTestingProcedureRequest>) => {
    setAnalysis((current) =>
      current ? { ...current, data: { ...current.data, ...patch } } : current,
    );
  };

  const blockingErrors = (analysis?.issues ?? []).filter((issue) => issue.level === 'error');
  // The analyst can fix a missed code or title inline, so re-check the live
  // values rather than trusting the issue list the parser produced.
  const canSave =
    !!analysis &&
    analysis.data.document_code.trim().length > 0 &&
    analysis.data.title.trim().length > 0 &&
    analysis.data.sections.length > 0;

  const handleSave = async () => {
    if (!analysis) return;
    setApiError('');
    try {
      const saved = await createProcedure.mutateAsync({
        ...analysis.data,
        document_code: analysis.data.document_code.trim().toUpperCase(),
        title: analysis.data.title.trim(),
      });
      toast.success(`Stored ${saved.document_code} — ${saved.title}`);
      handleReset();
    } catch (error) {
      const failure = error as ApiError;
      const fieldError = failure.errors
        ? Object.entries(failure.errors)
            .map(([field, messages]) => `${field}: ${messages[0]}`)
            .join(' · ')
        : '';
      const message = fieldError || failure.message || 'Failed to store the procedure.';
      setApiError(message);
      toast.error(message);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ClipboardPaste className="h-5 w-5" />
            Paste a procedure
          </CardTitle>
          <CardDescription>
            Paste the procedure text exactly as it appears on the document — header, numbered
            sections, bullets and the observation table. Then press Analyse to see how it will
            be stored.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder={
              'JIVO WELLNESS PVT.LTD.\nINHOUSE TESTING PROCEDURE\nARGEMONE OIL ADULTERATION TESTING\nDOCUMENT CODE: QA-TST-INH-14-02-10\n\n1. Scope\n...'
            }
            className="min-h-[280px] font-mono text-xs"
          />

          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={handleAnalyse} disabled={!text.trim()}>
              <ScanSearch className="mr-2 h-4 w-4" />
              Analyse
            </Button>
            <Button variant="outline" onClick={handleReset} disabled={!text && !analysis}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Clear
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setText(SAMPLE);
                setAnalysis(null);
              }}
            >
              Load sample
            </Button>
            <span className="ml-auto text-xs text-muted-foreground">
              {text.length.toLocaleString()} characters
            </span>
          </div>
        </CardContent>
      </Card>

      {analysis && (
        <>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Check the header</CardTitle>
              <CardDescription>
                These were read from the paste. Correct anything the parser got wrong — the
                values here are what gets saved.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="document_code">Document code</Label>
                <Input
                  id="document_code"
                  value={analysis.data.document_code}
                  onChange={(event) => patchHeader({ document_code: event.target.value })}
                  placeholder="QA-TST-INH-14-02-10"
                  className="font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={analysis.data.title}
                  onChange={(event) => patchHeader({ title: event.target.value })}
                  placeholder="ARGEMONE OIL ADULTERATION TESTING"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="procedure_type">Procedure type</Label>
                <NativeSelect
                  id="procedure_type"
                  value={analysis.data.procedure_type}
                  onChange={(event) =>
                    patchHeader({ procedure_type: event.target.value as ProcedureType })
                  }
                >
                  <SelectOption value="INHOUSE">In-house testing procedure</SelectOption>
                  <SelectOption value="STANDARD">Standard testing procedure</SelectOption>
                </NativeSelect>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="revision_number">Revision</Label>
                <div className="flex gap-2">
                  <Input
                    id="revision_number"
                    value={analysis.data.revision_number}
                    onChange={(event) => patchHeader({ revision_number: event.target.value })}
                    placeholder="00"
                    className="w-24"
                  />
                  <Input
                    type="date"
                    value={analysis.data.revision_date ?? ''}
                    onChange={(event) =>
                      patchHeader({ revision_date: event.target.value || null })
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">How this will be stored</CardTitle>
              <CardDescription>
                Exactly the record that gets written when you press Save.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ProcedureAnalysisPreview
                data={analysis.data}
                issues={analysis.issues}
                preamble={analysis.preamble}
              />
            </CardContent>
          </Card>

          {apiError && (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              {apiError}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={handleSave} disabled={!canSave || createProcedure.isPending}>
              {createProcedure.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save to database
            </Button>
            {!canSave && (
              <span className="text-sm text-muted-foreground">
                {blockingErrors.length > 0
                  ? 'Fix the errors above before saving.'
                  : 'A document code, a title and at least one section are needed.'}
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
}
