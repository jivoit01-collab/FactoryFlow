import { ArrowLeft, FileText } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { QC_PERMISSIONS } from '@/config/permissions';
import { usePermission } from '@/core/auth';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/shared/components/ui';

import { useTestingProcedureCounts } from '../../api/testingProcedure';
import ProcedureList from './ProcedureList';
import ProcedurePasteAnalyzer from './ProcedurePasteAnalyzer';

/**
 * QC → Procedures.
 *
 * Controlled testing procedures, in-house and standard. An analyst pastes the
 * procedure text, presses Analyse to see the exact record that will be
 * written, and saves it. Stored procedures are listed below, split by type.
 */
export default function QCProceduresPage() {
  const navigate = useNavigate();
  const { hasAnyPermission } = usePermission();
  const canManage = hasAnyPermission([QC_PERMISSIONS.TESTING_PROCEDURE.MANAGE]);

  const { data: counts } = useTestingProcedureCounts();
  const [tab, setTab] = useState('inhouse');

  return (
    <div className="space-y-6 pb-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate('/qc')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="space-y-1">
            <h2 className="flex items-center gap-3 text-3xl font-bold tracking-tight">
              <FileText className="h-8 w-8" />
              Procedures
            </h2>
            <p className="text-sm text-muted-foreground">
              Controlled testing procedures — in-house and standard.
            </p>
          </div>
        </div>

        {counts && (
          <div className="flex gap-2">
            <Badge variant="outline" className="text-sm">
              {counts.inhouse} in-house
            </Badge>
            <Badge variant="outline" className="text-sm">
              {counts.standard} standard
            </Badge>
          </div>
        )}
      </div>

      {canManage && <ProcedurePasteAnalyzer />}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Stored procedures</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList>
              <TabsTrigger value="inhouse">
                In-house{counts ? ` (${counts.inhouse})` : ''}
              </TabsTrigger>
              <TabsTrigger value="standard">
                Standard{counts ? ` (${counts.standard})` : ''}
              </TabsTrigger>
              <TabsTrigger value="all">All{counts ? ` (${counts.total})` : ''}</TabsTrigger>
            </TabsList>

            <TabsContent value="inhouse" className="mt-4">
              <ProcedureList procedureType="INHOUSE" canManage={canManage} />
            </TabsContent>
            <TabsContent value="standard" className="mt-4">
              <ProcedureList procedureType="STANDARD" canManage={canManage} />
            </TabsContent>
            <TabsContent value="all" className="mt-4">
              <ProcedureList canManage={canManage} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
