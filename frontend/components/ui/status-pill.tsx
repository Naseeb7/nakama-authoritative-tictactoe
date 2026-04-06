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
      ? "border-cyan-400/25 bg-cyan-400/10 text-cyan-200"
      : tone === "fuchsia"
        ? "border-fuchsia-400/25 bg-fuchsia-500/10 text-fuchsia-200"
        : "border-slate-700 bg-slate-950/70 text-slate-300";

  return (
    <span
      className={`rounded-full border px-3 py-2 text-xs uppercase tracking-[0.22em] ${toneClassName}`}
    >
      {children}
    </span>
  );
}
