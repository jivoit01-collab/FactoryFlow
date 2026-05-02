import GateSubmoduleFormPage, {
  type GateSubmoduleFormConfig,
} from '../standaloneForms/GateSubmoduleFormPage';

const repairMovementConfig: GateSubmoduleFormConfig = {
  storageKey: 'gate.repair-movement.form-draft',
  title: 'Repair Movement',
  subtitle: 'Returnable spare, tool, machine part, or maintenance item movement',
  backPath: '/gate',
  sections: [
    {
      title: 'Movement',
      fields: [
        { name: 'movementDate', label: 'Movement Date', type: 'date', required: true },
        {
          name: 'movementType',
          label: 'Movement Type',
          type: 'select',
          required: true,
          options: ['Send Out', 'Receive Back', 'Exchange', 'Service Visit', 'Scrap Return'],
        },
        { name: 'maintenanceEntryNo', label: 'Maintenance Entry No.' },
        { name: 'department', label: 'Department' },
        { name: 'requestedBy', label: 'Requested By' },
        { name: 'vendorName', label: 'Repair Vendor' },
      ],
    },
    {
      title: 'Item',
      fields: [
        { name: 'assetCode', label: 'Asset / Item Code' },
        { name: 'itemDescription', label: 'Item Description', required: true },
        { name: 'serialNo', label: 'Serial No.' },
        { name: 'qty', label: 'Qty', type: 'number', min: '0', step: '0.001' },
        { name: 'uom', label: 'UOM' },
        {
          name: 'returnable',
          label: 'Returnable',
          type: 'checkbox',
        },
      ],
    },
    {
      title: 'Gate And Documents',
      fields: [
        { name: 'vehicleNo', label: 'Vehicle No.' },
        { name: 'driverName', label: 'Driver Name' },
        { name: 'challanNo', label: 'Challan No.' },
        { name: 'ewayBillNo', label: 'E-way Bill No.' },
        { name: 'expectedReturnDate', label: 'Expected Return Date', type: 'date' },
        { name: 'manualSapRef', label: 'Manual SAP Reference' },
      ],
    },
    {
      title: 'Condition',
      fields: [
        {
          name: 'conditionOut',
          label: 'Condition Out',
          type: 'select',
          options: ['Working', 'Damaged', 'Needs Repair', 'Not Checked'],
        },
        {
          name: 'conditionIn',
          label: 'Condition In',
          type: 'select',
          options: ['Working', 'Repaired', 'Rejected', 'Partially Repaired', 'Not Received'],
        },
        { name: 'remarks', label: 'Remarks', type: 'textarea' },
      ],
    },
  ],
};

export default function RepairMovementFormPage() {
  return <GateSubmoduleFormPage config={repairMovementConfig} />;
}
