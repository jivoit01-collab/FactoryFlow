interface SignatureBlockProps {
  label: string;
  sign: string;
  signedAt: string | null;
}

export function SignatureBlock({ label, sign, signedAt }: SignatureBlockProps) {
  return (
    <div className="border rounded-lg p-3">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      {sign ? (
        <>
          <p className="font-medium text-sm">{sign}</p>
          {signedAt && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {new Date(signedAt).toLocaleString()}
            </p>
          )}
        </>
      ) : (
        <p className="text-sm text-muted-foreground italic">Pending</p>
      )}
    </div>
  );
}
