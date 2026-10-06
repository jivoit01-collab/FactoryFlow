import { useState } from 'react';

import { money, NO_VALUE, pctRough, whole } from '../../admin-control/utils';
import { OpsDrill } from '../../logistics-control/components';
import { useAmountsGodownItems } from '../api';
import type { AmountsCategory, AmountsGodown, AmountsGodownItem, AmountsPerson } from '../types';
import { managerList, quantity, shareOf } from '../utils';

export interface AmountsGodownDrillProps {
  companyCode: string;
  plantLabel: string;
  category: AmountsCategory;
  owner: AmountsPerson | null;
  onClose: () => void;
}

/**
 * One plant's RM, PM or FG, godown by godown -- and then what is in a godown.
 *
 * THE ROWS ADD UP TO THE TILE. Every row is the same category's value in one
 * godown, so the godown column is the tile's own figure split and the share
 * column can be trusted. A godown holding several categories appears under
 * each of them with only that category's part.
 *
 * The godown is held by CODE and looked up in the current payload: the board
 * re-reads every few minutes, and a row held from the click would go stale
 * under the reader.
 */
export function AmountsGodownDrill({
  companyCode,
  plantLabel,
  category,
  owner,
  onClose,
}: AmountsGodownDrillProps) {
  const [openCode, setOpenCode] = useState<string | null>(null);
  const opened = category.godowns.find((godown) => godown.code === openCode);

  if (opened) {
    return (
      <AmountsGodownItemsPanel
        companyCode={companyCode}
        plantLabel={plantLabel}
        category={category}
        godown={opened}
        onBack={() => setOpenCode(null)}
        onClose={onClose}
      />
    );
  }

  return (
    <OpsDrill
      title={`${plantLabel} · ${category.label}`}
      domain="warehouse"
      subtitle="Every godown holding it, at SAP stock value, largest first. Open a godown for its items."
      onClose={onClose}
      stats={[
        { label: 'Value', value: money(category.value) },
        { label: 'Godowns', value: whole(category.godowns.length) },
        { label: 'Items', value: whole(category.items) },
        { label: 'Owner', value: owner?.name ?? 'not set' },
      ]}
      rows={category.godowns}
      rowKey={(godown: AmountsGodown) => godown.code}
      empty={`SAP shows no ${category.label.toLowerCase()} on hand in any godown.`}
      onRowClick={(godown: AmountsGodown) => setOpenCode(godown.code)}
      columns={[
        { label: 'Godown', cell: (godown: AmountsGodown) => godown.code },
        { label: 'Name', cell: (godown: AmountsGodown) => godown.name, dim: true },
        {
          label: 'Managers',
          cell: (godown: AmountsGodown) => managerList(godown.managers),
          dim: true,
        },
        { label: 'Items', cell: (godown: AmountsGodown) => whole(godown.items), numeric: true },
        { label: 'Value', cell: (godown: AmountsGodown) => money(godown.value), numeric: true },
        {
          label: 'Share',
          cell: (godown: AmountsGodown) => pctRough(shareOf(godown.value, category.value)),
          numeric: true,
          dim: true,
        },
      ]}
    />
  );
}

interface AmountsGodownItemsPanelProps {
  companyCode: string;
  plantLabel: string;
  category: AmountsCategory;
  godown: AmountsGodown;
  onBack: () => void;
  onClose: () => void;
}

/** The items one godown holds of one category, most valuable first. */
export function AmountsGodownItemsPanel({
  companyCode,
  plantLabel,
  category,
  godown,
  onBack,
  onClose,
}: AmountsGodownItemsPanelProps) {
  const { data, isLoading, error } = useAmountsGodownItems(companyCode, category.key, godown.code);
  const items = data?.items ?? [];
  const total = data?.value ?? godown.value;

  return (
    <OpsDrill
      title={`${godown.code} · ${category.label}`}
      domain="warehouse"
      subtitle={`${godown.name} · ${plantLabel} · stock on hand at SAP value`}
      onBack={onBack}
      backLabel={`${plantLabel} · ${category.label}`}
      onClose={onClose}
      stats={[
        { label: 'Value', value: money(total) },
        { label: 'Items', value: data ? whole(items.length) : whole(godown.items) },
        { label: 'Managers', value: managerList(godown.managers, 3) },
      ]}
      loading={isLoading}
      rows={error ? [] : items}
      rowKey={(item: AmountsGodownItem) => item.item_code}
      empty={
        error
          ? 'SAP could not be read for this godown. Close and open it again to retry.'
          : `SAP shows no ${category.label.toLowerCase()} on hand in ${godown.code}.`
      }
      columns={[
        { label: 'Item code', cell: (item: AmountsGodownItem) => item.item_code, dim: true },
        { label: 'Item', cell: (item: AmountsGodownItem) => item.item_name || NO_VALUE },
        {
          label: 'Quantity',
          cell: (item: AmountsGodownItem) =>
            item.uom ? `${quantity(item.quantity)} ${item.uom}` : quantity(item.quantity),
          numeric: true,
        },
        { label: 'Value', cell: (item: AmountsGodownItem) => money(item.value), numeric: true },
        {
          label: 'Share',
          cell: (item: AmountsGodownItem) => pctRough(shareOf(item.value, total)),
          numeric: true,
          dim: true,
        },
      ]}
    />
  );
}
