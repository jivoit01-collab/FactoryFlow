import { MAINTENANCE_FLOW } from '../../constants/entryFlowConfig'
import SharedStep1Page from '../shared/SharedStep1Page'

export default function Step1Page() {
  return <SharedStep1Page config={MAINTENANCE_FLOW} />
}
