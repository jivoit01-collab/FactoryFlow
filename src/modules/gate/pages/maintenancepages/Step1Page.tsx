import SharedStep1Page from '../shared/SharedStep1Page'
import { MAINTENANCE_FLOW } from '../../constants/entryFlowConfig'

export default function Step1Page() {
  return <SharedStep1Page config={MAINTENANCE_FLOW} />
}
