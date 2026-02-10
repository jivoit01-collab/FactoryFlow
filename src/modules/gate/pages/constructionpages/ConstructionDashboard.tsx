import SharedDashboard from '../shared/SharedDashboard'
import { CONSTRUCTION_FLOW } from '../../constants/entryFlowConfig'

export default function ConstructionDashboard() {
  return <SharedDashboard config={CONSTRUCTION_FLOW} />
}
