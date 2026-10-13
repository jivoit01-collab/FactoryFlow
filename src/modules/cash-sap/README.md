# cash-sap — Cash book → SAP (frontend)

> Backend: `factory_app/cash_sap` (`/api/v1/cash-sap/`), see its `docs/README.md`.
> Built on branch `feat/fixed-asset-grpo` in **separate mode** (`FA_GRPO_SEPARATE_MODE.md` §3): a module of its own. The only existing files touched are `src/app/registry/index.ts` (registration) and `src/modules/accounts/module.config.tsx` (the menu items, see *Sidebar*).

The cash book's approved **bunches**, posted to SAP: one imprest **PO** per bunch per SAP company, a **GRPO** per voucher (or voucher group), and **A/P drafts** when a routing turns them on.

## Pages

| Route | Page | Who |
|---|---|---|
| `/accounts/cash-sap` | `CashSapBunchesPage`: the cash book's bunches with an SAP status badge each | route: any cash book right or either cash_sap right; the list itself is `GET /cash-book/bunches/` (`CanViewCashBook`: view, manage or approve the cash book), so a user with only a cash_sap right or only the branches right sees an error card. The seeded groups *Cash Book SAP Poster* / *Settings* include `cash_book.can_view_cash_book`; a cash_sap right given on its own needs it too. |
| `/accounts/bunches/:bunchId/sap` | `BunchSapPage`: the plan, posting and the escape hatches. The backend links here (`cash_sap/titles.py`). | read as above; writes need `cash_sap.can_post_cash_to_sap` |
| `/accounts/cash-sap-settings` | `CashSapSettingsPage`: tabs "Branch routing" and "G/L → SAP item" | read as above; read-only without `cash_sap.can_manage_cash_sap_settings` |

**Sidebar:** "Bunches → SAP" and "Cash → SAP settings" sit **inside the Accounts group**.
- `accounts/module.config.tsx` imports `CASH_SAP_NAV_ITEMS` from this module, the way SAP Portal gathers its modules' items.
- Accounts' `modulePrefix` includes `cash_sap`, so a holder of a `cash_sap.*` right sees the group even without a cash book right.
- This module's own `navigation` is empty.

## The bunch SAP page

- **Header:** bunch number, count, total, frozen state and the summary badge, plus the badges *SIMULATE*, *TEST SAP* and *Switched off*.
- **`BUNCH_CHANGED`:** a red panel at the top. It names the vouchers taken out, added or changed, and offers **Accept the change** (`accept-changes/`) and **Reset**.
- **Per SAP company:**
  - the PO status and DocNum;
  - the GRPO list, with **Date / G.no.** (`GrpoRedateDialog`);
  - the A/P drafts;
  - the voucher table: Sr, dates, G.no., head, SAP account, item, amount, treatment, Dim1, Dim3, bill (with upload), GRPO, status, SAP doc and warnings;
  - the **Warnings** cell (`VoucherIssues`, wording in `utils/voucherIssues.ts`) lists one short point per problem:
    - red **Fix:** blocks posting;
    - amber **Note:** is only worth a look;
    - hovering a point shows the backend's full message;
    - a code the wording file does not know shows the backend's message unchanged;
  - per row, **Edit for SAP** (`VoucherSapDialog`) and **Leave out**.
- **Post:**
  1. `confirmSapPost`;
  2. `post/` (freeze and send one);
  3. the `send-next/` loop (`utils/sendLoop.ts`):
     - a refused document's posting id joins `skip_posting_ids` and the loop continues;
     - it stops on `waiting`, `in_progress` or `sent == null`, after 250 calls, or on Stop;
     - the progress reads "Posting n of N".
- **Retry** is the same loop with `include_failed: true`.
- **Other actions:** **Stop sending** (reason), **Re-check SAP**, **Close the PO in SAP**, **Reset** (offered only while nothing is in SAP).
- **Polling:** the plan is fetched again every 15 s while anything is `QUEUED` or `IN_APPROVAL`. The plan read has the global error toast off; a failed refresh shows a small "Could not refresh" note and keeps the last plan.
- **Button gates** (`utils/status.ts`, mirroring `cash_sap/services.py`): *Leave out* and *Date / G.no.* need the PO in SAP (`_committed_po`: a DocEntry, or simulated and POSTED), not merely queued or in approval; *Reset* is hidden once a PO, PO draft, GRPO (numbered, POSTED or IN_APPROVAL) or A/P draft is in SAP; bills can be added to a frozen goods voucher while its GRPO is open (`attach_bill` has no frozen check); *Edit for SAP* is hidden for cash received and salary advances (rules 1 and 5).
- **Close the PO** queues the close and runs `send_next` for the whole bunch, which sends POs, drafts and GRPOs first; when something else went, the page carries on with the send loop instead of claiming the close was sent.
- **Timeouts:** post, send-next, close-po and re-check use a 5-minute timeout (`CASH_SAP_SEND_TIMEOUT_MS`).

## Bill facts (bill date, G.no., supplier bill no.)

These live in `cash_sap.VoucherSapInfo` on this branch, not in the cash book. `VoucherSapDialog` edits them:
- a poster saves them through the override endpoint;
- a custodian without the post right saves them through `vouchers/<entry>/info/`.

**Bill date rules:**
- The date input has `max` set to today.
- `utils/voucherDates.ts` mirrors `cash_sap/voucher_dates.py` exactly, with the same codes and messages. The dialog calls it with the age check off, as the plan does.
- `today()` is built from local date parts, never from the UTC date.

## Files

| Path | Contents |
|---|---|
| `module.config.tsx` | routes and navigation (`cashSapModuleConfig`) |
| `constants/api.ts` | endpoint paths, timeouts, the poll interval |
| `constants/permissions.ts` | `CASH_SAP_PERMISSIONS` and the access lists |
| `types/` | the plan and every request and response shape |
| `api/cashSap.api.ts`, `api/cashSap.queries.ts` | `cashSapApi` and the React Query hooks (root key `['cash-sap']`) |
| `utils/` | `sendLoop`, `status` (plan readings), `voucherDates`, `bills`, `voucherIssues` (the Warnings wording) |
| `components/` | `VoucherSapDialog`, `GrpoRedateDialog`, `SapDocStatusBadge`, `RoutingEditDialog`, `GLMapEditDialog`, `VoucherBillUpload`, `SapItemPicker`, `ProblemList`, `VoucherIssues`, `CashSapSwitchBadges` |
| `__tests__/` | API paths and timeouts, the send loop, voucher dates, plan readings, bill checks, the Warnings wording, and config/permission source checks. Run on 10 Oct 2026: 77 tests, all pass. |

## Registration (lead)

- Add `cashSapModuleConfig` to `src/app/registry/index.ts`, right after `accountsModuleConfig`. This registers its routes.
- `accounts/module.config.tsx` spreads `CASH_SAP_NAV_ITEMS` into its children and adds `CASH_SAP_MODULE_PREFIX` to its `modulePrefix`. This adds the menu items.

## Known limits

- **Removing bills.** The plan counts bills but does not list them, so only a bill added in the current session can be taken off from this page.
- **The cash book's own `BunchesPage`** has no SAP column on this branch. The badge appears on this module's list instead.
- **The cash book's `today()` UTC bug** is not fixed here, because those files exist already:
  - `CashEntryDialog.tsx:59`
  - `AdvancesPage.tsx:45`
  - `AtmPage.tsx:40`
