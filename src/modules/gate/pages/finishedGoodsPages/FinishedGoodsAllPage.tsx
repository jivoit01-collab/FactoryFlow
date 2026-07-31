import { FINISHED_GOODS_FLOW } from '../../constants/entryFlowConfig';
import SharedAllPage from '../shared/SharedAllPage';

export default function FinishedGoodsAllPage() {
  return <SharedAllPage config={FINISHED_GOODS_FLOW} />;
}
