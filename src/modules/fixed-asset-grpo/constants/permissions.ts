/**
 * Fixed Asset GRPO permissions, module-local.
 *
 * All three are declared on `fixed_asset_grpo.FixedAssetGRPORecord.Meta` and
 * handed out together by the "Fixed Asset GRPO" group (backend migration 0002).
 * The backend reads them like this (`fixed_asset_grpo/permissions.py`):
 *
 * | Right | Opens |
 * |---|---|
 * | `can_view_fixed_asset_grpo` | lists, an entry, the preview, history, print |
 * | `can_link_fixed_asset_po` | link, change or unlink the SAP PO; the open-PO list |
 * | `can_post_fixed_asset_grpo` | post (or simulate), close / reopen, discard; implies the other two |
 *
 * Any one of the three lets a person see the screens, which is why every route
 * takes the whole set. None of grpo's own rights opens anything here.
 */

export const FA_GRPO_PERMISSIONS = {
  /** See the lists, an entry, the preview and history. */
  VIEW: 'fixed_asset_grpo.can_view_fixed_asset_grpo',
  /** Post (or simulate) a fixed-asset GRPO; close / reopen; discard. */
  POST: 'fixed_asset_grpo.can_post_fixed_asset_grpo',
  /** Link, change or remove the SAP PO on a fixed-asset gate entry. */
  LINK: 'fixed_asset_grpo.can_link_fixed_asset_po',
} as const;

/** Module prefix for sidebar filtering (`hasModulePermission`). */
export const FA_GRPO_MODULE_PREFIX = 'fixed_asset_grpo';

/** Who reaches the screens: any of the three rights. */
export const FA_GRPO_ACCESS = [
  FA_GRPO_PERMISSIONS.VIEW,
  FA_GRPO_PERMISSIONS.POST,
  FA_GRPO_PERMISSIONS.LINK,
] as const;

/** Who may link, change or unlink a PO: the link right, or the post right. */
export const FA_GRPO_LINK_ACCESS = [FA_GRPO_PERMISSIONS.LINK, FA_GRPO_PERMISSIONS.POST] as const;

/** Who may post, close / reopen and discard: the post right only. */
export const FA_GRPO_POST_ACCESS = [FA_GRPO_PERMISSIONS.POST] as const;

export type FAGRPOPermission = (typeof FA_GRPO_PERMISSIONS)[keyof typeof FA_GRPO_PERMISSIONS];
