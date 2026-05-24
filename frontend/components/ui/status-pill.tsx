type StatusPillProps = {
  children: React.ReactNode;
  tone?: "cyan" | "fuchsia" | "neutral";
};

export function StatusPill({
  children,
  tone = "neutral",
}: StatusPillProps) {
  const toneClassName =
    tone === "cyan"
      ? "border-[rgba(57,95,120,0.24)] bg-[rgba(226,234,241,0.9)] text-[color:var(--accent-deep)]"
      : tone === "fuchsia"
        ? "border-[rgba(185,90,66,0.22)] bg-[rgba(248,231,220,0.92)] text-[color:var(--accent)]"
        : "border-[rgba(95,71,48,0.16)] bg-[rgba(255,250,241,0.92)] text-[color:var(--ink-soft)]";

  return (
    <span
      className={`paper-card rounded-full border px-3 py-2 text-xs uppercase tracking-[0.22em] ${toneClassName}`}
    >
      {children}
    </span>
  );
}
