import { Loader2 } from 'lucide-react';

import {
  Badge,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui';

import { useTestingProcedure } from '../../api/testingProcedure';

interface ProcedureDetailDialogProps {
  procedureId: number | null;
  onClose: () => void;
}

/** Reads back one stored procedure, rendered the way the document reads. */
export default function ProcedureDetailDialog({
  procedureId,
  onClose,
}: ProcedureDetailDialogProps) {
  const { data: procedure, isLoading } = useTestingProcedure(procedureId);

  return (
    <Dialog open={procedureId !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {procedure && (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl">{procedure.title}</DialogTitle>
              <DialogDescription className="flex flex-wrap items-center gap-2 pt-1">
                <span className="font-mono">{procedure.document_code}</span>
                <Badge
                  variant={procedure.procedure_type === 'INHOUSE' ? 'default' : 'secondary'}
                >
                  {procedure.procedure_type_label}
                </Badge>
                {procedure.revision_label && (
                  <span>Revision {procedure.revision_label}</span>
                )}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-1 border-y py-3 text-sm text-muted-foreground">
              {procedure.organisation && <div>{procedure.organisation}</div>}
              {procedure.heading && <div>{procedure.heading}</div>}
              <div className="flex flex-wrap gap-x-4">
                {procedure.total_pages !== null && <span>{procedure.total_pages} pages</span>}
                {procedure.classification && <span>{procedure.classification}</span>}
                <span>{procedure.status_label}</span>
              </div>
            </div>

            <div className="space-y-5">
              {procedure.sections.map((section) => (
                <section key={section.id ?? section.sequence} className="space-y-2">
                  <h3 className="flex items-center gap-2 font-semibold">
                    <span>
                      {section.section_number}. {section.title}
                    </span>
                    <Badge variant="outline" className="font-mono text-[10px]">
                      {section.section_key}
                    </Badge>
                  </h3>

                  {section.body && (
                    <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                      {section.body}
                    </p>
                  )}

                  {section.lines.some((line) => line.kind === 'TABLE_ROW') ? (
                    <table className="w-full border text-sm">
                      <tbody>
                        {section.lines.map((line) => (
                          <tr key={line.id ?? line.sequence} className="border-b last:border-0">
                            <td className="w-1/2 border-r px-3 py-2 align-top">{line.text}</td>
                            <td className="px-3 py-2 align-top">{line.interpretation}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    section.lines.length > 0 && (
                      <ul className="space-y-1 text-sm">
                        {section.lines.map((line) => (
                          <li key={line.id ?? line.sequence} className="flex gap-2">
                            <span className="shrink-0 text-muted-foreground">
                              {line.kind === 'STEP' ? `${line.marker}.` : '•'}
                            </span>
                            <span>{line.text}</span>
                          </li>
                        ))}
                      </ul>
                    )
                  )}
                </section>
              ))}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
