import GateSubmoduleFormPage, {
  type GateSubmoduleFormConfig,
} from '../standaloneForms/GateSubmoduleFormPage';

const returnsConfig: GateSubmoduleFormConfig = {
  storageKey: 'gate.returns.form-draft',
  title: 'BST / Returns',
  subtitle: 'Customer, branch, store, or back-store return received at gate',
  backPath: '/gate',
  sections: [
    {
      title: 'Return Source',
      fields: [
        { name: 'returnDate', label: 'Return Date', type: 'date', required: true },
        {
          name: 'returnType',
          label: 'Return Type',
          type: 'select',
          required: true,
          options: ['Customer Return', 'Branch Return', 'Back Store Transfer', 'Sales Return', 'Other'],
        },
        { name: 'sourceParty', label: 'Source Party', required: true },
        { name: 'referenceDocument', label: 'Reference Document' },
        { name: 'customerCode', label: 'Customer / Branch Code' },
        { name: 'manualSapRef', label: 'Manual SAP Reference' },
      ],
    },
    {
      title: 'Vehicle And Documents',
      fields: [
        { name: 'vehicleNo', label: 'Vehicle No.' },
        { name: 'driverName', label: 'Driver Name' },
        { name: 'transporterName', label: 'Transporter' },
        { name: 'challanNo', label: 'Challan No.' },
        { name: 'ewayBillNo', label: 'E-way Bill No.' },
        { name: 'documentQty', label: 'Document Qty', type: 'number', min: '0', step: '0.001' },
      ],
    },
    {
      title: 'Returned Goods',
      fields: [
        { name: 'itemCode', label: 'Item Code' },
        { name: 'itemName', label: 'Item Name', required: true },
        { name: 'batchNo', label: 'Batch / Lot No.' },
        { name: 'receivedQty', label: 'Received Qty', type: 'number', min: '0', step: '0.001' },
        {
          name: 'condition',
          label: 'Condition',
          type: 'select',
          options: ['Good', 'Damaged', 'Leaking', 'Expired', 'Mixed', 'Needs QC'],
        },
        { name: 'targetWarehouse', label: 'Target Warehouse' },
      ],
    },
    {
      title: 'QC And Closure',
      fields: [
        {
          name: 'qcRequired',
          label: 'QC Required',
          type: 'checkbox',
        },
        {
          name: 'action',
          label: 'Action',
          type: 'select',
          options: ['Hold', 'Accept', 'Reject', 'Send to Rework', 'Manual SAP Follow-up'],
        },
        { name: 'remarks', label: 'Remarks', type: 'textarea' },
      ],
    },
  ],
};

export default function ReturnsFormPage() {
  return <GateSubmoduleFormPage config={returnsConfig} />;
}
