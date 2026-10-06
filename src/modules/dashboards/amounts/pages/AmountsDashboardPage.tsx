import '../../logistics-control/styles/ops-board.css';
import '../../admin-control/styles/admin-board.css';
import '../styles/amounts-board.css';

import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { DASHBOARDS_PERMISSIONS } from '@/config/permissions';
import { usePermission } from '@/core/auth';

import { AdminBand } from '../../admin-control/components';
import { barPct, money, moneyParts, pctRough, whole } from '../../admin-control/utils';
import { useFullscreen } from '../../dispatch/hooks';
import { OpsGroup, OpsMeter, OpsPair, OpsTopbar } from '../../logistics-control/components';
import { useFullBleed } from '../../logistics-control/hooks';
import { useAmountsBoard } from '../api';
import { AmountsGodownDrill } from '../components';
import {
  AMOUNTS_OWNERS_ROUTE,
  AMOUNTS_PLANTS,
  DEBTOR_TILES,
  NON_MOVING_ROUTE,
  STOCK_CATEGORIES,
  STOCK_CATEGORY_LABELS,
} from '../constants';
import type {
  AmountsCategory,
  AmountsDebtorFigures,
  AmountsDebtorTotal,
  AmountsNonMoving,
  AmountsPerson,
  AmountsPlant,
  AmountsPlantStock,
  StockCategoryKey,
} from '../types';
import { debtAge, longDate, shareOf } from '../utils';

const SAP_MISSING = 'SAP could not be read.';

/**
 * The Amounts board: what the plants hold and what customers owe, in rupees.
 *
 *     Oil plant       total (RM | PM | FG) · RM · PM · FG · non-moving
 *     Beverage plant  the same
 *     Debtors         JWPL · MART · Beverages · Total
 *
 * Every figure arrives decided from `/dashboards/amounts-board/board/`; this
 * file formats them. A section SAP could not answer is null and its tile says
 * so -- an unreadable plant must never look like an empty one.
 */
