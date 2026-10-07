import type { ExpenseClaim } from '@/modules/accounts/api';

/** The G/L account, or — when the submitter did not know it — what it is for. */
export function ExpenseGLCell({ claim }: { claim: ExpenseClaim }) {
  if (claim.gl_account_code) {
    return (
      <>
        <p className="font-mono text-xs">{claim.gl_account_code}</p>
        <p className="text-xs text-muted-foreground">{claim.gl_account_name}</p>
      </>
    );
  }
  return (
    <>
      <p className="text-xs italic text-muted-foreground">Not known</p>
      <p className="text-xs">{claim.gl_description}</p>
    </>
  );
}
