# fixed-asset-grpo

The screens for posting a vendor's fixed-asset delivery to SAP as a GRPO. Backend: `factory_app/fixed_asset_grpo` (mounted at `api/v1/fixed-asset-grpo/`). Built on branch `feat/fixed-asset-grpo` in "separate mode" (`FA_GRPO_SEPARATE_MODE.md` §3): a new module, with no edit to the gate wizard, the warehouse/grpo screens, `config/constants/api.constants.ts` or `config/permissions/*`. The only existing files touched are `src/app/registry/index.ts` (registration) and `src/modules/accounts/module.config.tsx` (the menu item).

## Flow

1. **Gate (unchanged).** The fixed-asset gate wizard records the arrival with free text and completes it.
2. **Needs PO.** Someone with the link or post right opens **Link PO** (`FAPOLinkDialog`). They pick the SAP vendor, one of the vendor's open POs with lines in a fixed-asset warehouse, and *Received now* per line. When the backend says `over_receipt_enforced`, each line is capped at 110% of its open quantity. Lock reasons from the backend are shown as they are.
3. **Ready to post.** The preview (`FAGRPOPreviewPage`) shows:
   - the gate's record and the linked PO, with **Change PO** while nothing is posted;
   - the lines, with *Accept* ≤ received, price, tax, G/L, and the warehouse per line (read-only);
   - the posting date (local today, never later), the vendor ref and comments;
   - an inline multi-file input. Leave it empty and the backend sends the gate's invoice photo.

   **Post** goes through `confirmSapPost`. Its answers:
   - 201: posted, or simulated;
   - 202: waiting for SAP;
   - 409: already on its way;
   - 400 / 502: shown inline.

   A refused or waiting attempt leaves a draft. The page loads it, re-sends it as `grpo_posting_id`, and offers **Discard saved draft**.
4. **History.** Every attempt is listed. A simulated post shows a SIMULATED badge and offers **Discard** (post right). The detail page (`FAGRPOHistoryDetailPage`) is read-only and prints SAP's GRN.
5. **Done in SAP by hand** (`FAClosureDialog`) needs the post right. It closes an entry with a SAP DocNum or a note. The fourth tab lists closed entries and is where they are reopened. Its badge is `summary.closed_count`, which counts every closed FA entry; the list (`all-entries/`) leaves out pre-cut-over and gate-cancelled entries, so the tab says how many closed entries are counted but not listed.

## Routes and sidebar

| Path | Page |
|---|---|
| `/warehouse/grpo/fixed-asset` (`?tab=needs-po\|ready\|history\|closed`) | `FAGRPOPage` |
| `/warehouse/grpo/fixed-asset/preview/:vehicleEntryId` (`?draft=` is accepted) | `FAGRPOPreviewPage` |
| `/warehouse/grpo/fixed-asset/history/:postingId` | `FAGRPOHistoryDetailPage` |

- The paths match the backend's `FRONTEND_BASE`, so queue and notification links land here.
- No existing route captures them. grpo's parameter routes are `/warehouse/grpo/preview/:id` and `/warehouse/grpo/history/:id`, and there is no `/warehouse/grpo/:x` or `/warehouse/*` route.
- The menu item "Fixed Asset GRPO" sits **inside the Accounts group**:
  - `accounts/module.config.tsx` imports `FA_GRPO_NAV_ITEMS` from this module.
  - Accounts' `modulePrefix` includes `fixed_asset_grpo`, so a holder of only a `fixed_asset_grpo.*` right still sees the group, with this item in it.
  - This module's own `navigation` is empty.
  - The page addresses stay under `/warehouse/grpo/fixed-asset`, so the breadcrumb still reads Warehouse › GRPO.

## Permissions (`constants/permissions.ts`)

| Constant | Codename | Used for |
|---|---|---|
| `VIEW` | `fixed_asset_grpo.can_view_fixed_asset_grpo` | every route (with the other two) |
| `LINK` | `fixed_asset_grpo.can_link_fixed_asset_po` | Link / Change / Unlink PO (with `POST`) |
| `POST` | `fixed_asset_grpo.can_post_fixed_asset_grpo` | Post, close / reopen, discard draft / simulated |