export default function AmountsDashboardPage() {
  const shellRef = useRef<HTMLDivElement>(null);
  useFullBleed(shellRef);
  const { isFullscreen, toggle } = useFullscreen(shellRef);
  const navigate = useNavigate();
  const { hasPermission } = usePermission();

  const { data, error, isFetching, isRefetchError } = useAmountsBoard();
  const [open, setOpen] = useState<{ plant: string; category: StockCategoryKey } | null>(null);

  const canManageOwners = hasPermission(DASHBOARDS_PERMISSIONS.MANAGE_STOCK_OWNERS);
  const canOpenNonMoving = hasPermission(DASHBOARDS_PERMISSIONS.VIEW_NON_MOVING_RM);
  // The last refresh failed and the figures on screen are the previous read's:
  // the header pill must not go on saying LIVE.
  const stale = isRefetchError;

  if (error && !data) {
    return (
      <div ref={shellRef} className="admin-board amounts-board ops-board">
        <div className="ops-board__inner">
          <OpsTopbar
            title="Amounts"
            scope="Feed unavailable"
            chips={[{ label: 'Feed', value: 'not answering' }]}
            totals={[]}
            busy
          />
          <main className="ops-stack">
            <section className="ops-band adm-band ops-b-warehouse">
              <div className="ops-rail">
                <p>Amounts</p>
              </div>
              <div className="ops-groups" style={{ gridTemplateColumns: '1fr' }}>
                <div className="ops-grp" style={{ gridTemplateRows: 'auto auto' }}>
                  <b className="ops-nm">The board could not be read</b>
                  <p className="ops-note">
                    Nothing is shown rather than a stale figure. The board keeps retrying on its
                    own.
                  </p>
                </div>
              </div>
            </section>
          </main>
        </div>
      </div>
    );
  }

  const loading = !data;
  const plantFor = (code: string) => data?.plants.find((plant) => plant.company_code === code);
  const debtorTotal = data?.debtors.total ?? null;

  const openPlant = open ? plantFor(open.plant) : undefined;
  const openCategory = open
    ? (openPlant?.stock?.categories.find((category) => category.key === open.category) ?? null)
    : null;

  return (
    <div ref={shellRef} className="admin-board amounts-board ops-board">
      <div className="ops-board__inner">
        <OpsTopbar
          title="Amounts"
          scope="Stock at SAP value · what customers owe"
          chips={[
            {
              label: 'Read',
              value: data
                ? new Date(data.meta.generated_at).toLocaleTimeString('en-IN', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : '—',
            },
          ]}
          totals={[
            ...AMOUNTS_PLANTS.map(({ code, label }) => {
              const stock = plantFor(code)?.stock ?? null;
              return {
                caption: label,
                value: money(stock?.total),
                sub: 'RM + PM + FG',
                missing: !stock,
              };
            }),
            {
              caption: 'Debtors',
              value: money(debtorTotal?.amount),
              sub: debtorTotal ? `${whole(debtorTotal.customers)} customers` : '',
              missing: !debtorTotal,
            },
          ]}
          busy={isFetching || stale}
          isFullscreen={isFullscreen}
          onToggleFullscreen={toggle}
          settingsTo={canManageOwners ? AMOUNTS_OWNERS_ROUTE : undefined}
        />

        <main className="ops-stack">
          {AMOUNTS_PLANTS.map(({ code, label }) => {
            const plant = plantFor(code) ?? null;
            return (
              <AdminBand
                key={code}
                domain="storage"
                title={label}
                scope="stock"
                columns="1.3fr repeat(4, minmax(0, 1fr))"
              >
                <TotalStockTile stock={plant?.stock ?? null} loading={loading} />
                {STOCK_CATEGORIES.map((key) => (
                  <CategoryTile
                    key={key}
                    categoryKey={key}
                    plant={plant}
                    loading={loading}
                    onOpen={() => setOpen({ plant: code, category: key })}
                  />
                ))}
                <NonMovingTile
                  nonMoving={plant?.non_moving ?? null}
                  loading={loading}
                  onOpen={
                    canOpenNonMoving
                      ? () => navigate(`${NON_MOVING_ROUTE}?company=${code}`)
                      : undefined
                  }
                />
              </AdminBand>
            );
          })}

          <AdminBand
            domain="cost"
            title="Debtors"
            scope="outside customers"
            columns="repeat(4, minmax(0, 1fr))"
          >
            {DEBTOR_TILES.map(({ key, label }) => {
              const company = data?.debtors.companies.find((c) => c.key === key);
              return (
                <DebtorTile
                  key={key}
                  name={label}
                  figures={company?.figures ?? null}
                  floor={data?.debtors.oldest_floor}
                  loading={loading}
                />
              );
            })}
            <DebtorTile
              name="Total"
              figures={debtorTotal}
              total={debtorTotal}
              floor={data?.debtors.oldest_floor}
              loading={loading}
            />
          </AdminBand>
        </main>
      </div>

      {open && openPlant && openCategory && (
        <AmountsGodownDrill
          companyCode={openPlant.company_code}
          plantLabel={openPlant.label}
          category={openCategory}
          owner={openPlant.owners[openCategory.key]}
          onClose={() => setOpen(null)}
        />
      )}
    </div>
  );
}

function TotalStockTile({ stock, loading }: { stock: AmountsPlantStock | null; loading: boolean }) {
  const headline = moneyParts(stock?.total);

  return (
    <OpsGroup
      name="Total stock"
      sub="RM | PM | FG"
      value={headline.value}
      unit={headline.unit}
      loading={loading}
      missing={!loading && !stock ? SAP_MISSING : undefined}
      viz={
        stock && (
          <OpsMeter
            segments={stock.categories.map((category, index) => ({
              fill: (['main', 'light', 'mute'] as const)[index % 3],
              pct: barPct(shareOf(category.value, stock.total)),
              label: category.key,
              figure: money(category.value),
            }))}
          />
        )
      }
    />
  );
}

function CategoryTile({
  categoryKey,
  plant,
  loading,
  onOpen,
}: {
  categoryKey: StockCategoryKey;
  plant: AmountsPlant | null;
  loading: boolean;
  onOpen: () => void;
}) {
  const category: AmountsCategory | null =
    plant?.stock?.categories.find((c) => c.key === categoryKey) ?? null;
  const owner: AmountsPerson | null = plant?.owners[categoryKey] ?? null;
  const headline = moneyParts(category?.value);
  const godowns = category?.godowns ?? [];
  const share = shareOf(category?.value, plant?.stock?.total);

  return (
    <OpsGroup
      name={`${categoryKey} godowns`}
      tag={category && share !== null ? { label: `${pctRough(share)} of stock` } : undefined}
      // The owner is read from Postgres, so it shows even while SAP is down:
      // whose stock it is does not depend on SAP answering.
      sub={owner ? `Owner · ${owner.name}` : 'Owner not set'}
      value={headline.value}
      unit={headline.unit}
      loading={loading}
      missing={!loading && !category ? SAP_MISSING : undefined}
      onOpen={godowns.length > 0 ? onOpen : undefined}
      viz={
        category && (
          <div>
            {godowns.length > 0 ? (
              <OpsPair
                rows={godowns.slice(0, 2).map((godown, index) => ({
                  label: godown.code,
                  figure: money(godown.value),
                  pct: barPct(shareOf(godown.value, godowns[0].value)),
                  fill: index === 0 ? 'main' : 'light',
                }))}
              />
            ) : (
              <p className="ops-note">
                No {STOCK_CATEGORY_LABELS[categoryKey].toLowerCase()} on hand.
              </p>
            )}
            {godowns.length > 0 && (
              <p className="adm-open-hint">
                {godowns.length} {godowns.length === 1 ? 'godown' : 'godowns'} — open the detail →
              </p>
            )}
          </div>
        )
      }
    />
  );
}

function NonMovingTile({
  nonMoving,
  loading,
  onOpen,
}: {
  nonMoving: AmountsNonMoving | null;
  loading: boolean;
  /** Absent when the reader cannot open the Non-Moving report. */
  onOpen?: () => void;
}) {
  const headline = moneyParts(nonMoving?.value);

  return (
    <OpsGroup
      name="Non-moving stock"
      sub={nonMoving ? `PM idle over ${nonMoving.age_days} days` : 'PM idle'}
      value={headline.value}
      unit={headline.unit}
      loading={loading}
      missing={!loading && !nonMoving ? SAP_MISSING : undefined}
      onOpen={onOpen}
      viz={
        nonMoving && (
          <div>
            <p className="amt-line">
              <b>{whole(nonMoving.item_count)}</b> items in{' '}
              {nonMoving.warehouses.length > 0 ? nonMoving.warehouses.join(', ') : 'no store'}
            </p>
            {onOpen ? (
              <p className="adm-open-hint">open the Non-Moving report →</p>
            ) : (
              <p className="ops-note">The full report needs Non-Moving access.</p>
            )}
          </div>
        )
      }
    />
  );
}

function DebtorTile({
  name,
  figures,
  total,
  floor,
  loading,
}: {
  name: string;
  figures: AmountsDebtorFigures | null;
  /** Given on the Total tile, for the companies it had to leave out. */
  total?: AmountsDebtorTotal | null;
  /** Balances under this set no oldest date (rounding residues). */
  floor?: number;
  loading: boolean;
}) {
  const headline = moneyParts(figures?.amount);
  const oldest = figures?.oldest ?? null;
  const age = debtAge(oldest?.date);
  const oldestCompany = total?.oldest?.company;

  return (
    <OpsGroup
      name={name}
      tag={age ? { label: age.label, tone: age.tone } : undefined}
      sub={figures ? `${whole(figures.customers)} customers in debit` : ''}
      value={headline.value}
      unit={headline.unit}
      loading={loading}
      missing={!loading && !figures ? SAP_MISSING : undefined}
      viz={
        figures && (
          <div>
            {oldest ? (
              <>
                <p className="amt-line" title={oldest.card_name}>
                  Oldest since <b>{longDate(oldest.date)}</b>
                  {oldestCompany ? ` · ${oldestCompany}` : ''}
                </p>
                <p className="amt-line" title={oldest.card_name}>
                  {oldest.card_name} · <b>{money(oldest.balance)}</b>
                </p>
              </>
            ) : (
              <p className="amt-line">
                {figures.amount > 0
                  ? `Every balance is under ${money(floor)}`
                  : 'No customer owes anything.'}
              </p>
            )}
            {total && total.missing.length > 0 ? (
              <p className="ops-note">Leaves out {total.missing.join(', ')}: SAP not read.</p>
            ) : figures.group_amount > 0 ? (
              <p className="ops-note">
                Group &amp; branches {money(figures.group_amount)} not counted
              </p>
            ) : null}
          </div>
        )
      }
    />
  );
}
