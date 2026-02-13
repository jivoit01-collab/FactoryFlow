import { CONSTRUCTION_FLOW } from '../../constants/entryFlowConfig'
import SharedDashboard from '../shared/SharedDashboard'

export default function ConstructionDashboard() {
  return <SharedDashboard config={CONSTRUCTION_FLOW} />
}
