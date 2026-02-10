import SharedDashboard, { RAW_MATERIAL_STATUS_CONFIG } from '../shared/SharedDashboard'
import { RAW_MATERIAL_FLOW } from '../../constants/entryFlowConfig'

export default function RawMaterialsDashboard() {
  return <SharedDashboard config={RAW_MATERIAL_FLOW} statusConfig={RAW_MATERIAL_STATUS_CONFIG} />
}
