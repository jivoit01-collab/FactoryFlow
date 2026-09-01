import { ArrowLeft, ClipboardList, FileSpreadsheet, Loader2, Plus } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { QC_PERMISSIONS } from '@/config/permissions';
import type { ApiError } from '@/core/api/types';
import { usePermission } from '@/core/auth';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  NativeSelect,
  SelectOption,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/shared/components/ui';

import {
  useCreateQCRecord,
  useQCRecords,
  useRecordTemplates,
} from '../../api/qcRecord';
import type { RecordStatus } from '../../types/qcRecord.types';

const STATUS_VARIANT: Record<RecordStatus, 'default' | 'secondary' | 'success' | 'destructive'> =
  {
    DRAFT: 'secondary',
    SUBMITTED: 'default',
    APPROVED: 'success',
    REJECTED: 'destructive',
  };

function todayIso(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

/**
 * QC → Documents.
 *
 * The filled record sheets (NMW daily water monitoring and any other form QA
 * keeps on paper), plus the blank forms they are filled from.
 */
export default function QCDocumentsPage() {
  const navigate = useNavigate();
  const { hasAnyPermission } = usePermission();
  const canFill = hasAnyPermission([QC_PERMISSIONS.QC_RECORD.FILL]);

  const { data: templates = [], isLoading: templatesLoading } = useRecordTemplates();
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [templateFilter, setTemplateFilter] = useState<string>('');

  const { data: records = [], isLoading: recordsLoading } = useQCRecords({
    ...(statusFilter ? { status: statusFilter as RecordStatus } : {}),
    ...(templateFilter ? { template: Number(templateFilter) } : {}),
  });

  const createRecord = useCreateQCRecord();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newTemplate, setNewTemplate] = useState<string>('');
  const [newDate, setNewDate] = useState(todayIso());
  const [newShift, setNewShift] = useState('');

  const openDialog = () => {
    setNewTemplate(templates[0] ? String(templates[0].id) : '');
    setNewDate(todayIso());
    setNewShift('');
    setIsDialogOpen(true);
  };

  const handleCreate = async () => {
    if (!newTemplate) {
      toast.error('Pick a form first.');
      return;
    }
    try {
      const record = await createRecord.mutateAsync({
        template: Number(newTemplate),
        record_date: newDate,
        shift: newShift,
      });
      setIsDialogOpen(false);
      navigate(`/qc/documents/records/${record.id}`);
    } catch (error) {
      toast.error((error as ApiError).message || 'Failed to open the sheet.');
    }
  };

  return (
    <div className="space-y-6 pb-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate('/qc')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="space-y-1">
            <h2 className="flex items-center gap-3 text-3xl font-bold tracking-tight">
              <ClipboardList className="h-8 w-8" />
              Documents
            </h2>
            <p className="text-sm text-muted-foreground">
              Filled QC record sheets and the forms they come from.
            </p>
          </div>
        </div>

        {canFill && templates.length > 0 && (
          <Button onClick={openDialog}>
            <Plus className="mr-2 h-4 w-4" />
            New record
          </Button>
        )}
      </div>

      <Tabs defaultValue="records">
        <TabsList>
          <TabsTrigger value="records">Records ({records.length})</TabsTrigger>
          <TabsTrigger value="forms">Forms ({templates.length})</TabsTrigger>
        </TabsList>

        {/* ---- filled sheets ---- */}
        <TabsContent value="records" className="mt-4 space-y-3">
          <div className="flex flex-wrap gap-3">
            <div className="space-y-1">
              <Label htmlFor="filter-form" className="text-xs">
                Form
              </Label>
              <NativeSelect
                id="filter-form"
                value={templateFilter}
                onChange={(event) => setTemplateFilter(event.target.value)}
                className="min-w-[16rem]"
              >
                <SelectOption value="">All forms</SelectOption>
                {templates.map((template) => (
                  <SelectOption key={template.id} value={String(template.id)}>
                    {template.title}
                  </SelectOption>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-1">
              <Label htmlFor="filter-status" className="text-xs">
                Status
              </Label>
              <NativeSelect
                id="filter-status"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
              >
                <SelectOption value="">All</SelectOption>
                <SelectOption value="DRAFT">Draft</SelectOption>
                <SelectOption value="SUBMITTED">Submitted</SelectOption>
                <SelectOption value="APPROVED">Approved</SelectOption>
                <SelectOption value="REJECTED">Rejected</SelectOption>
              </NativeSelect>
            </div>
          </div>

          {recordsLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : records.length === 0 ? (
            <div className="rounded-lg border border-dashed py-12 text-center">
              <FileSpreadsheet className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">
                No record sheets yet.
                {canFill && ' Press "New record" to open one.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-3 py-2 font-medium">Date</th>
                    <th className="px-3 py-2 font-medium">Form</th>
                    <th className="px-3 py-2 font-medium">Shift</th>
                    <th className="px-3 py-2 font-medium">Times</th>
                    <th className="px-3 py-2 font-medium">Filled</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((record) => (
                    <tr
                      key={record.id}
                      className="cursor-pointer border-b last:border-0 hover:bg-muted/40"
                      onClick={() => navigate(`/qc/documents/records/${record.id}`)}
                    >
                      <td className="px-3 py-2 font-medium">{record.record_date}</td>
                      <td className="px-3 py-2">
                        {record.template_title}
                        <span className="ml-2 font-mono text-xs text-muted-foreground">
                          {record.template_code}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {record.shift || '—'}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {record.slot_count}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {record.filled_count}
                      </td>
                      <td className="px-3 py-2">
                        <Badge variant={STATUS_VARIANT[record.status]}>
                          {record.status_label}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        {/* ---- blank forms ---- */}
        <TabsContent value="forms" className="mt-4">
          {templatesLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : templates.length === 0 ? (
            <div className="rounded-lg border border-dashed py-12 text-center">
              <p className="text-sm text-muted-foreground">
                No forms defined yet. A QA manager can add one in Django admin.
              </p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {templates.map((template) => (
                <Card key={template.id}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{template.title}</CardTitle>
                    <p className="font-mono text-xs text-muted-foreground">
                      {template.document_code}
                      {template.revision_label && ` · Rev ${template.revision_label}`}
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm text-muted-foreground">
                    {template.description && <p>{template.description}</p>}
                    <p>
                      {template.parameter_count} parameters · {template.record_count}{' '}
                      record{template.record_count === 1 ? '' : 's'} filled
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ---- open a new sheet ---- */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New record sheet</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="new-form">Form</Label>
              <NativeSelect
                id="new-form"
                value={newTemplate}
                onChange={(event) => setNewTemplate(event.target.value)}
              >
                {templates.map((template) => (
                  <SelectOption key={template.id} value={String(template.id)}>
                    {template.title}
                  </SelectOption>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-date">Date</Label>
              <Input
                id="new-date"
                type="date"
                value={newDate}
                onChange={(event) => setNewDate(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-shift">Shift (optional)</Label>
              <Input
                id="new-shift"
                value={newShift}
                onChange={(event) => setNewShift(event.target.value)}
                placeholder="A / B / C"
                maxLength={8}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              If a sheet is already open for this form, date and shift, you will be taken to
              it rather than a second one being created.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={createRecord.isPending}>
              {createRecord.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Open sheet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