## Endpoints (`constants/api.ts`)

All of them are relative to the client's `/api/v1`. The `Company-Code` header is added by the shared client.

| Call | Path | Backend view |
|---|---|---|
| `getSummary` | GET `fixed-asset-grpo/summary/` | `FAGRPODashboardSummaryAPI` |
| `getAllEntries` | GET `…/all-entries/` | `FAAllEntriesListAPI` |
| `getPendingEntries` | GET `…/pending/` | `FAPendingGRPOListAPI` |
| `getNeedsPO` | GET `…/needs-po/` | `FANeedsPOListAPI` |
| `getHistory` / `getDetail` | GET `…/history/[<id>/]` | `FAGRPOPostingHistoryAPI` / `FAGRPOPostingDetailAPI` |
| `getPrint` | GET `…/history/<id>/print/` | `FAGRPOPrintAPI` |
| `discardSimulated` | POST `…/history/<id>/discard-simulated/` | `FAGRPODiscardSimulatedAPI` |
| `getEntry` | GET `…/entries/<id>/` | `FAEntryDetailAPI` |
| `getPOReceipts` / `linkPO` | GET / POST `…/entries/<id>/po-receipts/` | `FAPOReceiptListCreateAPI` |
| `updatePOLink` / `unlinkPO` | PUT / DELETE `…/entries/<id>/po-receipts/<po_id>/` | `FAPOReceiptDetailAPI` |
| `getOpenFAPOs` | GET `…/entries/<id>/open-pos/?supplier_code=` | `FAOpenPOListAPI` |
| `getPreview` | GET `…/entries/<id>/preview/` | `FAGRPOPreviewAPI` |
| `closeEntry` / `reopenEntry` | POST / DELETE `…/entries/<id>/close/` | `FAEntryCloseAPI` |
| `post` | POST `…/post/` (multipart, 5-minute timeout) | `FAPostGRPOAPI` |
| `discardDraft` | DELETE `…/drafts/<posting_id>/` | `FAGRPODraftAPI` |

The vendor list in the Link PO dialog is the gate's `/po/vendors/` (`useVendors`, open to any signed-in user). The gate records a fixed-asset supplier as free text, so the SAP code is chosen at link time.

## Notes

- **One warehouse per GRPO.** The screens warn when the lines span warehouses. The backend refuses with `FA_GRPO_MIXED_WAREHOUSES`, and its message is shown.
- **Zero lines are sent.** The engine posts a line the request omits at its stored quantity, so "not this line" is sent as 0.
- **Several files.** The engine uploads each file as its own SAP attachment and links only the last one, so the page suggests a single file.
- **Types.** Where the backend reuses grpo's serializer (preview, history, post request), grpo's frontend type is imported from `@/modules/warehouse/grpo/types/grpo.types`. Nothing there is edited.

## Registration (lead)

Add to `src/app/registry/index.ts`:

```ts
import { fixedAssetGrpoModuleConfig } from '@/modules/fixed-asset-grpo/module.config';
// …in moduleRegistry, after warehouseModuleConfig:
fixedAssetGrpoModuleConfig,
```

`accounts/module.config.tsx` spreads `FA_GRPO_NAV_ITEMS` into its children and adds `FA_GRPO_MODULE_PREFIX` to its `modulePrefix` (the menu item).

## Tests

`__tests__/` holds:
- API paths, verbs and multipart; the timeout; 202 and 409;
- the pure helpers (110% ceiling, the Post-disabled reasons, the warehouse rule, the local date, draft reuse);
- module-config and preview source-text checks;
- the SAP-mode badges.

**Run on 10 Oct 2026:** 69 tests, all pass (`npx vitest run src/modules/fixed-asset-grpo`). `tsc --noEmit` reports no errors in this module.
