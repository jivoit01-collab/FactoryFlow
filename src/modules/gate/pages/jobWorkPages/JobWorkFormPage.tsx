import GateSubmoduleFormPage, {
  type GateSubmoduleFormConfig,
} from '../standaloneForms/GateSubmoduleFormPage';

const jobWorkConfig: GateSubmoduleFormConfig = {
  storageKey: 'gate.job-work.form-draft',
  title: 'Job Work / Oil Refining',
  subtitle: 'Refined oil or outsourced job-work material arriving at factory gate',
  backPath: '/gate',
  sections: [
    {
      title: 'Production Reference',
      fields: [
        { name: 'receiptDate', label: 'Receipt Date', type: 'date', required: true },
        { name: 'sapProductionOrder', label: 'SAP Production Order', required: true },
        { name: 'refinerVendor', label: 'Refiner / Job Worker', required: true },
        { name: 'materialGrade', label: 'Material Grade' },
        { name: 'sourceWarehouse', label: 'Source Warehouse' },
        { name: 'targetTankWarehouse', label: 'Target Tank / Warehouse' },
      ],
    },
    {
      title: 'Vehicle And Documents',
      fields: [
        { name: 'vehicleNo', label: 'Vehicle / Tanker No.', required: true },
        { name: 'driverName', label: 'Driver Name' },
        { name: 'challanNo', label: 'Refiner Challan No.', required: true },
        { name: 'ewayBillNo', label: 'E-way Bill No.' },
        { name: 'sealNo', label: 'Seal No.' },
        {
          name: 'sealOk',
          label: 'Seal OK',
          type: 'checkbox',
        },
      ],
    },
    {
      title: 'Quantities And Loss',
      fields: [
        { name: 'unrefinedInputQty', label: 'Unrefined Input Qty', type: 'number', min: '0', step: '0.001' },
        { name: 'refinedDispatchQty', label: 'Refined Dispatch Qty', type: 'number', min: '0', step: '0.001' },
        { name: 'vehicleReceiptQty', label: 'Vehicle Receipt Qty', type: 'number', min: '0', step: '0.001' },
        { name: 'tankReceiptQty', label: 'Tank Receipt Qty', type: 'number', min: '0', step: '0.001' },
        { name: 'refiningLossPct', label: 'Refining Loss %', type: 'number', min: '0', step: '0.001' },
        { name: 'unloadingLossPct', label: 'Unloading Loss %', type: 'number', min: '0', step: '0.001' },
      ],
    },
    {
      title: 'QC And Receipt',
      fields: [
        {
          name: 'qcDecision',
          label: 'QC Decision',
          type: 'select',
          options: ['Pending', 'Accepted', 'Partially Accepted', 'Rejected'],
        },
        { name: 'acceptedQty', label: 'Accepted Qty', type: 'number', min: '0', step: '0.001' },
        { name: 'rejectedQty', label: 'Rejected Qty', type: 'number', min: '0', step: '0.001' },
        { name: 'manualSapRef', label: 'Manual SAP Reference' },
        { name: 'remarks', label: 'Remarks', type: 'textarea' },
      ],
    },
  ],
};

export default function JobWorkFormPage() {
  return <GateSubmoduleFormPage config={jobWorkConfig} />;
}
