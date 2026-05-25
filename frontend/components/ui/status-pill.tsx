import { PaperBadge } from "@/components/ui/paper-primitives";

type StatusPillProps = {
  children: React.ReactNode;
  tone?: "cyan" | "fuchsia" | "neutral";
};

export function StatusPill({
  children,
  tone = "neutral",
}: StatusPillProps) {
  const toneValue =
    tone === "cyan"
      ? ("accent-deep" as const)
      : tone === "fuchsia"
        ? ("accent" as const)
        : ("neutral" as const);

  return (
    <PaperBadge tone={toneValue} className="px-3 py-2">
      {children}
    </PaperBadge>
  );
}
