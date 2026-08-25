/**
 * ETP / STP settings — everything the registers pick from.
 *
 * Seven maintained lists, one tab each. The point of the module is that none of
 * this is hardcoded: adding a chemical column, a monitoring parameter with new
 * limits, a back-wash step, a person who signs or a word in a dropdown is a
 * change made here, not a release.
 */

import { useState } from 'react';

import { COMPANY_CODE_LIST, COMPANY_LABELS } from '@/config/constants';
import { ETP_PERMISSIONS } from '@/config/permissions';
import { usePermission } from '@/core/auth/hooks/usePermission';
import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import { Button } from '@/shared/components/ui';

import {
  useCreateEtpBackwashEquipment,
  useCreateEtpChemical,
  useCreateEtpInstrument,
  useCreateEtpMonitoringParameter,
  useCreateEtpOption,
  useCreateEtpPlant,
  useCreateEtpPrintDocument,
  useCreateEtpStaff,
  useDeleteEtpBackwashEquipment,
  useDeleteEtpChemical,
  useDeleteEtpInstrument,
  useDeleteEtpMonitoringParameter,
  useDeleteEtpOption,
  useDeleteEtpPlant,
  useDeleteEtpPrintDocument,
  useDeleteEtpStaff,
  useEtpBackwashEquipment,
  useEtpChemicals,
  useEtpInstruments,
  useEtpMonitoringParameters,
  useEtpOptions,
  useEtpPlants,
  useEtpPrintDocuments,
  useEtpStaff,
  useUpdateEtpBackwashEquipment,
  useUpdateEtpChemical,
  useUpdateEtpInstrument,
  useUpdateEtpMonitoringParameter,
  useUpdateEtpOption,
  useUpdateEtpPlant,
  useUpdateEtpPrintDocument,
  useUpdateEtpStaff,
} from '../api';
import { MasterEditor, type MasterField, type MasterForm } from '../components/MasterEditor';
import {
  CALIBRATION_FREQUENCY_LABELS,
  type CalibrationInstrument,
  CHEMICAL_UOM_LABELS,
  MONITORING_STAGE_LABELS,
  PLANT_TYPE_LABELS,
  PRINT_DOCUMENT_LABELS,
  SPEC_VALIDATION_LABELS,
} from '../types';

const TABS = [
  { key: 'plants', label: 'Plants' },
  { key: 'people', label: 'People' },
  { key: 'chemicals', label: 'Chemicals' },
  { key: 'parameters', label: 'Monitoring parameters' },
  { key: 'backwash', label: 'Back-wash steps' },
  { key: 'options', label: 'Dropdown values' },
  { key: 'instruments', label: 'Instruments' },
  { key: 'documents', label: 'Print documents' },
] as const;

type TabKey = (typeof TABS)[number]['key'];

function labelOptions(labels: Record<string, string>) {
  return Object.entries(labels).map(([value, label]) => ({ value, label }));
}

