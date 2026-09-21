import '../../logistics-control/styles/ops-board.css';
import '../styles/builder.css';

import { ArrowLeft, Eye, Save, Share2, Undo2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { DashboardError, DashboardLoading } from '@/shared/components/dashboard';
import { Button } from '@/shared/components/ui';

import {
  useBuiltBoard,
  useCardCatalogue,
  usePublishBoard,
  useSaveBoard,
  useUnpublishBoard,
} from '../api';
import { BoardCanvas, BoardInspector, BoardSettings, CardPalette } from '../components';
import { useBoardDraft } from '../hooks';
import { draftFrom } from '../hooks/useBoardDraft';
import type { CardSpec } from '../types';

/**
 * The editor: palette on the left, grid in the middle, settings on the right.
 *
 * NOTHING HERE READS A FIGURE
 * The canvas draws placeholders. A dozen cards re-running their queries on
 * every drag would make the canvas unusable and would put that load on a
 * Postgres box serving fourteen databases — and none of it would help,
 * because what an author is arranging is shape, hue and position, all of
 * which are visible without a number. Preview is a click away and it is the
 * viewer, not a mode of this page.
 *
 * SAVE IS EXPLICIT
 * See `useBoardDraft` for why there is no autosave. The consequence lands
 * here: this page owns the unsaved-changes state and has to make it visible,
 * which is the banner in the toolbar and the browser's own beforeunload
 * prompt.
 */
export default function DashboardBuilderPage() {
  const { slug = '' } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const catalogueQuery = useCardCatalogue();
  const boardQuery = useBuiltBoard(slug);
  const saveBoard = useSaveBoard(slug);
  const publishBoard = usePublishBoard(slug);
  const unpublishBoard = useUnpublishBoard(slug);

  const catalogue = useMemo(() => {
    const map = new Map<string, CardSpec>();
    for (const card of catalogueQuery.data?.cards ?? []) map.set(card.key, card);
    return map;
  }, [catalogueQuery.data]);

  const limits = catalogueQuery.data?.limits;

  const initial = useMemo(
    () =>
      boardQuery.data
        ? draftFrom(boardQuery.data)
        : {
            name: '',
            description: '',
            mode: 'WALL' as const,
            columns: 4,
            rows: 3,
            surface: 'light' as const,
            density: 'normal' as const,
            accent: 'warehouse' as const,
            show_heading: true,
            in_carousel: false,
            placements: [],
          },
    [boardQuery.data],
  );

  const {
    draft,
    dirty,
    spilled,
    patch,
    addCard,
    moveCard,
    removeCard,
    patchCard,
    reset,
    clearSpilled,
  } = useBoardDraft(initial, catalogue, {
    max_rows: limits?.max_rows ?? { WALL: 5, PAGE: 12 },
  });

  const [selected, setSelected] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // The board arrives after the first render, so the draft is seeded here
  // rather than from useState's initialiser.
  useEffect(() => {
    if (boardQuery.data) reset(boardQuery.data);
  }, [boardQuery.data, reset]);

  // The browser's own prompt. Blunt, and the only thing that survives a tab
  // close — an in-app guard cannot.
  useEffect(() => {
    if (!dirty) return undefined;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  if (catalogueQuery.isLoading || boardQuery.isLoading) return <DashboardLoading />;
  if (catalogueQuery.error || boardQuery.error || !limits) {
    return (
      <DashboardError
        message={((catalogueQuery.error ?? boardQuery.error) as Error)?.message}
        onRetry={() => {
          void catalogueQuery.refetch();
          void boardQuery.refetch();
        }}
      />
    );
  }

  const board = boardQuery.data;
  const selectedPlacement = selected !== null ? draft.placements[selected] : undefined;

  const save = () => {
    setMessage(null);
    saveBoard.mutate(draft, {
      onSuccess: () => setMessage('Saved.'),
      onError: (error) => {
        // The server's validation message is the useful one — it names the
        // card and the cell. Surfaced verbatim rather than replaced with a
        // generic failure.
        const detail =
          (error as { response?: { data?: { placements?: string[]; detail?: string } } })
            .response?.data;
        setMessage(
          detail?.placements?.[0] ?? detail?.detail ?? 'The board could not be saved.',
        );
      },
    });
  };

  return (
    <div className="cbx-builder">
      <header className="cbx-toolbar">
        <Button variant="ghost" size="sm" onClick={() => navigate('/dashboards/builder')}>
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          All boards
        </Button>

        <div className="cbx-toolbar-title">
          <b>{draft.name || 'Untitled board'}</b>
          {dirty && <em>unsaved changes</em>}
        </div>

        <div className="cbx-toolbar-actions">
          {dirty && board && (
            <Button variant="ghost" size="sm" onClick={() => reset(board)}>
              <Undo2 className="mr-1.5 h-4 w-4" />
              Discard
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/dashboards/board/${slug}`)}
            /* A preview of unsaved changes would be a lie: the viewer reads
               the server's copy. Saving first is the honest order. */
            disabled={dirty}
            title={dirty ? 'Save first — the preview reads the saved board' : undefined}
          >
            <Eye className="mr-1.5 h-4 w-4" />
            Preview
          </Button>
          {board?.visibility === 'PUBLISHED' ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => unpublishBoard.mutate(undefined)}
            >
              <Share2 className="mr-1.5 h-4 w-4" />
              Unpublish
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => publishBoard.mutate(undefined)}
              disabled={draft.placements.length === 0}
              title={
                draft.placements.length === 0
                  ? 'Add a card before publishing'
                  : 'Everyone in the company can open it; each card is still gated on its own data right'
              }
            >
              <Share2 className="mr-1.5 h-4 w-4" />
              Publish
            </Button>
          )}
          <Button size="sm" onClick={save} disabled={!dirty || saveBoard.isPending}>
            <Save className="mr-1.5 h-4 w-4" />
            Save
          </Button>
        </div>
      </header>

      {message && (
        <p className="cbx-message" role="status">
          {message}
        </p>
      )}

      {spilled.length > 0 && (
        <p className="cbx-message cbx-message-warn" role="status">
          {spilled.length} card{spilled.length === 1 ? '' : 's'} came off the board
          when it shrank: {spilled.map((placement) => placement.card_key).join(', ')}.
          Make it bigger again and add them back, or save as it is.
          <button type="button" onClick={clearSpilled}>
            Dismiss
          </button>
        </p>
      )}

      <div className="cbx-builder-body">
        <CardPalette
          cards={catalogueQuery.data?.cards ?? []}
          placedKeys={draft.placements.map((placement) => placement.card_key)}
          onAdd={(spec) => {
            const placed = addCard(spec);
            if (!placed) {
              setMessage(
                `No room for ${spec.title} (${spec.columns}×${spec.rows}). Make the board bigger or move something.`,
              );
            }
          }}
        />

        <main className="cbx-stage">
          <BoardCanvas
            placements={draft.placements}
            catalogue={catalogue}
            columns={draft.columns}
            rows={draft.rows}
            surface={draft.surface}
            density={draft.density}
            accent={draft.accent}
            selectedIndex={selected}
            onSelect={setSelected}
            onMove={moveCard}
            onDropNew={(cardKey, at) => {
              const spec = catalogue.get(cardKey);
              if (spec) addCard(spec, at);
            }}
            onRemove={(index) => {
              removeCard(index);
              setSelected(null);
            }}
          />
        </main>

        <aside className="cbx-side">
          {selectedPlacement ? (
            <>
              <button
                type="button"
                className="cbx-side-back"
                onClick={() => setSelected(null)}
              >
                ← Board settings
              </button>
              <BoardInspector
                placement={selectedPlacement}
                spec={catalogue.get(selectedPlacement.card_key)}
                boardAccent={draft.accent}
                onChange={(incoming) => patchCard(selected as number, incoming)}
              />
            </>
          ) : (
            <BoardSettings draft={draft} limits={limits} onChange={patch} />
          )}
        </aside>
      </div>
    </div>
  );
}
