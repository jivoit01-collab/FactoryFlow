import SharedDashboard from '../shared/SharedDashboard'
import { MAINTENANCE_FLOW } from '../../constants/entryFlowConfig'

export default function MaintenanceDashboard() {
  return <SharedDashboard config={MAINTENANCE_FLOW} />
}
