import { AlertTriangle, CheckCircle2, Table2, XCircle } from 'lucide-react';

import { Badge, Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui';

import type { SaveTestingProcedureRequest } from '../../types/testingProcedure.types';
import { countLines, type ParseIssue } from '../../utils/procedureParser';

interface ProcedureAnalysisPreviewProps {
  data: SaveTestingProcedureRequest;
  issues: ParseIssue[];
  preamble: string[];
}

const LINE_KIND_LABEL: Record<string, string> = {
  BULLET: 'Bullet',
  STEP: 'Step',
  TABLE_ROW: 'Table row',
  PARAGRAPH: 'Paragraph',
};

/** One `column → value` row of the stored-header table. */
function FieldRow({ column, value }: { column: string; value: React.ReactNode }) {
  const isEmpty = value === '' || value === null || value === undefined;
  return (
    <tr className="border-b last:border-0">
      <td className="w-56 py-2 pr-4 align-top font-mono text-xs text-muted-foreground">
        {column}
      </td>
      <td className="py-2 align-top text-sm">
        {isEmpty ? <span className="italic text-muted-foreground">not set</span> : value}
      </td>
    </tr>
  );
}

/**
 * Shows exactly what the save will write: the procedure row, then one block per
 * section with its lines. This is rendered from the same object that gets
 * POSTed, so nothing here can drift from what is stored.
 */
export default function ProcedureAnalysisPreview({
  data,
  issues,
  preamble,
}: ProcedureAnalysisPreviewProps) {
  const errors = issues.filter((issue) => issue.level === 'error');
  const warnings = issues.filter((issue) => issue.level === 'warning');
  const totalLines = countLines(data.sections);

  return (
    <div className="space-y-4">
      {/* ---- issues ---- */}
      {errors.length === 0 && warnings.length === 0 && (
        <div className="flex items-start gap-2 rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-800">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <span>Parsed cleanly. Everything below will be stored as shown.</span>
        </div>
      )}
      {errors.map((issue, index) => (
        <div
          key={`error-${index}`}
          className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800"
        >
          <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            <span className="font-mono text-xs">{issue.field}</span> — {issue.message}
          </span>
        </div>
      ))}
      {warnings.map((issue, index) => (
        <div
          key={`warning-${index}`}
          className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            <span className="font-mono text-xs">{issue.field}</span> — {issue.message}
          </span>
        </div>
      ))}

      {/* ---- what was found ---- */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Sections', value: data.sections.length },
          { label: 'Lines', value: totalLines },
          {
            label: 'Type',
            value: data.procedure_type === 'INHOUSE' ? 'In-house' : 'Standard',
          },
          { label: 'Revision', value: data.revision_number || '—' },
        ].map((stat) => (
          <div key={stat.label} className="rounded-lg border bg-muted/30 p-3">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">
              {stat.label}
            </div>
            <div className="mt-1 text-xl font-semibold">{stat.value}</div>
          </div>
        ))}
      </div>

      {/* ---- the procedure row ---- */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Table2 className="h-4 w-4" />
            Procedure record
            <span className="font-mono text-xs font-normal text-muted-foreground">
              quality_control_testingprocedure
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <table className="w-full">
            <tbody>
              <FieldRow
                column="document_code"
                value={<span className="font-mono">{data.document_code}</span>}
              />
              <FieldRow column="title" value={data.title} />
              <FieldRow
                column="procedure_type"
                value={
                  <Badge variant={data.procedure_type === 'INHOUSE' ? 'default' : 'secondary'}>
                    {data.procedure_type}
                  </Badge>
                }
              />
              <FieldRow column="heading" value={data.heading} />
              <FieldRow column="organisation" value={data.organisation} />
              <FieldRow column="revision_number" value={data.revision_number} />
              <FieldRow column="revision_date" value={data.revision_date} />
              <FieldRow column="total_pages" value={data.total_pages} />
              <FieldRow column="classification" value={data.classification} />
              <FieldRow column="status" value={<Badge variant="success">{data.status}</Badge>} />
              <FieldRow
                column="source_text"
                value={
                  <span className="text-muted-foreground">
                    {data.source_text.length.toLocaleString()} characters kept for re-analysis
                  </span>
                }
              />
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* ---- sections and their lines ---- */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Table2 className="h-4 w-4" />
            Sections &amp; lines
            <span className="font-mono text-xs font-normal text-muted-foreground">
              {data.sections.length} section rows · {totalLines} line rows
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {data.sections.length === 0 && (
            <p className="text-sm italic text-muted-foreground">
              No sections were found, so nothing would be stored.
            </p>
          )}

          {data.sections.map((section) => (
            <div key={section.sequence} className="rounded-lg border">
              <div className="flex flex-wrap items-center gap-2 border-b bg-muted/40 px-3 py-2">
                <span className="font-mono text-xs text-muted-foreground">
                  #{section.sequence}
                </span>
                <span className="font-semibold">
                  {section.section_number}. {section.title}
                </span>
                <Badge variant="outline" className="font-mono text-[10px]">
                  {section.section_key}
                </Badge>
                {section.lines.length > 0 && (
                  <span className="ml-auto text-xs text-muted-foreground">
                    {section.lines.length} line{section.lines.length === 1 ? '' : 's'}
                  </span>
                )}
              </div>

              {section.body && (
                <p className="whitespace-pre-wrap border-b px-3 py-2 text-sm text-muted-foreground">
                  {section.body}
                </p>
              )}

              {section.lines.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                        <th className="w-12 px-3 py-1.5 font-medium">seq</th>
                        <th className="w-24 px-3 py-1.5 font-medium">kind</th>
                        <th className="w-16 px-3 py-1.5 font-medium">marker</th>
                        <th className="px-3 py-1.5 font-medium">text</th>
                        {section.lines.some((line) => line.interpretation) && (
                          <th className="px-3 py-1.5 font-medium">interpretation</th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {section.lines.map((line) => (
                        <tr key={line.sequence} className="border-b last:border-0 align-top">
                          <td className="px-3 py-1.5 font-mono text-xs text-muted-foreground">
                            {line.sequence}
                          </td>
                          <td className="px-3 py-1.5">
                            <Badge variant="outline" className="text-[10px]">
                              {LINE_KIND_LABEL[line.kind] ?? line.kind}
                            </Badge>
                          </td>
                          <td className="px-3 py-1.5 font-mono text-xs">{line.marker || '—'}</td>
                          <td className="px-3 py-1.5">{line.text}</td>
                          {section.lines.some((other) => other.interpretation) && (
                            <td className="px-3 py-1.5">{line.interpretation || '—'}</td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* ---- anything the parser could not place ---- */}
      {preamble.length > 0 && (
        <Card className="border-amber-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-amber-800">Not stored</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-2 text-sm text-muted-foreground">
              These lines were not inside any section, so they will not be saved:
            </p>
            <ul className="list-disc space-y-1 pl-5 text-sm">
              {preamble.map((line, index) => (
                <li key={index} className="text-amber-900">
                  {line}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
