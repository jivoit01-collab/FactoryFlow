import { useParams } from 'react-router-dom';

import { CustomBoardView } from '../components/CustomBoardView';

/**
 * A built board at its own address.
 *
 * Thin on purpose: the board itself is `CustomBoardView`, which the wall
 * rotation mounts directly. A rotation cannot navigate, so it has no route to
 * read a slug from — and a carousel that drew its own copy of a board would
 * be a second place for the same board to drift.
 */
export default function CustomBoardPage() {
  const { slug = '' } = useParams<{ slug: string }>();
  return <CustomBoardView slug={slug} />;
}
