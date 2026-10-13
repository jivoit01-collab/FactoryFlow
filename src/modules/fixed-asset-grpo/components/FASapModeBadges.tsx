import { Badge } from '@/shared/components/ui';

import type { FASapFlags } from '../types';

/**
 * Where a post from this screen would land, said before anyone presses Post.
 *
 * - **SIMULATE** -- every check runs and SAP is read, but nothing is written:
 *   the GRPO is recorded as a simulated post that history can discard.
 * - **TEST SAP** -- the company's Service Layer database and HANA schema are
 *   both `TEST_` ones.
 * - **LIVE SAP** -- a real company database, and live posting is allowed.
 * - **SWITCHED OFF** -- `FIXED_ASSET_GRPO_ENABLED` is off on this server.
 */
export function FASapModeBadges({ sap }: { sap: FASapFlags | undefined | null }) {
  if (!sap) return null;
  return (
    <div className="flex flex-wrap items-center gap-2" data-testid="fa-sap-mode">
      {!sap.enabled && <Badge variant="destructive">SWITCHED OFF</Badge>}
      {sap.simulate && (
        <Badge className="border-transparent bg-amber-500 text-white hover:bg-amber-500/80">
          SIMULATE — nothing goes to SAP
        </Badge>
      )}
      {sap.is_test_db === true && <Badge variant="secondary">TEST SAP</Badge>}
      {sap.is_test_db === false && !sap.simulate && sap.allow_live && (
        <Badge variant="destructive">LIVE SAP</Badge>
      )}
    </div>
  );
}
