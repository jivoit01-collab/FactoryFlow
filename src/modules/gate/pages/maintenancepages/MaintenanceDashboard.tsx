import { MAINTENANCE_FLOW } from '../../constants/entryFlowConfig'
import SharedDashboard from '../shared/SharedDashboard'

export default function MaintenanceDashboard() {
  return <SharedDashboard config={MAINTENANCE_FLOW} />
}
