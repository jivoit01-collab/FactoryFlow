import '../styles/builder.css';

import {
  Copy,
  GalleryHorizontalEnd,
  LayoutDashboard,
  Lock,
  Monitor,
  Plus,
  Trash2,
  Users,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { DashboardError, DashboardLoading } from '@/shared/components/dashboard';
import { Button } from '@/shared/components/ui';
import { cn } from '@/shared/utils';

import {
  useBuiltBoards,
  useCreateBoard,
  useDeleteBoard,
  useDuplicateBoard,
} from '../api';
import { ACCENT_CLASS } from '../components/CardFace';
import { NEW_BOARD_DEFAULTS } from '../constants';
import type { BoardSummary } from '../types';

/**
 * Every board this login can open, and the button that makes another.
 *
 * WHY BOARDS SOMEBODY ELSE PUBLISHED ARE LISTED EVEN WHEN NO CARD ON THEM
 * WILL RENDER
 * The list does not check feed rights per board — that check walks the whole
 * catalogue, which is fine for one board and wrong for a list of forty. A
 * published board a reader holds no rights for therefore appears here and
 * explains itself when opened. That is deliberate: a board's NAME is not a
 * disclosure, its figures are, and "you may not read any of this" is a more
 * useful answer than a board that silently does not exist.
 */

function BoardTile({
  board,
  onOpen,
  onEdit,
  onDuplicate,
  onDelete,
  canBuild,
}: {
  board: BoardSummary;
  onOpen: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  canBuild: boolean;
}) {
  return (
    <article className={cn('cbx-board-tile', ACCENT_CLASS[board.accent])}>
      <button type="button" className="cbx-board-open" onClick={onOpen}>
        <header>
          <h3>{board.name}</h3>
          <span className="cbx-board-grid">
            {board.columns}×{board.rows}
          </span>
        </header>
        <p>{board.description || 'No description.'}</p>
        <footer>
          <span>
            {board.mode === 'WALL' ? (
              <Monitor className="h-3.5 w-3.5" />
            ) : (
              <LayoutDashboard className="h-3.5 w-3.5" />
            )}
            {board.mode === 'WALL' ? 'Wall' : 'Page'}
          </span>
          <span>
            {board.visibility === 'PUBLISHED' ? (
              <Users className="h-3.5 w-3.5" />
            ) : (
              <Lock className="h-3.5 w-3.5" />
            )}
            {board.visibility === 'PUBLISHED' ? 'Published' : 'Private'}
          </span>
          {board.in_carousel && (
            <span>
              <GalleryHorizontalEnd className="h-3.5 w-3.5" />
              On the wall
            </span>
          )}
          <span>
            {board.card_count} card{board.card_count === 1 ? '' : 's'}
          </span>
          {!board.is_mine && <span>by {board.owner_name}</span>}
        </footer>
      </button>

      <div className="cbx-board-actions">
        {/* Editing is the owner's alone. A colleague who wants a variant
            duplicates it, which is one click and leaves the original alone —
            the same answer the server gives if they try to PATCH it. */}
        {board.is_mine && canBuild && (
          <Button variant="outline" size="sm" onClick={onEdit}>
            Edit
          </Button>
        )}
        {canBuild && (
          <Button variant="ghost" size="sm" onClick={onDuplicate} title="Take a copy">
            <Copy className="h-3.5 w-3.5" />
          </Button>
        )}
        {board.is_mine && canBuild && (
          <Button variant="ghost" size="sm" onClick={onDelete} title="Delete">
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </article>
  );
}

export default function MyDashboardsPage() {
  const navigate = useNavigate();
  const { data, isLoading, error, refetch } = useBuiltBoards();
  const createBoard = useCreateBoard();
  const duplicateBoard = useDuplicateBoard();
  const deleteBoard = useDeleteBoard();

  if (isLoading) return <DashboardLoading />;
  if (error) {
    return (
      <DashboardError
        message={(error as Error).message}
        onRetry={() => {
          void refetch();
        }}
      />
    );
  }

  const boards = data?.boards ?? [];
  const canBuild = data?.can_build ?? false;

  const mine = boards.filter((board) => board.is_mine);
  const shared = boards.filter((board) => !board.is_mine);

  const startNew = () => {
    createBoard.mutate(
      { ...NEW_BOARD_DEFAULTS, name: 'Untitled board', placements: [] },
      {
        // Straight into the editor. A board with no cards has nothing to show,
        // so a list entry would be the one step nobody wants.
        onSuccess: (board) => navigate(`/dashboards/builder/${board.slug}`),
      },
    );
  };

  return (
    <div className="cbx-page">
      <header className="cbx-page-head">
        <div>
          <h1>My dashboards</h1>
          <p>
            Boards composed out of the card catalogue. What each card shows still
            depends on the data rights you hold — arranging one never widens them.
          </p>
        </div>
        {canBuild && (
          <Button onClick={startNew} disabled={createBoard.isPending}>
            <Plus className="mr-1.5 h-4 w-4" />
            New board
          </Button>
        )}
      </header>

      {!canBuild && (
        <p className="cbx-notice">
          You can open boards shared with you, but not build your own. Ask an
          administrator for the dashboard builder permission.
        </p>
      )}

      {boards.length === 0 && (
        <p className="cbx-notice">
          Nothing here yet.{' '}
          {canBuild
            ? 'Make a board and drag some cards onto it.'
            : 'Nobody has shared a board with you.'}
        </p>
      )}

      {mine.length > 0 && (
        <section>
          <h2>Mine</h2>
          <div className="cbx-board-grid-list">
            {mine.map((board) => (
              <BoardTile
                key={board.slug}
                board={board}
                canBuild={canBuild}
                onOpen={() => navigate(`/dashboards/board/${board.slug}`)}
                onEdit={() => navigate(`/dashboards/builder/${board.slug}`)}
                onDuplicate={() =>
                  duplicateBoard.mutate(board.slug, {
                    onSuccess: (copy) =>
                      navigate(`/dashboards/builder/${(copy as { slug: string }).slug}`),
                  })
                }
                onDelete={() => {
                  if (
                    window.confirm(
                      `Delete “${board.name}”? An administrator can restore it.`,
                    )
                  ) {
                    deleteBoard.mutate(board.slug);
                  }
                }}
              />
            ))}
          </div>
        </section>
      )}

      {shared.length > 0 && (
        <section>
          <h2>Shared with me</h2>
          <div className="cbx-board-grid-list">
            {shared.map((board) => (
              <BoardTile
                key={board.slug}
                board={board}
                canBuild={canBuild}
                onOpen={() => navigate(`/dashboards/board/${board.slug}`)}
                onEdit={() => navigate(`/dashboards/builder/${board.slug}`)}
                onDuplicate={() =>
                  duplicateBoard.mutate(board.slug, {
                    onSuccess: (copy) =>
                      navigate(`/dashboards/builder/${(copy as { slug: string }).slug}`),
                  })
                }
                onDelete={() => undefined}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