export default function EtpSettingsPage() {
  const { hasPermission } = usePermission();
  const canManage = hasPermission(ETP_PERMISSIONS.MANAGE_SETTINGS);
  const [tab, setTab] = useState<TabKey>('plants');

  const { data: plants = [], isLoading: plantsLoading } = useEtpPlants();
  const { data: staff = [], isLoading: staffLoading } = useEtpStaff();
  const { data: chemicals = [], isLoading: chemicalsLoading } = useEtpChemicals();
  const { data: parameters = [], isLoading: parametersLoading } = useEtpMonitoringParameters();
  const { data: equipment = [], isLoading: equipmentLoading } = useEtpBackwashEquipment();
  const { data: options = [], isLoading: optionsLoading } = useEtpOptions();
  const { data: instruments = [], isLoading: instrumentsLoading } = useEtpInstruments();
  const { data: printDocuments = [], isLoading: documentsLoading } = useEtpPrintDocuments();

  const createPlant = useCreateEtpPlant();
  const updatePlant = useUpdateEtpPlant();
  const deletePlant = useDeleteEtpPlant();
  const createStaff = useCreateEtpStaff();
  const updateStaff = useUpdateEtpStaff();
  const deleteStaff = useDeleteEtpStaff();
  const createChemical = useCreateEtpChemical();
  const updateChemical = useUpdateEtpChemical();
  const deleteChemical = useDeleteEtpChemical();
  const createParameter = useCreateEtpMonitoringParameter();
  const updateParameter = useUpdateEtpMonitoringParameter();
  const deleteParameter = useDeleteEtpMonitoringParameter();
  const createEquipment = useCreateEtpBackwashEquipment();
  const updateEquipment = useUpdateEtpBackwashEquipment();
  const deleteEquipment = useDeleteEtpBackwashEquipment();
  const createOption = useCreateEtpOption();
  const updateOption = useUpdateEtpOption();
  const deleteOption = useDeleteEtpOption();
  const createInstrument = useCreateEtpInstrument();
  const updateInstrument = useUpdateEtpInstrument();
  const deleteInstrument = useDeleteEtpInstrument();
  const createPrintDocument = useCreateEtpPrintDocument();
  const updatePrintDocument = useUpdateEtpPrintDocument();
  const deletePrintDocument = useDeleteEtpPrintDocument();

  const plantOptions = plants.map((plant) => ({
    value: String(plant.id),
    label: `${plant.code} — ${plant.name}`,
  }));
  const chemicalOptions = chemicals.map((chemical) => ({
    value: String(chemical.id),
    label: chemical.name,
  }));

  const plantFields: MasterField[] = [
    { key: 'code', label: 'Code', type: 'text', required: true, placeholder: 'ETP' },
    { key: 'name', label: 'Name', type: 'text', required: true },
    {
      key: 'plant_type',
      label: 'Type',
      type: 'select',
      required: true,
      options: labelOptions(PLANT_TYPE_LABELS),
    },
    { key: 'location', label: 'Location', type: 'text' },
    {
      key: 'company_codes',
      label: 'Companies served',
      type: 'multiselect',
      options: COMPANY_CODE_LIST.map((code) => ({ value: code, label: COMPANY_LABELS[code] })),
      help: 'Pick every company the plant serves. Leave empty if it is not attributed yet — the plant then drops out of a company-filtered view.',
    },
    { key: 'capacity_kld', label: 'Capacity (KLD)', type: 'number', align: 'right' },
    { key: 'consent_number', label: 'Consent / NOC no.', type: 'text', hideInTable: true },
    { key: 'sequence', label: 'Order', type: 'number', align: 'right' },
  ];

  const staffFields: MasterField[] = [
    { key: 'name', label: 'Name', type: 'text', required: true },
    {
      key: 'role',
      label: 'Role',
      type: 'select',
      required: true,
      options: [
        { value: 'OPERATOR', label: 'Operator' },
        { value: 'CHEMIST', label: 'Chemist' },
        { value: 'SUPERVISOR', label: 'Supervisor' },
        { value: 'QAM', label: 'QA Manager' },
        { value: 'OTHER', label: 'Other' },
      ],
    },
    { key: 'employee_code', label: 'Employee code', type: 'text' },
    {
      key: 'plant_ids',
      label: 'Plants',
      type: 'multiselect',
      options: plantOptions,
      help: 'Leave empty to offer this person on every plant.',
    },
    { key: 'sequence', label: 'Order', type: 'number', align: 'right' },
  ];

  const chemicalFields: MasterField[] = [
    { key: 'name', label: 'Chemical', type: 'text', required: true },
    {
      key: 'default_uom',
      label: 'Default unit',
      type: 'select',
      required: true,
      options: labelOptions(CHEMICAL_UOM_LABELS),
      help: 'Each entry can still override the unit — the STP records HYPO in grams where the ETP records litres.',
    },
    {
      key: 'plant_ids',
      label: 'Plants dosing it',
      type: 'multiselect',
      options: plantOptions,
      help: 'Leave empty to offer it on every plant.',
    },
    { key: 'sequence', label: 'Column order', type: 'number', align: 'right' },
    { key: 'remarks', label: 'Remarks', type: 'text', hideInTable: true },
  ];

  const parameterFields: MasterField[] = [
    { key: 'plant', label: 'Plant', type: 'select', required: true, options: plantOptions },
    {
      key: 'stage',
      label: 'Sampling point',
      type: 'select',
      required: true,
      options: labelOptions(MONITORING_STAGE_LABELS),
    },
    {
      key: 'parameter_key',
      label: 'Key',
      type: 'text',
      required: true,
      placeholder: 'ph / tds / do',
      help: 'A short stable key. Keep it the same across plants so reports line up.',
    },
    { key: 'parameter_name', label: 'Name', type: 'text', required: true },
    { key: 'unit', label: 'Unit', type: 'text', placeholder: 'ppm' },
    { key: 'min_value', label: 'Min', type: 'number', align: 'right' },
    { key: 'max_value', label: 'Max', type: 'number', align: 'right' },
    {
      key: 'validation_type',
      label: 'Check',
      type: 'select',
      required: true,
      options: labelOptions(SPEC_VALIDATION_LABELS),
      help: 'How the limits are read. Pick "No numeric check" to record a value without flagging it.',
    },
    {
      key: 'specification_text',
      label: 'Spec as printed',
      type: 'text',
      placeholder: '6.5-8.5',
      hideInTable: true,
    },
    { key: 'sequence', label: 'Order', type: 'number', align: 'right' },
  ];

  const equipmentFields: MasterField[] = [
    { key: 'plant', label: 'Plant', type: 'select', required: true, options: plantOptions },
    { key: 'name', label: 'Step / equipment', type: 'text', required: true },
    { key: 'equipment_code', label: 'Code', type: 'text', hideInTable: true },
    {
      key: 'default_chemical',
      label: 'Usual chemical',
      type: 'select',
      options: chemicalOptions,
      placeholder: 'None',
    },
    {
      key: 'default_duration_minutes',
      label: 'Usual minutes',
      type: 'number',
      align: 'right',
      help: 'Used to prefill the stop time when the step is logged.',
    },
    { key: 'sequence', label: 'Order', type: 'number', align: 'right' },
  ];

  const optionFields: MasterField[] = [
    {
      key: 'category',
      label: 'Dropdown',
      type: 'select',
      required: true,
      options: [
        { value: 'SLUDGE_COLLECTION_MODE', label: 'Sludge — mode of collection' },
        { value: 'SLUDGE_STORAGE_METHOD', label: 'Sludge — method of storage' },
        { value: 'SLUDGE_DISPOSAL_MODE', label: 'Sludge — mode of disposal' },
        { value: 'CALIBRATION_ACTION', label: 'Calibration — corrective action' },
      ],
    },
    { key: 'label', label: 'Value', type: 'text', required: true },
    { key: 'sequence', label: 'Order', type: 'number', align: 'right' },
    {
      key: 'is_default',
      label: 'Preselected',
      type: 'checkbox',
      help: 'Preselected on the form. Keep one default per dropdown.',
    },
  ];

  const instrumentFields: MasterField[] = [
    { key: 'equipment_name', label: 'Equipment', type: 'text', required: true },
    { key: 'equipment_id', label: 'Equipment ID', type: 'text', required: true },
    { key: 'plant', label: 'Plant', type: 'select', options: plantOptions, placeholder: 'None' },
    { key: 'line_id', label: 'Line ID', type: 'text', hideInTable: true },
    { key: 'location', label: 'Location', type: 'text' },
    { key: 'working_range', label: 'Working range', type: 'text', placeholder: '0 - 14' },
    {
      key: 'frequency',
      label: 'Frequency',
      type: 'select',
      required: true,
      options: labelOptions(CALIBRATION_FREQUENCY_LABELS),
    },
    {
      key: 'tolerance',
      label: 'Allowed variation (±)',
      type: 'number',
      align: 'right',
      help: 'A reading beyond this files the instrument as out of calibration.',
    },
    {
      key: 'pointValues',
      label: 'Buffer points',
      type: 'numberList',
      placeholder: '4, 7, 10.01',
      help: 'The standard values the instrument is checked at, comma separated.',
    },
    { key: 'standard_make_model', label: 'Standard used', type: 'text', placeholder: 'ADVIT PH14' },
    { key: 'standard_equipment_id', label: 'Standard ID', type: 'text', hideInTable: true },
    { key: 'standard_range', label: 'Standard range', type: 'text', hideInTable: true },
    {
      key: 'external_calibration_date',
      label: 'External calibration done',
      type: 'date',
      hideInTable: true,
    },
    {
      key: 'external_calibration_due_date',
      label: 'External calibration due',
      type: 'date',
      hideInTable: true,
    },
    { key: 'sequence', label: 'Order', type: 'number', align: 'right' },
  ];

  /** Instruments carry their buffer points as a nested list. */
  const instrumentToForm = (row: CalibrationInstrument): MasterForm => ({
    equipment_name: row.equipment_name,
    equipment_id: row.equipment_id,
    plant: row.plant ? String(row.plant) : '',
    line_id: row.line_id,
    location: row.location,
    working_range: row.working_range,
    frequency: row.frequency,
    tolerance: row.tolerance,
    pointValues: (row.points ?? []).map((point) => point.actual_value).join(', '),
    standard_make_model: row.standard_make_model,
    standard_equipment_id: row.standard_equipment_id,
    standard_range: row.standard_range,
    external_calibration_date: row.external_calibration_date ?? '',
    external_calibration_due_date: row.external_calibration_due_date ?? '',
    sequence: String(row.sequence),
  });

  const instrumentToPayload = (form: MasterForm): Record<string, unknown> => {
    const points = String(form.pointValues ?? '')
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean)
      .map((value, index) => ({ actual_value: value, sequence: index + 1 }));
    return {
      equipment_name: form.equipment_name,
      equipment_id: form.equipment_id,
      plant: form.plant === '' ? null : Number(form.plant),
      line_id: form.line_id,
      location: form.location,
      working_range: form.working_range,
      frequency: form.frequency,
      tolerance: form.tolerance === '' ? undefined : form.tolerance,
      standard_make_model: form.standard_make_model,
      standard_equipment_id: form.standard_equipment_id,
      standard_range: form.standard_range,
      external_calibration_date: form.external_calibration_date || null,
      external_calibration_due_date: form.external_calibration_due_date || null,
      sequence: form.sequence === '' ? 0 : Number(form.sequence),
      points,
    };
  };

  /** Foreign keys arrive as strings from the selects. */
  const withNumericFk = (keys: string[]) => (form: MasterForm) => {
    const payload: Record<string, unknown> = { ...form };
    keys.forEach((key) => {
      payload[key] = form[key] === '' ? null : Number(form[key]);
    });
    ['sequence', 'min_value', 'max_value', 'capacity_kld', 'default_duration_minutes'].forEach(
      (key) => {
        if (key in payload && payload[key] === '') payload[key] = null;
      },
    );
    if (payload.sequence === null) payload.sequence = 0;
    if (Array.isArray(form.plant_ids)) payload.plant_ids = form.plant_ids.map(Number);
    return payload;
  };

  const printDocumentFields: MasterField[] = [
    {
      key: 'document_key',
      label: 'Form',
      type: 'select',
      required: true,
      options: labelOptions(PRINT_DOCUMENT_LABELS),
    },
    {
      key: 'document_code',
      label: 'Document code',
      type: 'text',
      required: true,
      placeholder: 'QA-FRM-14-00-08-06',
      help: 'Printed in the header of that form and in its footer.',
    },
    { key: 'revision', label: 'Revision', type: 'text', placeholder: '00' },
    { key: 'issue_date', label: 'Issue date', type: 'date' },
    {
      key: 'company_code',
      label: 'Company',
      type: 'select',
      options: COMPANY_CODE_LIST.map((code) => ({ value: code, label: COMPANY_LABELS[code] })),
      placeholder: 'All companies',
      help: 'Leave as "All companies" unless one company needs its own number for the same form.',
    },
    {
      key: 'form_name',
      label: 'Name as printed',
      type: 'text',
      placeholder: 'SLUDGE GENERATION RECORD',
      hideInTable: true,
      help: 'Shown as the form title. Leave blank to keep the built-in name.',
    },
    {
      key: 'document_id',
      label: 'Document ID (footer)',
      type: 'text',
      hideInTable: true,
      help: 'Optional per-copy ID, the way the QC prints carry one.',
    },
    { key: 'notes', label: 'Notes', type: 'text', hideInTable: true },
  ];

  /** "All companies" is stored as no company at all. */
  const printDocumentToPayload = (form: MasterForm): Record<string, unknown> => ({
    ...form,
    company_code: form.company_code === '' ? null : form.company_code,
    issue_date: form.issue_date === '' ? null : form.issue_date,
  });

  return (
    <div className="space-y-6 p-6">
      <DashboardHeader
        title="ETP / STP Settings"
        description="The lists the registers pick from — plants, people, chemicals, parameters, steps, dropdowns and instruments"
      />

      <div className="flex flex-wrap gap-2">
        {TABS.map((entry) => (
          <Button
            key={entry.key}
            size="sm"
            variant={tab === entry.key ? 'default' : 'outline'}
            onClick={() => setTab(entry.key)}
          >
            {entry.label}
          </Button>
        ))}
      </div>

      {!canManage && (
        <p className="text-sm text-muted-foreground">
          You can review these lists but not change them — that needs the ETP settings permission.
        </p>
      )}

      {tab === 'plants' && (
        <MasterEditor
          title="Plants"
          description="Every register row belongs to one of these."
          rows={plants}
          loading={plantsLoading}
          fields={plantFields}
          canManage={canManage}
          onCreate={(payload) => createPlant.mutateAsync(payload)}
          onUpdate={(id, payload) => updatePlant.mutateAsync({ id, payload })}
          onDelete={(id) => deletePlant.mutateAsync(id)}
          rowLabel={(row) => `${row.code} — ${row.name}`}
          emptyMessage="No plants yet. Add your ETP and STP to get started."
        />
      )}

      {tab === 'people' && (
        <MasterEditor
          title="People"
          description="Who signs the registers. These are names on a form, not application logins."
          rows={staff}
          loading={staffLoading}
          fields={staffFields}
          canManage={canManage}
          onCreate={(payload) => createStaff.mutateAsync(payload)}
          onUpdate={(id, payload) => updateStaff.mutateAsync({ id, payload })}
          onDelete={(id) => deleteStaff.mutateAsync(id)}
          rowLabel={(row) => row.name}
        />
      )}

      {tab === 'chemicals' && (
        <MasterEditor
          title="Chemicals"
          description="One column each on the consumption register."
          rows={chemicals}
          loading={chemicalsLoading}
          fields={chemicalFields}
          canManage={canManage}
          onCreate={(payload) => createChemical.mutateAsync(payload)}
          onUpdate={(id, payload) => updateChemical.mutateAsync({ id, payload })}
          onDelete={(id) => deleteChemical.mutateAsync(id)}
          rowLabel={(row) => row.name}
        />
      )}

      {tab === 'parameters' && (
        <MasterEditor
          title="Monitoring parameters"
          description="The columns of the on-line monitoring sheet, with the limits that flag a reading."
          rows={parameters}
          loading={parametersLoading}
          fields={parameterFields}
          canManage={canManage}
          toPayload={withNumericFk(['plant'])}
          onCreate={(payload) => createParameter.mutateAsync(payload)}
          onUpdate={(id, payload) => updateParameter.mutateAsync({ id, payload })}
          onDelete={(id) => deleteParameter.mutateAsync(id)}
          rowLabel={(row) => `${row.plant_code} ${row.stage} ${row.parameter_name}`}
        />
      )}

      {tab === 'backwash' && (
        <MasterEditor
          title="Back-wash steps"
          description="Sand / carbon filter back-wash and rinse steps, per plant."
          rows={equipment}
          loading={equipmentLoading}
          fields={equipmentFields}
          canManage={canManage}
          toPayload={withNumericFk(['plant', 'default_chemical'])}
          onCreate={(payload) => createEquipment.mutateAsync(payload)}
          onUpdate={(id, payload) => updateEquipment.mutateAsync({ id, payload })}
          onDelete={(id) => deleteEquipment.mutateAsync(id)}
          rowLabel={(row) => row.name}
        />
      )}

      {tab === 'options' && (
        <MasterEditor
          title="Dropdown values"
          description="The words the sludge and calibration selects offer."
          rows={options}
          loading={optionsLoading}
          fields={optionFields}
          canManage={canManage}
          onCreate={(payload) => createOption.mutateAsync(payload)}
          onUpdate={(id, payload) => updateOption.mutateAsync({ id, payload })}
          onDelete={(id) => deleteOption.mutateAsync(id)}
          rowLabel={(row) => `${row.category_display}: ${row.label}`}
        />
      )}

      {tab === 'documents' && (
        <MasterEditor
          title="Print documents"
          description="The controlled-document number each register prints. Correcting a code or bumping a revision here reaches the paper immediately — no release needed."
          rows={printDocuments}
          loading={documentsLoading}
          fields={printDocumentFields}
          canManage={canManage}
          toPayload={printDocumentToPayload}
          onCreate={(payload) => createPrintDocument.mutateAsync(payload)}
          onUpdate={(id, payload) => updatePrintDocument.mutateAsync({ id, payload })}
          onDelete={(id) => deletePrintDocument.mutateAsync(id)}
          rowLabel={(row) => `${row.document_key_label} (${row.document_code})`}
          emptyMessage="No numbers configured — the prints fall back to their built-in codes until you add them."
        />
      )}

      {tab === 'instruments' && (
        <MasterEditor
          title="Instruments"
          description="What the calibration register checks, and the buffer points it is checked at."
          rows={instruments}
          loading={instrumentsLoading}
          fields={instrumentFields}
          canManage={canManage}
          toForm={instrumentToForm}
          toPayload={instrumentToPayload}
          extraColumns={[
            {
              label: 'Last / next',
              render: (row) =>
                `${row.last_calibration_date ?? 'never'} → ${row.calibration_due_date ?? '—'}`,
            },
          ]}
          onCreate={(payload) => createInstrument.mutateAsync(payload)}
          onUpdate={(id, payload) => updateInstrument.mutateAsync({ id, payload })}
          onDelete={(id) => deleteInstrument.mutateAsync(id)}
          rowLabel={(row) => `${row.equipment_name} (${row.equipment_id})`}
        />
      )}
    </div>
  );
}
