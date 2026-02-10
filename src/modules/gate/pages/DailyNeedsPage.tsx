import SharedDashboard from './shared/SharedDashboard'
import { DAILY_NEED_FLOW } from '../constants/entryFlowConfig'

export default function DailyNeedsPage() {
  return <SharedDashboard config={DAILY_NEED_FLOW} />
}
