import { FileText, Loader2, Search, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import type { ApiError } from '@/core/api/types';
import { Badge, Button, Input } from '@/shared/components/ui';

import { useDeleteTestingProcedure, useTestingProcedures } from '../../api/testingProcedure';
import type { ProcedureType } from '../../types/testingProcedure.types';
import ProcedureDetailDialog from './ProcedureDetailDialog';

interface ProcedureListProps {
  /** Undefined shows every type. */
  procedureType?: ProcedureType;
  canManage: boolean;
}

export default function ProcedureList({ procedureType, canManage }: ProcedureListProps) {
  const [search, setSearch] = useState('');
  const [openProcedureId, setOpenProcedureId] = useState<number | null>(null);

  const { data: procedures = [], isLoading } = useTestingProcedures(
    procedureType ? { procedure_type: procedureType } : {},
  );
  const deleteProcedure = useDeleteTestingProcedure();

  // Filtering client-side keeps typing instant; the list is master data and small.
  const term = search.trim().toLowerCase();
  const visible = term
    ? procedures.filter(
        (procedure) =>
          procedure.title.toLowerCase().includes(term) ||
          procedure.document_code.toLowerCase().includes(term),
      )
    : procedures;

  const handleDelete = async (id: number, code: string) => {
    if (!confirm(`Retire ${code}? It stays in the records but drops out of this list.`)) return;
    try {
      await deleteProcedure.mutateAsync(id);
      toast.success(`${code} retired.`);
    } catch (error) {
      toast.error((error as ApiError).message || 'Failed to retire the procedure.');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by title or document code…"
          className="pl-9"
        />
      </div>

      {visible.length === 0 ? (
        <div className="rounded-lg border border-dashed py-12 text-center">
          <FileText className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">
            {procedures.length === 0
              ? 'No procedures stored yet. Paste one above to get started.'
              : 'No procedure matches that search.'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-3 py-2 font-medium">Document code</th>
                <th className="px-3 py-2 font-medium">Title</th>
                <th className="px-3 py-2 font-medium">Type</th>
                <th className="px-3 py-2 font-medium">Revision</th>
                <th className="px-3 py-2 font-medium">Content</th>
                <th className="w-10 px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {visible.map((procedure) => (
                <tr
                  key={procedure.id}
                  className="cursor-pointer border-b last:border-0 hover:bg-muted/40"
                  onClick={() => setOpenProcedureId(procedure.id)}
                >
                  <td className="px-3 py-2 font-mono text-xs">{procedure.document_code}</td>
                  <td className="px-3 py-2 font-medium">{procedure.title}</td>
                  <td className="px-3 py-2">
                    <Badge
                      variant={procedure.procedure_type === 'INHOUSE' ? 'default' : 'secondary'}
                    >
                      {procedure.procedure_type === 'INHOUSE' ? 'In-house' : 'Standard'}
                    </Badge>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {procedure.revision_label || '—'}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {procedure.section_count} sections · {procedure.line_count} lines
                  </td>
                  <td className="px-3 py-2">
                    {canManage && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleDelete(procedure.id, procedure.document_code);
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ProcedureDetailDialog
        procedureId={openProcedureId}
        onClose={() => setOpenProcedureId(null)}
      />
    </div>
  );
}
