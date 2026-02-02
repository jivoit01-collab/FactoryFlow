// Pages
export { default as QCDashboardPage } from './pages/QCDashboardPage'
export { default as QCInspectionPage } from './pages/QCInspectionPage'
// Legacy page exports
export { default as QualityCheckListPage } from './pages/QualityCheckListPage'
export { default as QualityCheckDetailPage } from './pages/QualityCheckDetailPage'

// Components
export { QCStatusBadge } from './components/QCStatusBadge'
export { QCSummaryCard } from './components/QCSummaryCard'
export { QCItemsTable } from './components/QCItemsTable'
export { QCParameterRow } from './components/QCParameterRow'
export { QCTabs } from './components/QCTabs'
export { QCFileUpload } from './components/QCFileUpload'
export { QCActionButtons } from './components/QCActionButtons'
// Legacy component exports
export { QualityCheckTable } from './components/QualityCheckTable'
export { QualityStatusBadge } from './components/QualityStatusBadge'

// Hooks/Queries
export {
  useQCItems,
  useQCSummary,
  useQCItem,
  useQCInspection,
  useStartQCInspection,
  useSubmitQCInspection,
  useUploadQCAttachment,
  useDeleteQCAttachment,
  // Legacy exports
  useQualityCheckList,
  useQualityCheckDetail,
  useCreateQualityCheck,
  useUpdateQualityCheck,
  useDeleteQualityCheck,
} from './api/qualityCheck.queries'

// Types
export type {
  QCItem,
  QCInspection,
  QCSummary,
  VisualInspectionData,
  LabParametersData,
  VisualParameter,
  LabParameter,
  QCAttachment,
  StartQCRequest,
  SubmitQCRequest,
  UploadAttachmentRequest,
  QCItemsResponse,
  QCInspectionFormData,
} from './types/qualityCheck.types'
export { QCStatus, PassFailResult, QualityCheckStatus } from './types/qualityCheck.types'

// Constants
export {
  QC_STATUS_LABELS,
  QC_STATUS_OPTIONS,
  QC_STATUS_COLORS,
  QC_STATUS_BADGE_VARIANTS,
  VISUAL_INSPECTION_PARAMS,
  LAB_PARAMETERS,
  PASS_FAIL_OPTIONS,
  QC_TABS,
  QC_TAB_LABELS,
  QC_FORM_DEFAULTS,
  ACCEPTED_FILE_TYPES,
  MAX_FILE_SIZE,
  // Legacy exports
  QUALITY_CHECK_STATUS_LABELS,
  QUALITY_CHECK_STATUS_OPTIONS,
  QUALITY_PARAMETERS,
} from './constants/qualityCheck.constants'
export type { QCTab } from './constants/qualityCheck.constants'

// Schemas
export {
  visualInspectionSchema,
  labParametersSchema,
  qcInspectionSchema,
  submitQCSchema,
  areAllParametersChecked,
  hasAnyFailedParameter,
  getParameterCounts,
} from './schemas/qualityCheck.schema'
export type {
  VisualInspectionFormData,
  LabParametersFormData,
  QCInspectionFormData as QCFormData,
  SubmitQCFormData,
} from './schemas/qualityCheck.schema'
